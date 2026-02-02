/**
 * Connection status indicator component
 * Shows real-time connection status and collaborator count
 */

import type { ConnectionStatus } from '../collaboration/types';

interface ConnectionStatusProps {
  status: ConnectionStatus;
  collaboratorCount: number;
  isSyncing: boolean;
  lastError: string | null;
  onReconnect?: () => void;
}

export function ConnectionStatusIndicator({
  status,
  collaboratorCount,
  isSyncing,
  lastError,
  onReconnect,
}: ConnectionStatusProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-gray-400';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-md">
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
        <span className="text-sm font-medium text-gray-700">
          {getStatusText()}
        </span>
      </div>

      {/* Syncing indicator */}
      {isSyncing && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          <span>Syncing...</span>
        </div>
      )}

      {/* Collaborator count */}
      {status === 'connected' && collaboratorCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <span>{collaboratorCount}</span>
        </div>
      )}

      {/* Error message */}
      {lastError && (
        <div className="text-xs text-red-600" title={lastError}>
          Error
        </div>
      )}

      {/* Reconnect button */}
      {(status === 'disconnected' || status === 'error') && onReconnect && (
        <button
          onClick={onReconnect}
          className="rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white hover:bg-blue-600"
        >
          Reconnect
        </button>
      )}
    </div>
  );
}
