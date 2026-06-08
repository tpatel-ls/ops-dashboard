# Ops Dashboard — Multi-Device + Realtime Sync Build

**Paste this entire file as the prompt in a fresh Claude Code session.** It is a
complete, standalone execution brief. Work autonomously and end-to-end; don't
re-ask decisions that are already locked below. `ultracode` — use Workflow
orchestration for parallelizable work. Keep `pnpm typecheck` / `pnpm build` green
and commit at each phase. Checkpoint progress to `docs/ops-dashboard/STATE.md`.

---

## Mission

Make any capture — a task, note, or journal entry logged on **any** device,
including a tap on the **Galaxy Watch 7 Ultra** — appear on **every** device's
dashboard, **live**. Free stack: **Supabase free cloud** (Postgres + Auth +
Realtime) + **Vercel free** hosting. Target devices: **Samsung Galaxy S24 Ultra**
(phone), **Galaxy Tab S10 Ultra** (tablet), **Galaxy Watch 7 Ultra** (Wear OS).

Acceptance: I log "buy milk tomorrow 5pm" from my watch → within ~2s it shows on
the phone and tablet dashboards, correctly parsed, and is there next time I open
the app anywhere.

---

## Read first (existing project context)

- Repo: `/Users/tanaypatel/Desktop/taskify`. Branch: `feat/ops-dashboard`.
- It's a **local-first PWA "Ops Dashboard"** — Next.js 16 App Router, React 19,
  Tailwind v4, Dexie (IndexedDB), pnpm monorepo (`@drift/core`, `@drift/ui`, app at
  `apps/web`). Run: `pnpm install` then `pnpm dev` (→ http://localhost:3000).
- **Read these before doing anything:** `docs/ops-dashboard/spec.md` (full design,
  data model, conventions, and the verified 2026 Supabase↔Next research) and
  `docs/ops-dashboard/STATE.md` (current status + how to resume). Follow the
  existing design tokens and `src/lib` data-layer patterns exactly.

### Current state (do NOT rebuild these)
- P0–P5 **local features are built + browser-verified**: capture + AI triage,
  Today, Tasks, Routines + streaks, Habits heatmap, Projects/Areas/Retainers,
  Content, People CRM, Library (Journal/Notes/Quotes/Books), Domains, chat (`/ask`),
  enriched task edit-drawer, PWA icons + `app/manifest.ts`. Demo seed is removed
  (`lib/reset.ts` one-time wipe); the dashboard starts empty.
- **Data layer:** every entity has `id, createdAt, updatedAt, version, deviceId,
  deletedAt`. Mutations go through `apps/web/src/lib/*` (and `lib/records.ts`) which
  write Dexie + enqueue a `SyncOp` to the outbox.
- **Sync is SCAFFOLDED BUT OFF:** `apps/web/src/lib/sync-queue.ts` (outbox),
  `packages/core/src/sync.ts` (`pickWinner` version-then-updatedAt merge,
  `SyncEnvelope`), `apps/web/src/lib/sync-worker-client.ts`,
  `apps/web/src/lib/supabase.ts`. `Settings.syncEnabled` defaults `false`. There is
  **no live backend wired, no pull, no realtime, no auth.**
- **`/api/capture`** triages-and-returns only (does NOT persist). `/api/triage`,
  `/api/chat`, `/api/journal/extract`, `/api/push` exist and degrade without keys.
  Server helpers: `lib/server/{ai,pushover,guard}.ts` (`requestAllowed`,
  `getAnthropic`, `MODELS`).
- **Supabase migrations exist, not applied:** `supabase/migrations/0001_init.sql`
  (tasks/projects/whiteboards), `0002_ops.sql` (ops entities), `0003_library.sql`
  (people/notes/quotes/books). All use RLS `((select auth.uid()) = user_id)`.

---

## Locked architecture decisions (do not re-litigate)

1. **Backend:** Supabase **free cloud** — Postgres + Auth + **Realtime**.
2. **Hosting:** **Vercel free** (public HTTPS, reachable by all devices anywhere).
   *(Tailscale is an optional private-only alternative — skip unless I ask.)*
3. **Sync:** bidirectional, **single-user**, **Supabase Realtime** for instant
   cross-device updates. Offline-first: Dexie stays the local cache/source of truth
   offline; the outbox drains when online; inbound merges via `pickWinner`. Soft
   deletes are tombstones (`deletedAt`).
4. **Auth:** single-user **Supabase Auth** (email/password), **public signups
   disabled**, the one user created in the dashboard. Use **`@supabase/ssr`** with
   the **2026 patterns** (already researched in `spec.md`): `getAll/setAll` cookie
   interface, `getClaims()` in middleware (never `getSession()` server-side), new
   **publishable**/**secret** API keys (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` /
   `SUPABASE_SECRET_KEY`), never expose the secret key client-side.
5. **Capture persistence:** `/api/capture` and in-app capture must **write through
   to Supabase** so they propagate; Dexie remains the offline mirror.
6. **Keep-alive:** a **Vercel Cron** hits a `/api/health` endpoint daily that does a
   trivial Supabase query, so the free project never pauses (7-day inactivity rule).
7. **PWA:** migrate the hand-rolled `public/sw.js` to **Serwist (`@serwist/next`)**
   for a real offline shell + installability (see spec research); keep notifications.

---

## What I (the user) will provide — ask me for these when you reach the step

- **Supabase:** I'll create a free project; I'll paste the **Project URL**,
  **publishable key** (`sb_publishable_…`), and **secret key** (`sb_secret_…`).
  (Or guide me through `npx supabase login` + `link` if you prefer CLI.)
- **Vercel:** I'll run `vercel login` when you're ready to deploy.
- **`ANTHROPIC_API_KEY`** (AI triage/journal/chat). Optional: **`GROQ_API_KEY`**
  (better voice), **`PUSHOVER_TOKEN`/`PUSHOVER_USER`** (push to phone+watch).
- **`OPS_API_SECRET`:** pick/generate one random string (for the watch webhook).
- For the watch: my Google account is on the watch+phone; I can install **Tasker**
  or **HTTP Shortcuts** if needed.

Collect these with `AskUserQuestion` or a clear inline request; don't block other
work waiting on them — build the code first, wire keys when I provide them.

---

## Execution plan

> Commit after each phase. Use workflows where steps are parallelizable. After each
> phase, verify (`pnpm typecheck`, and `pnpm build` before declaring done; Playwright
> for UI). Update `STATE.md`.

### Phase 1 — Supabase project, schema, single-user auth
- Have me create the free Supabase project; capture URL + keys into
  `apps/web/.env.local` (gitignored) and later Vercel env.
- Install/init CLI as devDep (`npx supabase`); `supabase link`; **`supabase db
  push`** to apply migrations 0001→0003 to the hosted DB. Generate types:
  `supabase gen types typescript --linked > apps/web/src/lib/database.types.ts`.
- Auth: enable email/password, **disable public signups**, create my single user in
  the dashboard. Build `/login` (server action `signInWithPassword`) + `/auth/signout`.
- `@supabase/ssr` factories: `utils/supabase/{client,server,middleware}.ts` +
  root `middleware.ts` calling `updateSession` → `getClaims()` (matcher excludes
  static assets; **include `/api`**). Protect the app + API behind the session.
- **Acceptance:** can log in as the one user; unauthenticated requests redirect; RLS
  blocks cross-user rows.

### Phase 2 — Bidirectional realtime sync engine
- **Column mapping:** write a camelCase(TS)↔snake_case(DB) mapper per table (the DB
  uses snake_case; the app uses camelCase). Centralize it.
- **Push (outbound):** wire the existing outbox/worker to upsert local `SyncOp`s to
  Supabase with `user_id = auth.uid()`, version-aware (don't clobber newer remote —
  use `pickWinner` semantics). Drain on reconnect.
- **Pull (inbound):** on boot, fetch rows changed since a stored cursor
  (`updated_at`), merge into Dexie via `pickWinner`, advance cursor.
- **Realtime:** subscribe to `postgres_changes` on every synced table; on event,
  upsert/tombstone into Dexie. `useLiveQuery` is already reactive, so dashboards
  update live. Debounce/batch as needed.
- Turn on `syncEnabled` (and a Settings toggle + status indicator). Handle offline
  gracefully (queue locally, sync later).
- **Acceptance:** create a task on device A → it appears on device B within ~2s
  without reload; edit/delete propagate; works after going offline→online.

### Phase 3 — Capture persistence + the watch flow
- `/api/capture`: after triage, **persist** the resulting task/journal row to
  Supabase under the user (so realtime propagates it everywhere). Keep it
  secret-gated (`OPS_API_SECRET`) for the watch; also accept an authenticated
  in-app session. Return the created record.
- In-app `runCapture`: ensure it flows through the sync layer (Dexie + outbox →
  Supabase), so phone/tablet/desktop captures also propagate.
- **Watch shortcut** (deliver the recipe to me — see the dedicated section below).
- Pushover: send on reminders + a daily summary; it bridges phone→watch.
- **Acceptance:** a `POST /api/capture` with the secret + `{raw:"..."}` creates a
  task that shows up live on all signed-in devices.

### Phase 4 — PWA on the three devices (Serwist + responsive)
- Replace `public/sw.js` with **Serwist** (`@serwist/next`, `app/sw.ts`): precache
  app shell, offline fallback route, keep the notification handlers. Verify install
  only via `next build && next start` or the Vercel build (SW doesn't run in dev).
- Confirm `app/manifest.ts` + the existing 192/512/maskable icons satisfy Android
  "Add to Home Screen".
- Responsive: phone = bottom nav + single column; **Tab S10 Ultra** (≈1480 CSS px
  landscape) = persistent sidebar + two-pane master–detail. Use `dvh` +
  `env(safe-area-inset-*)`, `viewport-fit=cover` (S24 Ultra punch-hole/gesture bar).
- **Acceptance:** installs to home screen on S24 Ultra and Tab S10 Ultra over the
  Vercel HTTPS URL; works offline (cached shell + Dexie); mic works (HTTPS).

### Phase 5 — Deploy to Vercel + keep-alive
- `vercel link` + deploy. Set env vars in Vercel (Supabase URL/publishable/secret,
  `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `PUSHOVER_*`, `OPS_API_SECRET`). Add the
  Vercel domain to Supabase Auth → URL Configuration (Site URL + Redirect URLs).
- Add **`/api/health`** (trivial authenticated Supabase query) + a **Vercel Cron**
  (`vercel.json`) hitting it daily → free project never pauses.
- **Acceptance:** the production URL loads on all devices, signed in, syncing live.

### Phase 6 — AI live + full end-to-end verification
- With `ANTHROPIC_API_KEY` set, verify triage, journal **photo** OCR (`/api/journal/
  extract`), and chat (`/ask`) actually run.
- Run the full acceptance test (watch → all devices), `pnpm typecheck`, `pnpm build`,
  and a Playwright pass. Update `STATE.md` + commit.

---

## Per-device build checklist (must all pass)

**Galaxy S24 Ultra (phone)**
- [ ] PWA installed to home screen (Vercel HTTPS), standalone, safe-area correct.
- [ ] Capture: text + voice (Web Speech, or Groq if key) + ⌘/quick-add; mic works (HTTPS).
- [ ] Realtime sync in/out; offline then online drains.
- [ ] Pushover reminders + daily summary arrive.
- [ ] Bottom-nav responsive layout.

**Galaxy Tab S10 Ultra (tablet)**
- [ ] PWA installed; **two-pane** layout at tablet width (sidebar + list + detail).
- [ ] Realtime sync with phone (create on phone → appears here live).

**Galaxy Watch 7 Ultra (Wear OS)**
- [ ] One-tap shortcut → speak → task is created and appears on phone+tablet live
      (via paired-phone → `/api/capture`). Document the exact recipe (below).
- [ ] Pushover notifications mirror to the watch (phone-bridged).
- [ ] Clearly note the standalone-LTE limitation (needs the phone in range; there
      is no Tailscale/PWA on Wear OS).

---

## The watch shortcut recipe (write this up for me, both options)

The watch can't run the PWA; it triggers the **paired S24 Ultra**, which makes the
authenticated HTTP call. Provide step-by-step for **both**:

1. **Google Assistant routine** (simplest): "Hey Google, log to dashboard" →
   routine captures the spoken text → sends it. If Assistant routines can't POST
   raw, fall back to option 2.
2. **Tasker (or HTTP Shortcuts) + Wear Tile/AutoWear**: a watch tile/button →
   Tasker task on the phone → "Get Voice" → HTTP Request `POST
   https://<vercel-app>/api/capture`, header `Authorization: Bearer <OPS_API_SECRET>`,
   body `{"raw":"%voice"}`. Include exact field values and a test curl.

Provide a copy-pasteable `curl` so I can verify the endpoint before wiring the watch.

---

## Guardrails / conventions

- Read `spec.md` + `STATE.md` first; match the warm-amber design tokens + utility
  classes; keep `@drift/*` scope; colocate small files.
- Use the **2026 Supabase SSR patterns** exactly (getAll/setAll, getClaims,
  publishable/secret keys) — they're documented in `spec.md`; do not copy older
  tutorials. RLS `((select auth.uid()) = user_id)` on every table. Never put the
  secret key in a `NEXT_PUBLIC_` var.
- All server routes keep degrading gracefully without keys; never reflect raw error
  messages; keep the `requestAllowed` guard on `/api/*`.
- Single user — keep auth minimal; disable public signups.
- Commit per phase with clear messages; run an adversarial code-review workflow
  before declaring done (watch for: Dexie `.orderBy/.where` on unindexed keys,
  boolean-indexed queries, UTC-vs-local date bucketing, unawaited promises).
- Verify with `pnpm typecheck`, `pnpm build`, and Playwright; don't claim done
  without running them.

## Definition of done

- Log a capture on the **watch** → appears on **phone + tablet** within ~2s, parsed
  correctly, and persists across reloads on all three.
- Create/edit/delete on any device propagates live to the others; offline edits sync
  on reconnect.
- App is installed as a PWA on the S24 Ultra and Tab S10 Ultra from the Vercel URL.
- Supabase free project stays awake (cron keep-alive); AI features work with the key.
- `typecheck` + `build` green; `STATE.md` updated; everything committed on
  `feat/ops-dashboard` (open a PR if I ask).
