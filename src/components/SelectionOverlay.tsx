/**
 * Selection overlay component
 * Displays remote user selections with colored borders
 */

import type { UserAwareness } from '../collaboration/types';

interface SelectionOverlayProps {
  collaborators: Map<number, UserAwareness>;
  /** Get bounding box for a node ID */
  getNodeBounds: (nodeId: string) => { x: number; y: number; width: number; height: number } | null;
  /** Canvas zoom level for scaling */
  zoom?: number;
  /** Canvas pan offset */
  pan?: { x: number; y: number };
}

export function SelectionOverlay({
  collaborators,
  getNodeBounds,
  zoom = 1,
  pan = { x: 0, y: 0 },
}: SelectionOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {Array.from(collaborators.values()).map((user) => {
        return user.selection.map((nodeId) => {
          const bounds = getNodeBounds(nodeId);
          if (!bounds) return null;

          // Transform position based on canvas zoom and pan
          const x = bounds.x * zoom + pan.x;
          const y = bounds.y * zoom + pan.y;
          const width = bounds.width * zoom;
          const height = bounds.height * zoom;

          return (
            <div
              key={`${user.clientId}-${nodeId}`}
              className="absolute"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${width}px`,
                height: `${height}px`,
                border: `2px solid ${user.color}`,
                borderRadius: '2px',
                boxShadow: `0 0 0 1px white, 0 0 8px ${user.color}40`,
              }}
            >
              {/* User label on selection */}
              <div
                className="absolute -top-6 left-0 rounded px-2 py-0.5 text-xs font-medium text-white shadow-sm"
                style={{ backgroundColor: user.color }}
              >
                {user.displayName}
              </div>
            </div>
          );
        });
      })}
    </div>
  );
}
