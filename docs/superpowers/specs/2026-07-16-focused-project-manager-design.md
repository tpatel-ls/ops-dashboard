# Focused Project Manager Design

**Date:** 2026-07-16
**Status:** Approved

## Objective

Turn the application into a focused project manager where the fastest and most obvious action is logging a task into the correct personal or organization workspace.

The primary experience must answer four questions immediately:

1. What needs attention today?
2. What should I work on next?
3. Which project does this work belong to?
4. What is the fastest way to record a new task?

## Product Boundary

The primary application will focus on:

- Work dashboard
- Tasks
- Projects
- Calendar
- Inbox
- Organization context
- Search and settings

Habits, routines, food, identity scoring, and lifestyle metrics will be removed from primary navigation, mobile navigation, dashboard content, command shortcuts, and preload behavior. Their routes and stored records will remain intact. This avoids destructive data changes and keeps a future archive or export path available.

Specialized LSG tools such as Power Dialer and Kanban remain available from a secondary Tools section on desktop and the command palette. They do not compete with the core daily workflow.

## Information Architecture

### Desktop Navigation

The sidebar will use three small groups:

- Work: Home, Tasks, Projects, Calendar, Inbox
- Tools: Kanban, Power Dialer, Notepad
- System: Search, Settings

The product name becomes `Taskify` with the descriptor `Project command`.

### Mobile Navigation

The bottom navigation will contain:

- Home
- Tasks
- Add task
- Projects
- Calendar

The center add action opens task capture directly. It will not expose project creation or progress logging until the user deliberately changes the capture mode.

### Route Behavior

- `/dashboard` is the new Work Dashboard.
- `/tasks` remains the complete task view.
- `/projects` remains the project workspace.
- `/calendar` remains the cumulative schedule.
- `/today` remains available for compatibility but is not a primary destination.

## Work Dashboard

The dashboard is an operational surface, not a scorecard.

### Header

- Title: `Work Dashboard`
- Current date and selected organization context
- Primary `Add task` button
- Compact counts for overdue, due today, and active projects

### Quick Capture

A persistent quick task form appears first in dashboard content.

- Task title is the primary field and receives focus when requested.
- Pressing Enter saves the task.
- Organization defaults to the active organization context. Under the All context, it defaults to the most recently used destination and falls back to Personal.
- Project defaults to the most recently used valid project for that destination.
- Today is the default schedule on the dashboard.
- Optional controls expose organization, project, schedule, and priority without blocking the first save.
- After saving, the title clears and focus remains in the task field for rapid entry.
- A live status message confirms where the task was saved.

### Work Sections

The dashboard uses unframed sections and restrained row surfaces:

- Attention: overdue and due-today tasks
- Next up: upcoming scheduled tasks
- Active projects: project name, organization, open task count, completed ratio, due date, and a direct add-task action

Empty states provide one clear creation action.

## Task Experience

The Tasks page keeps search and filters but gains a quick capture row at the top.

- New tasks default to the active organization context.
- Task rows continue to support completion, priority, editing, and project assignment.
- Search, status, organization, and project filters remain available.
- Mobile controls wrap without horizontal page scrolling.
- The primary task list remains dense and scan-friendly.

## Project Experience

Projects retain the current data model and creation flow, but project work becomes easier to log.

- Each project card exposes a direct add-task action.
- Opening a project keeps task creation near the project title.
- Tasks created from a project inherit its organization and domain.
- Project cards show active task count, completion ratio, status, and due date.
- Search, status filtering, and sorting remain available.
- Desktop can use the existing board and detail overlay pattern for this iteration.
- Mobile uses a full-width detail surface with no horizontal overflow.

## Capture Dialog

The existing work logger remains for full task, project, and progress entry, but Task mode becomes lighter.

- Task title appears before organization controls.
- Organization and project controls are grouped under `Details`.
- The active organization and recent project are preselected.
- Schedule and priority remain available but do not dominate the initial screen.
- The save label is short and direct: `Add task`.
- Keyboard submit remains Cmd+Enter or Ctrl+Enter.
- Existing validation, focus management, offline save behavior, and sync status remain intact.

## Data Flow

No schema migration is planned.

1. UI resolves a destination from active organization context, recent destination, and Personal fallback.
2. Project choices are filtered to the resolved destination.
3. Task creation uses the existing `addTask` mutation.
4. Dexie updates the UI immediately.
5. The existing outbox and Supabase sync engine propagate the record when sync is available.
6. Failures retain user input and show a concise error message.

The redesign must not delete or transform habit, routine, food, or identity records.

## Accessibility

- All add actions have explicit accessible names.
- Task capture status uses a polite live region.
- Advanced controls use native labels and inputs.
- Touch targets are at least 44 pixels on coarse pointers.
- Keyboard focus remains visible and returns correctly after dialogs.
- Reduced motion behavior remains supported.

## Responsive Behavior

- 360 to 767 pixels: single-column dashboard, bottom navigation, full-width task capture, stacked project metadata.
- 768 to 1199 pixels: sidebar, compact two-column project summary where space allows.
- 1200 pixels and above: dashboard attention and project sections use wider grid tracks without fixed page widths.
- No primary route may create document-level horizontal overflow.

## Error Handling

- Blank task titles are rejected without clearing the form.
- Invalid recent organization or project selections fall back safely.
- A failed local write leaves entered text intact.
- Offline saves clearly indicate that sync is pending.
- Route-level recovery remains available through the authenticated error boundary.

## Verification

- Unit tests for destination and recent-project fallback behavior.
- Component-focused lint and TypeScript checks for every edited surface.
- Browser flow for rapid consecutive task entry.
- Browser flow for organization-scoped and project-scoped task entry.
- Responsive checks at 360, 390, 412, 768, 1024, and 1440 pixels.
- Console error scan on Dashboard, Tasks, Projects, and Calendar.
- Full tests, typecheck, lint, production build, and Git diff validation before push.

## Success Criteria

- A user can log a task from the first screen using one text field and Enter.
- A user can log multiple tasks without repeatedly opening and closing a dialog.
- A user can place work into Personal or an organization project without navigating away.
- The main navigation contains no workout, habit, routine, food, or identity-management entries.
- Existing data and cross-device sync behavior remain compatible.
- The application has no horizontal page scroll at the verified device widths.
