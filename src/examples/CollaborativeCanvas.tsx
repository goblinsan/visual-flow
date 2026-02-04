/**
 * Example: Real-time Collaborative Canvas
 * Demonstrates how to integrate real-time collaboration into CanvasApp
 */

import { useRealtimeCanvas } from '../collaboration';
import { CursorOverlay } from '../components/CursorOverlay';
import { SelectionOverlay } from '../components/SelectionOverlay';
import { ConnectionStatusIndicator } from '../components/ConnectionStatusIndicator';
import { ActiveUsersList } from '../components/ActiveUsersList';
import type { LayoutSpec } from '../layout-schema';

interface CollaborativeCanvasProps {
  canvasId: string;
  userId: string;
  displayName: string;
  buildInitial: () => LayoutSpec;
  wsUrl?: string;
}

/**
 * Example collaborative canvas component
 * 
 * Usage:
 * ```tsx
 * <CollaborativeCanvas
 *   canvasId="canvas-123"
 *   userId="user@example.com"
 *   displayName="John Doe"
 *   buildInitial={() => createDefaultSpec()}
 *   wsUrl="wss://your-worker.workers.dev"
 * />
 * ```
 */
export function CollaborativeCanvas({
  canvasId,
  userId,
  displayName,
  buildInitial,
  wsUrl,
}: CollaborativeCanvasProps) {
  // Enable real-time collaboration
  const {
    spec,
    // setSpec and updateSelection are available but not used in this example
    // Wire them to your actual canvas implementation
    status,
    collaborators,
    isSyncing,
    lastError,
    updateCursor,
    reconnect,
  } = useRealtimeCanvas({
    canvasId,
    userId,
    displayName,
    buildInitial,
    wsUrl,
    enabled: true,
  });

  // Track cursor movement on canvas
  const handleMouseMove = (e: React.MouseEvent) => {
    // Convert screen coordinates to canvas coordinates
    // (In real implementation, account for zoom and pan)
    updateCursor(e.clientX, e.clientY);
  };

  // Note: Selection change handler would be wired to actual selection logic
  // This is just a placeholder showing the pattern

  // Example: Get node bounds for selection overlay
  // In real app, this would query the actual rendered nodes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getNodeBounds = (_nodeId: string) => {
    // Placeholder - implement based on your rendering
    // Should return actual bounds of rendered node
    return { x: 0, y: 0, width: 100, height: 100 };
  };

  return (
    <div className="relative h-screen w-screen" onMouseMove={handleMouseMove}>
      {/* Header with status and active users */}
      <div className="absolute left-4 right-4 top-4 z-50 flex items-center justify-between">
        <ConnectionStatusIndicator
          status={status}
          collaboratorCount={collaborators.size}
          isSyncing={isSyncing}
          lastError={lastError}
          onReconnect={reconnect}
        />
        
        <ActiveUsersList collaborators={collaborators} maxVisible={5} />
      </div>

      {/* Main canvas - replace with your CanvasStage component */}
      <div className="h-full w-full">
        {/* Your CanvasStage or rendering component here */}
        {/* Example: */}
        {/* <CanvasStage 
          spec={spec} 
          onSpecChange={setSpec}
          onSelectionChange={handleSelectionChange}
        /> */}
        <div className="flex h-full items-center justify-center bg-gray-100">
          <p className="text-gray-500">
            Canvas rendering goes here. Current spec has {spec.root.children?.length || 0} children.
          </p>
        </div>
      </div>

      {/* Presence overlays */}
      <CursorOverlay collaborators={collaborators} />
      
      <SelectionOverlay
        collaborators={collaborators}
        getNodeBounds={getNodeBounds}
      />
    </div>
  );
}

/**
 * Example: Enable collaboration in existing CanvasApp
 * 
 * Replace useDesignPersistence or useCloudPersistence with useRealtimeCanvas:
 * 
 * ```tsx
 * // Old:
 * const { spec, setSpec } = useDesignPersistence({ buildInitial });
 * 
 * // New:
 * const { 
 *   spec, 
 *   setSpec, 
 *   collaborators,
 *   updateCursor,
 *   updateSelection 
 * } = useRealtimeCanvas({
 *   canvasId: 'canvas-123',
 *   userId: 'user@example.com',
 *   displayName: 'John Doe',
 *   buildInitial,
 *   wsUrl: 'wss://your-worker.workers.dev',
 * });
 * 
 * // Add presence overlays to your canvas:
 * <CursorOverlay collaborators={collaborators} />
 * <SelectionOverlay collaborators={collaborators} getNodeBounds={getNodeBounds} />
 * ```
 */
