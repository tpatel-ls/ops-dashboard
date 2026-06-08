# Ops Dashboard — State & Handoff

> **Read this FIRST to resume.** Full design: [`./spec.md`](./spec.md).
> Multi-device build brief: [`./multi-device-build.md`](./multi-device-build.md).
> Go-live runbook: [`./deploy.md`](./deploy.md) · Watch: [`./watch-capture.md`](./watch-capture.md).
> Last updated: 2026-06-08 (session 2 — realtime sync + auth + PWA, code-complete).

## Session 2 — multi-device realtime sync: **DEPLOYED & LIVE** ✅
- **Production:** https://taskify-three-delta.vercel.app (Vercel project `taskify`,
  Root Directory `apps/web`). Login: `tanaypatel192@gmail.com`.
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
  `ANTHROPIC_BASE_URL=https://jamess-mac-mini.tail7e0fa0.ts.net` (Tailscale Funnel
  → publicly reachable by Vercel), `ANTHROPIC_API_KEY` set, and
  `OPS_TRIAGE_MODEL=claude-haiku-4-5-20251001` (the short alias isn't recognized by
  the proxy; vision=claude-sonnet-4-6, chat=claude-opus-4-8 work as-is). `ai.ts`
  now honors `ANTHROPIC_BASE_URL`. Caveat: depends on the Mac mini being on +
  Funnel running; if it's down, capture falls back to the local date parser.
  No Whisper/audio model on the proxy, so voice still uses the browser Web Speech
  API (fine on phone/tablet). (3) In Supabase Auth, turn OFF "Allow new signups"
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
  recovered **Drift** monorepo (Next.js 16, React 19, Tailwind v4, Dexie, Supabase
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
- [x] Recover Drift from git history; install deps; write spec.
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
- Keep `@drift/*` package scope + Dexie name `drift` (no churn; no user data yet).
  "Ops Dashboard" is display-name only.
- Activity heatmap = **derived** (no stored table). `react-activity-calendar` v3.
- Voice = MediaRecorder→Groq Whisper; AI = Claude Sonnet 4.6; both have local fallbacks.
- Reminders fire client-side (ReminderTicker) now; server cron push at host-time.
