# Architecture

Drift is a pnpm monorepo. The web app is a Next.js 16 App Router project that
talks to IndexedDB through Dexie. Optional Supabase sync runs in a Web Worker
(landing in M6) and is opt-in per device.

## Packages

- `@drift/core` owns the data shapes, the Dexie schema, the ULID and device
  id helpers, and the natural language quick-add parser. Pure TypeScript so
  it can run in tests, in the browser, and inside the Web Worker.
- `@drift/ui` keeps the `cn` helper and the design tokens that any
  framework-agnostic UI ships with. Heavier shadcn primitives land here as
  they are needed.
- `@drift/whiteboard` owns the pen pointer helpers, palm rejection, and the
  tldraw wrapper. The wrapper itself is added in M4.
- `@drift/tsconfig` is the shared TS config base that every package extends.

## App layers

```
apps/web
  src/app                 routes per view (today, week, month, kanban, etc.)
  src/components          presentation layer
  src/lib                 thin data layer that wraps @drift/core for the UI
```

Mutations flow `UI -> lib -> Dexie`. When sync is enabled, the lib layer also
enqueues a `SyncOp` row that the Web Worker drains on its next tick.

## Routing

The root redirects to `/today`. Each first class view has its own folder under
`apps/web/src/app`. Placeholder views live under their final route so they
can grow in place across milestones.

## Theming

`next-themes` toggles the `.dark` class on `<html>`. Tailwind v4 reads the
matching custom variant defined in `globals.css`. CSS variables drive every
token so we never hardcode colors in components.

## Why this shape

- Colocated tests live next to their source. A single `pnpm -r test` runs the
  whole suite.
- Path aliases (`@/*`) only exist inside `apps/web`. Cross package imports
  use named workspace dependencies so refactors stay honest.
- The web app transpiles workspace packages through Next.js so we ship plain
  TS and skip a separate build step during M0.
