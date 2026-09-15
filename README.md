# Ops Dashboard

Ops Dashboard is a local-first personal operations app for tasks, projects,
routines, captures, journals, food logs, people, notes, books, quotes, and
whiteboards. The web app is a Next.js PWA with optional Supabase sync and
server-side AI features.

## Workspace

```text
apps/web              Next.js 16 App Router, React 19, Tailwind v4
packages/core         shared types, Dexie schema, dates, recurrence, parsing
packages/ui           shared class-name utilities
packages/whiteboard   tldraw canvas wrapper
packages/tsconfig     shared TypeScript configurations
supabase/             SQL migrations and seed data
docs/                 architecture, sync, deployment, and device guides
```

## Requirements

- Node.js 22 or newer
- pnpm 10 or newer

If your environment does not provide `pnpm` globally, the repo works with
Corepack-compatible installs:

```sh
corepack enable
corepack pnpm --version
```

## Getting started

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

The development server runs at `http://localhost:3000`.

## Validation

CI runs the dependency audit and then one combined verification script, so the
fastest way to match it locally is:

```sh
corepack pnpm audit:high
corepack pnpm ci:local
```

`ci:local` chains the individual checks, which can also be run on their own
while iterating:

```sh
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

The Playwright smoke suite is not part of CI. Run it locally when a change
touches app boot, routing, or capture:

```sh
corepack pnpm --filter @ops-dashboard/web exec playwright install chromium
corepack pnpm test:e2e
```

The Chromium install only needs to run once per machine.

## Configuration

The app works without a backend in local-first mode. Supabase authentication
and sync, Anthropic-backed AI routes, transcription, and Pushover notifications
are optional. See `docs/ops-dashboard/deploy.md` and the other guides under
`docs/ops-dashboard/` for their environment variables and setup steps.

## Architecture

See `docs/architecture.md` for the workspace layout and `docs/sync.md` for the
current synchronization model.
