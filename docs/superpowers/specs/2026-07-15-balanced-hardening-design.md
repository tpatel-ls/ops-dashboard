# Balanced Hardening Design

## Objective

Deliver 40 independently reviewable commits that make Ops Dashboard safer, faster to operate, easier to use on touch devices, and easier to maintain without changing its core architecture or adding paid dependencies.

## Scope

The work is divided into four equal product concerns:

1. Data integrity and regression coverage.
2. Accessibility and mobile ergonomics.
3. Workflow speed and navigation.
4. Production resilience and maintainability.

The design and implementation plan are the first two commits. The remaining 38 commits change application behavior, tests, production states, or maintainability. Every commit must be non-empty and independently understandable.

## Architecture

Existing local-first boundaries remain authoritative. Data mutations continue through the current task, project, organization, work-log, record, and sync helpers. New validation is implemented as focused pure helpers where possible, then enforced at mutation boundaries so every UI receives the same behavior.

UI work stays inside established React components and Tailwind tokens. Dialogs gain shared accessibility behavior only where it removes repeated lifecycle bugs. No new state framework, database table, or component library is introduced.

## Product Behavior

### Data Integrity

- Reject blank names and invalid durations before records reach Dexie.
- Prevent duplicate organization names and progress logs for missing projects.
- Exclude archived records from active selectors.
- Make task sorting and filtering deterministic and testable.
- Preserve sync operations when repeated remote failures need user attention.

### Accessibility And Mobile

- Add keyboard bypass navigation and a real main-content target.
- Give overlays dialog semantics, focus restoration, Escape behavior, live feedback, and body scroll locking.
- Keep task actions visible on touch devices and make compact controls meet practical touch targets.
- Respect reduced-motion preferences.

### Workflow Speed

- Add task and project search without server round trips.
- Add direct task creation actions and clearer zero-state recovery.
- Surface useful project metadata for scanning.
- Add complete keyboard navigation entries and fast logger submission.

### Production Resilience

- Add route loading and error states.
- Improve PWA shortcuts and offline metadata.
- Make sync state more informative and recover cleanly from browser network changes.
- Remove current lint debt in focused commits.

## Error Handling

Mutation helpers throw concise user-safe errors for invalid input. Components retain entered values and render errors through live regions. Sync failures remain queued instead of being silently discarded. Production error boundaries provide retry actions without exposing internal error details.

## Verification

Each behavior change receives a focused test when it can be expressed as deterministic logic. UI-only accessibility and responsive changes receive typecheck, lint, and Playwright coverage. The release gate runs all unit tests, workspace typechecking, web lint, the production build, the multi-viewport browser suite, dash scanning, and Git history count verification.

## Constraints

- Exactly 40 new commits after baseline `1706bd0`.
- No empty commits or generated screenshots in Git.
- No em dash or en dash characters.
- No schema migration or new paid service.
- Preserve local-first behavior and existing Supabase interfaces.
- Push only after the complete verification gate passes.
