# Ops Dashboard — Design Spec

> Personal life operating-system PWA. Inspired by Jared Hill's Claude-Code-built
> "Ops Dashboard" (source transcript: `~/Downloads/Jerad Ops Dashboard Project.txt`).
> Owner: Tanay (your-email@example.com). Created 2026-06-07.

This spec is the build anchor. If context resets, read this + `STATE.md` to resume.

---

## 1. Goal

One frictionless tool that ties together every area of life: capture → triage →
tasks, routines/habits, projects, content, people, library, and a "chat with your
data" layer. Friction of capture is the enemy; the system must get out of the way.

### Target devices (all Samsung / Android / Wear OS)
- **Galaxy S24 Ultra** (phone) — primary capture surface; PWA installed to home screen.
- **Galaxy Tab S10 Ultra** (tablet) — two-pane layouts at ≥lg.
- **Galaxy Watch 7 Ultra** (Wear OS) — capture via API later; notifications via
  Pushover phone→watch bridging (no native watch app needed).

### Tanay's three deltas vs Jared's build
1. Runs on Samsung/Android/Wear OS (not Apple).
2. Habits get a **GitHub-style activity heatmap across all activity types**.
3. **Journal upload** (text or photo) → AI extracts insights and **marks habits**.

---

## 2. Locked decisions (2026-06-07)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Scope order | Foundation (P0) → Core (P1) first, then layer the rest |
| 2 | Hosting | **Local-first dev, host later.** Runs fully on-device (Dexie/IndexedDB); deploy to Supabase + Vercel with minimal change |
| 3 | Notifications | **Pushover** (server POST to api.pushover.net; reaches watch via phone bridging) |
| 4 | Watch capture | Design the capture **API** now; phone/tablet/desktop capture in v1; Wear OS path later |

### Auto-decided defaults (changeable)
- **Foundation:** Build on the recovered **Ops Dashboard** monorepo (Next.js 16 App Router,
  React 19, Tailwind v4, Dexie local-first, Supabase sync, PWA, cmdk palette). This
  matches the recommended stack and runs with zero external accounts.
- **AI:** Anthropic Claude. `claude-sonnet-4-6` for triage/journal; `claude-opus-4-8`
  for heavy reasoning/chat; `claude-haiku-4-5` for cheap tasks. Graceful local
  fallback (chrono parser) when `ANTHROPIC_API_KEY` is absent.
- **Voice:** MediaRecorder → `/api/transcribe` → Groq `whisper-large-v3-turbo`
  (OpenAI-compatible SDK). Fallback: Web Speech API. Cap ~90s. Review before save.
- **Heatmap:** `react-activity-calendar@^3` fed by a pure aggregation over derived
  activity (no redundant table). `Activity = {date, count, level}`, dense gap-filled.
- **Product name:** "Ops Dashboard" (display only). Internal package scope stays
  `@ops-dashboard/*` to avoid import churn. Dexie DB name stays `ops-dashboard` (no user data yet).

---

## 3. Architecture (inherited + extended)

pnpm monorepo:
- `@ops-dashboard/core` — data shapes, Dexie schema, ULID/device-id, NL parser, recurrence,
  sync helpers. Pure TS (runs in tests/browser/worker). **We extend this heavily.**
- `@ops-dashboard/ui` — `cn` + design tokens.
- `@ops-dashboard/whiteboard` — tldraw wrapper (kept, low priority).
- `apps/web` — Next.js app. `src/app` routes, `src/components` UI, `src/lib` thin
  data layer wrapping `@ops-dashboard/core`.

**Data flow:** `UI → src/lib → Dexie`. Each mutation also `enqueueOp()` to the
`syncOps` outbox; when sync is enabled a Web Worker drains it to Supabase.
Every record carries `id (ULID), createdAt, updatedAt, version, deviceId, deletedAt`.
Conflict resolution: `pickWinner` = higher version, then newer `updatedAt`.

