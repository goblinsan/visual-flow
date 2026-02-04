/**
 * useCheckpoints hook
 * Auto-checkpoint system with manual checkpoint support
 * Phase 3: Checkpoint System
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LayoutSpec } from '../layout-schema';
import type {
  Checkpoint,
  CheckpointMetadata,
  CheckpointStorage,
  CreateCheckpointOptions,
} from '../types/checkpoint';

/**
 * LocalStorage-based checkpoint storage
 * Production: Replace with R2/API storage
 */
class LocalStorageCheckpointStorage implements CheckpointStorage {
  private readonly storageKey = 'vf_checkpoints';

  async save(checkpoint: Checkpoint): Promise<void> {
    const checkpoints = await this.loadAll();
    checkpoints.push(checkpoint);
    
    // Keep only last 50 checkpoints per canvas to avoid storage bloat
    // Group by canvas and limit each canvas separately
    const byCanvas = new Map<string, Checkpoint[]>();
    for (const cp of checkpoints) {
      if (!byCanvas.has(cp.canvasId)) {
        byCanvas.set(cp.canvasId, []);
      }
      byCanvas.get(cp.canvasId)!.push(cp);
    }
    
    // Keep last 50 per canvas
    const filtered: Checkpoint[] = [];
    for (const [_canvasId, canvasCheckpoints] of byCanvas) {
      const sorted = canvasCheckpoints.sort((a, b) => b.createdAt - a.createdAt);
      filtered.push(...sorted.slice(0, 50));
    }
    
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  }

  async get(id: string): Promise<Checkpoint | null> {
    const checkpoints = await this.loadAll();
    return checkpoints.find((c) => c.id === id) || null;
  }

  async list(canvasId: string, limit = 20): Promise<CheckpointMetadata[]> {
    const checkpoints = await this.loadAll();
    return checkpoints
      .filter((c) => c.canvasId === canvasId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map((c) => ({
        id: c.id,
        canvasId: c.canvasId,
        createdAt: c.createdAt,
        label: c.label,
        isAuto: c.isAuto,
        userId: c.userId,
        sizeBytes: c.sizeBytes,
      }));
  }

  async delete(id: string): Promise<void> {
    const checkpoints = await this.loadAll();
    const filtered = checkpoints.filter((c) => c.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  }

  async cleanup(canvasId: string, keepCount: number): Promise<void> {
    const checkpoints = await this.loadAll();
    
    // Keep manual checkpoints and most recent auto-checkpoints
    const manual = checkpoints.filter(
      (c) => c.canvasId === canvasId && !c.isAuto
    );
    const auto = checkpoints
      .filter((c) => c.canvasId === canvasId && c.isAuto)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, keepCount);
    
    const other = checkpoints.filter((c) => c.canvasId !== canvasId);
    const filtered = [...manual, ...auto, ...other];
    
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  }

  private async loadAll(): Promise<Checkpoint[]> {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading checkpoints:', error);
      return [];
    }
  }
}

interface UseCheckpointsOptions {
  /** Canvas ID for checkpoint scoping */
  canvasId: string;
  /** Current spec to checkpoint */
  getSpec: () => LayoutSpec;
  /** Restore spec from checkpoint */
  setSpec: (spec: LayoutSpec) => void;
  /** User ID (optional) */
  userId?: string;
  /** Auto-checkpoint interval in ms (default: 5 minutes) */
  autoCheckpointIntervalMs?: number;
  /** Whether auto-checkpoint is enabled */
  enableAutoCheckpoint?: boolean;
  /** Storage implementation (default: localStorage) */
  storage?: CheckpointStorage;
}

export function useCheckpoints({
  canvasId,
  getSpec,
  setSpec,
  userId,
  autoCheckpointIntervalMs = 5 * 60 * 1000, // 5 minutes
  enableAutoCheckpoint = true,
  storage = new LocalStorageCheckpointStorage(),
}: UseCheckpointsOptions) {
  const [checkpoints, setCheckpoints] = useState<CheckpointMetadata[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Track last checkpoint time
  const lastCheckpointRef = useRef<number>(0);
  const lastSpecRef = useRef<LayoutSpec | null>(null);

  /**
   * Load checkpoint list
   */
  const loadCheckpoints = useCallback(async () => {
    try {
      const list = await storage.list(canvasId);
      setCheckpoints(list);
    } catch (error) {
      console.error('Error loading checkpoints:', error);
    }
  }, [canvasId, storage]);

  /**
   * Create a checkpoint
   */
  const createCheckpoint = useCallback(
    async (options: CreateCheckpointOptions = {}) => {
      setIsCreating(true);
      try {
        const spec = getSpec();
        const checkpoint: Checkpoint = {
          id: `checkpoint-${canvasId}-${Date.now()}`,
          canvasId,
          createdAt: Date.now(),
          label: options.label,
          isAuto: options.isAuto ?? false,
          state: spec, // Store full spec (in production, serialize Yjs state)
          userId,
          sizeBytes: JSON.stringify(spec).length,
        };

        await storage.save(checkpoint);
        lastCheckpointRef.current = Date.now();
        lastSpecRef.current = spec;

        // Reload list
        await loadCheckpoints();

        // Cleanup old auto-checkpoints (keep 10)
        await storage.cleanup(canvasId, 10);

        return checkpoint;
      } catch (error) {
        console.error('Error creating checkpoint:', error);
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [canvasId, getSpec, userId, storage, loadCheckpoints]
  );

  /**
   * Restore from a checkpoint
   */
  const restoreCheckpoint = useCallback(
    async (checkpointId: string) => {
      setIsRestoring(true);
      try {
        const checkpoint = await storage.get(checkpointId);
        if (!checkpoint) {
          throw new Error(`Checkpoint ${checkpointId} not found`);
        }

        // Restore the spec
        setSpec(checkpoint.state as LayoutSpec);
        
        return checkpoint;
      } catch (error) {
        console.error('Error restoring checkpoint:', error);
        throw error;
      } finally {
        setIsRestoring(false);
      }
    },
    [setSpec, storage]
  );

  /**
   * Delete a checkpoint
   */
  const deleteCheckpoint = useCallback(
    async (checkpointId: string) => {
      try {
        await storage.delete(checkpointId);
        await loadCheckpoints();
      } catch (error) {
        console.error('Error deleting checkpoint:', error);
        throw error;
      }
    },
    [storage, loadCheckpoints]
  );

  /**
   * Auto-checkpoint timer
   */
  useEffect(() => {
    if (!enableAutoCheckpoint) return;

    const interval = setInterval(() => {
      const currentSpec = getSpec();
      const now = Date.now();
      
      // Only checkpoint if spec changed and enough time passed
      const timeSinceLastCheckpoint = now - lastCheckpointRef.current;
      const specChanged =
        !lastSpecRef.current ||
        JSON.stringify(currentSpec) !== JSON.stringify(lastSpecRef.current);

      if (specChanged && timeSinceLastCheckpoint >= autoCheckpointIntervalMs) {
        createCheckpoint({ isAuto: true }).catch((error) => {
          console.error('Auto-checkpoint failed:', error);
        });
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [
    enableAutoCheckpoint,
    autoCheckpointIntervalMs,
    getSpec,
    createCheckpoint,
  ]);

  /**
   * Load checkpoints on mount
   */
  useEffect(() => {
    loadCheckpoints();
  }, [loadCheckpoints]);

  return {
    checkpoints,
    isCreating,
    isRestoring,
    createCheckpoint,
    restoreCheckpoint,
    deleteCheckpoint,
    refreshCheckpoints: loadCheckpoints,
  };
}
