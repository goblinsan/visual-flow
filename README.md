# Vizail (Interactive Canvas Editor)

A visual canvas editor built with **React**, **TypeScript**, **Vite**, and **Konva**. Features a modular architecture with comprehensive test coverage and real-time collaboration support.

## Features

### Core Editing
- Multi-selection (click, shift/ctrl, marquee)
- Shape tools (rectangle, ellipse, line, curve)
- Text editing with rich formatting
- Image placement with aspect ratio control
- Group/ungroup, duplicate, delete
- Layer z-ordering and organization
- Transform tools (resize, rotate, scale)

### Collaboration
- Real-time collaborative editing (Yjs CRDT)
- Cursor and selection awareness
- Soft locks for conflict prevention
- Cloud synchronization

### AI Integration
- Agent-based design proposals
- Branch-based workflow
- Proposal review and approval

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
## Architecture Overview

Vizail follows a modular architecture with clear separation of concerns:

| Layer | Purpose | Key Modules |
|-------|---------|-------------|
| **Specification** | Declarative layout tree | `layout-schema.ts` |
| **Rendering** | Spec nodes → Konva shapes | `canvas/CanvasRenderer.tsx`, `renderer/` |
| **Interaction** | Mouse/keyboard handling | `canvas/hooks/useMouseEventHandlers.ts` |
| **Application** | Top-level orchestration | `CanvasApp.tsx`, `components/canvas/` |
| **Commands** | Atomic operations (undo/redo) | `commands/*.ts` |
| **Persistence** | Save/load/sync | `hooks/useDesignPersistence.ts` |
| **Collaboration** | Real-time editing | `collaboration/useRealtimeCanvas.ts` |

### Modular Design (Post-Refactor)

The codebase has been refactored from monolithic components into focused modules:

**Canvas Layer** (~1,000 lines total):
- `CanvasStage.tsx` (968 lines) - Main canvas orchestrator
- 4 UI components (ContextMenu, CurveControlPointsLayer, etc.)
- 7 custom hooks (useMouseEventHandlers, useTextEditing, etc.)
- 3 utility modules (canvasUtils, iconComponentUtils, draftUtils)

**Application Layer** (~1,000 lines total):
- `CanvasApp.tsx` (1,037 lines) - App orchestrator
- 4 UI components (HeaderToolbar, LeftToolbar, etc.)
- 5 domain hooks (useToolState, useDialogState, etc.)

See `docs/ARCHITECTURE.md` for detailed architecture documentation.

---
## Directory Structure

```
src/
├── CanvasApp.tsx              # Main app orchestrator (1,037 lines)
├── canvas/
│   ├── CanvasStage.tsx        # Canvas orchestrator (968 lines)
│   ├── CanvasRenderer.tsx     # Spec → Konva rendering
│   ├── components/            # Canvas UI components
│   │   ├── ContextMenu.tsx
│   │   ├── CurveControlPointsLayer.tsx
│   │   ├── DraftPreviewLayer.tsx
│   │   └── TextEditingOverlay.tsx
│   ├── hooks/                 # Canvas interaction hooks
│   │   ├── useMouseEventHandlers.ts
│   │   ├── useTextEditing.ts
│   │   ├── useShapeTools.ts
│   │   ├── useTransformManager.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useViewportManager.ts
│   │   └── useSelectionManager.ts
│   └── utils/                 # Canvas utilities
│       ├── canvasUtils.ts
│       ├── iconComponentUtils.ts
│       └── draftUtils.ts
├── components/
│   ├── canvas/                # App-level UI components
│   │   ├── HeaderToolbar.tsx
│   │   ├── LeftToolbar.tsx
│   │   ├── AttributesSidebar.tsx
│   │   └── AgentPanel.tsx
│   ├── dialogs/
│   │   └── DialogManager.tsx
│   └── *Panel.tsx             # Attribute panels
├── hooks/
│   ├── canvas/                # App-level state hooks
│   │   ├── useToolState.ts
│   │   ├── useDialogState.ts
│   │   ├── useAttributeState.ts
│   │   ├── useLibraryState.ts
│   │   └── useProposalState.ts
│   └── use*.ts                # Feature hooks
├── commands/                  # Atomic operations (undo/redo)
├── collaboration/             # Real-time collaboration
├── renderer/                  # Pure rendering derivations
├── utils/                     # Shared utilities
└── samples/                   # Example specs
```

---
## Development Workflow

### Setup
```bash
npm install        # Install dependencies
npm run dev        # Start dev server
npm test           # Run test suite
npm run lint       # Run linter
npm run build      # Production build
```

### Development Principles
1. **Test-Driven**: Write tests before implementation
2. **Incremental**: Small, focused changes
3. **Type-Safe**: Full TypeScript coverage
4. **Modular**: Extract logic into hooks/utilities
5. **Tested**: All modules have comprehensive tests

### Code Organization
- Keep components under 500 lines
- Extract hooks for reusable logic
- Create utilities for pure functions
- Write tests for all new modules
- Maintain clear boundaries

---
## Testing Strategy

Comprehensive test coverage with 498+ tests:

| Category | Coverage |
|----------|----------|
| **Unit Tests** | Hooks, utilities, commands |
| **Component Tests** | UI components, interactions |
| **Integration Tests** | Component composition |
| **Visual Tests** | Rendering derivations |

### Test Organization
- Co-located with source files (e.g., `useMouseEventHandlers.test.ts`)
- Comprehensive coverage of all modules
- Fast execution (sub-second for most tests)

### Running Tests
```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- --coverage # Coverage report
```

---
## Keyboard Shortcuts

### Tools
- `V` - Select tool
- `R` - Rectangle tool
- `O` - Ellipse tool
- `L` - Line tool
- `P` - Curve/Path tool
- `T` - Text tool
- `I` - Image tool

### Actions
- `Delete`/`Backspace` - Delete selected
- `Ctrl/Cmd + D` - Duplicate
- `Ctrl/Cmd + G` - Group
- `Ctrl/Cmd + Shift + G` - Ungroup
- `Ctrl/Cmd + Z` - Undo (local mode)
- `Ctrl/Cmd + Shift + Z` - Redo (local mode)
- `Arrow Keys` - Nudge 1px
- `Shift + Arrow Keys` - Nudge 10px
- `Space + Drag` - Pan canvas

### Selection
- `Click` - Select single
- `Shift/Ctrl + Click` - Add/remove from selection
- `Drag` - Marquee select
- `Shift/Ctrl + Drag` - Toggle marquee

### Transform
- `Shift + Drag Handle` - Constrain aspect ratio
- `Alt + Drag Handle` - Scale from center
- `Shift + Alt + Drag` - Both constraints

---
## Project Management

This repository uses an **Epic/Milestone/Issue** hierarchy:
- **Milestones**: Release goals or project phases
- **Epics**: Major features (labeled PRs)
- **Issues**: Individual tasks tied to Epics

See `docs/GITHUB_ISSUE_HIERARCHY.md` for details.

---
## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Code Quality**: Maintain TypeScript types and test coverage
2. **Modularity**: Keep components focused and under 500 lines
3. **Testing**: Write tests for all new functionality
4. **Documentation**: Update relevant docs with changes

See `docs/ARCHITECTURE.md` for architecture details and patterns.

---
## Roadmap

See `docs/ROADMAP.md` for:
- Planned features and improvements
- Milestone tracking
- Technical debt items

---
## License

TBD (not yet specified). Add a LICENSE file before public distribution.
