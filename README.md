# Visual Flow (Interactive Canvas Editor)

An experimental visual canvas editor built with **React**, **TypeScript**, **Vite**, and **Konva**. It focuses on incremental, test‑driven refactors toward a clean interaction model and future undo/redo support.

Current capabilities include:
 - Multi‑selection (click, shift / ctrl, marquee, toggle marquee)
 - Group / ungroup, duplicate, delete, layer z‑ordering
 - Rectangle tool with centered + square creation modifiers
 - Image aspect mode with stretch + restore flow
 - Text glyph scaling (with reset)
 - Attribute editing panels (color, stroke, dash, opacity, defaults, recent colors)
 - Pure derivation seams: paint normalization, rectangle visual props, measurement heuristics, selection logic

Baseline Tag: `refactor-baseline-v1` (post extraction of paint, measurement, rectVisual, interaction helpers)

---
## Quick Start
```bash
pnpm install   # or npm install / yarn
pnpm dev       # start Vite dev server
pnpm test      # run vitest suite
pnpm build     # production bundle (if required later)
```

Open the app, create rectangles (`R`), experiment with grouping, resizing, and context menu actions.

---
## Project Management

This repository uses an automated **Epic/Milestone/Issue** hierarchy for project management:
- **Milestones** represent release goals or project phases
- **Epics** (labeled PRs) represent major features tied to Milestones  
- **Issues** represent individual tasks tied to Epics
- When an Epic is merged, all linked Issues are **automatically closed**

📖 See [Epic Management Guide](docs/EPIC_MANAGEMENT.md) for details  
⚡ See [Quick Reference](docs/EPIC_QUICK_REFERENCE.md) for commands

---
## Architecture Overview

| Layer | Purpose | Key Files |
|-------|---------|-----------|
| Spec Model | Declarative layout tree (root + children) | `layout-schema.ts` |
| Rendering | Convert spec nodes → Konva shapes | `canvas/CanvasRenderer.tsx`, `renderer/rectVisual.ts` |
| Interaction | Stage pointer + selection handling | `canvas/CanvasStage.tsx`, `renderer/interaction.ts` |
| Measurement | Text + stack size heuristics | `renderer/measurement.ts` |
| Paint / Style | Normalize fill/stroke/dash semantics | `utils/paint.ts` |
| Persistence | Local storage for defaults + recent colors | `hooks/useDesignPersistence.ts`, `hooks/useRecentColors.ts` |
| Attribute Panels | Editing UI (rect, colors, defaults) | `components/*Panel.tsx` |

### Pure Seams (Tested)
1. `computeRectVisual` – Consolidated rectangle visual derivation (fallback stroke, dash inclusion rules).
2. `normalizePaint` / `deriveStrokeVisual` – Paint enable/disable + fallback semantics.
3. `measurement` – Approximate height + font scaling heuristics separated from rendering.
4. `interaction` – Selection state transitions (click + marquee) extracted for deterministic tests.

### Planned (Roadmap)
See `docs/ROADMAP.md` for staged work: drag extraction, command layer, undo/redo, composite batching.

---
## Directory Highlights
```
src/
  canvas/            # Stage + Konva wiring
  components/        # Attribute & control panels
  hooks/             # Persistence, sizing, selection, defaults
  renderer/          # Pure derivations (visuals, measurement, interaction)
  utils/             # Paint, color editing, dash parsing, spec utilities
  samples/           # Example spec compositions
  editor/            # (Emerging) higher-level editor constructs
```

---
## Development Workflow
Small, behavior‑parity refactors only:
1. Add / extend tests first.
2. Extract pure helper or hook.
3. Replace inline logic with helper call.
4. Run full test suite (must stay green & count non‑decreasing).
5. Document extraction (append to `refactor_plan.md`).

Recommended scripts:
```bash
pnpm test              # unit tests
pnpm test --watch      # focused iterative loop
pnpm lint              # lint (strict: many any->TODO items remain)
pnpm storybook         # (if enabled) interactive component/dev env
```

---
## Testing Strategy
| Area | Coverage |
|------|----------|
| Visual derivation | `rectVisual.test.ts` validates style + fallback combinations |
| Paint logic | `paint.test.ts` (dash conversion, disabling semantics) |
| Measurement | `measurement.test.ts` ensures font + height heuristics stable |
| Interaction | `interaction.test.ts` click + toggle + marquee behaviors |
| Persistence | Round‑trip, recent colors, defaults |
| Spec invariants | Node uniqueness / structure guards |
| Panels | Rect attribute + color picker session interactions |

