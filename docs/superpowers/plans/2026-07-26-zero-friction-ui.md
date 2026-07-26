# Zero-friction Taskify UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship exactly 35 focused product improvements after the design and plan commits, making Taskify faster and clearer on desktop and mobile.

**Architecture:** Preserve the current task-first shell and local-first data layer. Improve existing React surfaces with small state changes and pure presentation helpers; behavior changes receive focused Vitest coverage before production code.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Dexie, Zustand, dnd-kit, Vitest, Playwright.

## Global Constraints

- Start from commit `53c97ca` and finish exactly 37 commits ahead of it.
- Commits 1 and 2 are the design and implementation-plan commits.
- Commits 3 through 37 each ship one distinct UI or usability improvement.
- Do not add dependencies, schemas, migrations, members, roles, or invitations.
- Preserve local-first creation and Supabase sync behavior.
- Voice capture must leave an editable draft before saving.
- New behavioral helpers follow red-green-refactor.
- Mobile controls provide a 44 pixel target.
- Do not add em dashes to UI copy.
- Mirror source changes to `/Users/tanaypatel/Desktop/taskify` after verification.

## File structure

- `apps/web/src/lib/task-presentation.ts`: human task dates and result summaries.
- `apps/web/src/lib/task-presentation.test.ts`: pure presentation behavior.
- `apps/web/src/lib/board-actions.ts`: legal keyboard board transitions.
- `apps/web/src/lib/board-actions.test.ts`: transition coverage.
- `apps/web/src/components/app-shell.tsx`: interruption policy and capture shortcut.
- `apps/web/src/components/command-palette.tsx`: review access and simpler destinations.
- `apps/web/src/components/quick-add.tsx`: editable voice, submit, clear, feedback, and picker.
- `apps/web/src/components/tasks-view.tsx`: search, filters, sort, dates, and empty states.
- `apps/web/src/components/dashboard/work-dashboard.tsx`: useful agenda summaries.
- `apps/web/src/components/kanban-board.tsx`: board context, actions, feedback, and mobile cues.
- `apps/web/src/components/projects-board.tsx`: project search, progress, context, and empty states.
- `apps/web/src/components/org-switcher.tsx`: lane meaning and task counts.
- `apps/web/src/components/mobile-nav.tsx`: safe-area and press feedback.
- `apps/web/src/components/top-bar.tsx`: sticky responsive capture surface.
- `apps/web/src/app/(app)/loading.tsx`: task-shaped loading state.
- `apps/web/src/app/(app)/error.tsx`: plain recovery UI.

---

### Task 1: Stop automatic review interruption

**Files:** Modify `apps/web/src/components/app-shell.tsx`.

- [ ] Remove `DailyReviewTrigger` from the always-mounted shell so opening Taskify never produces an unsolicited modal.
- [ ] Run `pnpm --filter @ops-dashboard/web typecheck`.
- [ ] Commit with `fix: stop automatic daily review interruptions`.

### Task 2: Add deliberate daily review access

**Files:** Modify `apps/web/src/components/command-palette.tsx`, `apps/web/src/components/daily-review.tsx`.

- [ ] Export a `DailyReviewDialog` that reads `reviewOpen`, and add a `Review today` command calling `openReview()`.
- [ ] Mount only the dialog in `AppShell`:

```tsx
<DailyReviewDialog />
```

- [ ] Verify typecheck and commit `feat: make daily review a deliberate action`.

### Task 3: Add a universal capture shortcut

**Files:** Modify `apps/web/src/components/app-shell.tsx`, `apps/web/src/components/help-overlay.tsx`.

- [ ] Register `q` to focus `[data-quick-task-input]` on desktop and open the mobile composer when that input is not visible.
- [ ] Add `Q` to the documented shortcut list.
- [ ] Verify typecheck and commit `feat: add one-key task capture`.

### Task 4: Keep voice transcripts editable

**Files:** Modify `apps/web/src/components/quick-add.tsx`.

