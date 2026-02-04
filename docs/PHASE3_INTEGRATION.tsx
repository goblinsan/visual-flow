/**
 * Integration Example: How to add Phase 3 features to CanvasApp
 * 
 * This file shows the minimal changes needed to integrate Phase 3 features
 * into the existing CanvasApp component.
 */

import { useState } from 'react';
import { useRealtimeCanvas } from '../collaboration';
import { LockOverlay } from '../components/LockBadge';
import { ConflictToastContainer } from '../components/ConflictToast';
import { CheckpointPanel } from '../components/CheckpointPanel';
import { useConflictDetection } from '../hooks/useConflictDetection';
import { useCheckpoints } from '../hooks/useCheckpoints';
import type { LayoutSpec } from '../layout-schema';

/**
 * Example: Adding Phase 3 to CanvasApp
 * 
 * BEFORE (Phase 2):
 * ```tsx
 * const { spec, setSpec } = useRealtimeCanvas({ ... });
 * ```
 * 
 * AFTER (Phase 3):
 * ```tsx
 * const {
 *   spec,
 *   setSpec,
 *   collaborators,
 *   clientId,
 *   updateDragging, // NEW: For soft locks
 * } = useRealtimeCanvas({ ... });
 * 
 * // NEW: Conflict detection
 * const { conflicts, dismissConflict } = useConflictDetection({
 *   spec,
 *   selectedNodeIds,
 *   collaborators,
 *   clientId,
 * });
 * 
 * // NEW: Checkpoints
 * const {
 *   checkpoints,
 *   createCheckpoint,
 *   restoreCheckpoint,
 *   deleteCheckpoint,
 * } = useCheckpoints({
 *   canvasId,
 *   getSpec: () => spec,
 *   setSpec,
 * });
 * ```
 */

interface Phase3IntegrationProps {
  canvasId: string;
  userId: string;
  displayName: string;
  buildInitial: () => LayoutSpec;
  // ... other existing CanvasApp props
}

export function Phase3IntegrationExample({
  canvasId,
  userId,
  displayName,
  buildInitial,
}: Phase3IntegrationProps) {
  // Existing CanvasApp state
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [showCheckpointPanel, setShowCheckpointPanel] = useState(false);

  // Phase 2: Real-time collaboration (already exists)
  const {
    spec,
    setSpec,
    collaborators,
    clientId,
    updateCursor,
    updateSelection,
    updateDragging, // ← Already exists in Phase 2!
    // ... other fields
  } = useRealtimeCanvas({
    canvasId,
    userId,
    displayName,
    buildInitial,
  });

  // ✨ NEW Phase 3: Conflict detection
  const { conflicts, dismissConflict } = useConflictDetection({
    spec,
    selectedNodeIds,
    collaborators,
    clientId,
    enabled: true,
  });

  // ✨ NEW Phase 3: Checkpoints
  const {
    checkpoints,
    isCreating,
    isRestoring,
    createCheckpoint,
    restoreCheckpoint,
    deleteCheckpoint,
  } = useCheckpoints({
    canvasId,
    getSpec: () => spec,
    setSpec,
    userId,
    enableAutoCheckpoint: true,
    autoCheckpointIntervalMs: 5 * 60 * 1000, // 5 minutes
  });

  // ✨ UPDATED: Existing drag handlers with soft locks
  const handleDragStart = (
    nodeIds: string[],
    event: any // Konva event
  ) => {
    // Get drag position from event
    const position = {
      x: event.target.x(),
      y: event.target.y(),
    };

    // ✨ NEW: Broadcast soft lock to other users
    updateDragging({
      nodeIds,
      ghostPosition: position,
    });

    // ... existing drag logic
  };

  const handleDragMove = (
    _nodeIds: string[],
    event: any
  ) => {
    // Update ghost position during drag
    const position = {
      x: event.target.x(),
      y: event.target.y(),
    };

    // ✨ NEW: Update ghost position
    updateDragging({
      nodeIds: selectedNodeIds,
      ghostPosition: position,
    });

    // ... existing drag logic
  };

  const handleDragEnd = () => {
    // ✨ NEW: Release soft lock
    updateDragging(undefined);

    // ... existing drag logic
  };

  // ✨ UPDATED: Selection handler with awareness
  const handleSelectionChange = (nodeIds: string[]) => {
    setSelectedNodeIds(nodeIds);
    
    // ✨ EXISTING Phase 2: Update awareness
    updateSelection(nodeIds);
  };

  // Helper to get node screen position (for lock badges)
  const getNodePosition = (nodeId: string): { x: number; y: number } | null => {
    // TODO: Implement based on your rendering
    // This should return the actual screen position of the node
    // Example:
    // const node = findNodeById(spec, nodeId);
    // const stage = stageRef.current;
    // return stage.toCanvas(node.position);
    
    return null; // Placeholder
  };

  return (
    <div className="relative h-screen w-screen">
      {/* Existing CanvasApp rendering */}
      {/* ... */}
      
      {/* ✨ NEW Phase 3: Lock overlay (shows who's dragging) */}
      <LockOverlay
        collaborators={collaborators}
        getNodePosition={getNodePosition}
      />

      {/* ✨ NEW Phase 3: Conflict notifications */}
      <ConflictToastContainer
        conflicts={conflicts}
        onDismiss={dismissConflict}
        onUndo={(conflictId) => {
          // TODO: Implement undo logic
          // For now, just dismiss
          dismissConflict(conflictId);
        }}
      />

      {/* ✨ NEW Phase 3: Checkpoint panel */}
      <CheckpointPanel
        checkpoints={checkpoints}
        isCreating={isCreating}
        isRestoring={isRestoring}
        onCreateCheckpoint={(label) => {
          createCheckpoint({ label, isAuto: false });
        }}
        onRestoreCheckpoint={restoreCheckpoint}
        onDeleteCheckpoint={deleteCheckpoint}
        isOpen={showCheckpointPanel}
        onClose={() => setShowCheckpointPanel(false)}
      />

      {/* ✨ NEW: Add checkpoint button to toolbar */}
      <button
        onClick={() => setShowCheckpointPanel(true)}
        className="absolute right-4 top-4 rounded-lg bg-white px-3 py-2 text-sm shadow"
      >
        Checkpoints ({checkpoints.length})
      </button>
    </div>
  );
}

