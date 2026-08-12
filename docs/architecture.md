# Architecture

Ops Dashboard is a pnpm monorepo. The web app is a Next.js 16 App Router project that
talks to IndexedDB through Dexie. Optional Supabase sync runs in the browser and is
enabled automatically for an authenticated session, with a device-local off switch.

## Packages

- `@ops-dashboard/core` owns the data shapes, the Dexie schema, the ULID and device
  id helpers, and the natural language quick-add parser. Pure TypeScript so
  it can run in tests, the browser, and server-side route code.
- `@ops-dashboard/ui` keeps the `cn` helper and the design tokens that any
  framework-agnostic UI ships with.
- `@ops-dashboard/whiteboard` owns the pen pointer helpers, palm rejection, and the
  tldraw canvas wrapper.
- `@ops-dashboard/tsconfig` is the shared TS config base that every package extends.

## App layers

```
apps/web
  src/app                 routes per view (today, week, month, kanban, etc.)
  src/app/api             guarded AI, capture, health, push, and transcription APIs
  src/components          presentation layer
  src/lib                 thin data layer that wraps @ops-dashboard/core for the UI
  src/lib/sync            outbox drain, pull cursors, conflicts, and realtime sync
```

Mutations flow `UI -> lib -> Dexie`. When sync is enabled, the lib layer also
enqueues a `SyncOp` row. The in-page sync engine coalesces local kicks, drains the
outbox, performs paginated catch-up pulls, and listens for Supabase Realtime rows.
Dexie remains the immediate source of truth, so network failures do not block local
work.

## Routing

The root app route opens the work dashboard. Each first-class view has its own folder
under `apps/web/src/app`. The proxy refreshes Supabase sessions and gates page
navigations when Supabase is configured. API routes keep JSON semantics and apply
their own same-origin or bearer-secret guards.

## Theming

The local `ThemeProvider` resolves light, dark, or system preference and toggles the
`.dark` class on `<html>`. A small boot script applies the stored preference before
React hydrates. Tailwind v4 reads the matching custom variant in `globals.css`, and
CSS variables drive the shared color tokens.

## Why this shape

- Colocated tests live next to their source. A single `pnpm -r test` runs the
  whole suite.
- Path aliases (`@/*`) only exist inside `apps/web`. Cross package imports
  use named workspace dependencies so refactors stay honest.
- The web app transpiles workspace packages through Next.js, so shared packages ship
  as TypeScript source without separate build artifacts.
