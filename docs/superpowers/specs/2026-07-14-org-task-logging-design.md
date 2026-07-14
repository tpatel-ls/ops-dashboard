# Organization-first task and project logging

Date: 2026-07-14. Status: approved by Tanay for end-to-end execution.

## Goal

Make it fast and unambiguous to create tasks for each organization Tanay works
for, create projects inside those organizations, and log progress against those
projects. The same workflow must be comfortable on a Galaxy S24 Ultra, Galaxy
Tab S10, Mac, and Windows. Records continue to sync through the existing
local-first Dexie, outbox, Supabase, and Realtime pipeline.

## Product decisions

- One universal logger handles Task, Project, and Progress modes.
- Every work record is filed into an organization or Personal. The selected
  destination stays visible while entering data and in the final save action.
- Project choices are limited to the selected organization so a task cannot be
  accidentally attached across organization boundaries.
- The logger remembers the last concrete destination on each device. If the
  current app context is a specific organization or Personal, that context wins.
- All is a viewing context, not a valid destination. When the app is in All and
  no previous destination exists, Personal is the safe default.
- Organization context remains per-device. Records and their organization
  assignments sync across devices.

## Current problems addressed

1. The project creation form does not set `orgId`. A project created while an
   organization filter is active can disappear from the view immediately.
2. Mobile capture can create tasks but does not expose organization assignment.
3. The top-bar project picker mixes projects from every organization and does
   not show the organization behind each project.
4. Organization management is buried in Settings, making first-time setup slow.
5. Save feedback does not tell the user whether the record is synced or queued
   offline.

## Universal logger

The existing center Capture action on mobile and universal capture entry points
open the same organization-first logger.

### Shared header

- Segmented mode control: Task, Project, Progress.
- Organization rail: active organizations followed by Personal.
- Each destination uses its existing color and name. The selected destination
  gets a strong focus treatment without changing layout.
- An Add organization action opens a compact inline name and color form.
- Close control and accessible dialog title.

### Task mode

- Required title input with immediate focus.
- Optional project picker filtered by the selected destination.
- Schedule control with Inbox, Today, Tomorrow, and Pick date choices.
- Compact priority control with Normal, Important, and Critical choices.
- Primary action includes the destination, such as `Add to LS Global Group`.
- Saving creates a task with the selected `orgId`. When a project is selected,
  the task inherits the project's `orgId` and `domainId`.

### Project mode

- Required project name.
- Organization comes from the shared destination rail.
- Type control: Project, Area, or Retainer.
- Optional due date and description. Additional project detail stays in the
  existing detail drawer.
- Saving creates the project with the selected `orgId` and opens its detail.

### Progress mode

- Project picker filtered by the selected destination and required to save.
- Duration in minutes with 15, 30, and 60 minute shortcuts plus manual entry.
- Optional progress note.
- Saving creates a work log and updates the project's `lastWorkedAt`.

## Projects page

- The existing New project form gains a visible organization selector.
- Its initial selection follows the active context or last concrete destination.
- Project cards show their organization when the page is in All context.
- A compact `Log progress` action opens the universal logger in Progress mode
  with that project preselected.
- The empty state action opens the project logger instead of revealing a second
  form pattern.

## Tasks and quick capture

- The top bar keeps its fast single-line capture for desktop productivity.
- Its project picker groups and labels projects by organization.
- Selecting a project remains the fastest path and inherits the organization.
- When no project is selected, a visible destination control assigns the task's
  organization before saving.
- The mobile center action always opens the full logger because the screen has
  room for an explicit destination and schedule without horizontal overflow.

## Responsive behavior

### Phone

- Full-width bottom sheet anchored above safe-area navigation.
- One-column fields, minimum 44px touch targets, no nested horizontal scrollers.
- The organization rail wraps into a compact two-column destination grid when
  names do not fit.
- The keyboard may cover secondary fields, but never the title or save action.

### Tablet

- Centered dialog up to 680px wide with two-column secondary fields.
- Organization destinations stay on one wrapping row.

### Mac and Windows

- Centered dialog with keyboard-first behavior.
- Enter saves when focus is in the title field and required fields are valid.
- Escape closes. Arrow keys move through segmented controls and destinations.

### Galaxy Watch

- The current web app does not become an independent Wear OS application in
  this scope.
- Watch voice or shortcut capture hands text to the signed-in phone flow. The
  phone performs organization selection and sync.
- A true standalone Watch application remains a separate native Wear OS build.

## Data flow and sync

1. The UI creates records through existing sync-aware helpers.
2. Dexie stores the record immediately, so the UI responds offline.
3. The helper enqueues an outbox operation.
4. Supabase receives the operation when connected.
5. Realtime and the safety pull deliver it to other signed-in devices.
6. The logger reports `Synced`, `Saved offline`, or `Needs attention` using the
   existing sync status store.

No database migration is required. `Task.orgId`, `Project.orgId`,
`Organization`, and `WorkLog` already exist and are synced. The implementation
must not expose Supabase service credentials to the client and must retain the
existing owner-scoped RLS policies.

## Error handling

- Validation remains inline and preserves entered data.
- If saving locally fails, keep the logger open and name the failed action.
- If local save succeeds while sync is offline, close normally and show the
  queued state. Do not present this as a failed save.
- If the selected organization is archived from another device, fall back to
  Personal and require confirmation before saving.
- A project whose organization no longer matches the selected destination is
  cleared from the picker.

## Accessibility

- Dialog focus is trapped and returns to the invoking control on close.
- Every icon-only control has an accessible name and tooltip where unfamiliar.
- Organization and status information is never color-only.
- Inputs use visible labels and error text is connected with `aria-describedby`.
- Reduced-motion preferences disable sheet and selection animation.

## Testing and verification

- Unit tests cover destination resolution, active-context defaults, project
  filtering, and organization inheritance.
- Component tests cover all three modes, validation, mode switching, and
  offline status messaging.
- Browser tests create an organization task, organization project, and progress
  log, then confirm each appears in the matching filtered view.
- Responsive browser checks run at 360, 390, 412, 768, 1024, and 1440 pixel
  widths with an assertion that no route creates horizontal overflow.
- Sync verification creates a record in one signed-in browser context, waits
  for Supabase persistence, and confirms it appears in a second context.
- Final checks: tests, typecheck, lint, production build, production deployment,
  health endpoint, and production mobile smoke test.

## Non-goals

- Multi-user organizations, role management, team sharing, or invitations.
- Replacing the existing natural-language capture and AI routing system.
- Building a native Android, desktop, or Wear OS application in this change.
- Syncing the active organization lens between devices.
