# visual-flow — Copilot coding agent playbook

Goal: JSON layout spec → React renderer → Storybook → tests → PR.

Key files
- `src/layout-schema.ts` — spec types.
- `src/renderer/*` — renderer components.
- `src/stories/*` — visual review in Storybook.
- `src/**/*.test.tsx` — Vitest tests.

Conventions
- Tailwind-first styling; inline styles for dynamic spacing.
- TypeScript strict mode, functional components.

Agent task template
- Work in branch `agent/visual-flow`.
- Open a PR labeled `automerge`.
- Iterate until CI is green.
