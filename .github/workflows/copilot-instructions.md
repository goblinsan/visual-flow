## Copilot Refactor Charter

This document establishes the guardrails and execution model for the incremental refactor of the Vizail editor codebase, beginning with Phase 0 test hardening and proceeding through small, reversible extractions. It is intended for AI pair programming workflows and MUST be treated as enforceable policy during automated or semi-automated edits.

### Core Principles
1. Ship Stability First: The working behavior of the editor (rectangle creation, selection, attribute editing incl. fill/stroke disable, swap, outline fallback) must never regress silently.
2. Minimize Blast Radius: Only one conceptual extraction/change set per PR (hook, util module, component split, or test addition group).
3. Tests Before or With Change: Any newly abstracted logic MUST gain equal-or-better test coverage in the same commit/PR.
4. Reversibility: Every change should be trivially revertible (delete new file & restore import wiring) without cascading edits.
5. No Spec Drift: Data schema for nodes, selection behavior, persistence keys and color disabling semantics are immutable unless explicitly scheduled.
6. Observability: When adding utilities, include narrow, intention‑revealing names and (where helpful) micro JSDoc explaining domain intent.

### Prohibited During Early Phases
- Broad renames across many files in one step.
- Changing public facing prop or field names inside node spec structures.
- Mixing formatting-only commits with logical refactors.
- Introducing new state management libraries or architectural overhauls (e.g. Zustand, Redux) before baseline extraction phases complete.

### Phase Sequence (Condensed)
Phase 0: Test Surface Hardening (dash parsing, persistence invariants, spec invariants).
Phase 1: Extract spec utilities (`findNode`, `updateNode`, type helpers).
Phase 2: Extract `useElementSize` hook (from inline logic in `CanvasApp.tsx`).
Phase 3: Isolate color editing helpers (pure functions) out of component render bodies.
Phase 4: Split attribute editing panels (selection vs defaults) with stable props.
Phase 5: Renderer/service boundary refinement (pure layout + impure Konva integration separation).
Later: Persistence strategy refinement, advanced memoization, performance profiling.

### Acceptance Criteria per Extraction PR
Each extraction PR MUST:
- Touch only files directly related to the target (plus tests + minimal import adjustments).
- Leave prior tests green AND add targeted new tests.
- Include a short CHANGELOG line (to be added later once changelog established) summarizing functional neutrality ("no behavior change").
- Provide a brief PR description template sections: Motivation, What Changed, Tests Added, Risk & Rollback.

### Testing Guardrails
Add tests for:
- Dash pattern parsing (empty, single number, even/odd length arrays if applicable when implemented, invalid inputs).
- Persistence round-trip of rectangle defaults (colors incl. disabled flags, stroke width, dash pattern once extracted).
- Spec invariants: Each node has id (string), type, rect geometry sanity (non-negative width/height), flags for `fillEnabled` `strokeEnabled` respected by renderer.

### Change Workflow (AI Assisted)
1. Read baseline target file(s) completely before modification.
2. Introduce new file(s) with copied logic, add dedicated tests.
3. Switch original call sites to use the new abstraction.
4. Run tests; if failing, fix or revert partial wiring before proceeding.
5. Remove now-dead duplicated inline logic ONLY after green tests.
6. Commit with conventional prefix `refactor:` or `test:` as appropriate.

### Performance & Safety Notes
- Avoid premature memoization; prefer clarity first.
- Keep utility modules free of React imports unless they implement hooks.
- Hooks must not perform I/O or localStorage writes outside `useEffect`.

### Style & Naming
- Utility module names: `specUtils.ts`, `colorUtils.ts` (only if diverging from existing), `dashPattern.ts`.
- Hook names: `useElementSize` (future extraction), `usePersistedDefaults` (future if created, requires tests first).
- Test names: Mirror file + `.test.ts` or `.test.tsx`.

### Risk Mitigation Checklist (Pre-Commit)
Tick mentally (or via PR template) before committing:
- [ ] Only one conceptual change.
- [ ] New/updated tests written & passing.
- [ ] No incidental large formatting diffs.
- [ ] No behavior change (unless explicitly scheduled).
- [ ] Reversible with minimal effort.

### Post-Merge Follow-Up
If a regression is discovered, revert the single PR rather than stacking quick patches. Reverts should leave tree exactly as previous known-good baseline.

### Amendments
Any change to this charter must be its own PR labeled `meta` and cannot bundle code refactors.

---
Generated: 2025-09-18 (Phase 0 initiation)
Owner: Maintainers / AI Pair Programming Workflow
Status: Active
# Vizail — revised playbook

**Main Goal:** The main app is now the canvas editor.

## Application Layout
- Left: sidebar with design files.
- Center: canvas (draggable + selectable).
- Right: attribute editor.
- Toolbar: Save, Save As, Export to Roblox.

## Guardrails
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
- Required CI check: `vizail-ci`.
