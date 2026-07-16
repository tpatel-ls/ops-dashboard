# Balanced Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver exactly 40 reviewable commits that improve data integrity, accessibility, mobile ergonomics, workflow speed, production resilience, and maintainability.

**Architecture:** Keep the existing local-first mutation and sync boundaries. Extract deterministic query and validation behavior into pure helpers with Vitest coverage, then integrate those helpers into the current React surfaces. Keep UI changes inside established components and Tailwind tokens.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zustand, Dexie, Supabase Realtime, Tailwind CSS 4, Vitest, Playwright.

## Global Constraints

- Exactly 40 commits after baseline `1706bd0`.
- No empty commits, schema migrations, or paid dependencies.
- No em dash or en dash characters.
- Every behavior change gets a failing focused test first when deterministic test coverage is practical.
- Run the complete release gate before pushing.

---

### Task 1: Design Record

**Files:** `docs/superpowers/specs/2026-07-15-balanced-hardening-design.md`

- [x] Record the approved scope, architecture, error handling, constraints, and verification strategy.
- [x] Commit as `docs: design balanced hardening pass`.

### Task 2: Executable Plan

**Files:** `docs/superpowers/plans/2026-07-15-balanced-hardening.md`

- [x] Record all 40 commit boundaries and their focused verification commands.
- [x] Commit as `docs: plan balanced hardening pass`.

### Task 3: Project Name Validation

**Files:** `apps/web/src/lib/projects.ts`, `apps/web/src/lib/projects.test.ts`

- [x] Add failing tests proving project names are trimmed and blank names reject before writes.
- [x] Implement mutation-boundary normalization and run `pnpm --filter @ops-dashboard/web test -- src/lib/projects.test.ts`.
- [x] Commit as `fix: validate project names at creation`.

### Task 4: Work Log Validation

**Files:** `apps/web/src/lib/worklogs.ts`, `apps/web/src/lib/worklogs.test.ts`

- [x] Add failing tests for missing projects, fractional minutes, zero minutes, and valid logs.
- [x] Reject invalid or orphaned logs before writes and run the focused test.
- [x] Commit as `fix: validate project work logs`.

### Task 5: Organization Name Normalization

**Files:** `apps/web/src/lib/organizations.ts`, `apps/web/src/lib/organizations.test.ts`

- [x] Add a failing test proving names are trimmed and blanks reject.
- [x] Normalize at the mutation boundary and run the focused test.
- [x] Commit as `fix: normalize organization names`.

### Task 6: Duplicate Organization Protection

**Files:** `apps/web/src/lib/organizations.ts`, `apps/web/src/lib/organizations.test.ts`

- [x] Add a failing case-insensitive duplicate-name test.
- [x] Check active organization records before creation and run the focused test.
- [x] Commit as `fix: prevent duplicate organizations`.

### Task 7: Active Project Predicate

**Files:** `apps/web/src/lib/project-query.ts`, `apps/web/src/lib/project-query.test.ts`, `apps/web/src/components/tasks-view.tsx`

- [x] Add failing coverage that excludes deleted, archived, done, and archived-status projects.
- [x] Implement `isActiveProject` and use it in task filters.
- [x] Commit as `fix: exclude inactive projects from task filters`.

### Task 8: Deterministic Task Sorting

**Files:** `apps/web/src/lib/task-query.ts`, `apps/web/src/lib/task-query.test.ts`, `apps/web/src/components/tasks-view.tsx`

- [x] Add failing tests for date, priority, order, and title tie breaking.
- [x] Implement `compareTasks` and replace the inline comparator.
- [x] Commit as `fix: make task sorting deterministic`.

### Task 9: Task Search Helper

**Files:** `apps/web/src/lib/task-query.ts`, `apps/web/src/lib/task-query.test.ts`

- [x] Add failing tests for case-insensitive title and project-name matching.
- [x] Implement `matchesTaskSearch` and run focused tests.
- [x] Commit as `feat: add task search matching`.

### Task 10: Project Query Helpers

**Files:** `apps/web/src/lib/project-query.ts`, `apps/web/src/lib/project-query.test.ts`

- [x] Add failing tests for project search and name, due-date, and recently-worked ordering.
- [x] Implement `matchesProjectSearch` and `compareProjects`.
- [x] Commit as `feat: add project query helpers`.

### Task 11: Sync Cursor Validation

**Files:** `apps/web/src/lib/sync/cursors.ts`, `apps/web/src/lib/sync/cursors.test.ts`, `apps/web/src/lib/sync/engine.ts`

- [x] Add failing tests for invalid JSON, arrays, non-string values, and valid cursor maps.
- [x] Implement `parseSyncCursors` and use it in the engine.
- [x] Commit as `fix: validate stored sync cursors`.

### Task 12: Safe Cursor Overlap

