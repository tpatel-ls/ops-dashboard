# Focused Project Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace the lifestyle-oriented primary experience with a focused project manager that makes task logging immediate on every device.

**Architecture:** Keep the existing Dexie, Supabase, task, project, and organization boundaries. Add pure task-capture selection helpers, build a reusable rapid task entry component on top of `addTask`, replace the dashboard with project execution data, then simplify navigation and the full capture dialog around the same work model.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zustand, Dexie, Supabase Realtime, Tailwind CSS 4, Vitest, Playwright.

## Global Constraints

- Do not delete or migrate habit, routine, food, or identity records.
- Remove lifestyle modules from primary navigation, dashboard content, command shortcuts, and preload behavior.
- Preserve local-first writes and the existing Supabase outbox.
- Use existing design tokens and Lucide icons.
- Keep touch targets at least 44 pixels on coarse pointers.
- Prevent document-level horizontal overflow from 360 through 1440 pixels.
- Do not introduce em dash or en dash characters.
- Run the complete release gate before pushing `main`.

---

### Task 1: Task Capture Selection Helpers

**Files:**
- Create: `apps/web/src/lib/task-capture.ts`
- Create: `apps/web/src/lib/task-capture.test.ts`

**Interfaces:**
- Consumes: `WorkDestination`, `Project`, and `Priority`.
- Produces: `resolveRecentProject(projects, destination, recentProjectId)`, `taskCaptureOverrides(destination, project, scheduledFor, priority)`, and exported preference keys.

- [ ] **Step 1: Write failing selection tests**

Cover a valid recent project, a project from another organization, an archived project, Personal fallback, and project inheritance of organization and domain.

```ts
expect(resolveRecentProject([personal, work], 'personal', work.id)).toBeUndefined();
expect(resolveRecentProject([personal], 'personal', personal.id)?.id).toBe(personal.id);
expect(taskCaptureOverrides('personal', work, '2026-07-16', 2)).toMatchObject({
  projectId: work.id,
  orgId: work.orgId,
  domainId: work.domainId,
  scheduledFor: '2026-07-16',
  priority: 2,
});
```

- [ ] **Step 2: Verify the tests fail**

Run: `pnpm --filter @ops-dashboard/web test -- src/lib/task-capture.test.ts`

Expected: FAIL because `task-capture.ts` does not exist.

- [ ] **Step 3: Implement the pure helpers**

```ts
export const LAST_TASK_DESTINATION_KEY = 'ops:last-task-destination';
export const LAST_TASK_PROJECT_KEY = 'ops:last-task-project';

export function resolveRecentProject(
  projects: Project[],
  destination: WorkDestination,
  recentProjectId: string | null,
): Project | undefined {
  if (!recentProjectId) return undefined;
  return projectsForDestination(projects, destination)
    .find((project) => project.id === recentProjectId);
}
```

Build override objects so a selected project always wins over destination context.

- [ ] **Step 4: Verify the focused tests pass**

Run: `pnpm --filter @ops-dashboard/web test -- src/lib/task-capture.test.ts`

Expected: all task-capture tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/task-capture.ts apps/web/src/lib/task-capture.test.ts
git commit -m "feat: add rapid task capture selection"
```

### Task 2: Reusable Rapid Task Entry

**Files:**
- Create: `apps/web/src/components/quick-task-entry.tsx`
- Modify: `apps/web/src/lib/work-logger.ts`

**Interfaces:**
- Consumes: Task 1 helpers, `useOrgStore`, `useSyncStatus`, `addTask`, active organizations, and active projects.
- Produces: `QuickTaskEntry({ defaultSchedule, project, compact, autoFocus })`.

- [ ] **Step 1: Build the entry shell**

Render a labeled task title input, add button, and `Details` toggle. The default layout must keep the title field and add button visible at 360 pixels.

```tsx
<form aria-label="Quick task entry" onSubmit={save}>
  <input aria-label="Task title" placeholder="Add a task and press Enter" />
  <button type="submit">Add task</button>
</form>
```

- [ ] **Step 2: Add destination and project resolution**

Use `resolveWorkDestination`, recent local preferences, and an optional fixed project. Invalid stored values must fall back to Personal or no project.

- [ ] **Step 3: Add optional details**

Expose organization, project, Inbox/Today/Tomorrow/date schedule, and Normal/Important/Critical priority in a collapsible region. Store valid destination and project choices after a successful save.

- [ ] **Step 4: Preserve rapid entry behavior**

After a successful `addTask`, clear only the title, keep destination details, return focus to the title, and announce the save through `aria-live="polite"`. Keep input text on failure.

- [ ] **Step 5: Verify component quality**

Run:

```bash
pnpm --filter @ops-dashboard/web exec eslint src/components/quick-task-entry.tsx
pnpm --filter @ops-dashboard/web typecheck
```

Expected: zero ESLint errors and successful TypeScript completion.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/quick-task-entry.tsx apps/web/src/lib/work-logger.ts
git commit -m "feat: add rapid task entry"
```

