/**
 * Cursor overlay component
 * Displays remote user cursors
 */

import type { UserAwareness } from '../collaboration/types';

interface CursorOverlayProps {
  collaborators: Map<number, UserAwareness>;
  /** Local user's client ID (to filter out) */
  localClientId?: number | null;
  /** Canvas zoom level for scaling */
  zoom?: number;
  /** Canvas pan offset */
  pan?: { x: number; y: number };
}

export function CursorOverlay({ collaborators, localClientId, zoom = 1, pan = { x: 0, y: 0 } }: CursorOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {Array.from(collaborators.values()).filter(user => user.clientId !== localClientId).map((user) => {
        if (!user.cursor) return null;

        // Transform cursor position based on canvas zoom and pan
        const x = user.cursor.x * zoom + pan.x;
        const y = user.cursor.y * zoom + pan.y;

        return (
          <div
            key={user.clientId}
            className="absolute transition-all duration-100"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* Cursor SVG */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 3L19 12L11 14L9 22L5 3Z"
                fill={user.color}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>

            {/* User label */}
            <div
              className="ml-5 mt-1 rounded px-2 py-1 text-xs font-medium text-white shadow-lg"
              style={{ backgroundColor: user.color }}
            >
              {user.displayName}
            </div>
          </div>
        );
      })}
    </div>
  );
}
