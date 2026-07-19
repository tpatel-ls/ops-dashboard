# Operations UI Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver 15 visible UI improvements that make Taskify faster to scan and easier to operate across phone, tablet, and desktop.

**Architecture:** Keep the current Next.js App Router, Dexie data flow, Zustand stores, and Tailwind design tokens. Improve existing shell and feature components in place, adding pure helpers and tests only where interaction behavior changes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Dexie, Zustand, Lucide React, Vitest, Playwright.

## Global Constraints

- Produce exactly 15 non-empty commits on `main` after baseline `4d9bd0b`.
- Every commit must visibly improve the UI.
- Preserve local-first data behavior and all existing routes.
- Do not add em dash or en dash characters.
- Prevent page-level horizontal overflow at all target widths.
- Use existing libraries and tokens; add no dependencies.

---

### Task 1: Tighten the App Canvas

**Files:** Modify `apps/web/src/app/globals.css`; include this plan and design record.

- [ ] Refine global surface, selection, scrollbar, and motion styles for a calmer canvas.
- [ ] Run web typecheck and commit as `style: refine the application canvas`.

### Task 2: Make Page Headers Responsive

**Files:** Modify `apps/web/src/components/view-shell.tsx`.

- [ ] Reduce phone header bulk and improve metadata/action wrapping.
- [ ] Run web typecheck and commit as `style: tighten responsive page headers`.

### Task 3: Focus the Global Top Bar

**Files:** Modify `apps/web/src/components/top-bar.tsx`.

- [ ] Make capture the dominant action while preserving search, context, sync, and settings.
- [ ] Run web typecheck and commit as `style: focus the global command bar`.

### Task 4: Improve Sidebar Hierarchy

**Files:** Modify `apps/web/src/components/sidebar.tsx`.

- [ ] Strengthen brand, navigation grouping, active state, and footer status without increasing width.
- [ ] Run web typecheck and commit as `style: sharpen sidebar navigation hierarchy`.

### Task 5: Polish Mobile Navigation

**Files:** Modify `apps/web/src/components/mobile-nav.tsx`.

- [ ] Stabilize tab dimensions, safe-area spacing, and the central task action.
- [ ] Run web typecheck and commit as `style: polish mobile task navigation`.

### Task 6: Clarify Organization Context

**Files:** Modify `apps/web/src/components/org-switcher.tsx`.

- [ ] Expose the current organization clearly and improve menu selection states.
- [ ] Run web typecheck and commit as `style: clarify organization context switching`.

### Task 7: Add Fast Schedule Controls

**Files:** Modify `apps/web/src/components/quick-task-entry.tsx`; modify `apps/web/src/lib/task-capture.ts`; modify `apps/web/src/lib/task-capture.test.ts`.

- [ ] Write a failing test for the schedule summary helper.
- [ ] Add compact Inbox, Today, and Tomorrow choices plus a stable summary.
- [ ] Run the focused test and web typecheck; commit as `feat: add fast task scheduling controls`.

### Task 8: Turn Dashboard Counts into Signals

**Files:** Modify `apps/web/src/components/dashboard/work-dashboard.tsx`.

- [ ] Improve dashboard title, context copy, and count signal hierarchy.
- [ ] Run web typecheck and commit as `style: strengthen dashboard work signals`.

### Task 9: Improve Attention Task Rows

**Files:** Modify `apps/web/src/components/dashboard/work-dashboard.tsx`.

- [ ] Make completion, priority, project, organization, and due status easier to scan.
- [ ] Run web typecheck and commit as `style: improve dashboard task scanning`.

### Task 10: Make Upcoming Work a Timeline

**Files:** Modify `apps/web/src/components/dashboard/work-dashboard.tsx`.

- [ ] Add compact date badges and clearer upcoming task grouping without changing data order.
- [ ] Run web typecheck and commit as `style: shape upcoming work into a timeline`.

### Task 11: Upgrade Project Progress Cards

**Files:** Modify `apps/web/src/components/dashboard/work-dashboard.tsx`.

- [ ] Strengthen project ownership, due state, progress, and add-task affordances.
- [ ] Run web typecheck and commit as `style: upgrade project progress cards`.

### Task 12: Simplify the Tasks Workspace

**Files:** Modify `apps/web/src/components/tasks-view.tsx`; modify `apps/web/src/app/(app)/tasks/page.tsx` if header metadata is needed.

- [ ] Recompose search, filters, count, and task rows for phone and desktop scanning.
- [ ] Run web typecheck and task query tests; commit as `style: simplify the tasks workspace`.

### Task 13: Consolidate Project Controls

**Files:** Modify `apps/web/src/components/projects-board.tsx`.

- [ ] Merge status and sort controls into a wrapping toolbar and improve project card actions.
- [ ] Run web typecheck and project query tests; commit as `style: consolidate project workspace controls`.

### Task 14: Refine the Work Logger Sheet

**Files:** Modify `apps/web/src/components/work-logger-dialog.tsx`.

- [ ] Improve mobile sheet geometry, mode selection, details summary, and sticky action area.
- [ ] Run web typecheck and work logger tests; commit as `style: refine the responsive work logger`.

### Task 15: Finish the Command Experience

**Files:** Modify `apps/web/src/components/command-palette.tsx`; modify `apps/web/src/app/(app)/loading.tsx`; modify `apps/web/src/app/(app)/error.tsx`; modify `apps/web/scripts/verify-work-logger.mjs`.

- [ ] Polish command search, keyboard hints, loading, and error states.
- [ ] Make the browser verifier accept an installed Chrome executable.
- [ ] Run full tests, lint, typecheck, build, browser flow, screenshots, and overflow checks.
- [ ] Commit as `style: finish the cross-device command experience`.

