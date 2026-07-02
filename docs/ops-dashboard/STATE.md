# Ops Dashboard — State & Handoff

> **Read this FIRST to resume.** Full design: [`./spec.md`](./spec.md).
> Multi-device build brief: [`./multi-device-build.md`](./multi-device-build.md).
> Go-live runbook: [`./deploy.md`](./deploy.md) · Watch: [`./watch-capture.md`](./watch-capture.md).
> Last updated: 2026-07-01 (session 4 - universal capture: notepad, braindump brain, food logs).

## Session 4 - universal capture: one brain, many mouths (2026-07-01)
- **The brain:** `/api/braindump` parses ANY capture (a line or a whole ramble)
  into N routed items (forced `route_items` tool call on `MODELS.triage`;
  context = active project/routine names + client-local date; caps 8000 chars /
  100 names). Client router `lib/route-items.ts` files each item through the
  sync-aware lib helpers (task / project task via `addTaskToProject` /
  food log / routine check / journal / note / quote), creates one Capture per
  item for the Inbox trail, and returns a per-item undo closure (soft delete or
  un-check + dismiss the capture). AI unreachable -> one task per line, flagged
  `aiOffline`. `runCapture` (top bar, palette) is now a thin wrapper (max 3
  notifications per dump). Rides-along fixes: notes/quotes/journal/person now
  become real records (was: everything collapsed to Task); person -> note,
  event -> dated task.
- **FoodLog entity** (AI-estimated calories + macros): types + Dexie v6
  (`foodLogs: 'id, date, mealType, updatedAt, deletedAt'`) + `Syncable` union +
  `SYNC_TABLES.foodLogs = 'food_logs'` + migration `0006_food_logs.sql`
  (RLS/version-guard/realtime, mirrors 0005). `lib/food-logs.ts` CRUD;
  `computeFoodTotals` + `matchByName` live in core with vitest coverage.
  `wipeLocalData` now clears `organizations` (latent org-rollout bug) and
  `foodLogs`.
- **/notepad** (sidebar PLAN, `g p`, palette entry): big auto-growing textarea
  + mic; the transcript APPENDS instead of auto-submitting. Process
  (Ctrl+Enter) -> session feed rows with kind icon, destination chip (project /
  "Food - N kcal" / "checked: routine" / Journal / Note / Quote) and one-tap
  Undo (row goes struck-through); amber notice row on AI-offline dumps. Voice
  logic extracted to `lib/use-voice-input.ts` (Whisper-preferred, Web Speech
  fallback, 60s cap, hydration-safe `available`); `quick-add.tsx` consumes the
  hook - one implementation, zero top-bar behavior change.
- **/food** (sidebar PLAN after Week, palette entry; intentionally NOT
  org-scoped): selected-day stat tiles (kcal/protein/carbs/fat), meals grouped
  breakfast/lunch/dinner/snacks with per-item breakdown + total-kcal chip +
  soft delete + meal-type select, 7-day kcal bar trend (plain divs; click a bar
  to jump to that day), prev/next/Today nav mirroring the month grid. Quick log
  line pipes through the brain with a `"(food log) "` prefix bias; mic appends;
  AI-offline falls back to a task with an amber notice.
- **Mobile quick-add dialog:** now routes through `processBrainDump` (was raw
  `addTask` - no AI), flashes "N items filed" before closing, mic via the
  shared hook, "Open Notepad" link at the bottom.
