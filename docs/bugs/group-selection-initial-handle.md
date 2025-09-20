# Bug: Incorrect Initial Group Selection Handle

Status: Resolved (2025-09-20)  
Reported: 2025-09-20
Category: Selection / Transformer

## Original Symptoms
1. Selecting an existing group (already in spec) produced an incorrect transformer box on the first select (fixed earlier).
2. Immediately after creating a new group, the transformer briefly appeared with a degenerate (or padded / incorrect) box, occasionally flickering before stabilizing or requiring a deselect/reselect.

## Expected
On first selection of a group, the transformer box should immediately reflect the union bounds of its children without requiring a reselection.

## Pre-Fix Observed Behavior
- Post group command: transformer sometimes showed 0×0 (earlier) or an inflated width/height (later) momentarily due to handle/padding bounds.
- Debug retries (multi-frame) reduced but did not eliminate transient mismatch; tests failed when asserting transformer clientRect directly.
- Existing groups selected cleanly after earlier partial fix.

## Environment
- Feature branch: `feature/object-transforms`
- Affected components: `CanvasStage` (transformer attachment in selection effect), possibly group bounding logic.

## Root Cause
Two intertwined issues:
1. Measurement Source Mismatch: Tests (and earlier logic) relied on the transformer's `getClientRect()`, which includes padding/handles causing inflated dimensions compared to the group node's true union bounds.
2. Initial Frame Race: Immediately after grouping, Konva's layout/measurement stabilization may lag one frame; attaching a visible transformer instantly exposed the intermediate (degenerate or padded) box causing a visible flicker.

## Investigation Summary
- Added diagnostic retry logging confirming transformer box remained inflated across frames (not a simple timing shrink issue, but padding inclusion).
- Exposed raw node client rect (`getNodeClientRect`) for tests to assert underlying geometry.
- After switching tests to raw node bounds, logic correctness was validated; flicker persisted only visually due to showing transformer during stabilization.

## Final Fix
1. Tests switched to asserting raw group node bounds to avoid transformer handle padding.
2. Transformer is temporarily hidden (`visible={false}`) for a newly selected group until the group's own client rect matches spec-derived union bounds (polled up to a few frames).
3. Once stable (or after a fail-safe max attempts), transformer becomes visible—eliminating flicker of incorrect bounds.
4. Legacy multi-frame transformer reattachment loop and verbose retry logs were removed/obsoleted by visibility gating.

## Acceptance Criteria (Met)
- Immediately after creating a group, no incorrect transformer box is shown; it appears only once stable.
- Flicker eliminated (no transient wrong-size transformer visible).
- Other node selection unaffected.
- Tests (group create via command & shortcut) pass using raw node bounds.

## Related Files
- `src/canvas/CanvasStage.tsx` (selection effect attaching transformer; needs multi-frame stabilization logic)
- `src/commands/groupNodes.ts` (group bounding box + child position normalization)
- `src/canvas/CanvasStage.groupCreate.initialBounds.int.test.tsx` (may need enhancement to assert non-degenerate first-frame bounds once fixed)
- `src/canvas/CanvasStage.groupSelection.initialBounds.test.tsx`

## Reproduction (Current)
1. Create two rectangles.
2. Select both.
3. Press Group (Ctrl/Cmd+G).
4. Observe transformer box: shows 0×0 (or very small) at one child's origin.
5. Click empty canvas.
6. Reselect group: correct bounding box appears.

## Residual Considerations
- If future UX requires always-visible transformer (even while stabilizing), a padding-adjusted comparison or precomputed bounding box overlay could replace visibility gating.
- Could further simplify by skipping polling when child count is small and spec dimensions already deterministic.

## Next Steps
- Optional: remove now-unused diagnostic utilities and consolidate selection effect.
- Monitor for regressions when adding new node types with asynchronous measurements (e.g., images loading).

---
Tracking labels: selection, transformer, group, resolved
