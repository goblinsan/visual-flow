# Visual Flow Roadmap (Post refactor-baseline-v1)

Baseline Tag: `refactor-baseline-v1`
Date: 2025-09-19
Status: Main branch contains extracted paint, measurement, rect visual, selection interaction helpers. Feature branch milestone progress: Milestone 1 (Drag & Marquee) COMPLETE (2025-09-19). Milestone 2 (Command Dispatch Layer) COMPLETE (2025-09-20): All canvas mutation paths (insert, transform, delete, duplicate, group, ungroup, nudge, property update) now dispatch commands through a single executor; legacy direct spec mutation paths removed from interaction layer. Executor maintains history stack (undo/redo UI deferred to Milestone 3). New integration test (`CanvasStage.commandIntegration.test.tsx`) verifies command dispatch for nudge, duplicate, delete.

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

Exit Criteria (all satisfied):
- New test files: `interaction.drag.test.ts`, `interaction.marquee.test.ts`. ✅
- CanvasStage diff limited to replacing inline math + branching (both drag & marquee integrated). ✅
- All existing tests still green post-integration (105 passing). ✅

Completion Note: Marquee refactored to session-based pure helpers (`beginMarquee/updateMarquee/finalizeMarquee`), removing imperative hit-test code. Milestone 1 closed; no behavior changes detected.

## Milestone 2: Command Dispatch Layer (COMPLETE)
Goal: Introduce a lightweight command abstraction powering all spec mutations (delete, duplicate, group, ungroup, transform, property change) and migrate all interaction/UI pathways to use it exclusively.

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
4. Integrate into CanvasApp or a new `useCommandExecutor` hook (prototype executor with simple undo/redo now implemented).

Exit Criteria (All Met):
- Atomic commands implemented with unit tests (apply + invert where applicable).
- Executor hook integrated at app root; spec mutations flow only through `executeCommand`.
- All keyboard + menu + interaction (drag finalize, transformer finalize, rectangle creation, nudge, group/ungroup, duplicate, delete, property panel edits) dispatch commands.
- No regressions observed in existing interaction tests (full suite green at 134 prior to final doc update; new tests added).
Deferred (moved to Optional Enhancements / Future): layer reordering command, aspect re-enable & text scale reset via commands (currently legacy), undo/redo keyboard shortcuts, rotation regression test/fix.

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

---
## Stability Backlog Progress (S1 Initiated)

S1: Command History Fuzz & Invariants (IN PROGRESS)

Added utilities:
- `utils/specInvariant.ts` providing `checkSpec` + `expectSpecInvariant` (current checks: root frame presence, unique ids, non-negative sizes, valid numeric positions, cycle detection placeholder).
- `utils/seededRng.ts` deterministic LCG RNG for reproducible fuzz sequences.

Added test harness:
- `commands/commandHistory.fuzz.test.ts` executes ~120 randomized operations (insert, transform, group, ungroup, duplicate, delete, update props) with invariant validation after each successful command, then full undo-all / redo-all round-trip snapshot assertions.

Outcomes so far:
- All existing tests plus fuzz harness pass ( >140 tests ).
- Baseline invariants show no structural corruption under randomized sequences.

Next S1 Steps:
1. Enrich invariants: group bounding box union validation, selection id validity, optional zIndex ordering.
2. Increase fuzz sequence length & multi-seed loop (e.g., 10 seeds x 200 ops) gated behind env flag to keep default CI runtime small.
3. Add failure artifact serializer (write minimal failing trace & spec JSON for reproduction).

These will complete S1 and provide confidence to tackle S2 (deterministic bounding without visibility gating).

---
### Optional Enhancements & Backlog (Post Milestone 2)
These are non-blocking improvements identified during the command migration.

1. Rotation regression fix: Rotated node snapping back on mouseup. Action: add transform integration test asserting persisted rotation + position invariance; ensure `TransformNodesCommand` includes rotation and neutralization order is correct.
2. Layer reordering command: Implement `ReorderSiblingsCommand` and migrate any direct reordering logic.
3. Aspect re-enable & Text scale reset: Convert to `UpdateNodePropsCommand` batch commands.
4. Rapid click rectangle regression test: Ensure ultra-fast click-drag-click sequences don't leak marquee or leave stale draft state.
5. Interaction flush helper: Centralize rAF neutralization + post-commit reconciliation.
6. Group/ungroup additional tests: Expand integration coverage beyond existing nudge/duplicate/delete.
7. Performance profiling: Measure command execution & React reconciliation for large selections (100+ nodes) pre-composite batching.
8. Composite batching (Milestone 4 precursor): Investigate grouping multiple property panel quick edits into one undo step.
9. Persistence groundwork: Decide minimal command serialization format for later session restore.
10. Alignment guides: Visual snap lines during drag/resize (will leverage command pre-commit predictions).
11. Macro recording spike: Feasibility of capturing a sequence of commands to replay.

---
Rotation Bug Note (Tracking): Live rotation during transform interaction appears correct, but on finalize the node reverts. Initial hypothesis was legacy direct mutation path skipping rotation persistence. With all paths now command-based, reproduce and confirm if issue persists before implementing fix. Add regression test once root cause identified.
