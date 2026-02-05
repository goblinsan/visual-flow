/**
 * CheckpointPanel component
 * UI for managing checkpoints (create, restore, delete)
 * Phase 3: Checkpoint System
 */

import { useState } from 'react';
import type { CheckpointMetadata } from '../types/checkpoint';

interface CheckpointPanelProps {
  /** List of available checkpoints */
  checkpoints: CheckpointMetadata[];
  /** Whether a checkpoint is being created */
  isCreating: boolean;
  /** Whether a checkpoint is being restored */
  isRestoring: boolean;
  /** Callback to create a manual checkpoint */
  onCreateCheckpoint: (label?: string) => void;
  /** Callback to restore a checkpoint */
  onRestoreCheckpoint: (checkpointId: string) => void;
  /** Callback to delete a checkpoint */
  onDeleteCheckpoint: (checkpointId: string) => void;
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback when panel is closed */
  onClose: () => void;
}

/**
 * Panel for checkpoint management
 */
export function CheckpointPanel({
  checkpoints,
  isCreating,
  isRestoring,
  onCreateCheckpoint,
  onRestoreCheckpoint,
  onDeleteCheckpoint,
  isOpen,
  onClose,
}: CheckpointPanelProps) {
  const [checkpointLabel, setCheckpointLabel] = useState('');
  const [showLabelInput, setShowLabelInput] = useState(false);

  if (!isOpen) return null;

  const handleCreateCheckpoint = () => {
    const label = checkpointLabel.trim() || undefined;
    onCreateCheckpoint(label);
    setCheckpointLabel('');
    setShowLabelInput(false);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Checkpoints</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Create checkpoint section */}
        <div className="border-b border-gray-200 px-6 py-4">
          {!showLabelInput ? (
            <button
              onClick={() => setShowLabelInput(true)}
              disabled={isCreating}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Checkpoint'}
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={checkpointLabel}
                onChange={(e) => setCheckpointLabel(e.target.value)}
                placeholder="Checkpoint label (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateCheckpoint();
                  if (e.key === 'Escape') setShowLabelInput(false);
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateCheckpoint}
                  disabled={isCreating}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowLabelInput(false);
                    setCheckpointLabel('');
                  }}
                  className="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Checkpoint list */}
        <div className="max-h-96 overflow-y-auto px-6 py-4">
          {checkpoints.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No checkpoints yet. Create your first checkpoint to save the current state.
            </p>
          ) : (
            <div className="space-y-2">
              {checkpoints.map((checkpoint) => (
                <div
                  key={checkpoint.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {checkpoint.isAuto ? (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Auto
                        </span>
                      ) : (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Manual
                        </span>
                      )}
                      {checkpoint.label && (
                        <span className="text-sm font-medium text-gray-900">
                          {checkpoint.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatTimestamp(checkpoint.createdAt)}
                      {checkpoint.sizeBytes && (
                        <span className="ml-2">
                          ({Math.round(checkpoint.sizeBytes / 1024)}KB)
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onRestoreCheckpoint(checkpoint.id)}
                      disabled={isRestoring}
                      className="rounded px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => onDeleteCheckpoint(checkpoint.id)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                      aria-label="Delete"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M6 2H10M2 4H14M12.5 4L12 12C12 13.1046 11.1046 14 10 14H6C4.89543 14 4 13.1046 4 12L3.5 4"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-gray-200 px-6 py-3">
          <p className="text-xs text-gray-500">
            Auto-checkpoints are created every 5 minutes when changes are detected.
          </p>
        </div>
      </div>
    </div>
  );
}