**Files:** `apps/web/src/lib/sync/cursors.ts`, `apps/web/src/lib/sync/cursors.test.ts`, `apps/web/src/lib/sync/engine.ts`

- [x] Add failing tests proving malformed dates fall back to the epoch.
- [x] Implement `overlappedCursor` and replace inline date arithmetic.
- [x] Commit as `fix: recover malformed sync timestamps`.

### Task 13: Bypass Navigation

**Files:** `apps/web/src/app/(app)/layout.tsx`, `apps/web/src/app/globals.css`

- [x] Add a keyboard-visible skip link and a focusable `main` target.
- [x] Run focused ESLint and typecheck.
- [x] Commit as `feat: add skip to content navigation`.

### Task 14: Working Notifications Link

**Files:** `apps/web/src/components/top-bar.tsx`, `apps/web/src/components/today/notifications-feed.tsx`

- [x] Replace the inert notifications button with a link to a labeled notifications section.
- [x] Run focused ESLint and typecheck.
- [x] Commit as `fix: connect the notifications action`.

### Task 15: Accessible Task Filters

**Files:** `apps/web/src/components/tasks-view.tsx`

- [x] Add a labeled status group, pressed state, and 44px touch targets.
- [x] Run focused ESLint and typecheck.
- [x] Commit as `fix: improve task filter accessibility`.

### Task 16: Touch-Friendly Task Actions

**Files:** `apps/web/src/components/tasks-view.tsx`, `apps/web/src/app/globals.css`

- [x] Keep star actions visible for coarse pointers while preserving hover behavior on desktop.
- [x] Run focused ESLint and the responsive browser check.
- [x] Commit as `fix: keep task actions visible on touch`.

### Task 17: Reduced Motion Support

**Files:** `apps/web/src/app/globals.css`

- [x] Disable non-essential animation and smooth transitions under `prefers-reduced-motion: reduce`.
- [x] Build the web app to validate CSS.
- [x] Commit as `fix: respect reduced motion preferences`.

### Task 18: Organization Menu Initial Focus

**Files:** `apps/web/src/components/org-switcher.tsx`

- [x] Focus the active menu item when the menu opens and return focus on Escape.
- [x] Run focused ESLint and typecheck.
- [x] Commit as `fix: focus the active organization option`.

### Task 19: Organization Menu Arrow Keys

**Files:** `apps/web/src/components/org-switcher.tsx`

- [x] Support ArrowUp, ArrowDown, Home, and End across organization options.
- [x] Run focused ESLint and typecheck.
- [x] Commit as `feat: add organization menu keyboard navigation`.

### Task 20: Help Overlay Semantics

**Files:** `apps/web/src/components/help-overlay.tsx`

- [x] Add dialog semantics, title association, and modal state.
- [x] Run focused ESLint and typecheck.
- [x] Commit as `fix: label the keyboard help dialog`.

### Task 21: Help Overlay Lifecycle

**Files:** `apps/web/src/components/help-overlay.tsx`

- [x] Lock background scrolling, focus the close action, close on Escape, and restore prior focus.
- [x] Run focused ESLint and typecheck.
- [x] Commit as `fix: manage keyboard help focus`.

### Task 22: Logger Lifecycle

**Files:** `apps/web/src/components/work-logger-dialog.tsx`

- [x] Lock body scrolling while open and restore the launcher's focus after close.
- [x] Run focused ESLint, tests, and typecheck.
- [x] Commit as `fix: manage work logger modal focus`.

### Task 23: Logger Validation Announcements

**Files:** `apps/web/src/components/work-logger-dialog.tsx`

- [x] Add live regions and `aria-invalid` links for task, project, progress, and organization errors.
- [x] Run focused ESLint and typecheck.
- [x] Commit as `fix: announce work logger validation`.

### Task 24: Fast Logger Submit

**Files:** `apps/web/src/components/work-logger-dialog.tsx`

- [x] Submit the active logger form with Cmd+Enter or Ctrl+Enter without interfering with Escape or Tab.
- [x] Run focused browser verification.
- [x] Commit as `feat: add fast work logger submit`.

### Task 25: Logger Duration Limit

**Files:** `apps/web/src/lib/work-logger.ts`, `apps/web/src/lib/work-logger.test.ts`, `apps/web/src/components/work-logger-dialog.tsx`

- [x] Add a failing test for `validWorkMinutes` accepting 1 through 1440 only.
- [x] Enforce the helper in Progress mode and set input bounds.
- [x] Commit as `fix: bound progress log duration`.

### Task 26: Task Search UI

**Files:** `apps/web/src/components/tasks-view.tsx`

- [x] Add a compact search field using `matchesTaskSearch`, with a clear action and result count.
- [x] Run focused ESLint, typecheck, and browser smoke.
- [x] Commit as `feat: add task list search`.

### Task 27: Direct Task Creation

