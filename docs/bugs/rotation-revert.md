# Bug: Rotation Reverts On Transform Finalize

Status: Resolved (2025-09-20)
Reported: 2025-09-20
Environment: jsdom + react-konva test harness (headless); also manually reproducible in browser (pending revalidation post-command migration)

## Symptom (Original)
During interactive rotation via the transformer handles:
- Live preview reflected expected rotation.
- On mouseup (transform finalize), node snapped back to its original rotation (0deg or previous value) and occasionally shifted position.

## Context
Pre-command migration there were dual mutation paths (direct `setSpec` fallback and command path). Hypothesis was that rotation wasn't persisted when fallback path triggered. After Milestone 2 completion all transform finalization now dispatches `TransformNodesCommand` exclusively.

## Root Cause
Neutralization logic in `onTransformEnd` reset both scale and rotation of the live Konva nodes inside a `requestAnimationFrame` callback. While the command correctly persisted `rotation` into the spec, immediately resetting the node's rotation to 0 sometimes produced visual inconsistency and (depending on anchor drag path) subtle positional drift due to Konva recalculating the node's bounding box post-rotation reset.

## Fix
- Modified neutralization to reset only scale (set `scaleX/scaleY` back to 1) and preserve the node's rotation, preventing mismatch between persisted spec rotation and live node state.
- Added test API (`rotateNode`, `forceTransformEnd`) and a regression test `CanvasStage.rotationPersist.int.test.tsx` asserting rotation persistence.
- Converted the test from a failing sentinel to a passing assertion after verifying fix.

## Validation
- Automated test passes (rotation persists at expected angle after transform finalize).
- Manual interaction (to be optionally re-verified in Storybook) should now show stable rotation with no positional jump.

## Lessons Learned
- Only neutralize transient properties (scale) that are artifacts of interactive handles; preserve meaningful transforms (rotation) already committed to the model.
- Provide explicit test harness hooks early to lock down interaction invariants.

## Acceptance Criteria (Met)
- Interactive rotation persists exact angle in spec after finalize.
- Regression test asserts rotation === 45 after programmatic rotation + finalize.
- No new flicker or drift observed in existing transform tests.

## References
- `src/canvas/CanvasStage.tsx` `onTransformEnd` implementation.
- `src/commands/transformNodes.ts` command apply logic.
- Flicker mitigation commit introducing deferred neutralization.

---
Tracking label: rotation, transform, command-system, resolved