- [ ] Change `onTranscript` from immediate capture to `setValue(text)`.
- [ ] Keep focus in the input and announce that the transcript is ready to review.
- [ ] Verify existing voice tests and commit `fix: review voice text before saving`.

### Task 5: Add an explicit quick-add submit action

**Files:** Modify `apps/web/src/components/quick-add.tsx`.

- [ ] Render a labelled arrow submit button whenever the draft is non-empty.
- [ ] Disable it while adding, recording, or transcribing.
- [ ] Verify typecheck and commit `feat: add visible quick task submit`.

### Task 6: Add one-tap draft clearing

**Files:** Modify `apps/web/src/components/quick-add.tsx`.

- [ ] Render a `Clear task draft` button when text exists.
- [ ] Preserve the selected destination and project when clearing.
- [ ] Verify typecheck and commit `feat: add quick capture clear action`.

### Task 7: Announce capture outcomes

**Files:** Modify `apps/web/src/components/quick-add.tsx`.

- [ ] Add a polite status region with exact states: `Task added`, `Recording`, `Transcribing`, and failure copy.
- [ ] Clear success after two seconds without clearing an error.
- [ ] Verify typecheck and commit `feat: announce task capture status`.

### Task 8: Improve project picker recovery

**Files:** Modify `apps/web/src/components/quick-add.tsx`.

- [ ] Add an in-menu clear-search button and distinguish `No projects yet` from `No matching projects`.
- [ ] Provide a one-click `Add without project` action when a project is selected.
- [ ] Verify typecheck and commit `feat: clarify quick-add project choices`.

### Task 9: Explain the capture destination

**Files:** Modify `apps/web/src/components/quick-add.tsx`.

- [ ] Replace internal mode copy with `Saving to Personal`, `Saving to {organization}`, or `Saving to {project}`.
- [ ] Give the destination selector an explanatory title.
- [ ] Verify typecheck and commit `feat: make task destination explicit`.

### Task 10: Clear task search in one action

**Files:** Modify `apps/web/src/components/tasks-view.tsx`.

- [ ] Add an `aria-label="Clear task search"` button inside the search field when text exists.
- [ ] Restore focus to search after clearing.
- [ ] Verify typecheck and commit `feat: add task search clear action`.

### Task 11: Reset all task filters

**Files:** Modify `apps/web/src/components/tasks-view.tsx`.

- [ ] Derive `hasActiveFilters` from project, domain, and search values.
- [ ] Add `Clear filters` that resets all three without changing Open or Done.
- [ ] Verify typecheck and commit `feat: add one-click task filter reset`.

### Task 12: Make result summaries useful

**Files:** Create `apps/web/src/lib/task-presentation.ts`, `apps/web/src/lib/task-presentation.test.ts`; modify `apps/web/src/components/tasks-view.tsx`.

- [ ] Write a failing test:

```ts
expect(taskResultSummary(0, false)).toBe('No tasks');
expect(taskResultSummary(1, true)).toBe('1 matching task');
expect(taskResultSummary(4, true)).toBe('4 matching tasks');
```

- [ ] Implement `taskResultSummary(count, filtered)` and use it in the controls.
- [ ] Run the focused test and commit `feat: clarify task result counts`.

### Task 13: Add due-aware task sorting

**Files:** Modify `apps/web/src/lib/task-query.ts`, `apps/web/src/lib/task-query.test.ts`, `apps/web/src/components/tasks-view.tsx`.

- [ ] Write failing cases for `compareTasksBy('default' | 'due' | 'priority')`.
- [ ] Implement the comparator without changing the default order.
- [ ] Add a compact Sort selector with Default, Due date, and Priority.
- [ ] Run focused tests and commit `feat: add simple task sorting`.

### Task 14: Use human task dates

**Files:** Modify `apps/web/src/lib/task-presentation.ts`, its test, and `apps/web/src/components/tasks-view.tsx`.

- [ ] Write failing tests for `Today`, `Tomorrow`, `Yesterday`, `Overdue · Jul 24`, and `Jul 30`.
- [ ] Implement `taskDateLabel(date, today, done)`.
- [ ] Use it for due and scheduled rows, then commit `feat: humanize task date labels`.