Emerging TODO: drag delta math, command inversion, undo stack invariants.

---
## Refactor Protocol (Condensed)
Adapted from `.github/workflows/refactor_plan.md`:

1. One conceptual change per commit (e.g. "extract measurement heuristics").
2. No silent behavior changes – if behavior changes, label commit clearly & add tests.
3. Every new module accompanied by a test file (or added cases).
4. Test count never decreases; all must pass before merge.
5. Avoid broad renames / formatting churn in refactor commits.
6. Prefer small pure seams before architectural leaps (undo/redo, command bus).

---
## Roadmap Snapshot
Milestones:
1. Drag & Marquee Extraction (drag threshold, displacement calc, pure marquee hit-testing)
2. Command Dispatch Layer (atomic + invertible commands)
3. Undo / Redo Foundation (`useHistory`, command log, inversion tests)
4. Batched Interaction Commits (drag grouped into single history entry)
5. Optional: History persistence (session resilience)

Details: see `docs/ROADMAP.md`.

---
## Interaction Cheatsheet

Core selection & navigation:
- Click: Select a single node.
- Shift / Ctrl + Click: Add/remove nodes from selection.
- Drag on empty space: Marquee select (hold Shift/Ctrl to toggle in/out).
- Right‑Click: Open context menu (Group / Ungroup / Re-enable Aspect when applicable).
- Middle Mouse / Alt+Left Drag / Space+Drag: Pan (Spacebar enables temporary panning mode).
- Mouse Wheel: Zoom to cursor.

Transform & geometry:
- Drag corner/edge handles: Resize freely (non-uniform allowed).
- Shift + Drag handle: Constrain resize to original aspect ratio.
- Alt/Option + Drag handle: Centered scaling (expands/shrinks symmetrically about center).
- Shift + Alt + Drag: Centered uniform scaling.
- Rotate handle: Free rotation (snaps at 0/90/180/270°).

Rectangle tool:
- Activate: toolbar button or press `R` (toggle).
- Draw: Click-drag on empty canvas to create rectangle.
- Shift while dragging: Constrain to square.
- Alt while dragging: Center-out creation (start point becomes center). Shift+Alt: centered square.
- Release mouse to finalize; tool auto-switches back to Select; new rect is selected.

Text glyph scaling:
- Text nodes distort (squash/stretch) their glyphs when resized; the box itself does not reflow text.
- Shift during text resize: Uniform glyph scale (maintain original distortion ratio).
- Alt: Centered glyph scaling; Shift+Alt combines both behaviors.
- Context Menu → Reset Text Scale: Restore glyph scale to 1× (removes distortion).

Images:
- Non-uniform resize of an aspect-preserving image: Switches to stretched mode (aspect disabled).
- Context Menu → Re-enable Aspect: Restores aspect mode (uses existing or fallback `contain` fit).
- Shift constraint still works after restoring aspect.

Grouping:
- Ctrl/Cmd + G: Group selected nodes.
- Ctrl/Cmd + Shift + G: Ungroup (when a single group is selected).

Editing:
- Delete / Backspace: Remove selected nodes.
- Ctrl/Cmd + D: Duplicate selection.
- Arrow Keys: Nudge 1px.
- Shift + Arrow Keys: Nudge 10px.

Layer ordering (z-order within same parent):
- Context Menu → Move Forward: Move each selected node one step closer to front (cannot pass another selected node).
- Context Menu → Move Lower: Move each selected node one step toward back.
- Context Menu → Move To Top: Bring selected nodes to front (relative order preserved among them).
- Context Menu → Move To Bottom: Send selected nodes to back (relative order preserved).

Rotation & Baking:
- Transform changes are baked on mouse release: live Konva transform is reset while persisted spec stores final position, size, rotation.

Notes:
- Aspect behavior for images is controlled by `preserveAspect` + `objectFit` (`cover`/`contain`). Stretched images set `preserveAspect=false`.
- Any subsequent non-uniform scale of a restored aspect image disables aspect again.
- Text scaling persists as `textScaleX` / `textScaleY`; reset sets both to 1.

---
## Contributing (Internal)
This project currently iterates via tightly scoped refactors. Follow the Refactor Protocol, update roadmap / refactor plan as you land seams, and keep commits reviewable (< ~400 touched LOC ideally).

Planned external contribution guidelines (CODE_OF_CONDUCT, PR template) pending stabilization of interaction & history layers.

---
## License
TBD (not yet specified). Add a LICENSE file before public distribution.


