# Vizail Architecture

## Overview

Vizail is a visual canvas editor built with React, TypeScript, Vite, and Konva. The architecture follows a modular component-based design with clear separation of concerns.

## Core Principles

1. **Component Composition**: Large monolithic components have been decomposed into focused, single-responsibility modules
2. **Hook-Based Logic**: Business logic is extracted into custom hooks for reusability and testability
3. **Pure Functions**: Utility functions are pure and tested independently
4. **Type Safety**: Full TypeScript coverage with explicit interfaces

## Architecture Layers

### 1. Specification Layer
**Purpose**: Declarative layout tree representation

- **File**: `layout-schema.ts`
- **Concept**: Immutable spec with root frame and nested children
- **Node Types**: Frame, Rect, Ellipse, Line, Curve, Text, Image, Group
- **Versioning**: Schema migrations handled via `schemaMigration.ts`

### 2. Rendering Layer
**Purpose**: Convert spec nodes to Konva shapes

**Key Files**:
- `canvas/CanvasRenderer.tsx` - Main renderer
- `renderer/rectVisual.ts` - Rectangle visual derivation
- `renderer/measurement.ts` - Text sizing heuristics
- `utils/paint.ts` - Paint normalization (fill/stroke/dash)

**Pattern**: Pure derivation functions that transform spec properties into visual properties

### 3. Interaction Layer
**Purpose**: Handle user input and canvas interactions

**Organization** (post-refactor):

```
canvas/
├── CanvasStage.tsx          # Main stage orchestrator (968 lines)
├── components/
│   ├── ContextMenu.tsx      # Right-click context menu
│   ├── CurveControlPointsLayer.tsx  # Curve editing UI
│   ├── DraftPreviewLayer.tsx        # Shape draft visualization
│   └── TextEditingOverlay.tsx       # Text editing UI
├── hooks/
│   ├── useMouseEventHandlers.ts     # Mouse event dispatch
│   ├── useTextEditing.ts            # Text editing logic
│   ├── useShapeTools.ts             # Shape creation tools
│   ├── useTransformManager.ts       # Transform handling
│   ├── useKeyboardShortcuts.ts      # Keyboard shortcuts
│   ├── useViewportManager.ts        # Viewport/zoom/pan
│   └── useSelectionManager.ts       # Selection normalization
└── utils/
    ├── canvasUtils.ts               # Node queries, coords
    ├── iconComponentUtils.ts        # Icon/component creation
    └── draftUtils.ts                # Draft listener utilities
```

**Key Patterns**:
- Hooks encapsulate related state and handlers
- Components are presentational with clear props
- Utils are pure functions for common operations

### 4. Application Layer
**Purpose**: Top-level app orchestration and UI

**Organization** (post-refactor):

```
src/
├── CanvasApp.tsx            # Main app orchestrator (1,037 lines)
├── components/
│   └── canvas/
│       ├── HeaderToolbar.tsx        # File/Help menu
│       ├── LeftToolbar.tsx          # Tool selection
│       ├── AttributesSidebar.tsx    # Property inspector
│       └── AgentPanel.tsx           # AI proposals panel
├── components/dialogs/
│   └── DialogManager.tsx            # All modal dialogs
└── hooks/canvas/
    ├── useToolState.ts              # Tool selection state
    ├── useDialogState.ts            # Dialog open/close state
    ├── useAttributeState.ts         # Attribute panel state
    ├── useLibraryState.ts           # Icon/component library
    └── useProposalState.ts          # AI proposal state
```

**Key Patterns**:
- Domain-specific hooks group related state
- Components extracted by UI responsibility
- Clean separation between UI and logic

### 5. Command Layer
**Purpose**: Atomic, invertible operations for undo/redo

**Key Files**:
- `commands/types.ts` - Command interfaces
- `commands/updateNodeProps.ts` - Property updates
- `commands/deleteNodes.ts` - Node deletion
- `commands/duplicateNodes.ts` - Node duplication
- `commands/groupNodes.ts` - Grouping
- `commands/ungroupNode.ts` - Ungrouping
- `commands/transformNodes.ts` - Transforms

**Pattern**: Each command implements `apply()` and `invert()` for undo/redo

### 6. Persistence Layer
**Purpose**: Save/load designs and manage defaults

**Key Files**:
- `hooks/useDesignPersistence.ts` - Local storage
- `hooks/useCloudPersistence.ts` - Cloud sync
- `hooks/useRecentColors.ts` - Color history
- `hooks/usePersistentRectDefaults.ts` - Default values
- `utils/persistence.ts` - Storage utilities