- **Verified:** typecheck all packages; 22 core vitest tests; eslint clean on
  every touched file; production webpack build (36 routes incl. `/notepad`,
  `/food`, `/api/braindump`); live Playwright E2E on dev (AI key not set
  locally, so the fallback path is what's exercisable): notepad 3-line dump ->
  amber notice + 3 tasks with NL dates parsed ("tomorrow 2pm", "this weekend"
  -> Sat 4 Jul), undo soft-deletes the task + dismisses the capture, Inbox
  shows all captures "via notepad", /food renders + quick-log fallback notice,
  390x844 quick-add dialog has mic + Notepad link, **0 console errors** across
  the whole session.
- **PENDING external steps (run from the account that owns the prod project;
  runbook `apply-0005.md` covers all three):**
  (0) **DEPLOY - prod is STALE.** Discovered while shipping this session:
  pushes to `main` do NOT auto-deploy. The last GitHub-recorded Vercel
  deployment is from **2026-06-12** (`b0f93d9`), so prod is running
  pre-org-lanes code - sessions 3 AND 4 are not live (`/api/braindump` 404s
  in prod; commit `6e1166b` has no Vercel status). The `taskify` project is
  not visible from the Windows machine: CLI user `tpatel-2911` has no such
  project and the LS Global Group team does not either - it lives on the
  account used for the session-2 go-live (the Mac). Fix from there:
  `git pull && vercel deploy --prod` from the repo root (project Root
  Directory is `apps/web`), and optionally connect the GitHub repo in the
  project's Git settings (production branch `main`) so pushes deploy
  automatically from now on. Note: a stray empty `taskify` project briefly
  created under `tpatel-2911s-projects` during this diagnosis was deleted
  again; the real prod project and domain were never touched.
  (1) Apply migrations **0005 + 0006** to prod (one `db push` applies both) -
  until then food_logs/organizations rows retry harmlessly (per-table outbox
  isolation).
  (2) AI-path E2E in PROD after deploy (the Anthropic gateway env lives
  there): dump "call Bryan tomorrow about the RAG prompt, had 2 eggs and
  toast for breakfast, did my morning workout" -> expect a Blue Text task, a
  ~300-400 kcal food log, and the workout routine checked.
- **Follow-ups (explicitly out of scope this round):** watch webhook
  `/api/capture` still uses the old single-item triage prompt - upgrade it to
  the braindump brain later. Nutrition DB lookups (AI estimates only) and
  inline macro editing (delete + re-log is v1) also deferred.

## Session 3 — org context + portfolio dashboard: code-complete, one prod step pending
- **Portfolio dashboard** at `/dashboard` (now the landing route): per-project
  progress rings, status bars, next actions, filters/sort, needs-attention
  rail, plus a "Load my projects" idempotent importer (Blue Text, Power
  Dialer, Mini Monet, Email Triage).
- **Organizations (work lanes):** new synced `organizations` table + `orgId`
  on projects/tasks (Dexie v5, migration `0005_organizations.sql`). Top-bar
  switcher (All / org / Personal, per-device via localStorage) scopes
  Dashboard, Projects, Tasks, Kanban, Calendar. Week + Month calendars color
  tasks by lane with legend chips that toggle lanes under All. Settings ->
  Organizations manages lanes. Boot setup seeds "LS Global Group"
  (deterministic id `org-ls-global-group` so devices cannot duplicate it) and
  migrates Blue Text / Power Dialer into it.
- **Fast task-to-project:** quick-add project picker (picked -> `addTask`
  direct, skips triage), inline add inputs on project detail + dashboard
  tiles, kanban project-drop and task-drawer project changes carry `orgId`.
  Field clears travel as SQL null (the mapper drops absent keys, so
  undefined never propagates a clear) - systemic fix still open for other
  fields (projectId clear pre-dates this).
- **Outbox hardening:** drainOutbox now isolates failures per table (was
  head-of-line blocking), so an unapplied prod migration cannot wedge sync
  for other tables.
- **PENDING (one manual step): apply `supabase/migrations/0005_organizations.sql`
  to prod project `jnaycounllaafvorakss`** - the CLI on this machine is authed
  to the LSG Supabase account, not the personal one hosting Taskify. Paste the
  file into the Supabase SQL editor (or `supabase link --project-ref
  jnaycounllaafvorakss && supabase db push`). Until then, org rows retry
  harmlessly; everything else syncs.

## Session 2 — multi-device realtime sync: **DEPLOYED & LIVE** ✅
- **Production:** https://taskify-three-delta.vercel.app (Vercel project `taskify`,
  Root Directory `apps/web`). Login: `your-email@example.com`.
- **Supabase:** project `jnaycounllaafvorakss` (Taskify), migrations 0001→0004
  applied, single user created, realtime publication + version-guard live.
- **Verified in production:** login gate works; Settings→Sync shows **Live**; the
  watch webhook `POST /api/capture` ("buy milk tomorrow 5pm", secret-gated) parsed
  + persisted + appeared in the browser **live via realtime** (correct local day
  2026-06-09), and the soft-delete tombstone propagated back. `/api/health`
  returns `{ok:true,db:"up"}`. Env vars set in Vercel (prod/preview/dev).
- **Server secret note:** the new `sb_secret_` key was rejected by this project's
  GoTrue admin + Data API (401), so `SUPABASE_SECRET_KEY` uses the legacy
  `service_role` key (works everywhere; valid until end-2026).
