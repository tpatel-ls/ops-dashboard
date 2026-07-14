# Organization-first Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one responsive logger for organization-scoped tasks, projects, and progress, then verify that its records persist locally and sync through the existing Supabase path.

**Architecture:** A pure destination helper owns organization defaults and project filtering. Zustand only owns dialog launch state. A focused client dialog performs local-first writes through the existing task, project, organization, and work-log helpers, while project and capture surfaces launch it with optional mode and project context.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zustand, Dexie, Supabase Realtime, Tailwind CSS 4, Vitest, Playwright.

## Global Constraints

- No em dashes or en dashes in code, UI strings, or docs.
- Work records without `orgId` are Personal; `all` is a viewing context only.
- No database migration or new dependency.
- All writes must use existing sync-aware helpers and retain owner-scoped RLS.
- Phone layouts must have 44px touch targets and no horizontal overflow.
- The Watch remains phone-assisted; do not claim an independent Wear OS app.

---

### Task 1: Destination rules

**Files:**
- Create: `apps/web/src/lib/work-logger.ts`
- Test: `apps/web/src/lib/work-logger.test.ts`

**Interfaces:**
- Produces: `WorkDestination`, `resolveWorkDestination`, `destinationOrgId`, `projectsForDestination`, `syncSaveMessage`.
- Consumes: `OrgContext`, `Project`, and `SyncState` from existing modules.

- [x] **Step 1: Write failing tests for context priority and fallback**

```ts
expect(resolveWorkDestination('org-a', 'personal', ['org-a'])).toBe('org-a');
expect(resolveWorkDestination('all', 'org-a', ['org-a'])).toBe('org-a');
expect(resolveWorkDestination('all', 'missing', ['org-a'])).toBe('personal');
```

- [x] **Step 2: Run the test and verify RED**

Run: `pnpm --filter @ops-dashboard/web test -- src/lib/work-logger.test.ts`
Expected: FAIL because `work-logger` does not exist.

- [x] **Step 3: Implement the pure rules**

```ts
export type WorkDestination = 'personal' | string;

export function resolveWorkDestination(
  ctx: OrgContext,
  last: WorkDestination | null,
  activeOrgIds: string[],
): WorkDestination {
  if (ctx === 'personal') return 'personal';
  if (ctx !== 'all' && activeOrgIds.includes(ctx)) return ctx;
  if (last === 'personal' || (last && activeOrgIds.includes(last))) return last;
  return 'personal';
}
```

Add project filtering by exact `orgId` with missing `orgId` treated as Personal, and map sync states to `Saved and synced`, `Saved offline - sync queued`, or `Saved on this device - sign in to sync`.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `pnpm --filter @ops-dashboard/web test -- src/lib/work-logger.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/web/src/lib/work-logger.ts apps/web/src/lib/work-logger.test.ts
git commit -m "feat: add organization destination rules"
```

### Task 2: Logger launch state

**Files:**
- Modify: `apps/web/src/lib/app-store.ts`
- Test: `apps/web/src/lib/app-store.test.ts`

**Interfaces:**
- Produces: `WorkLoggerMode`, `openWorkLogger(mode?, projectId?)`, and `closeWorkLogger()`.
- Preserves: `openQuickAdd()` and `closeQuickAdd()` as task-mode compatibility aliases.

- [x] **Step 1: Write a failing store test**

```ts
useAppStore.getState().openWorkLogger('progress', 'project-1');
expect(useAppStore.getState()).toMatchObject({
  workLoggerOpen: true,
  workLoggerMode: 'progress',
  workLoggerProjectId: 'project-1',
});
```

- [x] **Step 2: Run the test and verify RED**

Run: `pnpm --filter @ops-dashboard/web test -- src/lib/app-store.test.ts`
Expected: FAIL because `openWorkLogger` is missing.

- [x] **Step 3: Add launch state and compatibility aliases**

```ts
export type WorkLoggerMode = 'task' | 'project' | 'progress';

openWorkLogger: (mode = 'task', projectId = null) =>
  set({ workLoggerOpen: true, workLoggerMode: mode, workLoggerProjectId: projectId }),
closeWorkLogger: () =>
  set({ workLoggerOpen: false, workLoggerMode: 'task', workLoggerProjectId: null }),
```

- [x] **Step 4: Run the store tests and verify GREEN**

Run: `pnpm --filter @ops-dashboard/web test -- src/lib/app-store.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/web/src/lib/app-store.ts apps/web/src/lib/app-store.test.ts
git commit -m "feat: add universal logger launch state"
```

