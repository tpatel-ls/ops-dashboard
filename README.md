# Drift

Local-first task and whiteboard app. Web first, Android wrapper later.

## Status

M0 scaffold landed. See `docs/architecture.md` for the layout and
`claude_code_prompt.md` (the spec on the user's desktop) for the full plan.

## Workspace

```
plank/
  apps/web              Next.js 16 App Router, React 19, Tailwind v4
  packages/core         types, Dexie schema, ULID, quick-add parser
  packages/ui           shared cn helper, design tokens
  packages/whiteboard   pen pointer helpers, palm rejection
  packages/tsconfig     shared TypeScript configs
  supabase/             SQL migrations and seed (M6)
  docs/                 architecture, sync, pen input, shortcuts
```

## Getting started

```
pnpm install
pnpm dev            # runs apps/web on http://localhost:3000
pnpm test           # vitest across packages
pnpm typecheck
pnpm lint
```

## Notes

- The spec named Next.js 15. `create-next-app@latest` ships Next.js 16 today
  with the same App Router. Holding on 16 unless you want to pin back.
- No em-dashes anywhere. No n8n. TS strict everywhere.