- **Known follow-ups (non-blocking):** (1) `/today` logs React hydration error
  #418 in prod — it's statically prerendered but renders live dates; make the
  date-dependent today views client-only or `export const dynamic='force-dynamic'`.
  (2) **AI is LIVE** via a self-hosted Anthropic-compatible gateway: env
  `ANTHROPIC_BASE_URL=https://<your-proxy-host>.<tailnet>.ts.net` (Tailscale Funnel
  → publicly reachable by Vercel), `ANTHROPIC_API_KEY` set, and
  `OPS_TRIAGE_MODEL=claude-haiku-4-5-20251001` (the short alias isn't recognized by
  the proxy; vision=claude-sonnet-4-6, chat=claude-opus-4-8 work as-is). `ai.ts`
  now honors `ANTHROPIC_BASE_URL`. Caveat: depends on the Mac mini being on +
  Funnel running; if it's down, capture falls back to the local date parser.
  (2b) **Voice transcription is LIVE** via a self-hosted GPU Whisper server on the
  user's GB10 (DGX Spark), exposed over Tailscale Funnel:
  `TRANSCRIBE_BASE_URL=https://<your-whisper-host>.<tailnet>.ts.net/v1`, key-auth, model
  `whisper-1` (large-v3-turbo). `/api/transcribe` proxies audio there; the quick-add
  mic records audio → Whisper when enabled+online, else on-device Web Speech.
  Verified prod: Vercel→GB10 returns accurate text in ~1.7s. Setup brief:
  `gb10-whisper-setup.md`. (3) In Supabase Auth, turn OFF "Allow new signups"
  (hardening; admin-created user already exists). (4) `middleware.ts` works but
  Next 16 deprecates the name in favour of `proxy.ts`.

All code committed on `feat/ops-dashboard`; `pnpm typecheck` + `pnpm build` green,
9 core tests pass, browser smoke = 0 console errors (`/today`, `/login`, `/settings`).
A 6-dimension adversarial review (each finding independently refuted/confirmed)
raised 7, confirmed 6, all fixed: per-table pull cursors (was a global cursor that
could silently drop rows), start/stop generation token (was a re-entrancy leak),
capture `scheduledFor` UTC-midnight off-by-one, and a login `next` open redirect.
- **P1 Auth:** `@supabase/ssr` (2026 publishable/secret keys, `getClaims`) — factories
  in `utils/supabase/{client,server,middleware,admin}.ts`, root `middleware.ts`
  (gates pages, never redirects `/api`, no-op when unconfigured), `/login`
  (signInWithPassword) + `/auth/signout`. Routes moved under `(app)` group so login
  is chrome-free. Migration `0004_sync.sql` = version-guard trigger + realtime
  publication + user_id defaults/RLS on the 0001 tables.
- **P2 Sync engine** (`lib/sync/`): shallow camel↔snake mapper for all 16 tables
  (jsonb inner keys untouched), outbox push (DB trigger enforces pickWinner so a
  stale device can't clobber), pull-since-cursor with strict-newer merge (skips
  echoes), `postgres_changes` realtime → Dexie, one-time backfill on enable,
  online/offline + debounced kick on enqueue. Settings → Sync shows live status +
  sign in/out.
- **P3 Capture persistence:** `/api/capture` now writes the task/journal (+capture
  +notification) to Supabase (admin/secret client for the watch bearer; session
  client in-app) → realtime fans it out. `/api/health` keep-alive. Watch recipe doc.
- **P4 PWA:** Serwist (`@serwist/next`, `app/sw.ts`) precache + `/~offline` +
  preserved notification handlers; built via `next build --webpack` (Serwist off in
  dev). Tablet master–detail (drawer docks beside the list at `lg+`); manifest
  `orientation: any`.
- **P5 Deploy:** `apps/web/vercel.json` daily cron → `/api/health`; runbook in `deploy.md`.

**To go live I need from you:** Supabase project URL + publishable + secret keys,
`npx supabase login` (to push schema + gen types) and `vercel login` (to deploy),
`ANTHROPIC_API_KEY`, and an `OPS_API_SECRET`. See `deploy.md`.

## Snapshot
- **Product:** Ops Dashboard — local-first personal life-OS PWA, built on the
  recovered **Ops Dashboard** monorepo (Next.js 16, React 19, Tailwind v4, Dexie, Supabase
  sync, PWA, cmdk).
- **Branch:** `feat/ops-dashboard`. **PM:** pnpm 10 (corepack). **Node:** 25.
- **Deps installed:** yes. **Baseline (typecheck/test):** verifying.

## Locked decisions
1. Foundation→Core first. 2. Local-first dev, host later (Supabase+Vercel).
3. Pushover notifications. 4. Capture API now, Wear OS capture later.

## Phases (detail in spec §5)
P0 Foundation · P1 Capture+Today+Tasks · P2 Habits+Heatmap+Journal ·
P3 Content · P4 Library/People/Inventory · P5 Integrations/Push-cron/Chat/Search/Watch.

## Status
- [x] Brainstorm + 4 decisions + design-research workflow (`wf_b1308e73-3e2`).
- [x] Recover Ops Dashboard from git history; install deps; write spec.
- [x] Baseline verify (typecheck + tests green).
- [x] **P0** core extension, lib layer, shell rebrand + mobile nav, capture/triage +
  Pushover API, supabase 0002, env example, seed. Committed `dee9109`.
