# Operations UI Refinement Design

## Product Direction

Taskify is a personal operations console for managing work across organizations. The interface should feel like a precise command surface: dense enough for daily use, calm enough for long sessions, and fast on a phone with one hand.

## Primary Job

The first screen must answer three questions without navigation:

1. What needs attention now?
2. What is coming next?
3. Which projects are moving or slipping?

Task capture stays globally available, while the dashboard capture form becomes the place for intentional scheduling and project assignment.

## Visual System

- Preserve the existing graphite, orange, green, and neutral palette.
- Use border, spacing, typography, and compact status signals to create hierarchy.
- Keep cards at 8px radius or less for operational content; reserve larger radii for the app frame and modal surfaces.
- Prefer familiar Lucide icons for actions and provide accessible labels.
- Keep touch targets at least 44px on phones and compact them on larger screens.
- Never introduce horizontal page scrolling at 360px or wider.

## Interaction Model

- Global quick capture remains in the top bar.
- Dashboard capture exposes fast schedule choices before advanced details.
- Tasks and projects use compact, readable toolbars that wrap instead of scroll.
- Organization context is always visible and legible.
- Mobile navigation keeps the central create action reachable above safe areas.
- Modals behave as bottom sheets on phones and centered dialogs on larger screens.

## Verification

Every increment receives typecheck and focused test coverage where behavior changes. The final state is verified with lint, tests, production build, desktop and mobile screenshots, keyboard interaction, and overflow checks at 360, 390, 412, 768, 1024, and 1440 pixels.
