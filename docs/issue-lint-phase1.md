# Lint Debt Remediation – Phase 1

Tag baseline: `lint-prephase1-v1`
Working branch: `chore/lint-debt-phase1`

## Objective
Reduce disruptive `any` and unused variable lint errors in core interaction & renderer seams to enable confident feature evolution (drag, marquee, command system) without type opacity.

## Scope (Phase 1 Only)
Included:
- `src/canvas/stage-internal.ts`
- `src/canvas/core/CanvasOrchestrator.ts`
- `src/components/RectAttributesPanel*`
- `src/utils/specUtils.ts` (public helpers used in tests)
- New shared domain types module: `src/types/core.ts`

Deferred to Phase 2+
- Persistence + color utilities (`persistence.ts`, `color.ts`, `colorEditing`)
- Debounce/logger flexible argument APIs (may need generics)
- Test-only helper looseness (will get an override or targeted types later)

## Strategy
1. Introduce explicit domain types (minimal surface):
   - `NodeId = string`
   - `DesignNode` (rect variant only for now; future union)  
   - `SelectionState`  
   - `PointerState` (x, y, modifiers)  
   - `DragSession` (initial pointer, origin nodes, delta)
2. Replace high-churn `any` with these domain types or `unknown` + narrow.
3. Convert functions returning implicit `any` to explicit typed returns.
4. For evolving payload shapes, create small discriminated unions (e.g. `Command`, reserved for Phase 2 but placeholder allowed).
5. Keep diff tight: no logic rewrites, no incidental formatting.

## Metrics
- Baseline errors: 114 (from last run).
- Target after Phase 1: <= 70 (approx 40% reduction) without suppressions.
- New rule posture: Temporarily downgrade `no-explicit-any` to warning in normal lint; add `lint:strict` script to enforce before merging final Phase 1 PR.

## Acceptance Criteria
- Added `src/types/core.ts` exporting foundational types with doc comments.
- No remaining `any` in included scope files unless accompanied by `// TODO(types):` explaining deferment.
- Normal `npm run lint` shows fewer total errors (document count in PR description).
- `npm run lint:strict` still fails (expected) until later phases; CI can continue to use standard lint for now.

## Checklist
- [ ] Add `src/types/core.ts` with baseline types.
- [ ] Refactor `stage-internal.ts` to use types (remove top-level `any`).
- [ ] Refactor `CanvasOrchestrator.ts` surface `any` usage.
- [ ] Rect attributes components adopt typed props (no `any`).
- [ ] Update `specUtils.ts` signatures.
- [ ] ESLint config adjusts severity; add `lint:strict` npm script.
- [ ] Record new lint error count in this file.
- [ ] Commit + push branch; open PR referencing this doc.

## Out of Scope
- Creating full discriminated unions for all future node variants.
- Runtime validation (schema) – consider Zod in later phase if needed.

## Follow-Up (Phase 2 Preview)
- Generify debounce/logger utilities.
- Tighten persistence & color module types.
- Introduce `Command` & history-safe snapshot typing.

---
(Keep this file updated during the phase – treat as a living tracker.)
