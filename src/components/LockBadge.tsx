/**
 * LockBadge component
 * Shows when a node is being dragged/edited by another user
 * Phase 3: Soft Locks
 */

import type { UserAwareness } from '../collaboration/types';

interface LockBadgeProps {
  /** The user who has the lock */
  user: UserAwareness;
  /** Position to display the badge */
  position?: { x: number; y: number };
  /** Whether to show ghost preview */
  showGhost?: boolean;
}

/**
 * Badge that appears when another user is dragging a node
 */
export function LockBadge({ user, position, showGhost = true }: LockBadgeProps) {
  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        left: position ? `${position.x}px` : 0,
        top: position ? `${position.y}px` : 0,
      }}
    >
      {/* Lock indicator */}
      <div
        className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-white shadow-lg"
        style={{ backgroundColor: user.color }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="flex-shrink-0"
        >
          <path
            d="M9 5V3.5C9 2.11929 7.88071 1 6.5 1C5.11929 1 4 2.11929 4 3.5V5M3.5 5H9.5C10.0523 5 10.5 5.44772 10.5 6V10C10.5 10.5523 10.0523 11 9.5 11H3.5C2.94772 11 2.5 10.5523 2.5 10V6C2.5 5.44772 2.94772 5 3.5 5Z"
            stroke="white"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        <span className="truncate max-w-[120px]">{user.displayName}</span>
      </div>

      {/* Ghost preview outline */}
      {showGhost && user.dragging?.ghostPosition && (
        <div
          className="absolute rounded border-2 border-dashed opacity-50"
          style={{
            borderColor: user.color,
            left: user.dragging.ghostPosition.x,
            top: user.dragging.ghostPosition.y,
            // Ghost size would be calculated based on node bounds
            // For now, just show a small indicator
            width: '100px',
            height: '100px',
          }}
        />
      )}
    </div>
  );
}

/**
 * Overlay component that renders all lock badges for collaborators
 */
interface LockOverlayProps {
  /** Map of collaborators */
  collaborators: Map<number, UserAwareness>;
  /** Function to get node screen position */
  getNodePosition?: (nodeId: string) => { x: number; y: number } | null;
}

export function LockOverlay({ collaborators, getNodePosition }: LockOverlayProps) {
  const lockedUsers: Array<{ user: UserAwareness; nodeId: string; position: { x: number; y: number } | null | undefined }> = [];

  // Find all users currently dragging
  collaborators.forEach((user) => {
    if (user.dragging?.nodeIds && user.dragging.nodeIds.length > 0) {
      const nodeId = user.dragging.nodeIds[0]; // Use first node
      const position = getNodePosition?.(nodeId);
      
      lockedUsers.push({ user, nodeId, position });
    }
  });

  if (lockedUsers.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {lockedUsers.map(({ user, nodeId, position }) => (
        <LockBadge
          key={`${user.clientId}-${nodeId}`}
          user={user}
          position={position ?? undefined}
          showGhost={true}
        />
      ))}
    </div>
  );
}
