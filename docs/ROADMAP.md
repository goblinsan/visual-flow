# Visual Flow Roadmap (Post refactor-baseline-v1)

Baseline Tag: `refactor-baseline-v1`
Date: 2025-09-19
Status: Main branch contains extracted paint, measurement, rect visual, and selection interaction helpers. Clean slate for interaction depth + undo/redo architecture.

## Guiding Principles
- Incremental, behavior-parity refactors precede capability changes.
- Pure logic seams (selection, geometry, persistence) enable simple deterministic tests.
- Undo/redo built on intent-level actions (commands), not raw spec diffs.
- Interaction refactors first reduce CanvasStage imperative complexity before layering state history.

## Milestone 1: Drag & Marquee Interaction Extraction
Goal: Isolate drag threshold + position updates, and marquee hit-test, enabling deterministic tests and future performance optimizations.

Tasks:
1. `interaction.drag.ts`: pure helpers
   - `beginDrag(selectionIds, startPoint, nodePositions)` -> drag session object
   - `updateDrag(session, currentPoint)` -> { movedPositions, passedThreshold }
   - `finalizeDrag(session, lastPoint)` -> displacement summary for spec commit.
2. `interaction.marquee.ts`: pure hit-test + selection
   - Input: bounding rect, list of node AABBs {id,x,y,width,height}
   - Output: intersecting ids (dedup, excluding root)
3. Tests:
   - Drag: below threshold vs crossing threshold, multi-node displacement, zero-movement finalization.
   - Marquee: partial overlap inclusion, zero-size rectangle (no selection), toggle mode integration.
4. Refactor `CanvasStage.tsx` to use helpers (no behavior change). ✅ (drag integrated in commit `feat(interaction): integrate pure drag helpers`)

Exit Criteria:
- New test files: `interaction.drag.test.ts`, `interaction.marquee.test.ts`. ✅
- CanvasStage diff limited to replacing inline math + branching (drag portion done; marquee pending). ✅ (drag) / ⏳ (marquee)
- All existing tests still green. ✅ (105 tests passing post-integration)

Progress Note (in-progress milestone): Drag helper lifecycle fully adopted; marquee logic still inline pending extraction to pure helper (`computeMarquee` placeholder exists in renderer layer). Next step: introduce `interaction/marquee` usage in `CanvasStage` and remove imperative rectangle hit-test loop.

## Milestone 2: Command Dispatch Layer
Goal: Introduce a lightweight command abstraction powering all spec mutations (delete, duplicate, group, ungroup, transform, property change).

Tasks:
1. `commands/types.ts` defines:
   - `CommandContext` (spec snapshot, selection)
   - `Command` interface: { id, apply(spec): spec, invert?(specBefore, specAfter): Command }
2. Implement atomic commands:
   - `UpdateNodePropsCommand(id, partial)`
   - `DeleteNodesCommand(ids[])`
   - `DuplicateNodesCommand(ids[])`
   - `GroupNodesCommand(ids[])`
   - `UngroupNodeCommand(id)`
   - `TransformNodesCommand(updates: {id, position?, size?, rotation?, textScale?}[])`
3. Tests for each command (apply + invert parity).
4. Integrate into CanvasApp or a new `useCommandExecutor` hook (still without history stack, direct apply only).

Exit Criteria:
- Commands reused in existing keyboard/menu pathways.
- No change in user-visible behavior.

## Milestone 3: Undo/Redo Foundation
Goal: Provide reversible history of applied commands with bounded memory.

Tasks:
1. `useHistory(maxDepth=200)` hook
   - API: `execute(command)`, `undo()`, `redo()`, `canUndo`, `canRedo`.
2. History stores tuples: { command, inverseCommand }
   - If `invert` missing, compute by diffing before/after (fallback path) but prefer explicit invert.
3. Tests:
   - Linear history growth.
   - Branch discard after executing post-undo command.
   - Max depth truncation (oldest dropped, integrity retained).
4. Wire keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z (or Cmd variants on macOS).

Exit Criteria:
- All mutation paths use `execute()`.
- Undo/redo passes interaction smoke tests (manually + unit cases).

## Milestone 4: Batched Interaction Commits
Goal: Group related transient events (drag move, marquee selection adjustments) into single undoable commands.

Tasks:
1. Add `beginComposite(label)`, `commitComposite()`, `abortComposite()` to history layer.
2. Drag operations produce a single TransformNodesCommand at mouseup.
3. Multi-property panel edits within quick succession (optional future improvement) may coalesce.
4. Tests: composite assembly, abort path (escape/cancel), nested protection (error if nested).

Exit Criteria:
- Dragging a node is one undo step.
- Performance unaffected (no large array churn per mousemove).

## Milestone 5: Snapshot & Persistence Integration (Optional)
Goal: Persist undo stack (latest N commands) to session storage for crash resilience.

Tasks:
1. Serialize minimal command data (omit full spec snapshots).
2. On load, clear history if schema mismatch detected.
3. Provide dev toggle to disable persistence.

Exit Criteria:
- Reloading page preserves ability to undo last actions (best effort).

## Future Considerations (Not In Scope Yet)
- Multi-root / pages architecture.
- Collaborative edit (would shift strategy away from naive inversion to CRDT or OT models).
- Time Travel UI (slider scrub) once command log stabilized.
- Macro recording (sequence of commands saved as reusable action).

## Risk & Mitigation
| Risk | Mitigation |
|------|------------|
| Large CanvasStage diff during extraction | Cut into tiny PRs (drag then marquee) |
| Command inversion drift | Explicit invert implementations + tests |
| Performance regression during drag | Keep pure drag function O(n selection size) only |
| Undo memory growth | Max depth + compositing |

## Metrics to Track
- Avg LOC of CanvasStage (expect steady decrease).
- % of spec mutations routed through commands (target 100%).
- Undo correctness test count.
- History memory footprint at 200-depth (target < a few MB).

---
Generated as initial roadmap after stabilization work. Adjust iteratively with each milestone.
