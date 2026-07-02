# Universal Capture: brain-dump notepad, AI auto-routing, food logs

Date: 2026-07-01. Status: approved by Tanay. This document is self-contained:
paste it into a fresh Claude Code session and it has everything needed to
execute end to end.

---

## 0. How to use this document in a new session

- Repo: `https://github.com/tpatel-ls/ops-dashboard`. On Tanay's Windows
  machine it is cloned at `C:\Users\Tanay\Desktop\ops-dashboard`. Work on
  `main` (this repo merges directly to main; Vercel deploys from it).
- Baseline: `pnpm install` (if fresh clone), then `pnpm typecheck` and
  `pnpm --filter @ops-dashboard/core test` must be green BEFORE starting.
- Dev server: `pnpm dev` (Turbopack; picks 3001 if 3000 is busy).
- Follow the phase order below. After each phase: typecheck, lint the touched
  files, commit. Full build + browser E2E at the end, then push to main.

### Repo conventions (non-negotiable)

- NO em-dashes anywhere in code, UI strings, or docs. Use plain hyphens.
- TypeScript strict everywhere. `apps/web` overrides
  `exactOptionalPropertyTypes: false`; `packages/*` do not, so in packages use
  the conditional-spread idiom: `...(x ? { x } : {})`.
- Prettier: single quotes, trailing commas, width 100, plugin sorts Tailwind
  classes. ESLint: `pnpm --filter @ops-dashboard/web lint` (root `pnpm lint`
  is broken - the packages lack an eslint install; do not "fix" that here).
- The recursive `pnpm build` can OOM a type-check worker on this machine. Use:
  `cd apps/web; NODE_OPTIONS=--max-old-space-size=4096 pnpm exec next build --webpack`.
- Commit author MUST be `Tanay Patel <tpatel@lsglobalgroup.com>` (repo-local
  git config already set on the Windows clone; set it again if cloning fresh)
  or the commits do not count on Tanay's GitHub contribution graph.
- New React components: hydration-safe mount gating uses
  `useSyncExternalStore(() => () => {}, () => true, () => false)` - do NOT use
  the `useEffect(() => setMounted(true))` pattern; the repo lint flags
  set-state-in-effect as an error.
- Sync gotcha: the camel-to-snake mapper DROPS undefined keys, so clearing a
  synced field cross-device requires sending SQL null:
  `(value || null) as unknown as string | undefined` in the patch. See
  existing examples in `task-edit-drawer.tsx` and `kanban-board.tsx`.

### Current state you inherit (as of 2026-07-01)

- The app is Tanay's live life-OS PWA ("Ops Dashboard"), Next.js 16 + React 19
  + Tailwind v4 + Dexie (local-first) + Supabase realtime sync + Serwist PWA.
  Prod: Vercel project `taskify` (taskify-three-delta.vercel.app) on Tanay's
  PERSONAL Vercel account; Supabase project `jnaycounllaafvorakss` on his
  PERSONAL Supabase account.
- Org lanes shipped 2026-07-01: `organizations` table, `orgId` on
  projects/tasks, top-bar context switcher (All / LS Global Group / Personal),
  lane-colored Week+Month calendars, quick-add project picker, inline add on
  project detail + dashboard tiles, Settings > Organizations.
- PENDING external step: Supabase migration
  `supabase/migrations/0005_organizations.sql` is committed but NOT yet applied
  to prod (Tanay applies it from his Mac; runbook:
  `docs/ops-dashboard/apply-0005.md`). The outbox tolerates the missing table
  (per-table error isolation), so do not block on it. This plan adds migration
  0006; update the runbook to apply both.
- The dashboard route `/dashboard` is the landing page with a portfolio view
  and a "Load my projects" importer (Blue Text, Power Dialer, Mini Monet,
  Email Triage).

---

## 1. Product goal

Tanay wants ONE app for projects, tasks, habits, food logs, and everything
else, with frictionless capture: speak into a mic or type into a notepad and
every thought lands in the right place automatically.

Patterns adopted from the best capture apps: Todoist Ramble (voice ramble to
organized items), TAMSIV (one utterance becomes N typed items), Cal AI /
Voical / SpeakMeal (say what you ate, AI estimates calories + macros),
Reflect / NotePlan (brain-dump notes, AI extracts the action items).