### 7. Collaboration Layer
**Purpose**: Real-time collaborative editing

**Key Files**:
- `collaboration/useRealtimeCanvas.ts` - Yjs integration
- `components/CursorOverlay.tsx` - Remote cursors
- `components/SelectionOverlay.tsx` - Remote selections
- `components/LockBadge.tsx` - Soft locks
- `hooks/useConflictDetection.ts` - Conflict handling

**Technology**: Yjs CRDT with WebSocket provider

### 8. AI Agent Layer
**Purpose**: Agent-based design proposals

**Key Files**:
- `hooks/useProposals.ts` - Proposal management
- `utils/proposalHelpers.ts` - Proposal operations
- `api/client.ts` - API integration

## Design Patterns

### Custom Hooks
**Pattern**: Extract stateful logic into reusable hooks
**Examples**:
- `useMouseEventHandlers` - Consolidates 400+ lines of mouse logic
- `useTextEditing` - Manages all text editing state
- `useToolState` - Encapsulates tool selection

### Component Extraction
**Pattern**: Break large components into focused pieces
**Examples**:
- `ContextMenu` - Extracted from CanvasStage (290 lines)
- `DialogManager` - Extracted from CanvasApp (250 lines)
- `AttributesSidebar` - Extracted from CanvasApp (600 lines)

### Utility Modules
**Pattern**: Pure functions grouped by domain
**Examples**:
- `canvasUtils` - Node queries and transformations
- `iconComponentUtils` - Creation helpers
- `paint.ts` - Style normalization

## Testing Strategy

### Unit Tests
- **Hooks**: Test state transitions and side effects
- **Utilities**: Test pure function behavior
- **Commands**: Test apply/invert symmetry

### Component Tests
- **UI Components**: Test rendering and interactions
- **Integration**: Test component composition

### Test Organization
```
src/
├── canvas/
│   ├── hooks/
│   │   ├── useMouseEventHandlers.ts
│   │   └── useMouseEventHandlers.test.ts
│   └── utils/
│       ├── canvasUtils.ts
│       └── canvasUtils.test.ts
```

**Coverage**: 498 tests with comprehensive coverage of all modules

## State Management

### Local State
- Component-level: `useState` for UI state
- Hook-level: Encapsulated in custom hooks
- App-level: Lifted to CanvasApp/CanvasStage

### Shared State
- Spec: Passed down from CanvasApp
- Selection: Managed in CanvasStage
- Tool state: Managed via hooks

### External State
- Yjs document: Collaborative state
- LocalStorage: Persisted preferences
- Cloud API: Synced designs

## Performance Considerations

### Rendering Optimization
- Konva layer caching where appropriate
- Virtualization for large node counts
- Debounced updates for collaboration

### State Updates
- Batched awareness updates (requestAnimationFrame)
- Memoized selectors where beneficial
- Pure component patterns

## Future Architecture

### Planned Improvements
1. **State Machine**: Tool/mode management
2. **Sub-Components**: Further CanvasStage decomposition
3. **Context API**: Reduce prop drilling
4. **Worker Threads**: Heavy computations

See `ROADMAP.md` for detailed future plans.

## Migration Guide

### From Monolithic to Modular

**Before** (Monolithic):
```typescript
// CanvasStage.tsx: 2,869 lines
// - All mouse handlers inline
// - All context menu logic
// - All text editing
```

**After** (Modular):
```typescript
// CanvasStage.tsx: 968 lines
const { onMouseDown, onMouseMove, onMouseUp } = useMouseEventHandlers(...);
const textEditing = useTextEditing(...);
// Focus on orchestration
```

**Key Changes**:
- 53% reduction in CanvasStage.tsx
- 50% reduction in CanvasApp.tsx
- 17 extracted modules
- 150+ new tests
- Zero breaking changes

## Contributing

### Code Organization Rules
1. Keep components under 500 lines
2. Extract hooks for reusable logic
3. Create utilities for pure functions
4. Write tests for all new modules
5. Maintain TypeScript types

### File Naming Conventions
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities: `camelCase.ts`
- Tests: `*.test.ts` or `*.test.tsx`

### Module Boundaries
- **Component**: UI rendering + local UI state
- **Hook**: Stateful logic + side effects
- **Utility**: Pure functions + transformations