### Task 3: Three-mode universal logger

**Files:**
- Create: `apps/web/src/components/work-logger-dialog.tsx`
- Modify: `apps/web/src/components/app-shell.tsx`
- Delete: `apps/web/src/components/quick-add-dialog.tsx`
- Modify: `apps/web/src/lib/projects.ts`
- Test: `apps/web/src/lib/projects.test.ts`

**Interfaces:**
- Consumes: Task 1 destination helpers and Task 2 launch state.
- Produces: Task, Project, and Progress form modes with inline organization creation and sync feedback.

- [x] **Step 1: Write a failing project creation test for due date and org**

```ts
const project = await createProject('Launch', { orgId: 'org-a', dueDate: '2026-08-01' });
expect(project).toMatchObject({ orgId: 'org-a', dueDate: '2026-08-01' });
```

- [x] **Step 2: Run the test and verify RED**

Run: `pnpm --filter @ops-dashboard/web test -- src/lib/projects.test.ts`
Expected: FAIL because `CreateProjectOptions` does not accept `dueDate`.

- [x] **Step 3: Extend `CreateProjectOptions` minimally**

```ts
export interface CreateProjectOptions {
  color?: string;
  kind?: ProjectKind;
  domainId?: string;
  orgId?: string;
  description?: string;
  dueDate?: string;
}
```

Copy `dueDate` into the new record only when provided, then verify the focused test passes.

- [x] **Step 4: Build the dialog shell and destination rail**

Use `role="dialog"`, `aria-modal="true"`, a fixed backdrop, phone bottom-sheet geometry, tablet and desktop centered geometry, mode buttons, destination buttons with text and color, and an inline Add organization form. Read the active organization context and last destination, then call `resolveWorkDestination`.

- [x] **Step 5: Implement Task mode**

On save call `addTaskToProject` when a filtered project is selected. Otherwise call `addTask(title, { orgId, scheduledFor, priority })`. Schedule options are Inbox, Today, Tomorrow, and a date input. Keep local errors visible and preserve form values.

- [x] **Step 6: Implement Project mode**

Call `createProject(name, { orgId, kind, dueDate, description })`. The primary action includes the destination name.

- [x] **Step 7: Implement Progress mode**

Require a filtered project, expose 15, 30, and 60 minute shortcuts, validate positive integer minutes, and call `logWork(project.id, minutes, note)`.

- [x] **Step 8: Add save feedback and dialog behavior**

After local save, read `useSyncStatus` and show the Task 1 message before closing. Escape closes, backdrop click closes, focus starts in the first required field, and controls meet the 44px phone target.

- [x] **Step 9: Replace the old dialog in the app shell**

Render `WorkLoggerDialog`, route `g then i` to task mode, and make the global close action close the work logger.

- [x] **Step 10: Verify tests, typecheck, and commit**

Run:

```bash
pnpm --filter @ops-dashboard/web test -- src/lib/work-logger.test.ts src/lib/app-store.test.ts src/lib/projects.test.ts
pnpm --filter @ops-dashboard/web typecheck
```

Expected: PASS with no TypeScript errors.

```bash
git add apps/web/src/components/work-logger-dialog.tsx apps/web/src/components/app-shell.tsx apps/web/src/components/quick-add-dialog.tsx apps/web/src/lib/projects.ts apps/web/src/lib/projects.test.ts
git commit -m "feat: add organization-first work logger"
```

### Task 4: Projects page integration

**Files:**
- Modify: `apps/web/src/components/projects-board.tsx`
- Create: `apps/web/scripts/verify-work-logger.mjs`

**Interfaces:**
- Consumes: `useActiveOrgs`, `resolveWorkDestination`, and `openWorkLogger`.
- Produces: organization-aware inline creation, organization labels in All, and progress launch actions.

- [x] **Step 1: Add a browser assertion that reproduces the disappearing-project bug**

In `apps/web/scripts/verify-work-logger.mjs`, seed an organization in IndexedDB, set its context, create a project through the UI, and assert the project stays visible with that organization's label. Run it and verify it fails before the form change.

- [x] **Step 2: Add organization selection to the existing project form**

Load active organizations, initialize the destination from the active context, render Personal plus organization choices, and pass `orgId: destinationOrgId(destination)` to `createProject`.

- [x] **Step 3: Label cards in All context**

