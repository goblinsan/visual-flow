Copilot Refactor Instruction Charter
1. Purpose
Guide AI-assisted contributions so incremental refactors of CanvasApp.tsx and related code remain safe, reviewable, and behavior‑preserving.

2. Refactor Objectives
Reduce CanvasApp.tsx complexity by extracting pure utilities, hooks, and UI panels.
Preserve 100% runtime behavior after each small step.
Increase test surface before and during structural change (never after).
Lay groundwork for future features (undo/redo, multi-shape editing) without premature abstraction.
3. Scope (What AI May Do)
Allowed:

Extract pure functions (dash parsing, node lookup, node mutation).
Extract React hooks (sizing, persistence).
Extract presentational / attribute panels.
Add or update unit tests for each new utility/hook/component.
Add minimal types (only in the touched unit).
Introduce small internal documentation (JSDoc / inline comments where clarity improves).
Not Allowed (until explicitly greenlit):

Global renames unrelated to current extraction.
Mixing large typing overhauls with structural moves.
Changing shape schema semantics.
Introducing state libraries or architectural frameworks.
Silent behavior changes (even “improvements”) in extraction commits.
4. Golden Guardrails
One conceptual change per commit (e.g., “extract dash util” is one; “also rewrite panel” is not).
Each commit passes tests (npm run test) and does not reduce test count.
New module ⇒ new or expanded test file in same commit.
No console warnings or new React key/prop warnings introduced.
If logic must change (rare), MUST:
Be isolated in its own commit.
Include test proving new behavior.
Include BREAKING or BEHAVIOR-ADJUST note in commit body.
5. Phase Checklist (Applied in Order)
Phase	Action	Exit Criteria
0	Add baseline tests (dash parsing, spec invariants, persistence)	All green; test count increased
1	Extract specUtils (findNode, updateNode)	Panels still work
2	Extract useElementSize	Layout unaffected
3	Extract persistence hooks (usePersistentRectDefaults, useRecentColors)	Defaults + recent colors still function
4	Extract RectAttributesPanel	Single selection editing unchanged
5	Extract RectDefaultsPanel	Default rectangle creation unchanged
6	Consolidate dash + color duplication	No feature changes
7	(Optional) Add useSpecEditor service	Only if complexity warrants
8	Strengthen types gradually	No runtime changes
9	Add isolated Storybook stories (optional)	Visual parity
6. Commit Message Template
Use this structure:

If logic intentionally changes:

7. Test Policy
New or refactored unit must have at least:

Utility: direct input/output test (normal + edge + invalid).
Hook: state transition test (using React Testing Library or simple JSDOM).
Panel component: snapshot + at least one interaction (e.g., toggling fill off stores last color).
Spec invariants: A traversal test ensuring no invalid nodes appear after modifications.
8. Required Smoke Test Script (Manual)
After each commit:

Create a rectangle.
Change fill, stroke, alpha, disable fill, re-enable.
Set dash pattern, deselect, reselect — ensure value persists.
Create second rectangle — inherits defaults.
Recent colors list updates when new colors chosen.
(Optionally automate later.)

9. PR Review Checklist
Reviewer (human or AI) must confirm:

 Commit scope is narrow.
 Behavior parity statement present (unless behavior change commit).
 New tests exist for new modules.
 Test count not reduced.
 No unrelated formatting churn.
 No console / runtime warnings introduced.
 Manual smoke test notes included (optional but encouraged).
10. Anti-Patterns to Reject
“Refactor + feature” in same commit.
Extracting UI plus renaming 20 unrelated symbols.
Replacing inlined logic without tests.
Adding partial abstraction (e.g., half-migrated service) without completing integration.
Introduced global utilities that aren’t used anywhere yet (“speculative abstractions”).
11. When to Abort / Revert
Abort incremental step if:

Test suite becomes flaky / non-deterministic.
Visual regression appears with no immediate fix.
Performance degrades (canvas interactions noticeably lag). Then revert the last commit immediately; re-scope.
12. Escalation Criteria
Only introduce advanced layers (undo stack, spec editor service, context providers) after:

