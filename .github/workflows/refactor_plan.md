## Refactor & Stability Plan

Last Updated: 2025-09-20
Branch: `feature/object-transforms`

---
### 1. Summary of Work Accomplished
Incremental refactors and stability improvements have reduced monolith complexity and increased deterministic test coverage.

Key accomplishments:
1. Baseline invariants & utility tests established (spec traversal, paint, measurement, interaction).
2. Rendering logic decomposed into pure modules (`rectVisual`, `paint`, `measurement`).
3. Selection & marquee semantics extracted to pure helpers (`renderer/interaction.ts`) with unit tests.
4. Persistence + defaults hooks extracted (`usePersistentRectDefaults`, `useRecentColors`).
5. Attribute & defaults panels extracted (rect panels) maintaining behavior parity.
6. Grouping workflow stabilized: auto-selection of new group, raw node bounds testing API, transformer flicker eliminated via visibility gating.
7. Command architecture in place for core mutations (insert, transform, group, ungroup, duplicate, delete, update props) paving path for undo/redo robustness.
8. Test suite growth: now >130 tests covering paint logic, measurement heuristics, selection logic, grouping bounds, rotation persistence.

Outcome: We have reliable seams (pure utils + commands) enabling the next wave: systemic stability (history fuzzing, invariant enforcement) and removal of timing hacks (bounding poll).

---
### 2. Guiding Principles (Condensed)
| Principle | Intent |
|-----------|--------|
| Behavior Parity First | Each structural change must keep runtime UX identical unless explicitly flagged. |
| Test Before / During | Add or extend tests in same commit as extraction. |
| Single Responsibility Commits | One conceptual change per commit for review clarity. |
| Deterministic Geometry | Prefer spec-derived measurements over live transformer boxes. |
| Explicit Commands | All mutations flow through commands to enable undo/redo invariants. |

---
### 3. Backlog (Prioritized Stability & Quality Items)
Status Legend: ☐ Not Started · ▶ In Progress · ⏳ Blocked · ✔ Done · △ Optional / Nice-to-have

| ID | Item | Description / Acceptance Criteria | Status |
|----|------|-----------------------------------|--------|
| S1 | Command History Fuzz & Invariants | Randomized 200+ op sequences (insert, group, transform, ungroup, duplicate, delete, nudge). Full undo returns initial spec; redo reproduces final spec; invariants (unique IDs, tree integrity, size>0) hold on every checkpoint. 100 iterations green. | ☐ |
| S2 | Deterministic Group Bounding (Remove Poll) | Eliminate rAF polling; derive displayed bounds from spec union directly (custom transformer box or overlay). No visual delay; grouping tests still pass. | ☐ |
| S3 | Async Asset Stability | Simulate delayed image/text metrics; grouping/transform invariants unaffected. Add tests with mocked load events. | ☐ |
| S4 | Transform Rounding Policy | Centralize rounding of size/position deltas; 10 scale→undo cycles yield identical spec hash. Add `geometryPolicy.test.ts`. | ☐ |
| S5 | Interaction Race Edge Tests | Tool switch mid-marquee, delete during transform, rapid group→ungroup cycle. No crashes, invariants pass. | ☐ |
| S6 | Persistence Round‑Trip Integrity | serialize→deserialize→render path yields stable spec & identical node client rects (epsilon). Add `persistenceRoundTrip.test.ts`. | ☐ |
| S7 | Performance Smoke (Non‑Perf Test) | Basic benchmark harness: 100 sequential random commands executes < threshold (document baseline) and warns if regression. | ☐ |
| S8 | Stroke Width Live Compensation | Keep stroke visually constant during scale (divide by scale). Test ensures strokeWidth screen-space stays within ±1px. | ☐ |
| S9 | Group Rotation Math Refinement | Preserve relative child layout after rotation bake; rotation undo stable. Add rotation decomposition tests. | ☐ |
| S10 | Storybook Core Coverage | Stories for attribute panel states, multi-select transformer, disabled fill/stroke fallback, large node set. Build passes clean. | △ |
| S11 | Command Coverage Completion | Move remaining ad-hoc spec mutations (reorder, aspect reset, text scale reset) into commands + unit tests. | ☐ |
| S12 | Undo/Redo UI Layer | Toolbar + history length indicator; keyboard and UI parity. | △ |
| S13 | Accessibility Pass | ARIA roles, focus management for panels & canvas wrapper. | △ |
| S14 | Spec Versioning Scaffold | Introduce version field + upgrader stub; round‑trip test ensures backward compatibility scaffold in place. | △ |
| S15 | Geometry Epsilon Consolidation | Single source of truth for all epsilon tolerances referenced by tests & logic. | ☐ |
| S16 | Marquee State Robustness | Ensure switching to rect tool always clears marquee; regression test for stray marquee bug. | ☐ |