### Task 15: Strengthen overdue visibility

**Files:** Modify `apps/web/src/components/tasks-view.tsx`.

- [ ] Add an accessible alert icon and `Overdue` wording rather than relying on red alone.
- [ ] Keep completed rows neutral.
- [ ] Verify typecheck and commit `feat: make overdue tasks unmistakable`.

### Task 16: Make task empty states actionable

**Files:** Modify `apps/web/src/components/tasks-view.tsx`.

- [ ] Open the task composer from the Open empty state.
- [ ] Switch to Open from the Done empty state.
- [ ] Use action labels `Add task` and `View open tasks`.
- [ ] Verify typecheck and commit `feat: add actions to task empty states`.

### Task 17: Clarify completed-task restoration

**Files:** Modify `apps/web/src/components/tasks-view.tsx`.

- [ ] Use task-specific completion labels and show a visible `Restore` affordance on hover/focus for completed rows.
- [ ] Preserve the existing toggle behavior.
- [ ] Verify typecheck and commit `feat: make completed tasks easy to restore`.

### Task 18: Summarize the Today agenda

**Files:** Modify `apps/web/src/components/dashboard/work-dashboard.tsx`.

- [ ] Add compact metadata: `{open} open · {overdue} overdue · {upcoming} upcoming`.
- [ ] Omit zero-value danger wording.
- [ ] Verify typecheck and commit `feat: summarize today at a glance`.

### Task 19: Explain agenda sections

**Files:** Modify `apps/web/src/components/dashboard/work-dashboard.tsx`.

- [ ] Add short section descriptions for Overdue, Today, and Upcoming.
- [ ] Keep descriptions visually secondary and hide duplicate copy in empty states.
- [ ] Verify typecheck and commit `feat: clarify today agenda sections`.

### Task 20: Explain board lanes

**Files:** Modify `apps/web/src/lib/simple-kanban.ts`, its test, and `apps/web/src/components/kanban-board.tsx`.

- [ ] Add descriptions to the lane model: `Ready to start`, `Currently moving`, `Finished`.
- [ ] Test all descriptions and render them beneath lane names.
- [ ] Commit `feat: add meaning to board lanes`.

### Task 21: Show useful board dates

**Files:** Modify `apps/web/src/components/kanban-board.tsx`; reuse `taskDateLabel`.

- [ ] Render the due or scheduled date on each card.
- [ ] Use icon plus text and overdue wording.
- [ ] Verify focused presentation tests and commit `feat: show dates on board cards`.

### Task 22: Complete tasks from the board

**Files:** Modify `apps/web/src/components/kanban-board.tsx`.

- [ ] Add a 44 pixel completion button that stops drag and click propagation.
- [ ] Restore done tasks to To do from the Done lane.
- [ ] Verify typecheck and commit `feat: complete tasks directly on the board`.

### Task 23: Move board tasks with the keyboard

**Files:** Create `apps/web/src/lib/board-actions.ts`, `apps/web/src/lib/board-actions.test.ts`; modify `apps/web/src/components/kanban-board.tsx`.

- [ ] Write failing boundary tests for `previousBoardColumn` and `nextBoardColumn`.
- [ ] Implement deterministic lane neighbors.
- [ ] Add labelled previous/next buttons to focused cards.
- [ ] Run focused tests and commit `feat: add keyboard board movement`.

### Task 24: Preserve board drafts on failure

**Files:** Modify `apps/web/src/components/kanban-board.tsx`.

- [ ] Catch inline-add failures, retain title, and announce `Could not add task`.
- [ ] Show `Adding…` while pending.
- [ ] Verify typecheck and commit `fix: preserve failed board task drafts`.

### Task 25: Add mobile board orientation

**Files:** Modify `apps/web/src/components/kanban-board.tsx`.

