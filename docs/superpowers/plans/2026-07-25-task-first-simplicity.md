# Task-first Simplicity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Taskify as direct as Google Tasks while preserving its private organization lenses, combined All work view, kanban board, natural-language entry, Whisper voice capture, local-first storage, and sync.

**Architecture:** Keep the existing task, organization, Dexie, and sync models. Simplify only the presentation and interaction layer: a four-view work shell, one capture path per viewport, a focused agenda and task list, and a three-lane board backed by a small pure status-mapping module.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Dexie, Zustand, dnd-kit, Vitest, Playwright, existing `/api/transcribe` Whisper endpoint.

## Global Constraints

- Organizations are private lanes for one user. Do not add members, invites, roles, or permissions.
- Preserve all routes, records, sync behavior, task types, and secondary feature data.
- Do not add dependencies or modify database schemas.
- Reuse `addTask`, `setTaskStatus`, `updateTask`, `useVoiceInput`, and `/api/transcribe`.
- Keep TypeScript strict and preserve accessibility semantics and 44 pixel mobile touch targets.
- Do not add em dashes to code, UI copy, tests, or documentation.
- Use the real Git checkout at `/Users/tanaypatel/Desktop/Projects-LSG/taskify`; mirror source changes to the Codex workspace at `/Users/tanaypatel/Desktop/taskify`.
- Run focused tests before each commit and full verification after all tasks.

## File structure

- `apps/web/src/lib/simple-kanban.ts`: pure mapping between existing task statuses and the three simple board lanes.
- `apps/web/src/lib/simple-kanban.test.ts`: exhaustive unit coverage for status and drop mapping.
- `apps/web/src/components/kanban-board.tsx`: three-lane organization-aware board and mobile horizontal layout.
- `apps/web/src/components/sidebar.tsx`: four primary links and quiet secondary links.
- `apps/web/src/components/mobile-nav.tsx`: Today, Tasks, Add, Board, Projects.
- `apps/web/src/components/top-bar.tsx`: desktop capture and mobile workspace/search header.
- `apps/web/src/components/quick-add.tsx`: remember the explicit All work destination.
- `apps/web/src/components/view-shell.tsx`: smaller, quieter page heading.
- `apps/web/src/lib/use-voice-input.ts`: expose recording and transcription failures.
- `apps/web/src/components/work-logger-dialog.tsx`: task-first mobile composer with Whisper control and hidden mode switch.
- `apps/web/src/components/dashboard/work-dashboard.tsx`: focused Today agenda.
- `apps/web/src/components/tasks-view.tsx`: compact list controls with optional filters.
- `apps/web/src/app/(app)/tasks/page.tsx`: concise Tasks copy.
- `apps/web/src/app/(app)/kanban/page.tsx`: rename Kanban to Board and simplify copy.
- `apps/web/src/app/(app)/projects/page.tsx`: concise Projects copy.
- `apps/web/scripts/verify-work-logger.mjs`: update the mobile primary-navigation expectation.

---

### Task 1: Define the simple board model

**Files:**

- Create: `apps/web/src/lib/simple-kanban.ts`
- Create: `apps/web/src/lib/simple-kanban.test.ts`

**Interfaces:**

- Consumes: `TaskStatus` from `@ops-dashboard/core`.
- Produces:
  - `SimpleKanbanColumnId = 'todo' | 'doing' | 'done'`
  - `SIMPLE_KANBAN_COLUMNS`
  - `simpleKanbanColumn(status: TaskStatus): SimpleKanbanColumnId | null`
  - `statusForSimpleKanbanColumn(column: SimpleKanbanColumnId): TaskStatus`

- [ ] **Step 1: Write the failing status-mapping tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  simpleKanbanColumn,
  statusForSimpleKanbanColumn,
} from './simple-kanban';

describe('simpleKanbanColumn', () => {
  it.each([
    ['backlog', 'todo'],
    ['todo', 'todo'],
    ['blocked', 'todo'],
    ['doing', 'doing'],
    ['done', 'done'],
    ['archived', null],
  ] as const)('maps %s to %s', (status, column) => {
    expect(simpleKanbanColumn(status)).toBe(column);
  });
});