- [x] **Browser-verified** in Playwright: app boots, renders, **0 console errors**.
  Fixed an inherited zustand-selector infinite loop in app-shell (`closeAll`).
- [x] **Security hardening** on API routes (review-flagged): same-origin/secret
  guard, input caps, priority clamp, dropped user-supplied push `url`, no error reflection.
- [x] **P1 + P2 features** built (8 parallel agents) + integrated + browser-verified:
  capture+Inbox, Today (top-three/open/routines/slipping/resurfacing/notifications),
  Tasks (filter→edit drawer), Routines (streaks/groups), Habits (heatmap + stats),
  Domains, Projects/Areas/Retainers (milestones/checklists/worklogs/slipping), Content
  pipeline, Library journal + AI journal-upload. Commits `a912540`, `32cac33`.
- [x] Browser-verified all 9 new routes: **0 console errors each**; full seed renders
  (NL-parsed task dates, priority, domain/project chips, 12-day streak, heatmap, 1.5h logged).
- [x] Fixed: `order` not indexed (broke all task creation) → Dexie v3; mic-button hydration.
- [x] Adversarial code review (3 reviewers) → fixed timezone-local dates (streaks/
  heatmap/journal), reminder boolean-index query, capture aiKind preservation,
  overdue local date, streak label. Re-verified Habits (streak 12, journal counted,
  0 errors). Commit `0a4458c`.
- [x] Production build: 24 routes compile, TS + lint clean.
- [x] **P4/P5 local features** (8 more agents + integration): People CRM (facts/
  interactions), Library tabs (Notes/Quotes/Books beside Journal), enriched task
  edit-drawer (domain/project/content/star/reminders/recurrence), chat-with-data
  (`/ask` + `/api/chat`), Wear OS capture webhook (`/api/capture`, secret-gated),
  **PWA install icons** + typed manifest, polished Calendar/Week/Month/Kanban.
  Browser-verified; production build (28 routes) clean. Commits `c…` (P4 core) + this batch.
- [ ] **Needs your accounts/keys (not buildable by me alone):** hosting (Supabase +
  Vercel for true multi-device sync across S24 Ultra/Tab/Watch); live AI
  (`ANTHROPIC_API_KEY` for triage/journal/chat, `GROQ_API_KEY` voice, Pushover push) —
  code is in place with fallbacks, just unconfigured; Google Calendar; the physical
  Wear OS shortcut that hits `/api/capture`.

## Security posture
API routes (`/api/triage`, `/api/push`) use `lib/server/guard.ts`: same-origin
browser calls allowed; server-to-server needs `OPS_API_SECRET`; at host-time also
behind Supabase auth middleware. Inputs capped; push `url` not user-controllable.

## How to resume
1. Read this + `spec.md`. 2. `git log --oneline feat/ops-dashboard`.
3. Jump to **Next steps**. 4. `pnpm install` if needed, then `pnpm dev`.

## Commands
- Dev server: `pnpm dev` → http://localhost:3000 (redirects to `/today`).
- Checks: `pnpm typecheck` · `pnpm test` · `pnpm build`.

## Env (app runs fully local without them; sync/auth need the Supabase trio)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`),
`SUPABASE_SECRET_KEY` (`sb_secret_…`, server-only). Optional: `OPS_USER_ID`,
`OPS_API_SECRET` (watch + cron), `CRON_SECRET`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`,
`PUSHOVER_TOKEN`, `PUSHOVER_USER`. See `apps/web/.env.local.example`.

## Next steps (live — keep current)
1. **Go live (needs your accounts):** follow `deploy.md` — create Supabase project,
   `supabase db push` (0001→0004), create the single user (signups off), set env,
   `vercel link`/deploy, Auth URL config, set the cron `CRON_SECRET`.
2. **Verify multi-device:** sign in on S24 Ultra + Tab S10 Ultra, install PWA,
   create on one → appears on the other ~2s; test offline→online drain.
3. **Wire the watch:** `watch-capture.md` (Tasker/HTTP-Shortcuts) + the test curl.
4. Optional polish: true inline two-pane (currently the detail docks over the list
   right edge at lg+); per-table pull pagination if a table ever exceeds 1000
   changed rows in one catch-up.

## Notes / decisions log
- Keep `@ops-dashboard/*` package scope + Dexie name `ops-dashboard` (no churn; no user data yet).
  "Ops Dashboard" is display-name only.
- Activity heatmap = **derived** (no stored table). `react-activity-calendar` v3.
- Voice = MediaRecorder→Groq Whisper; AI = Claude Sonnet 4.6; both have local fallbacks.
- Reminders fire client-side (ReminderTicker) now; server cron push at host-time.
