/**
 * Example: Phase 3 Real-Time Polish Demo
 * Demonstrates soft locks, conflict detection, and checkpoints
 */

import { useState } from 'react';
import { useRealtimeCanvas } from '../collaboration';
import { CursorOverlay } from '../components/CursorOverlay';
import { SelectionOverlay } from '../components/SelectionOverlay';
import { LockOverlay } from '../components/LockBadge';
import { ConnectionStatusIndicator } from '../components/ConnectionStatusIndicator';
import { ActiveUsersList } from '../components/ActiveUsersList';
import { ConflictToastContainer } from '../components/ConflictToast';
import { CheckpointPanel } from '../components/CheckpointPanel';
import { useConflictDetection } from '../hooks/useConflictDetection';
import { useCheckpoints } from '../hooks/useCheckpoints';
import type { LayoutSpec } from '../layout-schema';

interface Phase3DemoProps {
  canvasId: string;
  userId: string;
  displayName: string;
  buildInitial: () => LayoutSpec;
  wsUrl?: string;
}

/**
 * Demonstration of Phase 3 features:
 * - Soft locks (see who's dragging what)
 * - Conflict notifications (when remote changes affect your selection)
 * - Checkpoint system (auto-save every 5 min + manual checkpoints)
 * - Performance optimizations (60fps with multiple collaborators)
 */
export function Phase3Demo({
  canvasId,
  userId,
  displayName,
  buildInitial,
  wsUrl,
}: Phase3DemoProps) {
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [showCheckpointPanel, setShowCheckpointPanel] = useState(false);

  // Real-time collaboration with performance optimizations
  const {
    spec,
    setSpec,
    status,
    collaborators,
    clientId,
    isSyncing,
    lastError,
    updateCursor,
    updateSelection,
    updateDragging,
    reconnect,
  } = useRealtimeCanvas({
    canvasId,
    userId,
    displayName,
    buildInitial,
    wsUrl,
    enabled: true,
  });

  // Conflict detection
  const { conflicts, dismissConflict } = useConflictDetection({
    spec,
    selectedNodeIds,
    collaborators,
    clientId,
    enabled: true,
  });

  // Checkpoint system (auto-checkpoint every 5 min)
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
    autoCheckpointIntervalMs: 5 * 60 * 1000, // 5 minutes
    enableAutoCheckpoint: true,
  });

  // Track cursor movement
  const handleMouseMove = (e: React.MouseEvent) => {
    // Convert screen coordinates to canvas coordinates
    // In real implementation, account for zoom and pan
    updateCursor(e.clientX, e.clientY);
  };

  // Handle selection changes
  const handleSelectionChange = (nodeIds: string[]) => {
    setSelectedNodeIds(nodeIds);
    updateSelection(nodeIds);
  };

  // Handle drag start (soft lock)
  const handleDragStart = (nodeIds: string[], position: { x: number; y: number }) => {
    updateDragging({
      nodeIds,
      ghostPosition: position,
    });
  };

  // Handle drag end (release lock)
  const handleDragEnd = () => {
    updateDragging(undefined);
  };

  // Example: Get node bounds for overlays
  // In real app, this would query actual rendered nodes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getNodeBounds = (_nodeId: string) => {
    return { x: 100, y: 100, width: 100, height: 100 };
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getNodePosition = (_nodeId: string) => {
    return { x: 100, y: 100 };
  };

  return (
    <div className="relative h-screen w-screen" onMouseMove={handleMouseMove}>
      {/* Header with status and controls */}
      <div className="absolute left-4 right-4 top-4 z-50 flex items-center justify-between">
        <ConnectionStatusIndicator
          status={status}
          collaboratorCount={collaborators.size}
          isSyncing={isSyncing}
          lastError={lastError}
          onReconnect={reconnect}
        />

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCheckpointPanel(true)}
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow hover:bg-gray-50"
          >
            Checkpoints ({checkpoints.length})
          </button>
          
          <ActiveUsersList collaborators={collaborators} maxVisible={5} />
        </div>
      </div>

      {/* Main canvas */}
      <div className="h-full w-full">
        {/* Your CanvasStage component here */}
        <div className="flex h-full items-center justify-center bg-gray-100">
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Phase 3: Real-Time Polish Demo</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>✅ Soft locks - See who's dragging nodes in real-time</p>
              <p>✅ Conflict notifications - Non-blocking alerts for conflicting edits</p>
              <p>✅ Auto-checkpoints - Every 5 minutes (if changed)</p>
              <p>✅ Performance - Throttled updates for 60fps with 5+ collaborators</p>
            </div>
            <div className="pt-4">
              <p className="text-gray-500">
                Canvas has {spec.root.children?.length || 0} nodes
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Simulated drag handlers: Use handleDragStart() and handleDragEnd()
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Presence overlays */}
      <CursorOverlay collaborators={collaborators} />
      
      <SelectionOverlay
        collaborators={collaborators}
        getNodeBounds={getNodeBounds}
      />

      {/* Phase 3: Lock badges showing who's dragging */}
      <LockOverlay
        collaborators={collaborators}
        getNodePosition={getNodePosition}
      />

      {/* Phase 3: Conflict notifications */}
      <ConflictToastContainer
        conflicts={conflicts}
        onDismiss={dismissConflict}
        onUndo={(conflictId) => {
          // In real app, implement undo logic
          console.log('Undo conflict:', conflictId);
          dismissConflict(conflictId);
        }}
      />

      {/* Phase 3: Checkpoint panel */}
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

      {/* Helper text */}
      <div className="pointer-events-none absolute bottom-4 left-4 text-xs text-gray-500">
        <p>Phase 3 Demo - All features integrated</p>
        <p className="mt-1">
          Throttled updates: {collaborators.size > 0 ? '10fps' : 'N/A'}
        </p>
      </div>
    </div>
  );
}

/**
 * Integration notes:
 * 
 * To integrate into existing CanvasApp:
 * 
 * 1. Replace useDesignPersistence with useRealtimeCanvas
 * 2. Add useConflictDetection hook
 * 3. Add useCheckpoints hook
 * 4. Wire updateDragging to drag handlers:
 *    - Call updateDragging({ nodeIds, ghostPosition }) on dragstart
 *    - Call updateDragging(undefined) on dragend
 * 5. Add overlay components:
 *    - <LockOverlay /> for soft locks
 *    - <ConflictToastContainer /> for conflict notifications
 *    - <CheckpointPanel /> in a modal/sidebar
 * 
 * The performance optimizations (throttling, batching) are automatic
 * in the updated useRealtimeCanvas hook.
 */