/**
 * Summary of Changes:
 * 
 * 1. Add imports:
 *    - LockOverlay, ConflictToastContainer, CheckpointPanel
 *    - useConflictDetection, useCheckpoints
 * 
 * 2. Add hooks:
 *    - useConflictDetection(...)
 *    - useCheckpoints(...)
 * 
 * 3. Update drag handlers:
 *    - handleDragStart: call updateDragging({ nodeIds, ghostPosition })
 *    - handleDragMove: call updateDragging({ nodeIds, ghostPosition })
 *    - handleDragEnd: call updateDragging(undefined)
 * 
 * 4. Add overlay components:
 *    - <LockOverlay />
 *    - <ConflictToastContainer />
 *    - <CheckpointPanel />
 * 
 * 5. Add UI controls:
 *    - Checkpoint button in toolbar
 * 
 * That's it! All performance optimizations are automatic in useRealtimeCanvas.
 */

/**
 * Testing Checklist:
 * 
 * Soft Locks:
 * - [ ] Open two browser windows
 * - [ ] Drag node in window 1
 * - [ ] See lock badge in window 2
 * - [ ] See ghost outline at drag position
 * - [ ] Lock disappears when drag ends
 * 
 * Conflict Detection:
 * - [ ] Select node in window 1
 * - [ ] Modify same node in window 2
 * - [ ] See conflict toast in window 1
 * - [ ] Toast shows correct user name
 * - [ ] Toast auto-dismisses after 5 seconds
 * 
 * Checkpoints:
 * - [ ] Open checkpoint panel
 * - [ ] Create manual checkpoint with label
 * - [ ] Make some changes
 * - [ ] See auto-checkpoint after 5 minutes
 * - [ ] Restore to earlier checkpoint
 * - [ ] Verify canvas returns to saved state
 * - [ ] Delete a checkpoint
 * 
 * Performance:
 * - [ ] Open 5 browser windows
 * - [ ] Drag nodes rapidly
 * - [ ] Verify 60fps (use browser DevTools Performance)
 * - [ ] No lag or stuttering
 * - [ ] Cursor updates smooth
 */
