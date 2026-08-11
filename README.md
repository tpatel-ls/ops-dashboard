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

- Node.js 20 or newer
- pnpm 10 or newer

## Getting started

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The development server runs at `http://localhost:3000`.

## Validation

Run the same checks used by CI:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The optional end-to-end command requires a Playwright configuration and test
suite, which are not currently present in this repository.

## Configuration

The app works without a backend in local-first mode. Supabase authentication
and sync, Anthropic-backed AI routes, transcription, and Pushover notifications
are optional. See `docs/ops-dashboard/deploy.md` and the other guides under
`docs/ops-dashboard/` for their environment variables and setup steps.

## Architecture

See `docs/architecture.md` for the workspace layout and `docs/sync.md` for the
current synchronization model.
