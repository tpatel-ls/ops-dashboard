# Zero-friction Taskify UI

Date: 2026-07-26. Status: approved by Tanay through delegated product authority
("do everything you recommend, don't ask questions, and don't stop until you are done").

## Goal

Make the existing task-first Taskify experience faster, clearer, and more forgiving
on desktop and mobile without changing its local-first data model or adding product
complexity.

The user owns five parallel lanes: four work organizations and Personal. The app
must make capture feel instant, keep the selected lane visible, and make the next
task action obvious. The Kanban board remains a first-class view, but the product
should feel closer to a calm personal task list than an operations console.

## Approaches considered

### A. Another structural redesign

Rebuild the shell, routes, and task surfaces again. This would create visual novelty
but would also disturb the task-first information architecture that is already
working and increase regression risk.

### B. Add more productivity features

Add saved views, custom board columns, dashboards, bulk editing, and automation.
Those features create more decisions and move the app away from the requested
Google Tasks level of simplicity.

### C. Friction-budget pass

Keep the current architecture and remove small points of hesitation across capture,
Today, Tasks, Board, Projects, organization context, mobile navigation, loading,
and error recovery.

This is the selected approach. Each change must make an existing action faster,
clearer, safer, or more accessible. No commit exists only to increase the commit
count.

## Product rules

1. One obvious primary action per surface.
2. Task text survives every recoverable failure.
3. Voice fills an editable draft before a task is saved.
4. Search and filters are reversible in one action.
5. Dates use human language before calendar notation.
6. Organization context is visible wherever a task could be created.
7. Mobile controls provide at least a 44 pixel touch target.
8. Keyboard users can capture, search, complete, edit, and move tasks.
9. Empty states explain the next useful action.
10. Feedback is brief, specific, and announced to assistive technology.

## Visual direction

### Subject

A private daily task notebook for one person balancing several distinct work
identities. The single job of every primary view is to help the user capture or
finish the next task.

### Palette

Retain the current semantic palette:

- Paper: `oklch(0.985 0.005 80)`
- Card: `oklch(1 0 0)`
- Ink: `oklch(0.18 0.02 280)`
- Burnt amber: `oklch(0.65 0.18 38)`
- Garden green: `oklch(0.65 0.16 150)`
- Signal red: `oklch(0.6 0.21 25)`

The dark theme retains its existing mapped tokens. Organization colors provide
context only and never become large decorative fields.

### Type

Inter remains the task and interface face because scanning speed matters more than
display personality. JetBrains Mono is limited to real keyboard shortcuts and
compact operational data. Uppercase mono eyebrows are removed from primary work
surfaces where they add ceremony without meaning.

### Layout

Desktop:

```text
┌────────────┬────────────────────────────────────────────┐
│ Today      │ [ Add a task… ][workspace][project][voice]│
│ Tasks      ├────────────────────────────────────────────┤
│ Board      │ View title                    quiet action │
│ Projects   │                                            │
│            │      one focused work surface              │
│ More       │                                            │
└────────────┴────────────────────────────────────────────┘
```

Mobile:

```text
┌──────────────────────────────┐
│ Taskify       [workspace][⌕] │
├──────────────────────────────┤
│ focused view content         │
│                              │
├──────────────────────────────┤
│ Today Tasks  [+] Board Proj. │
└──────────────────────────────┘
```

### Signature

The capture rail is Taskify's memorable element. It behaves like the first blank
line on a fresh index card: always ready, visibly scoped, voice-enabled, and calm.
The rest of the UI stays deliberately quiet so the capture rail earns attention.

### Self-critique

The existing paper palette and amber accent could become a generic warm productivity
theme. The design avoids that by spending its distinctiveness on the organization-
aware capture rail and task-card mechanics rather than adding decorative texture,
oversized typography, gradients, or ornamental numbering.

## Improvement groups

### Capture

- Remove automatic daily-review interruption.
- Provide deliberate review access in search and commands.
- Add a direct capture keyboard shortcut and visible hint.
- Keep voice transcripts editable before saving.
- Add explicit submit and clear actions.
- Show destination and project context in plain language.
- Announce success, failure, recording, and transcription states.
- Keep retry local and preserve the draft.

### Today and Tasks

- Humanize date labels.
- Make completion controls easier to hit and understand.
- Add clear search and filter-reset actions.
- Show useful result summaries.
- Add due-aware sort choices without changing defaults.
- Separate overdue work visually.
- Make empty states open the right composer.
- Improve completed-task legibility and restore actions.

### Board

- Add lane purpose copy and mobile position cues.
- Show human due dates on cards.
- Add direct complete and edit affordances.
- Make keyboard movement possible without drag.
- Announce moves and preserve blocked-task meaning.
- Improve inline-add progress and failure feedback.

### Projects and organizations

- Make project creation explain its current workspace.
- Add search and clear actions.
- Show task progress in project summaries.
- Make empty states useful.
- Show task counts and explanatory copy in the workspace switcher.
- Keep Personal and All work semantics explicit.

### Mobile and system quality

- Improve safe-area behavior and keyboard viewport handling.
- Strengthen sticky shell surfaces and touch feedback.
- Make loading skeletons match real layouts.
- Make errors return to Today in plain language.
- Add consistent reduced-motion, focus, and screen-reader behavior.

## Technical boundaries

- Keep Next.js App Router, React, Dexie, Supabase sync, Zustand, and dnd-kit.
- Do not add dependencies.
- Do not change database schemas or migrations.
- Do not add multi-user permissions, members, or invitations.
- Prefer small pure helpers for date, result-summary, and board-move behavior.
- Follow red-green-refactor for behavioral helpers and regressions.
- Preserve local-first creation and existing sync queues.
- Keep secondary routes available through More and command search.

## Verification

- Focused unit tests for every new pure behavior.
- Existing core and web suites remain green.
- Web TypeScript and ESLint pass.
- Production Next.js build passes.
- Desktop and mobile browser smoke checks cover capture, Tasks, Board, Projects,
  workspace switching, keyboard access, and empty states.
- The final branch contains exactly 37 new commits after `53c97ca`.