### Task 3: Work Dashboard Query Model

**Files:**
- Create: `apps/web/src/lib/work-dashboard.ts`
- Create: `apps/web/src/lib/work-dashboard.test.ts`

**Interfaces:**
- Consumes: `Task`, `Project`, `OrgContext`, and a local date string.
- Produces: `buildWorkDashboard(tasks, projects, ctx, today)` with overdue, today, upcoming, active project summaries, and counts.

- [ ] **Step 1: Write failing dashboard tests**

Prove that deleted, archived, completed, and out-of-context records are excluded. Prove date buckets and project completion ratios are deterministic.

- [ ] **Step 2: Verify the tests fail**

Run: `pnpm --filter @ops-dashboard/web test -- src/lib/work-dashboard.test.ts`

Expected: FAIL because `buildWorkDashboard` is missing.

- [ ] **Step 3: Implement the query model**

Use `matchesOrgContext`, active project predicates, and `compareTasks`. Return at most eight attention tasks, eight upcoming tasks, and six active project summaries for dashboard rendering.

- [ ] **Step 4: Verify the focused tests pass**

Run: `pnpm --filter @ops-dashboard/web test -- src/lib/work-dashboard.test.ts`

Expected: all work-dashboard tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/work-dashboard.ts apps/web/src/lib/work-dashboard.test.ts
git commit -m "feat: add work dashboard model"
```

### Task 4: Replace Life Command with Work Dashboard

**Files:**
- Create: `apps/web/src/components/dashboard/work-dashboard.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `buildWorkDashboard`, `QuickTaskEntry`, `useOrgStore`, `setTaskStatus`, and `openEdit`.
- Produces: the new `/dashboard` experience.

- [ ] **Step 1: Build the operational header**

Use `ViewShell` with title `Work Dashboard`, the current date, organization context, and an `Add task` action that focuses the quick-entry field.

- [ ] **Step 2: Put rapid capture first**

Render `QuickTaskEntry` before all metrics with `defaultSchedule="today"` and a stable focus target.

- [ ] **Step 3: Render attention and upcoming work**

Use dense task rows with complete, edit, date, project, and organization signals. Empty sections must offer one `Add task` action.

- [ ] **Step 4: Render active projects**

Show project name, organization, due date, open count, completion ratio, and direct task capture. Use a responsive list and grid without nested cards.

- [ ] **Step 5: Remove lifestyle dashboard dependencies**

The route must no longer import `LifeCommandCenter`, `summarizeLifeManagement`, identity score, routines, food logs, or journal metrics.

- [ ] **Step 6: Verify dashboard quality**

Run:

```bash
pnpm --filter @ops-dashboard/web exec eslint src/components/dashboard/work-dashboard.tsx 'src/app/(app)/dashboard/page.tsx'
pnpm --filter @ops-dashboard/web typecheck
```

Expected: successful lint and typecheck.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/dashboard/work-dashboard.tsx 'apps/web/src/app/(app)/dashboard/page.tsx'
git commit -m "feat: replace life command with work dashboard"
```

### Task 5: Put Rapid Entry on Tasks and Projects

**Files:**
- Modify: `apps/web/src/components/tasks-view.tsx`
- Modify: `apps/web/src/components/projects-board.tsx`
- Modify: `apps/web/src/app/(app)/tasks/page.tsx`
- Modify: `apps/web/src/app/(app)/projects/page.tsx`

**Interfaces:**
- Consumes: `QuickTaskEntry` and existing `openWorkLogger` project targeting.
- Produces: immediate entry from Tasks and direct task actions on project cards.

- [ ] **Step 1: Add task entry above task filters**

Render `QuickTaskEntry` with Inbox as the default schedule. Keep the existing search, status, project, and domain filters below it.

- [ ] **Step 2: Add project card task actions**

Extend `ProjectCardProps` and `KindGroup` with `onAddTask(project)`. Place an `Add task` command next to `Log progress` and call `openWorkLogger('task', project.id)`.

- [ ] **Step 3: Simplify page copy**

Use direct subtitles: `Capture, organize, and complete your work.` and `Plan outcomes and keep their next tasks moving.`

- [ ] **Step 4: Verify edited surfaces**

Run focused ESLint and `pnpm --filter @ops-dashboard/web typecheck`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/tasks-view.tsx apps/web/src/components/projects-board.tsx 'apps/web/src/app/(app)/tasks/page.tsx' 'apps/web/src/app/(app)/projects/page.tsx'
git commit -m "feat: make task entry available everywhere"
```

### Task 6: Focus Desktop and Mobile Navigation