Load organizations alongside projects and attach the matching organization to `ProjectCardData`. Show organization name and color only when `ctx === 'all'`.

- [x] **Step 4: Add progress actions without nested buttons**

Restructure the card into an article with a primary open button and a separate icon-plus-text `Log progress` button. Launch `openWorkLogger('progress', project.id)`.

- [x] **Step 5: Verify the focused browser assertion and commit**

Run: `pnpm --filter @ops-dashboard/web exec node scripts/verify-work-logger.mjs --scenario project-org`
Expected: PASS.

```bash
git add apps/web/src/components/projects-board.tsx apps/web/scripts/verify-work-logger.mjs
git commit -m "feat: make projects organization aware"
```

### Task 5: Fast capture and mobile access

**Files:**
- Modify: `apps/web/src/components/quick-add.tsx`
- Modify: `apps/web/src/components/top-bar.tsx`
- Modify: `apps/web/src/components/mobile-nav.tsx`
- Modify: `apps/web/src/app/(app)/today/page.tsx`
- Modify: `apps/web/src/components/dashboard/life-command-center.tsx`

**Interfaces:**
- Consumes: existing organization records, project records, and `openWorkLogger`.
- Produces: visible organization assignment in desktop capture and direct universal-logger access everywhere else.

- [ ] **Step 1: Group desktop project choices by destination**

Load organizations with projects, show an organization dot and label on each project row, and filter the list by the active destination. When no project is selected, expose a compact destination picker that passes `orgId` to `addTask`.

- [ ] **Step 2: Keep project inheritance authoritative**

When a project is selected, continue using `addTaskToProject` and ignore the standalone destination so the task always inherits the project's organization and domain.

- [ ] **Step 3: Route mobile and dashboard launchers to the universal logger**

The center mobile action opens Task mode. Today query-string capture and the dashboard Capture action do the same. Make the organization switcher available on phone using its existing compact dot-only rendering.

- [ ] **Step 4: Verify 360px layout and commit**

Run the browser overflow assertion at 360px on `/dashboard`, `/today`, `/tasks`, and `/projects`. Expected: `document.documentElement.scrollWidth <= window.innerWidth` on every route.

```bash
git add apps/web/src/components/quick-add.tsx apps/web/src/components/top-bar.tsx apps/web/src/components/mobile-nav.tsx apps/web/src/app/\(app\)/today/page.tsx apps/web/src/components/dashboard/life-command-center.tsx
git commit -m "feat: expose organization logging on every device"
```

### Task 6: End-to-end verification and release

**Files:**
- Modify: `docs/ops-dashboard/STATE.md`
- Modify: `docs/superpowers/plans/2026-07-14-org-task-logging.md`

**Interfaces:**
- Verifies the complete browser, local database, Supabase, and deployment path.

- [ ] **Step 1: Run focused and full automated checks**

```bash
pnpm test
pnpm typecheck
pnpm --filter @ops-dashboard/web lint
pnpm --filter @ops-dashboard/web build
git diff --check
rg -n "—|–" apps/web/src packages docs/superpowers/specs/2026-07-14-org-task-logging-design.md docs/superpowers/plans/2026-07-14-org-task-logging.md
```

Expected: tests, typecheck, and build pass; lint has no new errors; dash scan has no matches.

- [ ] **Step 2: Run responsive browser verification**

Start the dev server and test `/dashboard`, `/today`, `/tasks`, and `/projects` at widths 360, 390, 412, 768, 1024, and 1440. Confirm Task, Project, and Progress saves work and no route overflows horizontally.

- [ ] **Step 3: Verify cross-context sync**

Use two signed-in browser contexts against production configuration. Create an organization task in the first, wait for the sync status to become Live with zero pending operations, and confirm the record appears in the matching organization view in the second. No service key may enter browser code or logs.

- [ ] **Step 4: Review React quality**

Check client boundaries, effect dependencies, derived state, focus behavior, and avoid unnecessary rerenders in every edited TSX file. Re-run typecheck and the focused tests after any correction.

- [ ] **Step 5: Deploy production and verify health**

Upgrade the Vercel CLI before deployment if the installed version is stale, deploy with `vercel deploy --prod --yes`, confirm the production alias, call `/api/health` with the configured server-only secret, and inspect deployment error logs.

- [ ] **Step 6: Update state, commit, and push main**

Record the feature and verification results in `STATE.md`, check every completed plan item, commit remaining documentation, and run `git push origin main`. Confirm `git status` is clean and `origin/main` equals `HEAD`.
