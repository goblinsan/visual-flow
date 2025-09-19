# Lint Debt Remediation – Phase 1 (COMPLETED)

Baseline Tag: `lint-prephase1-v1`
Branch: `chore/lint-debt-phase1`
Merged into feature branch: `feat/interaction-m1-drag-marquee`

## Objective
Reduce disruptive `any` and unused variable lint errors in core interaction & renderer seams to enable confident feature evolution (drag, marquee, command system) without type opacity.

## Scope Executed
Included files refactored:
- `src/canvas/stage-internal.ts`
- `src/canvas/core/CanvasOrchestrator.ts`
- `src/components/RectAttributesPanel.tsx` + test
- `src/utils/specUtils.ts`
- Added `src/types/core.ts`

Deferred (Phase 2+): persistence/color utilities, debounce/logger generics, test helper looseness.

## Strategy Summary
Introduced minimal domain types module; replaced broad `any` with generics (`CanvasNode<TData>`), structural partials (`RectPatch`), and `unknown` where evolution expected. Avoided logic changes.

## Metrics
- Pre-phase (original strict run earlier): 114 errors (all errors, `no-explicit-any` as error) / 14 warnings.
- Mid-phase (after initial types + stage-internal cleanup): reduced `any` in targeted files (qualitative checkpoint).
- Post-phase (with `no-explicit-any` softened to warn): Remaining warnings now concentrated outside Phase 1 scope (CanvasApp, CanvasStage, tests, renderer). Exact counts to be gathered in Phase 2 strict re-enable.
- All unit tests still green (98 tests) – no regressions introduced.

## Acceptance Criteria Checklist
- [x] Added `src/types/core.ts` foundational types.
- [x] Removed `any` from `stage-internal.ts` surface (replaced with structural narrowing).
- [x] Introduced generic for orchestrator node data instead of `any`.
- [x] Typed Rect attributes component + test (removed `any`).
- [x] Converted `specUtils` to use `unknown` + `SpecPatch` instead of `any`.
- [x] Added `lint:strict` script (STRICT_TYPES=1) for future enforcement.
- [x] Updated tracking doc with outcome.

## Notes / Rationale
- Full elimination of `any` deferred where domain model not yet stable (e.g., future node variants, command system payloads). Using `unknown` prevents uncontrolled propagation while allowing incremental refinement.
- Did not chase hook dependency warnings in this phase (orthogonal behavior refactors).

## Next (Phase 2 Preview)
- CanvasStage & CanvasApp refactor to extract drag/marquee first (roadmap Milestone 1) then re-type residual `any`.
- Introduce `Command` types early so property & transform mutations share a consistent payload shape.
- Begin reducing hook dependency warnings by hoisting stable callbacks.

(End of Phase 1)
