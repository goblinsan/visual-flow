/**
 * Active users list component
 * Shows avatars of all connected collaborators
 */

import type { UserAwareness } from '../collaboration/types';

interface ActiveUsersListProps {
  collaborators: Map<number, UserAwareness>;
  maxVisible?: number;
}

export function ActiveUsersList({ collaborators, maxVisible = 5 }: ActiveUsersListProps) {
  const users = Array.from(collaborators.values());
  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = Math.max(0, users.length - maxVisible);

  if (users.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {/* User avatars */}
      {visibleUsers.map((user) => (
        <div
          key={user.clientId}
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
          style={{ backgroundColor: user.color }}
          title={user.displayName}
        >
          {getInitials(user.displayName)}
        </div>
      ))}

      {/* Remaining count */}
      {remainingCount > 0 && (
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-xs font-bold text-gray-700 shadow-sm"
          title={`${remainingCount} more`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

/**
 * Get initials from display name
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
