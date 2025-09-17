# visual-flow — revised playbook

**Main Goal:** The main app is now the canvas editor.

## Application Layout
- Left: sidebar with design files.
- Center: canvas (draggable + selectable).
- Right: attribute editor.
- Toolbar: Save, Save As, Export to Roblox.

## Guardrails
 - Keep Schema v2 authoritative; write migrations for old files.
 - Avoid breaking exports: add tests for React/Roblox exporters.
 - Use react-konva for canvas; keep renderer pure.
 - Don’t mutate .github/workflows/* except to add new tests for exporters.
 - No external network calls; assets via relative paths or data URLs.

## Requirements
- Visual nodes must be draggable/selectable.
- Attribute changes update the live spec.
- File management uses localStorage (with import/export).
- Exporter translates React JSON layout → Roblox GUI layout.

## Storybook
- Only used for regression tests of editor components.
- Do not use Storybook for end-user design preview anymore.

## Branching
- All new features: branch `agent/{task-name}`, PR with label `automerge`.
- Required CI check: `visual-flow-ci`.