Approved decisions:
1. Food logging = AI-estimated calories + protein/carbs/fat, logged by voice
   or text, with a Food page showing daily totals and history.
2. Notepad = full brain dump. One page, type or dictate anything - mixed
   thoughts, many lines - AI splits it into separate items and files each one.
3. Trust = file automatically, show a processed trail with one-tap Undo /
   reassign. No confirm-first friction.

## 2. Architecture: one brain, many mouths

A single new endpoint `/api/braindump` parses ANY capture (one line or a
whole ramble) into an array of routed items. Every capture surface calls it:
top-bar quick add, the Notepad page, the mobile quick-add dialog. A single
client router turns items into records through the existing sync-aware lib
helpers, so everything syncs to all devices through the outbox pipeline.

Why not extend the existing `/api/triage`: it is single-item, its prompt is
duplicated verbatim in `/api/capture` (watch webhook), and its client
(`capture-client.ts`) collapses almost every kind into a Task. The brain-dump
endpoint replaces the CLIENT path; the watch server path (`/api/capture`)
stays untouched this round (follow-up noted in STATE.md).

### 2.1 `/api/braindump` (new)

- File: `apps/web/src/app/api/braindump/route.ts`. `runtime='nodejs'`,
  guarded by `requestAllowed(req)` from `lib/server/guard.ts` (same as triage).
