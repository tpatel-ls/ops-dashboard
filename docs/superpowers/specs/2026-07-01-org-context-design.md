# Org Context: organizations, combined calendar, fast task-to-project

Date: 2026-07-01. Status: approved by Tanay ("execute everything end to end, I approve everything").

## Goal

Tanay works for two organizations and has personal projects. The app gets a
context switcher (All / each org / Personal) that scopes the work views, a
combined calendar that overlays every lane color-coded, and two fast paths for
adding tasks straight into a project. Everything syncs across devices through
the existing outbox -> Supabase -> realtime pipeline.

## Non-goals

- Multi-user, sharing, or team features. Still a single-user app.
- Org-scoping the personal modules (routines, habits, journal, people, library).
- Renaming or reworking domains. Domains stay as life areas.

## Data model

- New synced entity `Organization` (SyncMeta + `name`, `color`, `order`,
  `archivedAt?`). New Dexie table `organizations` (schema version 5) and new
  member in the `SyncTable` union.
- `Project.orgId?: ID` and `Task.orgId?: ID`. Absent orgId = Personal.
  Tasks inherit `orgId` from their project at write time (denormalized so
  calendar/list filters stay cheap).
- Dexie v5 adds the `organizations` store and `orgId` indexes on
  `projects` and `tasks`.
- Supabase migration `0005_organizations.sql`: `organizations` table matching
  the 0001/0004 conventions (text id PK, user_id default, version-guard
  trigger, RLS, realtime publication) plus `org_id text` columns on
  `projects` and `tasks`.

## Context model

- `OrgContext = 'all' | 'personal' | <orgId>`.
- Pure helper `matchesOrgContext(orgId: string | undefined, ctx)` in
  `@ops-dashboard/core` with vitest coverage.
- Active context is per-device (localStorage-persisted store), not synced.
  Data syncs everywhere; each device keeps its own lens.

## Seeding and migration of existing data

- On boot (client, once; localStorage guard + data-idempotent):
  - Create org "LS Global Group" (color `oklch(0.6 0.13 265)`) if no org with
    that name exists.
  - Projects named "Blue Text" / "Power Dialer" that have no orgId get
    patched to LS Global Group, and their tasks inherit it. Patches go through
    `patchRecord` so they sync.
- Mini Monet and Email Triage stay Personal (no orgId).
- The second org is added by Tanay in Settings (name unknown at build time).
- `import-projects.ts` becomes org-aware so a fresh device seeds identically.

## UI

1. **Org switcher** in the top bar: dropdown showing All / each org (color
   dot) / Personal; also "Switch to ..." entries in the command palette.
   Scopes exactly five views: Dashboard, Projects, Tasks, Kanban, Calendar.
2. **Combined calendar**: in All, tasks are color-coded by lane (org color;
   Personal uses a fixed accent) with legend chips that toggle lanes on/off.
   In a single context the calendar filters to that lane.
3. **Inline add on a project**: an add-task input on the project detail panel
   and on each dashboard project tile (tile is restructured so no button
   nesting). Type + Enter -> task lands in that project with NL parsing
   (dates, #tags, !! priority) and inherits domainId + orgId. Input stays
   focused for rapid entry.
4. **Quick-add project picker**: compact picker in the top-bar capture with
   type-to-filter. With a project picked, submit calls `addTask` directly
   (skips triage) with projectId/domainId/orgId. Without one, the existing
   capture -> triage flow is untouched.
5. **Settings -> Organizations**: add, rename, recolor, archive orgs
   (modeled on the domains management UI).
6. **Task edit drawer**: changing a task's project updates its orgId to the
   new project's orgId (or clears it).

## Sync end to end

- Add `organizations` to every sync surface: outbox mapper table list,
  per-table pull cursors, realtime subscriptions, and the on-enable backfill.
- Confirm one failing table (migration not yet applied in prod) cannot wedge
  the outbox for other tables; per-op error isolation.
- Local verification without env keys: typecheck/build plus browser E2E of the
  local Dexie path. Production verification steps documented in STATE.md
  (apply migration 0005, then create an org task on one device and watch it
  appear on another).

## Implementation plan (commit-sized)

1. Core: types, Dexie v5, `matchesOrgContext` + tests, organizations lib,
   Supabase migration 0005, sync engine wiring.
2. Switcher: context store, top-bar switcher, palette entries, scope
   Dashboard/Projects/Tasks/Kanban.
3. Calendar: combined overlay, lane colors, legend toggles, context filter.
4. Fast add: inline add on project detail + dashboard tile, quick-add project
   picker, edit-drawer org inheritance, org-aware importer + boot migration.
5. Settings org management, STATE.md/docs updates.

Each phase: typecheck + lint on touched files; build + Playwright pass at the
end; push to main (author `tpatel@lsglobalgroup.com`).
