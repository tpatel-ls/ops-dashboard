# Project Manager UI Pass Two

## Goal

Make Taskify faster to scan and operate on phones, tablets, watches, and desktop browsers without changing its organization and project data model.

## Design direction

- Keep the interface dense, calm, and focused on project execution.
- Make task capture and triage the fastest actions on every primary route.
- Prefer natural-height work sections so sparse data does not create empty panels.
- Replace implementation language and lifestyle framing with direct work language.
- Present scheduled tasks and time blocks together, with a compact mobile agenda.
- Preserve organization context and cross-device sync status everywhere it matters.

## Scope

The pass covers dashboard, quick capture, tasks, projects, project detail, calendar, inbox, kanban, notepad, power dialer, settings, sign-in, and shared responsive states. Each change is independently visible and committed separately.

## Verification

Run the web typecheck throughout implementation. Before pushing, run the complete test, lint, typecheck, and production build suites, then inspect primary routes at phone, tablet, and desktop widths with horizontal overflow checks.