- Request JSON: `{ text: string, context: { projects: string[], routines: string[], date: string } }`
  - `projects` = active project names (client sends; local-first, same trick
    as journal-extract's routineNames). `routines` = active routine names.
    `date` = client-local YYYY-MM-DD (server must not guess timezone).
  - Caps: text 8000 chars, projects/routines 100 names each.
- Model: `MODELS.triage` (Haiku) via `getAnthropic()` from `lib/server/ai.ts`;
  `max_tokens: 4096`; forced tool call `tool_choice: {type:'tool', name:'route_items'}`.
- Response: `{ ok: true, items: RoutedItemDraft[] }` or `{ ok:false, reason }`
  with the same reason codes triage uses (`no-key`, `empty`, `no-result`,
  `error`, plus 401 unauthorized).

System prompt (write it substantially as):

```
You are the capture brain for a personal life dashboard. The user speaks or
types freely: single thoughts, long rambles, mixed lists. Split the input into
distinct items and call route_items exactly once with all of them.

For each item, clean the title (remove filler words and self-corrections) and
classify kind:
- task: something to do (default for actions)
- food: something the user ate or drank
- habit: the user says they DID a recurring routine (match routineName from
  the provided list; only when clearly completed, not planned)
- journal: a reflection about the day or feelings
- note: information to remember
- quote: a quotation worth saving
- event: something happening at a specific time (return as task with dueText)
- person: information about a person (return as note; prefix title with the
  person's name)

Routing:
- projectName: if the item clearly belongs to one of the provided project
  names, return that name EXACTLY as given. Otherwise omit.
- routineName: for kind habit, the exact routine name from the list.
- dueText: any natural-language date/time, verbatim (e.g. "tomorrow 2pm").
- priority: 0-3 from urgency cues.
- tags: lowercase topic tags.

For kind food, also return food:
- mealType: breakfast | lunch | dinner | snack (infer from time words or the
  provided date context; default snack)
- items: each food with name, quantity (e.g. "2 eggs"), and your best
  ESTIMATE of calories (kcal), protein, carbs, fat in grams. Estimate like a
  nutritionist; round sensibly. Whole numbers.

Never invent projects or routines that are not in the provided lists.
```

Tool schema (`route_items`): `{ items: array of { kind: enum[task, food,
habit, journal, note, quote, event, person], title: string, notes?: string,
dueText?: string, priority?: integer 0-3, tags?: string[], projectName?:
string, routineName?: string, food?: { mealType: enum[breakfast, lunch,
dinner, snack], items: array of { name: string, quantity?: string, calories:
number, protein?: number, carbs?: number, fat?: number } } } }` with
`required: ['items']` and per-item `required: ['kind','title']`.

### 2.2 Client router (new): `apps/web/src/lib/route-items.ts`

`'use client'`. Exports:

```ts
export interface RoutedResult {
  captureId: string;
  kind: CaptureKind | 'food' | 'habit';
  title: string;
  recordType: 'task' | 'journalEntry' | 'note' | 'quote' | 'foodLog' | 'routineCheck';
  recordId: string;
  detail?: string;           // e.g. "Blue Text" or "640 kcal" or routine name
  undo: () => Promise<void>;
}
export async function processBrainDump(raw: string, source: CaptureSource): Promise<RoutedResult[]>
```

Behavior:
1. Gather context from Dexie: active project names (not deleted/archived),
   active routine names, `todayISO()`.
2. POST `/api/braindump`. On `ok:false` or fetch error -> FALLBACK (below).
3. For each returned item, create ONE Capture record
   (`createCapture(itemRawApproximation, source)` then `setCaptureRoute`) so
   the Inbox audit trail shows every item. Use the item title as the capture
   raw when the model does not echo source fragments.
4. Route by kind:
   - task/event: resolve projectName case-insensitively against active
     projects; if matched use `addTaskToProject(titleWithDueText, project)`
     (inherits domainId + orgId), else `addTask(titleWithDueText, { priority, tags, notes? })`.
     titleWithDueText = `title + ' ' + dueText` when dueText present (the NL
     parser in addTask handles the date).
   - food: `createFoodLog({...})` from the new lib (below); detail = total kcal.
   - habit: match routineName case-insensitively against active routines ->
     `toggleRoutineCheck(routine.id, todayISO(), true, 'capture')`; if no
     match, degrade to task. recordId = routine id; undo = toggle back off.
   - journal: `createJournalEntry({ body: title + notes, source: 'text' })`.
   - note/person: `createNote({ title, body: notes ?? title, tags })` from
     `apps/web/src/lib/notes.ts` (exists; check exact signature before use;
     if it differs, adapt).
   - quote: `createQuote`-equivalent from `apps/web/src/lib/quotes.ts` (same
     caveat: read the lib first, it exists for the Library view).
   - Undo closures: task/journal/note/quote/foodLog -> the lib's soft delete
     (`softDeleteTask` for tasks; `softDeleteRecord<T>(table, id)` from
     `lib/records.ts` for others); habit -> `toggleRoutineCheck(id, date, false, 'capture')`.
     Also mark the capture dismissed on undo (`dismissCapture(captureId)`).
5. FALLBACK (AI unreachable): split raw into non-empty lines; each line ->
   `addTask(line)` (NL parse still works); create captures with
   `aiKind: undefined`; return results flagged so the UI can show
   "AI offline - captured as tasks".
6. Update `apps/web/src/lib/capture-client.ts`: `runCapture` becomes a thin
   wrapper over `processBrainDump(raw, source)` returning the first result
   (keeps its callers working). Keep `pushNotification` per item ("Captured:
   {title}"), max 3 notifications per dump to avoid spam.

### 2.3 Data model: FoodLog (new synced entity)

`packages/core/src/types.ts`:

```ts
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export interface FoodItem {
  name: string;
  quantity?: string;
  calories: number;   // kcal
  protein?: number;   // grams
  carbs?: number;
  fat?: number;
}
export interface FoodLog extends SyncMeta {
  /** Local YYYY-MM-DD. */
  date: string;
  mealType: MealType;
  /** What the user actually said/typed. */
  description: string;
  items: FoodItem[];
  totalCalories: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
  source?: CaptureSource;
}
```

Also in types.ts: add `'foodLogs'` to the `SyncTable` union; add `'notepad'`
to `CaptureSource`; add `'food' | 'habit'` to `CaptureKind` (update the
Inbox `KIND_LABEL`/`KIND_ICON` maps in `apps/web/src/app/(app)/inbox/page.tsx`
- they must cover every CaptureKind or it is a type error); widen
`RoutineCheck.source` to `'manual' | 'journal' | 'capture'`.

Touchpoint checklist for the new entity (this exact recipe shipped
`organizations`, verified):
1. `packages/core/src/types.ts` - interface + SyncTable member (above).
2. `packages/core/src/db.ts` - `foodLogs!: EntityTable<FoodLog, 'id'>;` field
   + new `this.version(6).stores({ foodLogs: 'id, date, mealType, updatedAt, deletedAt' });`
   (only new/changed stores go in the new version block).
3. `packages/core/src/sync.ts` - add `FoodLog` to the `Syncable` union.
4. `apps/web/src/lib/sync/mapping.ts` - add `foodLogs: 'food_logs'` to
   `SYNC_TABLES`. That single entry auto-wires outbox push, pull cursors,
   realtime, and backfill (engine iterates DEXIE_TABLES derived from it).
   The items array is jsonb; the mapper is shallow so inner keys stay camel.
5. `supabase/migrations/0006_food_logs.sql` - mirror 0005 exactly:

```sql
create table if not exists food_logs (
  id text primary key,
  user_id uuid not null default auth.uid(),
  date text not null,
  meal_type text not null,
  description text not null,
  items jsonb not null default '[]',
  total_calories integer not null default 0,
  total_protein integer,
  total_carbs integer,
  total_fat integer,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz
);

alter table food_logs enable row level security;

drop policy if exists food_logs_owner on food_logs;
create policy food_logs_owner on food_logs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create index if not exists food_logs_user_updated on food_logs (user_id, updated_at);

do $$
declare t text;
begin
  foreach t in array array['food_logs']
  loop
    execute format('drop trigger if exists %I on %I', t || '_sync_guard', t);
    execute format(
      'create trigger %I before update on %I for each row execute function sync_guard()',
      t || '_sync_guard', t
    );
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception
      when duplicate_object then null;
    end;
  end loop;
end $$;
```

6. `apps/web/src/lib/food-logs.ts` (new) - CRUD over `records.ts` generics:
   `createFoodLog(input)` (computes totals from items; date defaults
   `todayISO()`), `updateFoodLog`, `deleteFoodLog` (softDeleteRecord), plus a
   pure exported `computeFoodTotals(items: FoodItem[])` for tests.
7. `apps/web/src/lib/reset.ts` - `wipeLocalData()` has a HARDCODED table
   array that is currently MISSING `organizations` (latent bug from the org
   rollout). Add BOTH `'organizations'` and `'foodLogs'`.
8. Vitest: `packages/core` has the test setup; put pure logic tests where the
   logic lives (core if the helper is in core, otherwise test the apps/web
   pure functions by keeping them dependency-free and simple).

### 2.4 Notepad page (new): `/notepad`

- Route `apps/web/src/app/(app)/notepad/page.tsx` wrapping a client
  `apps/web/src/components/notepad.tsx` in `ViewShell` (eyebrow "Capture",
  title "Notepad", subtitle about brain dumping).
- Extract the voice logic from `quick-add.tsx` into a reusable hook
  `apps/web/src/lib/use-voice-input.ts`: `useVoiceInput({ onTranscript })` ->
  `{ available, listening, transcribing, toggle }`. Whisper path when
  `whisperEnabled && MediaRecorder && navigator.onLine` else Web Speech; 60s
  max recording (copy the existing constants/behavior EXACTLY; then refactor
  quick-add.tsx to consume the hook so there is one implementation).
- UI: large auto-growing textarea (`.input` styles, min ~6 rows), mic button
  (pulses while listening; transcript APPENDS to the textarea rather than
  auto-submitting - the user may keep talking/typing), Process button +
  Ctrl+Enter, hint row.
- On process: `processBrainDump(text, 'notepad')`; clear textarea; prepend
  results to a session feed (component state; the durable trail is the Inbox).
- Feed rows: kind icon, title, destination chip (project name / "Food - 640
  kcal" / "checked: Morning workout" / Journal / Note / Quote), and per-row
  Undo button that calls `result.undo()` then marks the row struck-through.
  AI-offline dumps show an amber notice row.
- Empty state explains what it does with 3 example lines.
- Navigation: sidebar PLAN group (icon `NotebookPen`, href `/notepad`,
  shortcut `g p`) in `components/sidebar.tsx`; hotkey + prefetch in
  `components/app-shell.tsx` (`g then p`); command palette NAV entry in
  `components/command-palette.tsx`; mobile: see 2.6.

### 2.5 Food page (new): `/food`

- Route `apps/web/src/app/(app)/food/page.tsx` + client component
  `apps/web/src/components/food-view.tsx` in ViewShell (eyebrow "Health",
  title "Food").
- Header stat tiles (reuse the dashboard StatTile pattern): today's Calories,
  Protein, Carbs, Fat (sums over today's logs).
- Quick log input at top: single line + mic (useVoiceInput). Submits through
  `processBrainDump(text, 'text')` BUT with a food bias: simplest robust
  approach - prefix the text sent to the endpoint with
  `"(food log) "` so the model classifies it as food; strip nothing locally.
  Keep it dumb and reliable.
- Day view: logs grouped by mealType in order breakfast/lunch/dinner/snack,
  each row: description, per-item breakdown (name, quantity, kcal), total
  kcal chip, delete (soft) + edit of mealType.
- 7-day trend: simple bar row (div heights, no chart lib) of daily total
  kcal, today highlighted; date navigation (prev/next day, Today button)
  mirroring `month-grid.tsx` nav button styles.
- Live queries filter `!deletedAt`, index on `date`.
- Navigation: sidebar BUILD? No - place in PLAN group right after Week:
  `{ href: '/food', label: 'Food', icon: Utensils }`; palette entry; the org
  switcher does NOT scope Food (food is personal by definition).

### 2.6 Mobile capture upgrade

`apps/web/src/components/quick-add-dialog.tsx` currently calls `addTask(text)`
directly (NO AI - inconsistent with the top bar). Change it to:
- `processBrainDump(text, 'text')` on submit; show a one-line result summary
  ("3 items filed") briefly before close, or just close (keep it fast).
- Add the mic via `useVoiceInput` (transcript appends to the input).
- Add a small "Open Notepad" link at the bottom that routes to `/notepad`
  and closes the dialog.

### 2.7 Existing-bug fixes riding along (in scope, small)

- `capture-client.ts` collapse bug: note/quote/journal now route to their
  real records via the new router (person -> note, event -> dated task).
- `reset.ts` missing `organizations` (add with foodLogs).
- Inbox `KIND_LABEL`/`KIND_ICON`: add food (`Utensils`) and habit (`Repeat`).

## 3. Implementation phases (commit-sized)

Each phase ends: `pnpm --filter @ops-dashboard/web typecheck` (and core test
run when core changed) + eslint on touched files + `git commit`.

1. **C1 core + food data layer**: types.ts (FoodLog, MealType, FoodItem,
   SyncTable, CaptureSource 'notepad', CaptureKind food/habit,
   RoutineCheck.source 'capture'), db.ts v6, core sync.ts, mapping.ts,
   migration 0006, lib/food-logs.ts (+ computeFoodTotals with vitest in
   packages/core if placed there; otherwise a small test), reset.ts fix,
   Inbox kind maps.
   Commit: `feat(capture): FoodLog entity, Dexie v6, sync wiring, migration 0006`
2. **C2 the brain**: /api/braindump route + lib/route-items.ts +
   capture-client.ts delegation. Read `lib/notes.ts` and `lib/quotes.ts`
   signatures FIRST and adapt the router to them.
   Commit: `feat(capture): braindump endpoint + universal client router`
3. **C3 notepad**: use-voice-input.ts hook (refactor quick-add.tsx to use it,
   zero behavior change), notepad.tsx + page, nav/palette/hotkey.
   Commit: `feat(capture): Notepad brain-dump page with voice + undo trail`
4. **C4 food page**: food-view.tsx + page + nav/palette.
   Commit: `feat(food): Food page with daily totals, meals, 7-day trend`
5. **C5 mobile**: quick-add-dialog.tsx upgrade (AI + mic + notepad link).
   Commit: `feat(capture): mobile quick-add goes through the brain + mic`
6. **C6 ship**: STATE.md session-4 entry; update
   `docs/ops-dashboard/apply-0005.md` -> covers 0005 AND 0006 (rename or add
   apply-0006 section; db push applies both); full production build; live
   Playwright E2E; push to main.
   Commit: `docs: session 4 state; runbook covers migrations 0005+0006`

## 4. Verification (do not skip)

- Unit: computeFoodTotals; project/routine name matching helper (make it a
  pure exported function, test case-insensitivity and no-match).
- Typecheck all packages; eslint touched files (expect zero NEW warnings).
- Production build (webpack, NODE_OPTIONS memory bump).
- Live browser E2E on the dev server (Playwright MCP): the AI key is NOT set
  locally, so the FALLBACK path is what you can exercise locally:
  - /notepad: type 3 mixed lines -> Process -> amber "AI offline" notice,
    3 tasks created, undo works, captures appear in /inbox.
  - /food: page renders, manual quick-log falls back to a task (acceptable
    offline behavior - note it in the feed).
  - Mobile viewport (390x844): quick-add dialog has mic + notepad link.
  - 0 console errors throughout.
- AI-path verification happens in PROD after deploy (the Anthropic gateway env
  lives there): dump "call Bryan tomorrow about the RAG prompt, had 2 eggs
  and toast for breakfast, did my morning workout" -> expect a Blue Text task,
  a food log with ~300-400 kcal, and the workout routine checked. Do this
  from the deployed app, signed in.
- Prod data step (Tanay, on the Mac): `git pull && npx supabase db push`
  applies 0005 + 0006 (runbook). Until then food logs sync-retry harmlessly
  (outbox is per-table isolated).

## 5. Key file index (verified 2026-07-01)

- Triage (client path, being superseded): `apps/web/src/app/api/triage/route.ts`
- Watch webhook (duplicate prompt, DO NOT TOUCH this round): `apps/web/src/app/api/capture/route.ts`
- Anthropic client + models: `apps/web/src/lib/server/ai.ts` (MODELS.triage =
  OPS_TRIAGE_MODEL || claude-haiku-4-5); guard: `apps/web/src/lib/server/guard.ts`
- Capture client: `apps/web/src/lib/capture-client.ts`; captures lib:
  `apps/web/src/lib/captures.ts` (createCapture, setCaptureRoute,
  dismissCapture, deleteCapture)
- Generic CRUD (put/patch/softDelete + sync enqueue): `apps/web/src/lib/records.ts`
- Tasks: `apps/web/src/lib/tasks.ts` (addTask NL-parses dates/#tags/!!;
  addTaskToProject inherits domainId+orgId; softDeleteTask)
- Routines: `apps/web/src/lib/routines.ts` (toggleRoutineCheck(routineId,
  date, done, source), todayISO)
- Journal: `apps/web/src/lib/journal.ts` (createJournalEntry); multi-item
  extraction template: `apps/web/src/app/api/journal/extract/route.ts` +
  `apps/web/src/components/journal-upload.tsx`
- Library libs to read before routing note/quote: `apps/web/src/lib/notes.ts`,
  `apps/web/src/lib/quotes.ts`
- Voice: `apps/web/src/lib/transcribe.ts` (whisperEnabled, transcribeBlob),
  `apps/web/src/app/api/transcribe/route.ts`; current mic UI inside
  `apps/web/src/components/quick-add.tsx`
- Inbox (audit trail): `apps/web/src/app/(app)/inbox/page.tsx`
- Shell/nav: `apps/web/src/components/sidebar.tsx`, `top-bar.tsx`,
  `mobile-nav.tsx`, `command-palette.tsx`, `app-shell.tsx` (hotkeys,
  prefetch, one-time boot effects), `view-shell.tsx` (page frame)
- Store: `apps/web/src/lib/app-store.ts` (zustand; quickAddOpen etc.)
- Org context (pattern reference): `packages/core/src/org-context.ts`,
  `apps/web/src/lib/org-store.ts`, `org-lanes.ts`, `organizations.ts`,
  `org-setup.ts`, `apps/web/src/components/org-switcher.tsx`, `org-legend.tsx`
- Dexie schema: `packages/core/src/db.ts` (currently version(5))
- Sync: `apps/web/src/lib/sync/mapping.ts` (SYNC_TABLES - single source),
  `engine.ts` (drainOutbox has per-table failure isolation), `sync-queue.ts`
- Dashboard (StatTile/Segmented patterns to reuse): `apps/web/src/components/dashboard/portfolio-dashboard.tsx`
- Design tokens: `apps/web/src/app/globals.css` (.surface, .surface-flat,
  .input, .kbd, .hairline; oklch vars; font-mono eyebrow pattern:
  `font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground`)

## 6. Out of scope (explicit)

- Watch webhook upgrade to the braindump brain (follow-up).
- Nutrition database lookups (AI estimates only).
- Editing food item macros inline (delete + re-log is fine v1).
- Org-scoping the Food page or Notepad.
- Streaming responses; confirm-first inbox flow.