**Files:** `apps/web/src/components/tasks-view.tsx`

- [x] Add an icon-plus-text New task command that opens Task mode.
- [x] Run focused ESLint and browser smoke.
- [x] Commit as `feat: add task list capture action`.

### Task 28: Actionable Task Empty State

**Files:** `apps/web/src/components/tasks-view.tsx`

- [x] Add a create action for empty open or all views while keeping done-state guidance read-only.
- [x] Run focused ESLint and browser smoke.
- [x] Commit as `feat: make task empty states actionable`.

### Task 29: Stale Task Filter Recovery

**Files:** `apps/web/src/components/tasks-view.tsx`

- [x] Clear project filters that no longer belong to the selected organization context.
- [x] Run focused ESLint and typecheck.
- [x] Commit as `fix: clear stale organization task filters`.

### Task 30: Project Search UI

**Files:** `apps/web/src/components/projects-board.tsx`

- [x] Add project search using `matchesProjectSearch` without altering organization scoping.
- [x] Run focused ESLint, typecheck, and browser smoke.
- [x] Commit as `feat: add project search`.

### Task 31: Project Status Filter

**Files:** `apps/web/src/components/projects-board.tsx`

- [x] Add All, Active, Paused, and Done status controls with pressed state.
- [x] Run focused ESLint and browser smoke.
- [x] Commit as `feat: filter projects by status`.

### Task 32: Project Task Counts

**Files:** `apps/web/src/components/projects-board.tsx`

- [x] Render the existing open-task count on every project card.
- [x] Run focused ESLint and browser smoke.
- [x] Commit as `feat: show project task counts`.

### Task 33: Project Due Dates

**Files:** `apps/web/src/components/projects-board.tsx`

- [x] Show due dates with overdue emphasis and safe local date parsing.
- [x] Run focused ESLint and browser smoke.
- [x] Commit as `feat: show project due dates`.

### Task 34: Project Sorting Control

**Files:** `apps/web/src/components/projects-board.tsx`

- [x] Add Name, Due date, and Recent work sorting backed by `compareProjects`.
- [x] Run focused ESLint and browser smoke.
- [x] Commit as `feat: add project sorting`.

### Task 35: Complete Navigation Hotkeys

**Files:** `apps/web/src/components/app-shell.tsx`

- [x] Add direct navigation chords for Projects, Habits, and Routines.
- [x] Run focused ESLint and typecheck.
- [x] Commit as `feat: add core workflow hotkeys`.

### Task 36: Accurate Hotkey Reference

**Files:** `apps/web/src/components/help-overlay.tsx`

- [x] Document every active core navigation chord and rename quick add to Work logger.
- [x] Run focused ESLint.
- [x] Commit as `docs: update in-app keyboard reference`.

### Task 37: PWA Workflow Shortcuts

**Files:** `apps/web/src/lib/device-setup.ts`, `apps/web/src/lib/device-setup.test.ts`

- [x] Add failing tests for direct Tasks, Projects, and Habits shortcuts.
- [x] Extend the existing manifest shortcut source and run focused tests.
- [x] Commit as `feat: expand installed app shortcuts`.

### Task 38: App Loading State

**Files:** `apps/web/src/app/(app)/loading.tsx`

- [x] Add a stable shell-aligned loading state with no layout overflow.
- [x] Run typecheck and production build.
- [x] Commit as `feat: add authenticated app loading state`.

### Task 39: App Error Recovery

**Files:** `apps/web/src/app/(app)/error.tsx`

- [x] Add a client error boundary with retry and dashboard recovery actions.
- [x] Run focused ESLint, typecheck, and production build.
- [x] Commit as `feat: add authenticated app error recovery`.

### Task 40: Lint Debt Cleanup

**Files:** `apps/web/src/components/content-board.tsx`, `apps/web/src/components/domains-view.tsx`, `apps/web/src/components/notes-view.tsx`, `apps/web/src/components/person-detail.tsx`, `apps/web/src/components/project-detail.tsx`, `apps/web/src/components/quotes-view.tsx`

- [x] Remove the 11 existing unused symbols without behavior changes.
- [x] Run `pnpm --filter @ops-dashboard/web lint` and require zero warnings.
- [x] Commit as `chore: clear web lint debt`.

## Release Gate

- [x] Run `pnpm test` and `pnpm typecheck`.
- [x] Run `pnpm --filter @ops-dashboard/web lint` and `pnpm --filter @ops-dashboard/web build`.
- [x] Run `pnpm --filter @ops-dashboard/web exec node scripts/verify-work-logger.mjs --scenario all`.
- [x] Run `git diff --check` and scan source for long dash characters.
- [x] Confirm `git rev-list --count 1706bd0..HEAD` returns `40`.
- [ ] Push `main`, then confirm `HEAD` equals `origin/main` and the worktree is clean.
