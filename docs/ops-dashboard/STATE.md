# Ops Dashboard — State & Handoff

> **Read this FIRST to resume.** Full design: [`./spec.md`](./spec.md).
> Last updated: 2026-06-07 (session 1).

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
- [ ] PWA installability (manifest PNG icons) — deferred to host-time pass.
- [ ] P1 (capture flow + Today + Tasks + Domains/Projects), P2 (Routines + heatmap + journal).

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

## Env (all optional — app runs fully without them; see `.env.local.example`)
`ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `PUSHOVER_TOKEN`, `PUSHOVER_USER`,
(host-later) `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`.

## Next steps (live — keep current)
1. Shared capture flow: `lib/capture-client.ts` (runCapture → /api/triage → route to
   record, chrono fallback) wired into quick-add + command palette + Inbox.
2. Feature pages (parallelizable, disjoint files): Today, Tasks, Routines,
   Habits (react-activity-calendar heatmap + `lib/activity.ts`), Domains+Projects,
   Content, Journal-in-Library.
3. Deferred to a later pass: People CRM + Notes/Quotes/Books types (P4); PWA icons;
   Google Calendar, server push cron, chat-with-data, Wear OS capture (P5).

## Notes / decisions log
- Keep `@drift/*` package scope + Dexie name `drift` (no churn; no user data yet).
  "Ops Dashboard" is display-name only.
- Activity heatmap = **derived** (no stored table). `react-activity-calendar` v3.
- Voice = MediaRecorder→Groq Whisper; AI = Claude Sonnet 4.6; both have local fallbacks.
- Reminders fire client-side (ReminderTicker) now; server cron push at host-time.