---
### 4. Near-Term Execution Order (Suggested)
1. S1 – History Fuzz & Invariants (foundation for confidence)
2. S2 – Deterministic Bounding (remove polling technical debt)
3. S4 – Transform Rounding Policy (prevents drift uncovered by S1)
4. S5 – Interaction Race Tests
5. S3 – Async Asset Stability (depends on invariant harness to catch subtle issues)
6. S6 – Persistence Round‑Trip
7. S8 + S9 – Visual/transform fidelity improvements
8. S10 – Storybook coverage (visual regression safety)
9. Remaining stability/quality items (S15, S16, S11) then optional UI / perf (S7, S12, S13, S14)

---
### 5. Invariant Set (Target for S1)
| Invariant | Definition |
|-----------|------------|
| Unique IDs | No duplicates across full spec tree. |
| Single Parent | Each node appears exactly once (no cycles). |
| Valid Sizes | width > 0 && height > 0 for concrete shapes/groups. |
| Group Children | Groups either have ≥1 child or are explicitly allowed empty (decide & encode). |
| Selection Validity | Every selection id resolves to a current node (after each op). |
| No Dangling References | Reorder / grouping does not leave orphaned child references. |
| Stable Round‑Trip | Undo to start returns byte‑identical JSON (post ordering normalization if needed). |

---
### 6. Test Strategy Additions
| Area | New Test Type |
|------|---------------|
| Fuzz Harness | Deterministic seed + randomized sequences (Vitest) |
| Geometry Policy | Snapshot of transform/undo drift elimination |
| Async Assets | Mock image load latency integration test |
| Edge Interaction | Simulated rapid tool & command chaining |
| Persistence | Serialize/deserialize idempotence |
| Stroke Compensation | Visual numeric approximation (client rect diff) |
| Rotation Bake | Pre/post child coordinate equivalence (rot matrix) |

---
### 7. Metrics (Lightweight)
| Metric | Baseline (Current) | Target Trend |
|--------|--------------------|--------------|
| Test Count | ~134 | ↑ with each stability item |
| Avg Command Op Time (mock) | TBD | Document & monitor (warn on +50%) |
| CanvasStage LOC (core logic region) | Track after S2 | ↓ / stable |
| Flaky Tests | 0 | Stay 0 |

---
### 8. Commit / PR Checklist (Concise)
- [ ] Single responsibility
- [ ] Behavior parity OR clearly documented delta
- [ ] New/updated tests for any new logic
- [ ] Invariants green (after S1 harness exists)
- [ ] No console errors/warnings
- [ ] Docs/backlog updated if scope affects roadmap

---
### 9. Current Decisions / Policies
| Topic | Decision |
|-------|----------|
| Bounding Box Source | Spec union over transformer clientRect (transformer padding ignored). |
| Group Flicker Fix | Visibility gating until stable; will be replaced by deterministic bounds (S2). |
| Stroke Scaling | Temporary snap after bake; moving to live compensation (S8). |
| Rotation Persistence | Baseline rotation works; multi-child centroid math improvement (S9) pending. |

---
### 10. Active & Upcoming Work Tracking
Use the Backlog table statuses; update upon each commit touching stability features.

---
### 11. Bug Tracker
Status Legend: OPEN | IN-PROGRESS | RESOLVED | PARKED

| ID | Title | Status | Notes / Next Action |
|----|-------|--------|---------------------|
| B1 | Group Transformer Initial Flicker | RESOLVED | Hidden until stable; to be superseded by deterministic S2 removal of polling. |
| B2 | Group Rotation Child Drift | OPEN | Implement centroid-based rotation bake (S9). |
| B3 | Stroke Width Flicker During Scale | OPEN | Live compensate stroke while scaling (S8). |
| B4 | Stray Marquee After Tool Switch | OPEN | Ensure marquee cleared + threshold gating (S16). |
| B5 | Potential Image Load Timing Bounds | OPEN | Covered by async asset stability (S3). |

Add new bugs below (prepend B#):

| New ID | Description | Status | Linked Item |
|--------|-------------|--------|-------------|
| (add) |  |  |  |

---
### 12. Glossary (Abbrev)
Behavior Parity = No observable runtime change.  
Invariant = Always-true condition validated in tests/fuzz.  
Spec = Canonical serialized design tree.  
Fuzz Sequence = Deterministic pseudo-random command chain used for stress testing.

---
### 13. Next Immediate Action (If Unassigned)
Start S1: Implement `specInvariant.ts` + `commandHistory.fuzz.test.ts` with deterministic seed and reporting utilities.

---
End of Plan
