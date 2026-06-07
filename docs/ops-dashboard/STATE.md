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
- [ ] Baseline verify (typecheck/test).
- [ ] **P0** core extension + shell rebrand + capture API + supabase 0002 + env + PWA icons.
- [ ] P1, P2, ...

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
1. Verify baseline green.
2. Extend `@drift/core`: `types.ts` (add Domain, Routine, RoutineCheck, Capture,
   JournalEntry, WorkLog, Content, AppNotification, ChecklistTemplate; extend
   Task/Project/Settings), `db.ts` → `version(2)`, `sync.ts` table union, exports.
3. Add `apps/web/src/lib/<entity>.ts` helpers mirroring `tasks.ts` (put + enqueueOp + version bump).
4. Build features P0 → P1 → P2.

## Notes / decisions log
- Keep `@drift/*` package scope + Dexie name `drift` (no churn; no user data yet).
  "Ops Dashboard" is display-name only.
- Activity heatmap = **derived** (no stored table). `react-activity-calendar` v3.
- Voice = MediaRecorder→Groq Whisper; AI = Claude Sonnet 4.6; both have local fallbacks.
- Reminders fire client-side (ReminderTicker) now; server cron push at host-time.