**Server (Next route handlers, host-later but runnable locally):**
`/api/triage` (Claude), `/api/transcribe` (Groq), `/api/journal/extract` (Claude
vision), `/api/push` (Pushover), `/api/chat` (Claude over user data). All read keys
from env and **degrade gracefully** when keys are missing.

**Design system:** Tailwind v4, OKLCH CSS-variable tokens ("warm paper, burnt-amber
accent"), `.dark` class via next-themes. Utilities: `.surface`, `.surface-flat`,
`.input`, `.kbd`, `.hairline`, `.dot-grid`, `.live-dot`, `.scrollbar-thin`.
Responsive on **width** (not UA): phone `<lg` single column + bottom nav/drawer;
tablet `≥lg/xl` persistent sidebar + master–detail. Use `dvh` + `env(safe-area-*)`.

---

## 4. Data model

Base fields on every entity: `id, createdAt, updatedAt, version, deviceId, deletedAt`.

**Existing (extend):**
- `Task` — add `domainId?`, `contentId?`, `starred?` (Today top-3). Keep status,
  priority, scheduling, tags, projectId, parentId, recurrence, reminders, checklist.
- `Project` — add `domainId?`, `kind: 'project'|'area'|'retainer'`,
  `status: 'active'|'paused'|'done'|'archived'`, `description?`, `startDate?`,
  `dueDate?`, `lastWorkedAt?` (slipping), `milestones: Milestone[]`,
  `checklists: NamedChecklist[]`, `retainerResetDay?` (1–28, monthly reload).
- `Settings` — add `pushoverConfigured`, `aiEnabled`, capture defaults, timezone.

**New:**
- `Domain` — `name, color, icon?, description?, order`. Top of the hierarchy.
- `Milestone` (embedded) — `id, title, done, dueDate?`.
- `NamedChecklist` (embedded) — `id, name, items: ChecklistItem[]`.
- `ChecklistTemplate` — `name, kind, items: string[]` (reusable, e.g. new-website).
- `WorkLog` — `projectId, minutes, note?, at`. Time tracking + feeds heatmap.
- `Capture` — `raw, source: 'text'|'voice'|'watch'|'journal', status:
  'pending'|'triaged'|'dismissed', routedTo?: {type,id}, aiSummary?`. Raw inbox item.
- `Routine` (habit) — `name, description?, timeOfDay:
  'morning'|'afternoon'|'evening'|'anytime', specificTime?, notify, domainId?,
  kind: 'ongoing'|'fixed', durationDays?, startDate, endDate?, order, archivedAt?`.
- `RoutineCheck` — `routineId, date (YYYY-MM-DD), done, completedAt?`. Streaks + heatmap.
- `JournalEntry` — `date, body, mediaUrls[], mood?, tags[], source?`. Needed for upload.
- `AppNotification` — `title, body?, kind, refId?, readAt?`. In-app feed.
- `Content` (model now, UI P3) — `title, type, status, channel?, domainId?, url?,
  outline?, publishDate?, order`.
- `Person` / `Note` / `Quote` / `Book` / `InventoryItem` (model later, P4–P5).

**Activity aggregation (heatmap):** pure function reads completed tasks
(`completedAt`), routine checks (`done`), work logs (`at`), journal entries
(`date`), captures; buckets per local-day into `{date, count, level}` with
configurable per-type `WEIGHTS`. No stored activity table (avoids dual-write drift).

**Dexie:** bump schema to `version(2)` with new stores + indexes
(`tasks: ...,domainId,starred`; `routines`, `routineChecks: id,routineId,date`,
`domains`, `captures: id,status,createdAt`, `workLogs`, `journalEntries`,
`notifications`, `content`, `checklistTemplates`). Extend `SyncOp.table` union.

**Supabase:** new migration `0002_ops.sql` mirrors all new tables with RLS
`((select auth.uid()) = user_id)`. Written now, applied at host-time.

---

## 5. Feature breakdown by phase

### P0 — Foundation
- Recover Ops Dashboard (done), install, baseline runs.
- Extend `@ops-dashboard/core` types + Dexie v2 + sync union + lib helpers for every new
  entity (domains, routines, captures, journal, worklogs, content, notifications).
- Rebrand shell to "Ops Dashboard"; restructure sidebar into Jared's sections
  (Today, Capture/Inbox, Tasks, Routines, Projects, Content, People, Library,
  Domains, Settings). Responsive bottom nav for phone.
- Capture API contract + `/api/triage` (+ local fallback). Pushover server util.
- Seed helper for sample domains/projects/routines (dev only).
- Supabase `0002_ops.sql`. `.env.local.example`. Fix PWA manifest icons + Serwist
  (or keep manual SW for now; manifest icons are the must-fix for installability).

### P1 — Capture + Today + Tasks
- **Capture:** quick-add upgraded to capture-and-triage; voice button
  (MediaRecorder→/api/transcribe, Web Speech fallback); Cmd/Ctrl+K palette capture;
  capture → AI triage → routed record + notification; **Inbox** = recent captures
  with "where it went," editable/re-route.
- **Today:** top-3 starred tasks (star to promote), open tasks by due date,
  **Slipping** (projects/tasks untouched > N days), **Routine checklist**
  (morning/afternoon/evening) + streak chips, **Resurfacing** (daily quote/journal),
  **Review queue** (flagged items), **Notifications** feed.
- **Tasks:** list with sort (open/done/all) + filter (domain/project/area),
  edit drawer (priority, due, reminders, recurring, links), reminders → Pushover.
- **Domains + Projects/Areas/Retainers** manager: milestones, checklists +
  templates, work-log/time tracking, retainer monthly auto-reload.

### P2 — Habits + Heatmap + Journal (Tanay's emphasis)
- **Routines/Habits:** CRUD, check-off, streaks, ongoing vs fixed (e.g. 30-day),
  archived/completed streaks, per-day bar/summary.
- **GitHub-style heatmap** across all activity types, with per-type weighting and a
  day-detail drawer; lives on a Habits/Activity page and on Today.
- **Journal upload:** paste text or upload a photo of a handwritten page →
  `/api/journal/extract` (Claude vision) → creates a JournalEntry AND detects which
  habits were done → marks `RoutineCheck`s for the day (with user confirm).
- **Pushover** reminders + daily summary (client ticker now; server cron at host-time).

### P3–P5 (outline)
- P3 Content pipeline (kanban) + retainer polish.
- P4 Library (notes/quotes/journal/books+Kindle highlights) + People CRM + Inventory.
- P5 Google Calendar, server push cron, global search (fuse.js exists), chat-with-data,
  Wear OS capture path.

---

## 6. Environment variables (all optional; app runs without them)
```
ANTHROPIC_API_KEY=      # AI triage, journal extraction, chat
GROQ_API_KEY=           # voice transcription (whisper-large-v3-turbo)
PUSHOVER_TOKEN=         # push app token
PUSHOVER_USER=          # push user key
# host-later:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

## 7. Key conventions to follow
- New entity → add type, add to Dexie `version(2)`, add `src/lib/<entity>.ts` with
  `add/update/softDelete` that also `enqueueOp`, bump `version`, set `updatedAt`.
- Use `getDb()`, `newId()` (ULID), `getDeviceId()`, `enqueueOp()` from `@ops-dashboard/core`.
- UI state (modals/drawers) in `useAppStore` (zustand). Live queries via
  `dexie-react-hooks` `useLiveQuery`.
- Style with existing tokens/utilities only; never hardcode colors. Match the
  "warm paper / burnt amber" aesthetic. Colocate vitest tests.
- Server routes degrade gracefully without keys; never expose secrets client-side.

## 8. Verification
- `pnpm typecheck`, `pnpm test`, `pnpm build` stay green at each milestone.
- Smoke-test in browser (dev) for each view; production `build && start` to verify
  PWA installability (SW/precache don't run in `next dev`).
