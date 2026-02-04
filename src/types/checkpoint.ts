/**
 * Types for checkpoint system
 * Phase 3: Real-Time Polish
 */

import type { LayoutSpec } from '../layout-schema';

/**
 * Checkpoint representing a saved state of the canvas
 */
export interface Checkpoint {
  /** Unique checkpoint ID */
  id: string;
  /** Canvas ID this checkpoint belongs to */
  canvasId: string;
  /** Timestamp when checkpoint was created */
  createdAt: number;
  /** Optional user-provided label */
  label?: string;
  /** Whether this was an auto-checkpoint or manual */
  isAuto: boolean;
  /** Serialized Yjs state (if using Yjs) or full spec */
  state: Uint8Array | LayoutSpec;
  /** User who created the checkpoint */
  userId?: string;
  /** Size in bytes (for quota tracking) */
  sizeBytes?: number;
}

/**
 * Checkpoint metadata (without the full state)
 */
export interface CheckpointMetadata {
  id: string;
  canvasId: string;
  createdAt: number;
  label?: string;
  isAuto: boolean;
  userId?: string;
  sizeBytes?: number;
}

/**
 * Options for checkpoint creation
 */
export interface CreateCheckpointOptions {
  /** Optional label for the checkpoint */
  label?: string;
  /** Whether this is an auto-checkpoint */
  isAuto?: boolean;
}

/**
 * Storage interface for checkpoints
 */
export interface CheckpointStorage {
  /** Save a checkpoint */
  save(checkpoint: Checkpoint): Promise<void>;
  /** Get a checkpoint by ID */
  get(id: string): Promise<Checkpoint | null>;
  /** List checkpoints for a canvas */
  list(canvasId: string, limit?: number): Promise<CheckpointMetadata[]>;
  /** Delete a checkpoint */
  delete(id: string): Promise<void>;
  /** Delete old auto-checkpoints (keep manual ones) */
  cleanup(canvasId: string, keepCount: number): Promise<void>;
}