Two or more upcoming changes would duplicate node traversal logic again.
Cross-cutting concerns (like batching node updates) become error-prone.
13. Metrics (Lightweight)
Track (manually or script):

CanvasApp.tsx LOC trend (expect ↓).
Test file count (expect ↑).
Average diff size per refactor commit (keep < 400 lines total touched).
Time-to-review (should stay short).
14. Glossary
Behavior Parity: No observable UX/runtime change.
Structural Extraction: Moving code without rewriting internals.
Invariant: Condition that must always hold for spec tree (e.g., node id uniqueness).
Vertical Slice: Includes logic + tests + wiring for one piece in isolation.
15. AI Usage Protocol
When AI proposes a change:

Must cite which phase & step it corresponds to.
Must show diff summary (files added/modified).
Must state: “Behavior parity” or “Behavior change” explicitly.
Must propose test cases before editing (if new logic).

---
Phase 5 – Step 1 Extraction (2025-09-19)
Summary: Extracted pure rectangle visual prop derivation into `computeRectVisual`.
Files Added:
 - `src/renderer/rectVisual.ts`
 - `src/renderer/rectVisual.test.ts`
Files Modified:
 - `src/canvas/CanvasRenderer.tsx` (renderRect now delegates to helper)
Behavior Parity: Yes (tests verifying disable-fill/stroke fallback & dash unchanged, previous inline logic mirrored).
Tests: Added 5 cases covering: basic pass-through, empty string disabling, both disabled fallback, dash inclusion rules, default size/radius.
Rationale: Establishes first pure seam between spec node and Konva props; enables future consolidation of shape logic & easier unit testing without Konva.
Reversibility: Single helper; revert by inlining function body back into `renderRect`.
Next Candidate: Similar extraction for Text metrics or grouping shape property derivations into a `shapeVisual.ts` module.

Phase 6 – Paint Logic Consolidation (2025-09-19)
Summary: Introduced `utils/paint.ts` with `normalizePaint`, `deriveStrokeVisual`, and `dashArrayToInput` to unify fill/stroke disable + dash fallback / inclusion rules previously embedded only in `computeRectVisual`.
Files Added:
 - `src/utils/paint.ts`
 - `src/utils/paint.test.ts` (9 tests)
Files Modified:
 - `src/renderer/rectVisual.ts` (delegates to new utilities)
Behavior Parity: Yes. All prior rectangle visual derivation semantics preserved (fallback stroke #94a3b8, width 1, opacity 0.4, dash [3,3] when both disabled; dash only when stroke present & non-empty).
Test Impact: Test file count +1; total tests increased from 70 to 79; all passing.
Rationale: Establish reusable paint normalization boundary before further renderer/service decomposition.
Reversibility: Remove helper usage and inline prior logic from git history; no schema changes.
Follow-ups (Optional): Use `dashArrayToInput` in `CanvasApp.tsx` for minor duplication elimination; consider adding reverse `inputToDashArray` delegating to existing dash parser.

Phase 7 – Measurement Extraction (2025-09-19)
Summary: Extracted inline sizing heuristics (`approxTextHeight`, `getApproxHeight`) from `CanvasRenderer.tsx` into pure module `renderer/measurement.ts` providing `fontSizeForVariant`, `approxTextHeight`, and `estimateNodeHeight`.
Files Added:
 - `src/renderer/measurement.ts`
 - `src/renderer/measurement.test.ts` (5 tests)
Files Modified:
 - `src/canvas/CanvasRenderer.tsx` (removed inline measurement logic, now imports `estimateNodeHeight`).
Behavior Parity: Yes. All heuristic outputs (text height = fontSize+8, stack accumulation with gap added after each child, placeholder grid/group heights 200/100) preserved.
Tests: Added coverage for variant mapping, text height, stack aggregation, group/grid placeholders.
Rationale: Centralizes measurement heuristics for future refinement (real text metrics, caching) without touching rendering code.
Reversibility: Replace import with previous inline functions.
Next Opportunities: Introduce width estimation; unify gap accumulation semantics (consider not adding gap after last child in future – would be behavior change requiring tests).