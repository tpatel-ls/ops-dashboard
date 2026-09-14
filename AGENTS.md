# Daily maintenance automation

These instructions apply to the scheduled daily improvements routine. Other work
should follow the user's task.

- Use the date in `America/Chicago` and branch
  `automation/daily-improvements-YYYY-MM-DD` from current `origin/main`.
- Check for today's existing open or merged PR before inspecting the codebase. If
  merged, stop immediately. If open, resume that batch instead of creating another.
- Aim for 15 meaningful, small commits per day. Prefer focused maintenance,
  regression tests, accessibility fixes, and documentation. Never create empty or
  artificial changes just to reach the count. Do not backfill missed dates.
- Keep compute low: use one agent, narrow file searches, and a short plan. Avoid
  broad redesigns, repository-wide audits, dependency churn, browser sweeps, or
  subagents unless a concrete failure requires them.
- Use Node.js 22, matching CI. During editing, run only relevant tests and format changed files. Before the
  final push, run `pnpm format:check`, `pnpm lint`, and `pnpm typecheck`. Reuse the
  dependency cache; reinstall only when needed. CI runs the full audit, tests, and
  production build once for the completed batch.
- Push the batch once and open a non-draft PR to `main`. This is authorized daily
  work: no additional human merge approval is needed. The `merge-daily` CI job
  automatically rebases a verified daily batch into `main`, preserving commits.
  Do not squash, force-push `main`, bypass a failure, or run a second agent merely
  to wait for CI. If the PR is still running, report its URL and stop; GitHub owns
  completion from there.
- On an existing failed batch, inspect only the failed step, make the smallest
  correction, and push it for verification. If `main` advanced, update the batch
  against `origin/main` and rerun checks. Report an unresolved failure explicitly.
- Report the PR URL, commit count, and actual state. Opening a PR is not a
  successful merge; only report merged when GitHub confirms it.