describe('statusForSimpleKanbanColumn', () => {
  it.each([
    ['todo', 'todo'],
    ['doing', 'doing'],
    ['done', 'done'],
  ] as const)('uses %s as the canonical drop status', (column, status) => {
    expect(statusForSimpleKanbanColumn(column)).toBe(status);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm --filter @ops-dashboard/web test -- src/lib/simple-kanban.test.ts
```

Expected: FAIL because `./simple-kanban` does not exist.

- [ ] **Step 3: Implement the pure board model**

```ts
import type { TaskStatus } from '@ops-dashboard/core';

export type SimpleKanbanColumnId = 'todo' | 'doing' | 'done';

export interface SimpleKanbanColumn {
  id: SimpleKanbanColumnId;
  label: string;
  color: string;
}

export const SIMPLE_KANBAN_COLUMNS: SimpleKanbanColumn[] = [
  { id: 'todo', label: 'To do', color: 'var(--color-primary)' },
  { id: 'doing', label: 'In progress', color: 'var(--color-warning)' },
  { id: 'done', label: 'Done', color: 'var(--color-success)' },
];

export function simpleKanbanColumn(status: TaskStatus): SimpleKanbanColumnId | null {
  if (status === 'archived') return null;
  if (status === 'doing') return 'doing';
  if (status === 'done') return 'done';
  return 'todo';
}

export function statusForSimpleKanbanColumn(column: SimpleKanbanColumnId): TaskStatus {
  return column;
}
```

- [ ] **Step 4: Run the focused test**

Run:

```bash
pnpm --filter @ops-dashboard/web test -- src/lib/simple-kanban.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the model**

```bash
git add apps/web/src/lib/simple-kanban.ts apps/web/src/lib/simple-kanban.test.ts
git commit -m "feat: define simple kanban lanes"
```

### Task 2: Replace the configurable kanban with the three-lane board

**Files:**

- Modify: `apps/web/src/components/kanban-board.tsx:1-302`
- Modify: `apps/web/src/app/(app)/kanban/page.tsx:1-16`

**Interfaces:**

- Consumes: `SIMPLE_KANBAN_COLUMNS`, `simpleKanbanColumn`, and
  `statusForSimpleKanbanColumn` from Task 1.
- Produces: the existing `KanbanBoard` component with a simpler presentation.

- [ ] **Step 1: Remove grouping state and derive three buckets**

Replace `Grouping`, `STATUS_COLUMNS`, `PRIORITY_COLUMNS`, `bucketOf`, and the
group selector with:

```ts
const scopedTasks = useMemo(
  () => (tasks ?? []).filter((task) => matchesOrgContext(taskLane(task, projectsMap), ctx)),
  [ctx, projectsMap, tasks],
);

function tasksForColumn(columnId: SimpleKanbanColumnId): Task[] {
  return scopedTasks.filter((task) => simpleKanbanColumn(task.status) === columnId);
}
```

Load active organizations with projects and build an `organizationsMap` so All
work cards can show an organization dot and name.

- [ ] **Step 2: Canonicalize drag updates**

Use the helper in `onDragEnd`:

```ts
if (!event.over) return;
const taskId = String(event.active.id);
const columnId = String(event.over.id) as SimpleKanbanColumnId;
void updateTask(taskId, { status: statusForSimpleKanbanColumn(columnId) });
```

- [ ] **Step 3: Render the mobile and desktop lane layout**

The board container must be:

```tsx
<div className="scrollbar-thin -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-3 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
  {SIMPLE_KANBAN_COLUMNS.map((column) => (
    <KanbanColumn
      key={column.id}
      column={column}
      tasks={tasksForColumn(column.id)}
      projectsMap={projectsMap}
      organizationsMap={organizationsMap}
      addOverrides={addOverrides}
    />
  ))}
</div>
```

Each column uses `w-[86vw] max-w-sm shrink-0 snap-start md:w-auto md:max-w-none`.
Inline creation is retained at the bottom of each lane and uses the lane's
canonical status.

- [ ] **Step 4: Keep useful card context**

Update `KanbanCard` to show:

- title,
- Blocked badge when `task.status === 'blocked'`,
- Important or Critical priority only,
- project dot and name,
- organization dot and name when `ctx === 'all'`.

Remove tag grouping, tag counts, and the drag-grip decoration. Keep the whole
card draggable and clickable.

- [ ] **Step 5: Rename the route heading**

Use:

```tsx
<ViewShell
  eyebrow="Tasks"
  title="Board"
  subtitle="Move work from to do, to in progress, to done."
  compactHeader
  fullWidth
>
```

- [ ] **Step 6: Verify board tests and types**

Run:

```bash
pnpm --filter @ops-dashboard/web test -- src/lib/simple-kanban.test.ts
pnpm --filter @ops-dashboard/web typecheck
```

Expected: both PASS.

- [ ] **Step 7: Commit the board**

```bash
git add apps/web/src/components/kanban-board.tsx apps/web/src/app/'(app)'/kanban/page.tsx
git commit -m "feat: simplify the task board"
```

### Task 3: Simplify desktop and mobile navigation

**Files:**

- Modify: `apps/web/src/components/sidebar.tsx:1-175`
- Modify: `apps/web/src/components/mobile-nav.tsx:1-82`
- Modify: `apps/web/src/components/top-bar.tsx:1-80`
- Modify: `apps/web/src/components/view-shell.tsx:1-70`
- Modify: `apps/web/src/app/(app)/tasks/page.tsx:1-16`
- Modify: `apps/web/src/app/(app)/projects/page.tsx:1-16`
- Modify: `apps/web/scripts/verify-work-logger.mjs:159-163`

**Interfaces:**

- Consumes: existing routes, `QuickAdd`, `OrgSwitcher`, and command palette.
- Produces: the same exported shell components with fewer primary choices.

- [ ] **Step 1: Make the desktop primary navigation task-first**

Define:

```ts
const PRIMARY: NavItem[] = [
  { href: '/dashboard', label: 'Today', icon: CalendarCheck, shortcut: 'g h' },
  { href: '/tasks', label: 'Tasks', icon: ListTodo, shortcut: 'g t' },
  { href: '/kanban', label: 'Board', icon: KanbanSquare, shortcut: 'g k' },
  { href: '/projects', label: 'Projects', icon: FolderKanban, shortcut: 'g p' },
];

const SECONDARY: NavItem[] = [
  { href: '/calendar', label: 'Calendar', icon: Calendar, shortcut: 'g c' },
  { href: '/inbox', label: 'Inbox', icon: Inbox, shortcut: 'g i' },
  { href: '/notepad', label: 'Notepad', icon: NotebookPen, shortcut: 'g n' },
  { href: '/power-dialer', label: 'Power Dialer', icon: PhoneCall, shortcut: 'g l' },
];
```

Render PRIMARY under `Tasks`. Render SECONDARY inside a native `<details>`
labelled `More`. Keep Settings at the bottom. Remove Week and Month from the
sidebar, not from routing or command search. Change the brand subtitle from
`Work command` to `Your tasks` and remove the local-workspace status footer.

- [ ] **Step 2: Change mobile destinations**

Use Today and Tasks on the left, Board and Projects on the right:

```ts
const LEFT = [
  { href: '/dashboard', label: 'Today', icon: CalendarCheck },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
];

const RIGHT = [
  { href: '/kanban', label: 'Board', icon: KanbanSquare },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
];
```

Keep the center Add action and its `openWorkLogger('task')` behavior.

- [ ] **Step 3: Separate desktop and mobile top bars**

Render the `QuickAdd` surface only at `md` and above. On mobile render a compact
Taskify wordmark on the left, with `OrgSwitcher` and the search icon on the
right. Remove visible network, sync, theme, and Settings controls from the top
bar; they remain available in Settings and command search.

Desktop order:

1. one `QuickAdd` field,
2. workspace selector,
3. search.

Mobile order:

1. Taskify,
2. workspace selector,
3. search.

- [ ] **Step 4: Quiet the page heading**

Change `ViewShell` so the header is plain rather than a large `os-panel`. Use
`py-1` on compact headers, a maximum title size of `text-2xl`, and omit the
`Live workspace` status. Preserve `eyebrow`, `title`, `subtitle`, `meta`, and
`actions` props for secondary routes.

- [ ] **Step 5: Simplify route copy**

Tasks:

```tsx
<ViewShell eyebrow="Tasks" title="All tasks" subtitle="Find, finish, or update a task." compactHeader fullWidth>
```

Projects:

```tsx
<ViewShell eyebrow="Tasks" title="Projects" subtitle="Group related tasks around an outcome." compactHeader fullWidth>
```

- [ ] **Step 6: Update the existing mobile navigation smoke assertion**

In `verify-work-logger.mjs`, expect:

```js
for (const label of ['Today', 'Tasks', 'Add task', 'Board', 'Projects']) {
```

- [ ] **Step 7: Run shell verification**

Run:

```bash
pnpm --filter @ops-dashboard/web typecheck
pnpm --filter @ops-dashboard/web lint
```

Expected: both PASS.

- [ ] **Step 8: Commit the shell**

```bash
git add apps/web/src/components/sidebar.tsx apps/web/src/components/mobile-nav.tsx apps/web/src/components/top-bar.tsx apps/web/src/components/view-shell.tsx apps/web/src/app/'(app)'/tasks/page.tsx apps/web/src/app/'(app)'/projects/page.tsx apps/web/scripts/verify-work-logger.mjs
git commit -m "feat: focus navigation on tasks"
```

### Task 4: Add Whisper voice input to the mobile task composer

**Files:**

- Modify: `apps/web/src/lib/use-voice-input.ts:27-154`
- Modify: `apps/web/src/components/work-logger-dialog.tsx:1-760`
- Modify: `apps/web/src/components/quick-add.tsx:1-260`

**Interfaces:**

- Consumes: existing `useVoiceInput({ onTranscript })`.
- Produces: `VoiceInput.error: string | null`, a task composer microphone, and
  a remembered explicit destination for desktop All work capture.

- [ ] **Step 1: Expose voice failures from the shared hook**

Extend `VoiceInput`:

```ts
export interface VoiceInput {
  available: boolean;
  listening: boolean;
  transcribing: boolean;
  error: string | null;
  toggle: () => void;
}
```

Set `error` to null when a recording starts. Use these messages:

- permission or recorder start failure: `Microphone access was not available.`
- empty or failed transcription: `I could not transcribe that recording. Try again or type the task.`
- Web Speech error: `Voice input stopped. Try again or type the task.`

Return `{ available, listening, transcribing, error, toggle }`. Existing callers
that do not destructure `error` continue to compile.

- [ ] **Step 2: Hide mode switching in the normal Add task flow**

In `WorkLoggerPanel`, render the three-mode segmented control only when
`launchMode !== 'task'`. The center mobile Add action launches `task`, so its
dialog begins directly with the task field. Existing project and progress
launches keep their controls.

- [ ] **Step 3: Add the microphone to `TaskTitleField`**

Inside `TaskTitleField`, call:

```ts
const { available, listening, transcribing, error, toggle } = useVoiceInput({
  onTranscript: onTitleChange,
});
```

Wrap the input and mic in a relative container. The mic button must have:

```tsx
aria-label={
  transcribing ? 'Transcribing voice task' : listening ? 'Stop recording' : 'Start voice task'
}
```

Use `Mic`, `MicOff`, and `Loader2` icons for idle, recording, and transcription.
Show `Listening... tap to stop` or `Transcribing...` beneath the field. Render
the hook error with `role="alert"`. Do not auto-submit the transcript.

- [ ] **Step 4: Make the task destination summary plain**

Keep Inbox, Today, Tomorrow visible. Rename the details summary to:

```txt
{selectedProject?.name ?? selectedDestinationName} · {taskScheduleLabel(schedule, scheduledDate)}
```

The task form retains optional organization, project, custom date, and priority
inside Details.

- [ ] **Step 5: Remember the explicit desktop capture destination**

Import `LAST_TASK_DESTINATION_KEY` in `quick-add.tsx`. When the organization
select changes, save the selected value before updating local state:

```ts
const nextDestination = event.target.value;
window.localStorage.setItem(LAST_TASK_DESTINATION_KEY, nextDestination);
setDestinationOverride(nextDestination);
setProject(null);
```

When the component first resolves All work, read the stored value through a
hydration-safe `useSyncExternalStore` snapshot and pass it to
`resolveWorkDestination`. A single organization or Personal workspace still
wins over the stored value.

- [ ] **Step 6: Run type and lint checks**

Run:

```bash
pnpm --filter @ops-dashboard/web typecheck
pnpm --filter @ops-dashboard/web lint
```

Expected: both PASS.

- [ ] **Step 7: Commit voice capture**

```bash
git add apps/web/src/lib/use-voice-input.ts apps/web/src/components/work-logger-dialog.tsx apps/web/src/components/quick-add.tsx
git commit -m "feat: add voice to the task composer"
```

### Task 5: Turn the dashboard into a focused Today agenda

**Files:**

- Modify: `apps/web/src/components/dashboard/work-dashboard.tsx:1-467`
- Test: `apps/web/src/lib/work-dashboard.test.ts`

**Interfaces:**

- Consumes: `buildWorkDashboard`, `useOrgStore`, `setTaskStatus`, and
  `useAppStore.openEdit`.
- Produces: the existing `WorkDashboard` export with a focused agenda.

- [ ] **Step 1: Preserve and run the model tests before the rewrite**

Run:

```bash
pnpm --filter @ops-dashboard/web test -- src/lib/work-dashboard.test.ts
```

Expected: PASS.

- [ ] **Step 2: Remove duplicate capture and portfolio UI**

Remove:

- `QuickTaskEntry`,
- the page-level Capture task action,
- `DashboardCounts`,
- the active projects grid and `ProjectSummary`,
- project creation controls.

Keep the same Dexie query and `buildWorkDashboard` call.

- [ ] **Step 3: Render the focused agenda**

Use a compact shell:

```tsx
<ViewShell
  eyebrow={contextLabel}
  title="Today"
  subtitle={format(new Date(), 'EEEE, MMMM d')}
  compactHeader
  fullWidth
>
```

Render up to three sections:

1. `Overdue` only when `model.overdue.length > 0`.
2. `Today` always.
3. `Upcoming` with the existing limited `model.upcoming`.

Use one centered column with `max-w-4xl`. Each section header contains only its
title and count. Empty Today copy is `Nothing due today.` with an Add task
button that calls `openWorkLogger('task')`.

- [ ] **Step 4: Keep fast row actions and context**

Each agenda row keeps:

- 40 to 44 pixel completion target,
- clickable title opening the task drawer,
- due label,
- project dot and name,
- organization dot and name in All work,
- important or critical priority dot.

Do not show organization text in a single workspace view.

- [ ] **Step 5: Run model tests and typecheck**

Run:

```bash
pnpm --filter @ops-dashboard/web test -- src/lib/work-dashboard.test.ts
pnpm --filter @ops-dashboard/web typecheck
```

Expected: both PASS.

- [ ] **Step 6: Commit Today**

```bash
git add apps/web/src/components/dashboard/work-dashboard.tsx
git commit -m "feat: focus the Today agenda"
```

### Task 6: Simplify task list controls

**Files:**

- Modify: `apps/web/src/components/tasks-view.tsx:1-520`
- Test: `apps/web/src/lib/task-query.test.ts`

**Interfaces:**

- Consumes: existing task query helpers and organization scope.
- Produces: the existing `TasksView` component with reduced controls.

- [ ] **Step 1: Run task query tests before editing**

Run:

```bash
pnpm --filter @ops-dashboard/web test -- src/lib/task-query.test.ts
```

Expected: PASS.

- [ ] **Step 2: Reduce status filters**

Change:

```ts
type StatusFilter = 'open' | 'done';

const STATUS_TABS = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
] as const;
```

Remove the `all` branch from the filtered task computation.

- [ ] **Step 3: Remove duplicate creation controls**

Remove `QuickTaskEntry`, the in-page New task button, and
`openWorkLogger` from this view. The desktop header and mobile center Add action
remain the task creation paths.

- [ ] **Step 4: Collapse advanced filters**

Add:

```ts
const [filtersOpen, setFiltersOpen] = useState(false);
const activeFilterCount = Number(Boolean(projectFilter)) + Number(Boolean(domainFilter));
```

The always-visible toolbar contains:

- search input,
- Open and Done segmented control,
- Filters button with the active count.

Render project and domain dropdowns only when `filtersOpen` is true. Keep a
Clear filters action when either filter is selected.

- [ ] **Step 5: Load organization labels for All work**

Include `db.organizations.toArray()` in the existing live query, filter active
records, and build `organizationMap`. Pass these optional props to each row:

```ts
organizationName={ctx === 'all' ? organizationMap.get(taskLane(task, projectMap))?.name ?? 'Personal' : undefined}
organizationColor={ctx === 'all' ? organizationMap.get(taskLane(task, projectMap))?.color ?? PERSONAL_COLOR : undefined}
```

Render the organization dot and label beside the project metadata only when
both props are provided.

- [ ] **Step 6: Simplify row metadata**

Keep title, due date, project, organization in All work, and Important or
Critical priority. Remove low-priority labels and decorative star controls from
the list row. Task editing remains available by tapping the row. Remove the
create button and callback from `EmptyState`; its open-task copy becomes
`Use Add below on mobile, or the task bar above on desktop.`

- [ ] **Step 7: Run focused checks**

Run:

```bash
pnpm --filter @ops-dashboard/web test -- src/lib/task-query.test.ts
pnpm --filter @ops-dashboard/web typecheck
pnpm --filter @ops-dashboard/web lint
```

Expected: all PASS.

- [ ] **Step 8: Commit the list**

```bash
git add apps/web/src/components/tasks-view.tsx
git commit -m "feat: simplify task list controls"
```

### Task 7: Verify the complete task-first flow

**Files:**

- Modify only files required to fix verification defects found in Tasks 1 to 6.

**Interfaces:**

- Consumes: the complete task-first shell.
- Produces: a verified production build and browser evidence at desktop and
  mobile sizes.

- [ ] **Step 1: Run focused unit suites**

Run:

```bash
pnpm --filter @ops-dashboard/web test -- src/lib/simple-kanban.test.ts src/lib/work-dashboard.test.ts src/lib/task-query.test.ts src/lib/work-logger.test.ts src/lib/task-capture.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run all web unit tests**

Run:

```bash
pnpm --filter @ops-dashboard/web test
```

Expected: PASS.

- [ ] **Step 3: Run static verification**

Run:

```bash
pnpm --filter @ops-dashboard/web typecheck
pnpm --filter @ops-dashboard/web lint
pnpm format:check
```

Expected: all PASS. If formatting fails only in touched files, run Prettier on
those exact files and repeat the checks.

- [ ] **Step 4: Build production Next.js**

Run:

```bash
NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter @ops-dashboard/web build
```

Expected: production build completes with all routes generated.

- [ ] **Step 5: Run desktop browser smoke checks**

At 1440 by 1000 verify:

- primary nav is Today, Tasks, Board, Projects,
- one desktop capture field is visible,
- workspace selector changes the task scope,
- Today has no duplicate capture form or project grid,
- Tasks has search, Open/Done, and Filters,
- Board has exactly To do, In progress, Done,
- adding and completing a task works.

- [ ] **Step 6: Run mobile browser smoke checks**

At 390 by 844 verify:

- top capture field is hidden,
- bottom nav is Today, Tasks, Add, Board, Projects,
- Add opens directly to task capture without mode tabs,
- a microphone button is present when voice is available,
- Board scrolls horizontally across all three lanes,
- no page creates horizontal viewport overflow.

Save final screenshots under `output/playwright/task-first-*.png`.

- [ ] **Step 7: Inspect the final diff**

Run:

```bash
git status --short
git diff --check
git log --oneline -8
```

Expected: no whitespace errors and only intended source or screenshot changes.

- [ ] **Step 8: Commit verification fixes if needed**

If verification required source fixes:

```bash
git add apps/web/src/lib/simple-kanban.ts apps/web/src/lib/simple-kanban.test.ts apps/web/src/lib/use-voice-input.ts apps/web/src/components/kanban-board.tsx apps/web/src/components/sidebar.tsx apps/web/src/components/mobile-nav.tsx apps/web/src/components/top-bar.tsx apps/web/src/components/quick-add.tsx apps/web/src/components/view-shell.tsx apps/web/src/components/work-logger-dialog.tsx apps/web/src/components/dashboard/work-dashboard.tsx apps/web/src/components/tasks-view.tsx apps/web/src/app/'(app)'/tasks/page.tsx apps/web/src/app/'(app)'/kanban/page.tsx apps/web/src/app/'(app)'/projects/page.tsx apps/web/scripts/verify-work-logger.mjs
git commit -m "fix: harden task-first interactions"
```

If no source fixes were needed, do not create an empty commit.