- [ ] Add `Lane 1 of 3` text on mobile and `Swipe between lanes` above the board.
- [ ] Hide the cue at desktop breakpoints.
- [ ] Verify typecheck and commit `feat: orient mobile board navigation`.

### Task 26: Clear project search

**Files:** Modify `apps/web/src/components/projects-board.tsx`.

- [ ] Add an inline clear button that retains keyboard focus.
- [ ] Update the result status after clearing.
- [ ] Verify typecheck and commit `feat: add project search clear action`.

### Task 27: Show project task progress

**Files:** Modify `apps/web/src/lib/projects.ts`, `apps/web/src/lib/projects.test.ts`, `apps/web/src/components/projects-board.tsx`.

- [ ] Write failing tests for open, completed, and total project task counts.
- [ ] Implement `projectTaskProgress(tasks, projectId)`.
- [ ] Render `2 open · 3 done` with a semantic progress bar.
- [ ] Run focused tests and commit `feat: show project task progress`.

### Task 28: Explain project creation context

**Files:** Modify `apps/web/src/components/projects-board.tsx`.

- [ ] Show `Creating in Personal` or the selected organization above the creation field.
- [ ] Keep All work creation routed through the current destination behavior.
- [ ] Verify typecheck and commit `feat: show new project workspace`.

### Task 29: Make the project empty state useful

**Files:** Modify `apps/web/src/components/projects-board.tsx`.

- [ ] Focus the creation field from `Create project`.
- [ ] Distinguish a truly empty workspace from an empty search.
- [ ] Verify typecheck and commit `feat: improve project empty states`.

### Task 30: Add task counts to workspaces

**Files:** Modify `apps/web/src/components/org-switcher.tsx`.

- [ ] Query active tasks and projects, resolve each task lane, and show counts beside All work, each organization, and Personal.
- [ ] Keep the trigger compact.
- [ ] Verify typecheck and commit `feat: show workspace task counts`.

### Task 31: Explain workspace semantics

**Files:** Modify `apps/web/src/components/org-switcher.tsx`.

- [ ] Add `Everything together`, `Organization workspace`, and `Personal tasks` descriptions.
- [ ] Use `Choose workspace` as the menu heading.
- [ ] Verify typecheck and commit `feat: clarify workspace choices`.

### Task 32: Refine mobile navigation feedback

**Files:** Modify `apps/web/src/components/mobile-nav.tsx`.

- [ ] Use safe-area padding without collapsing the 64 pixel bar.
- [ ] Add pressed-state scale and stronger current-page semantics.
- [ ] Verify typecheck and commit `feat: refine mobile navigation feedback`.

### Task 33: Stabilize the capture rail

**Files:** Modify `apps/web/src/components/top-bar.tsx`, `apps/web/src/app/globals.css`.

- [ ] Make the top bar sticky and safe-area aware.
- [ ] Keep mobile content visible when the virtual keyboard changes viewport height.
- [ ] Verify typecheck and commit `feat: stabilize responsive capture rail`.

### Task 34: Match loading UI to task views

**Files:** Modify `apps/web/src/app/(app)/loading.tsx`.

- [ ] Replace the dashboard-style two-column skeleton with a compact heading and five task rows.
- [ ] Respect reduced motion through existing global rules.
- [ ] Verify typecheck and commit `feat: make loading states feel task-native`.

### Task 35: Make recovery plain and direct

**Files:** Modify `apps/web/src/app/(app)/error.tsx`.

- [ ] Replace `Recovery` and `Work dashboard` with `Taskify`, `Try again`, and `Go to Today`.
- [ ] Keep saved-data reassurance and assertive announcement.
- [ ] Verify typecheck and commit `feat: simplify app error recovery`.

## Final verification

- [ ] Confirm `git rev-list --count 53c97ca..HEAD` is exactly `37`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm --filter @ops-dashboard/web lint`.
- [ ] Run `pnpm --filter @ops-dashboard/web build`.
- [ ] Run desktop and mobile Playwright smoke checks.
- [ ] Push `main`, confirm `origin/main...main` is `0 0`, deploy production, and inspect logs.