**Files:**
- Modify: `apps/web/src/components/sidebar.tsx`
- Modify: `apps/web/src/components/mobile-nav.tsx`
- Modify: `apps/web/src/components/app-shell.tsx`
- Modify: `apps/web/src/components/command-palette.tsx`
- Modify: `apps/web/src/components/help-overlay.tsx`
- Modify: `apps/web/src/components/top-bar.tsx`

**Interfaces:**
- Produces: Work, Tools, and System navigation groups plus matching keyboard shortcuts.

- [ ] **Step 1: Reduce desktop navigation**

Use Home, Tasks, Projects, Calendar, and Inbox under Work. Use Kanban, Power Dialer, and Notepad under Tools. Keep Settings under System. Rename the brand to `Taskify` and descriptor to `Project command`.

- [ ] **Step 2: Replace mobile navigation**

Use Home and Tasks on the left, Projects and Calendar on the right, and keep the center `Add task` action.

- [ ] **Step 3: Align shortcuts and prefetching**

Prefetch only core and tool routes. Use `g h`, `g t`, `g p`, `g c`, `g i`, `g k`, `g l`, `g n`, and `g s`. Remove habit and routine shortcuts.

- [ ] **Step 4: Align command palette and top bar**

Remove lifestyle destinations, make task creation the palette capture language, and replace `Universal capture` with `Quick task` in the top bar.

- [ ] **Step 5: Update keyboard reference**

Document only active shortcuts and use `Add task` instead of `Work logger` in user-facing copy.

- [ ] **Step 6: Verify edited surfaces**

Run focused ESLint and web typecheck.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/sidebar.tsx apps/web/src/components/mobile-nav.tsx apps/web/src/components/app-shell.tsx apps/web/src/components/command-palette.tsx apps/web/src/components/help-overlay.tsx apps/web/src/components/top-bar.tsx
git commit -m "feat: focus navigation on projects and tasks"
```

### Task 7: Simplify the Full Task Dialog

**Files:**
- Modify: `apps/web/src/components/work-logger-dialog.tsx`
- Modify: `apps/web/src/components/quick-add.tsx`

**Interfaces:**
- Consumes: the shared task preference keys and destination helpers.
- Produces: task-first dialog layout and predictable quick task creation.

- [ ] **Step 1: Put task title first**

In Task mode, render the title field immediately below the mode selector. Move destination, project, schedule, and priority into a labeled details region below it.

- [ ] **Step 2: Use recent valid destination and project**

Read the shared preference keys and preselect a valid project. Continue to honor an explicitly launched project.

- [ ] **Step 3: Shorten task copy**

Use title `Add work`, eyebrow `Quick entry`, task submit text `Add task`, project submit text `Create project`, and progress submit text `Log progress`.

- [ ] **Step 4: Make top-bar quick add deterministic**

Without a project, call `addTask` directly using the selected organization rather than routing Personal entries through AI capture. Keep voice input and project targeting.

- [ ] **Step 5: Verify edited surfaces**

Run focused ESLint, work logger unit tests, and web typecheck.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/work-logger-dialog.tsx apps/web/src/components/quick-add.tsx
git commit -m "fix: make task capture direct and predictable"
```

### Task 8: Browser Verification and Release Gate

**Files:**
- Modify: `apps/web/scripts/verify-work-logger.mjs`
- Modify: `docs/superpowers/plans/2026-07-16-focused-project-manager.md`

**Interfaces:**
- Verifies the complete local browser workflow and responsive behavior.

- [ ] **Step 1: Add rapid-entry browser coverage**

Create two tasks consecutively from the dashboard input. Confirm the input clears, retains focus, and both task titles appear in the task view.

- [ ] **Step 2: Add organization and project coverage**

Select an organization and project through Details, save a task, then confirm the task is visible under the correct context and project.

- [ ] **Step 3: Update responsive routes**

Verify `/dashboard`, `/tasks`, `/projects`, and `/calendar` at 360, 390, 412, 768, 1024, and 1440 pixels. Fail on document-level horizontal overflow or browser console errors.

- [ ] **Step 4: Run the complete release gate**

```bash
pnpm test
pnpm typecheck
pnpm --filter @ops-dashboard/web lint
pnpm --filter @ops-dashboard/web build
pnpm --filter @ops-dashboard/web exec node scripts/verify-work-logger.mjs --scenario all
git diff --check
```

Expected: all tests pass, lint has zero warnings, production build exits zero, browser verification passes, and Git diff validation is clean.

- [ ] **Step 5: Scan for removed primary language**

Confirm primary navigation and dashboard files contain no references to Identity, Habits, Routines, Food, Life Command, workout, em dash, or en dash.

- [ ] **Step 6: Commit verification updates**

```bash
git add apps/web/scripts/verify-work-logger.mjs docs/superpowers/plans/2026-07-16-focused-project-manager.md
git commit -m "test: verify focused project manager flows"
```

- [ ] **Step 7: Push and verify GitHub parity**

```bash
git fetch origin
git push origin main
git fetch origin
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
test -z "$(git status --porcelain)"
```
