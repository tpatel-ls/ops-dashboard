# Architecture

Ops Dashboard is a pnpm monorepo. The web app is a Next.js 16 App Router project that
talks to IndexedDB through Dexie. Optional Supabase sync runs in the browser, is off
by default, and starts only once the device-local `syncEnabled` setting is turned on
and a Supabase session exists.

## Packages

- `@ops-dashboard/core` owns the data shapes, the Dexie schema, the ULID and device
  id helpers, and the natural language quick-add parser. Pure TypeScript so
  it can run in tests, the browser, and server-side route code.
- `@ops-dashboard/ui` keeps the `cn` class-name helper. The design tokens are
  not here: they are CSS variables declared in `apps/web/src/app/globals.css`,
  as the theming section below describes.
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

The root app route redirects to the view chosen in settings, falling back to
`/today` when the settings read fails. Each first-class view has its own folder
under `apps/web/src/app`. The proxy refreshes Supabase sessions and gates page
navigations when Supabase is configured. API routes keep JSON semantics and apply
their own same-origin or bearer-secret guards.

### Two Today surfaces

`/today` and `/dashboard` are different pages and both present as "Today":

- `/today` renders the Today rail, top three, routines, and the notification
  feed. It is the shipped default: `DEFAULT_SETTINGS.defaultView` is `today`, so
  a fresh install lands here, and it is also the fallback when the settings read
  fails and the target for a notification with no task id.
- `/dashboard` renders `WorkDashboard`. The sidebar, the mobile tab bar, and the
  command palette all label it "Today", and `g then h` goes here.

Nothing links to `/today`, so no nav entry matches it. `navPathActive` compares
whole path segments, and no nav path is `/today` or a parent of it, which means
the default landing page renders with no tab marked current. Deciding which page
owns the name (and whether the other keeps a nav entry) is a product call, so it
is recorded here rather than guessed at.

## Tag canonicalization

Every tag is stored in one canonical form: `NFKC` normalized, then lowercased
with `toLocaleLowerCase('en-US')`. The tags index counts and labels chips by the
stored string, so a tag that reaches Dexie in any other width, composition, or
casing becomes a second chip with a divided count. Tag filtering normalizes on
compare, so it still matches both, which is why a drift here shows up as
duplicate chips rather than as a broken filter.

There is no single owner of the rule, because `@ops-dashboard/core` cannot
depend on the web app. These paths each apply it and have to stay in agreement:

- `parseQuickAdd` in `packages/core/src/parse.ts` (quick add, `#tag`)
- `routedTag` in `apps/web/src/lib/brain-dump-result.ts` (brain dump, triage)
- `normalizeCaptureTags` in `apps/web/src/lib/route-items.ts` (capture routing)
- `mergeImportedTags` in `apps/web/src/lib/import-projects.ts` (portfolio seed)
- the tag input in `apps/web/src/components/task-edit-drawer.tsx`, which calls
  `routedTag` rather than repeating the rule

`normalizeStringList` is deliberately not one of them. With `caseInsensitive` it
deduplicates on the canonical key but keeps the first spelling it saw, which is
what the per-entity tag lists (notes, quotes, people, books, journal) want. It
is a deduplicator, not a canonicalizer, so it does not rescue a caller that
stored a non-canonical tag.

`brain-dump-result.test.ts` asserts `parseQuickAdd` and `routedTag` agree, so a
change to one side without the other fails the suite rather than silently
splitting a tag.

## Settings not yet wired

Settings are device-local: `settings` is not a `SyncTable`, so the sync engine
never carries it and each device keeps its own copy. Every field is normalized
on read, but five are stored without a reader.

Two are surfaced in the settings form with copy that says so rather than being
hidden, so the stored value keeps its meaning for whichever change wires it up:

- `dailyReviewAt` has no scheduler. The daily review opens only from the command
  palette, so changing the time saves a value nothing acts on.
- `leftyMode` is covered in `docs/pen-input.md`.

Three more are not in the settings form either, so they are defaults in the
schema and nothing else:

- `aiEnabled` is typed as the master switch for the server AI features, but no
  route or client path consults it. The AI routes are gated by whether their
  provider key is configured, not by this field.
- `captureAutoReminder` is typed as auto-attaching a reminder to captured tasks.
  Nothing attaches one; reminders are created only from the task drawer.
- `timezone` is validated against `Intl` on write and then never read, so every
  view uses the device timezone. The capture route does take a timezone, but as
  a request-supplied offset rather than from this field.

## Theming

The local `ThemeProvider` resolves light, dark, or system preference and toggles the
`.dark` class on `<html>`. A small boot script applies the stored preference before
React hydrates. Tailwind v4 reads the matching custom variant in `globals.css`, and
CSS variables drive the shared color tokens.

## Why this shape

- Colocated tests live next to their source. A single `corepack pnpm --recursive run
test` runs the
  whole suite.
- Path aliases (`@/*`) only exist inside `apps/web`. Cross package imports
  use named workspace dependencies so refactors stay honest.
- The web app transpiles workspace packages through Next.js, so shared packages ship
  as TypeScript source without separate build artifacts.
