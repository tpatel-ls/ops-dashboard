# Task-first simplicity redesign

Date: 2026-07-25. Status: approved by Tanay through delegated product authority
("do everything you recommend, don't ask questions, and don't stop until you are done").

## Goal

Make Taskify feel as easy as Google Tasks while retaining the useful differentiators:

- a kanban board,
- private organization workspaces for one user,
- a combined All work view,
- manual and Whisper-backed voice task capture,
- local-first storage and cross-device sync.

The redesign must reduce visible choices, duplicate entry points, and dashboard
ceremony. Existing data and secondary features stay intact.

## Product principles

1. Adding a task is the shortest path in the product.
2. The current workspace is always obvious and becomes the default destination.
3. One action has one primary control on each screen size.
4. Advanced metadata is available after capture, not required before capture.
5. All work is a real combined view, not another organization.
6. Secondary tools never compete with today's tasks.
7. No destructive migration or deletion is required for this redesign.

## Approaches considered

### A. Cosmetic cleanup

Keep every current surface and reduce spacing, labels, and decoration. This is
low risk but does not fix the core issue: the app still presents several capture
controls, many navigation destinations, and dense task controls at once.

### B. Task-first shell

Keep the current data model and mature task logic, but redesign navigation and
the main work views around four destinations and one capture path per viewport.
Secondary features remain reachable without living in primary navigation.

This is the selected approach. It creates a major usability improvement with
low data and sync risk.

### C. Full task-system rebuild

Replace the existing task UI and state flows wholesale. This could produce a
clean result but creates unnecessary risk around sync, natural-language parsing,
task editing, organization inheritance, and existing data.

## Information architecture

### Primary work views

- Today: the default landing page and daily agenda.
- Tasks: the searchable list of open or completed tasks.
- Board: the kanban view.
- Projects: project-level organization and task entry.

### Secondary views

Calendar, Inbox, Notepad, and Power Dialer remain available under a visually
quiet More section on desktop and through command search on every device.
Settings remains at the bottom of desktop navigation and in command search.
Routes and data are not removed.

### Mobile navigation

The five bottom destinations are:

1. Today
2. Tasks
3. Add
4. Board
5. Projects

The Add control opens a task-first composer. Project creation and progress
logging stay in their relevant project surfaces instead of competing with task
capture in the default composer.

## Workspace model

Organizations are private lanes owned and used by one person. There are no
members, invites, roles, or team permissions.

The global workspace selector continues to offer:

- All work,
- each active organization,
- Personal.

The selected workspace scopes Today, Tasks, Board, Projects, and Calendar.
When a single organization or Personal is selected, new tasks default to that
lane. In All work, capture uses the last explicit destination when it is still
valid and otherwise defaults to Personal. Task rows and cards in All work show a
compact organization color and label.

## Capture experience

### Desktop

The top bar contains the single persistent capture field:

- type and press Enter to add,
- tap the microphone to record,
- Whisper transcription is submitted through the existing `/api/transcribe`
  endpoint,
- the transcript is added as a task through the same task creation path,
- the current organization or selected destination is visible but quiet,
- project and advanced metadata remain optional.

### Mobile

The cramped top capture bar is removed. The center Add control opens the task
composer with:

- an immediately focused title field,
- a prominent microphone control using the existing shared voice hook,
- Inbox, Today, and Tomorrow shortcuts,
- the resolved organization destination,
- optional project, date, and priority controls behind Details,
- a single Add task action.

Voice transcription fills the composer so the user can correct it before
saving. This avoids silent transcription mistakes while keeping the path short.

### Error behavior

- Text is never cleared when creation fails.
- Recording and transcription states are visible and announced.
- Voice failure leaves the composer open and allows immediate typing.
- Offline task creation continues through the local-first database.

## Today

Today becomes a focused agenda, not a portfolio dashboard.

- A compact page heading shows the date and current workspace.
- Overdue tasks appear first when present.
- Today's tasks follow in one readable list.
- A small upcoming section shows the next few scheduled tasks.
- Completing and opening a task remain one-tap actions.
- Project and organization metadata appear only when useful.
- The duplicate dashboard capture form, capture button, count tiles, and active
  project grid are removed.

Projects remain one tap away in primary navigation.

## Tasks

The task list has one compact control row:

- search,
- Open and Done tabs,
- a Filters button.

Filters reveal project and domain selectors only when requested. The All status
tab and redundant New task button are removed. The global desktop capture or
mobile Add action is the creation path.

Rows prioritize:

1. completion control,
2. title,
3. due date,
4. project and organization context,
5. important or critical priority.

## Board

The default board has three lanes:

- To do,
- In progress,
- Done.

Existing statuses map safely:

- backlog, todo, and blocked appear in To do,
- doing appears in In progress,
- done appears in Done,
- archived remains hidden.

Blocked tasks keep a visible Blocked badge. Dragging a task to To do sets it to
todo, dragging to In progress sets it to doing, and dragging to Done sets it to
done. No records are migrated.

The project, priority, and tag grouping controls are removed from the main board
to keep the interaction obvious. Task cards retain project, organization, and
priority context.

On mobile, lanes use horizontal scrolling with scroll snap instead of one long
vertical stack. Each lane is nearly viewport width and independently scrollable.
Desktop shows all three lanes in a stable grid.

## Visual direction

The existing warm dark and light themes remain. The redesign removes
command-center styling:

- fewer gradients and status decorations,
- smaller page headers,
- more whitespace around task groups,
- plain language instead of operational jargon,
- organization colors used as context, not decoration,
- 44 pixel minimum touch targets on mobile.

## Technical boundaries

- Keep the existing Next.js App Router structure.
- Keep Dexie, Supabase sync, Zustand stores, and current task types.
- Reuse `addTask`, natural-language parsing, `useVoiceInput`, and
  `/api/transcribe`.
- Add small pure helpers for simple board status mapping so the behavior is
  unit-tested.
- Prefer focused components over adding more logic to already large views.
- Do not modify database schemas or production migrations.

## Testing

### Unit

- Board status grouping maps all current task statuses correctly.
- Board drops produce the intended canonical status.
- Existing task query and organization-context suites remain green.

### Component and browser

- Desktop capture adds a task to the selected workspace.
- Mobile Add opens the task composer.
- The task composer exposes a voice control when voice input is available.
- All work displays tasks from multiple organizations with labels.
- A single organization view filters Today, Tasks, Board, and Projects.
- Mobile board lanes scroll horizontally and expose all three lanes.
- Completing a task updates it immediately.

### Repository verification

- targeted unit tests,
- web typecheck,
- web lint,
- production Next.js build,
- desktop and mobile Playwright smoke checks.

## Out of scope

- multi-user organization membership,
- role-based access control,
- deleting or migrating secondary feature data,
- replacing Whisper or the existing sync stack,
- calendar redesign,
- native mobile applications.
