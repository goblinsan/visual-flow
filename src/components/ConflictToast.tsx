/**
 * ConflictToast component
 * Non-blocking notification when remote changes affect selected nodes
 * Phase 3: Conflict Notifications
 */

import { useEffect, useState } from 'react';

interface ConflictToastProps {
  /** User who made the conflicting change */
  userName: string;
  /** User's color */
  userColor: string;
  /** Node IDs that were affected */
  affectedNodeIds: string[];
  /** Callback when user clicks undo */
  onUndo?: () => void;
  /** Callback when toast is dismissed */
  onDismiss?: () => void;
  /** Auto-dismiss after this many ms (default: 5000) */
  autoDismissMs?: number;
}

/**
 * Toast notification for conflicting edits
 */
export function ConflictToast({
  userName,
  userColor,
  affectedNodeIds,
  onUndo,
  onDismiss,
  autoDismissMs = 5000,
}: ConflictToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!autoDismissMs) return;

    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  const handleUndo = () => {
    onUndo?.();
    handleDismiss();
  };

  const nodeText = affectedNodeIds.length === 1 
    ? 'Your selected node was' 
    : `${affectedNodeIds.length} of your selected nodes were`;

  return (
    <div className="pointer-events-auto fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className="flex max-w-md items-start gap-3 rounded-lg bg-white p-4 shadow-xl ring-1 ring-black/5">
        {/* Color indicator */}
        <div
          className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full ring-2 ring-white"
          style={{ backgroundColor: userColor }}
        />

        {/* Content */}
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-gray-900">
            Conflict detected
          </p>
          <p className="text-sm text-gray-600">
            {nodeText} modified by <span className="font-medium">{userName}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onUndo && (
            <button
              onClick={handleUndo}
              className="rounded px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 active:bg-gray-200"
            >
              Undo
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Dismiss"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Container for multiple conflict toasts
 */
interface ConflictToastContainerProps {
  conflicts: Array<{
    id: string;
    userName: string;
    userColor: string;
    affectedNodeIds: string[];
  }>;
  onUndo?: (conflictId: string) => void;
  onDismiss?: (conflictId: string) => void;
}

export function ConflictToastContainer({
  conflicts,
  onUndo,
  onDismiss,
}: ConflictToastContainerProps) {
  if (conflicts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
        {conflicts.map((conflict) => (
          <ConflictToast
            key={conflict.id}
            userName={conflict.userName}
            userColor={conflict.userColor}
            affectedNodeIds={conflict.affectedNodeIds}
            onUndo={() => onUndo?.(conflict.id)}
            onDismiss={() => onDismiss?.(conflict.id)}
          />
        ))}
      </div>
    </div>
  );
}
