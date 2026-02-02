/**
 * Cloud persistence hook with localStorage fallback
 * Phase 1: Drop-in replacement for useDesignPersistence with cloud backend
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LayoutSpec } from '../layout-schema';
import { apiClient } from '../api/client';
import {
  loadDesignSpec,
  saveDesignSpec,
  clearDesignSpec,
} from '../utils/persistence';

export interface UseCloudPersistenceOptions {
  /** Canvas ID to load/save (if null, creates new canvas on first save) */
  canvasId?: string | null;
  /** Provide an initial spec factory; only used if nothing persisted. */
  buildInitial: () => LayoutSpec;
  /** Autosave debounce ms (default 1000ms for cloud saves). */
  debounceMs?: number;
  /** Canvas name for creation */
  canvasName?: string;
}

interface UseCloudPersistenceResult {
  spec: LayoutSpec;
  setSpec: React.Dispatch<React.SetStateAction<LayoutSpec>>;
  reset: () => void;
  forceSave: () => void;
  clear: () => void;
  canvasId: string | null;
  isOnline: boolean;
  isSyncing: boolean;
  lastError: string | null;
  userRole?: 'owner' | 'editor' | 'viewer';
}

/**
 * Cloud-backed design persistence with localStorage fallback.
 * Provides same interface as useDesignPersistence for easy migration.
 */
export function useCloudPersistence(
  opts: UseCloudPersistenceOptions
): UseCloudPersistenceResult {
  const { buildInitial, debounceMs = 1000, canvasName = 'Untitled Canvas' } = opts;
  const [canvasId, setCanvasId] = useState<string | null>(opts.canvasId || null);
  const [spec, setSpec] = useState<LayoutSpec>(buildInitial);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'viewer'>();
  const timer = useRef<number | null>(null);
  const loadedRef = useRef(false);

  // Load initial data
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    async function loadCanvas() {
      if (opts.canvasId) {
        // Load from cloud
        const { data, error } = await apiClient.getCanvas(opts.canvasId);
        if (data) {
          setSpec(data.spec);
          setUserRole(data.user_role);
          setLastError(null);
        } else {
          // Fallback to localStorage
          console.warn('Failed to load from cloud, using localStorage:', error);
          const local = loadDesignSpec<LayoutSpec>();
          if (local) setSpec(local);
          setLastError(error || 'Failed to load from cloud');
        }
      } else {
        // Try localStorage for new canvas
        const local = loadDesignSpec<LayoutSpec>();
        if (local) setSpec(local);
      }
    }

    loadCanvas();
  }, [opts.canvasId]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cloud save function
  const saveToCloud = useCallback(
    async (nextSpec: LayoutSpec, currentCanvasId: string | null) => {
      if (!isOnline) {
        // Save to localStorage when offline
        saveDesignSpec(nextSpec);
        return;
      }

      setIsSyncing(true);

      try {
        if (currentCanvasId) {
          // Update existing canvas
          const { error } = await apiClient.updateCanvas(currentCanvasId, {
            spec: nextSpec,
          });

          if (error) {
            console.error('Cloud save failed:', error);
            // Fallback to localStorage
            saveDesignSpec(nextSpec);
            setLastError(error);
          } else {
            setLastError(null);
            // Also save to localStorage as backup
            saveDesignSpec(nextSpec);
          }
        } else {
          // Create new canvas
          const { data, error } = await apiClient.createCanvas(canvasName, nextSpec);

          if (data) {
            setCanvasId(data.id);
            setUserRole('owner');
            setLastError(null);
            saveDesignSpec(nextSpec);
          } else {
            console.error('Canvas creation failed:', error);
            saveDesignSpec(nextSpec);
            setLastError(error || 'Failed to create canvas');
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        console.error('Unexpected save error:', error);
        saveDesignSpec(nextSpec);
        setLastError(error);
      } finally {
        setIsSyncing(false);
      }
    },
    [isOnline, canvasName]
  );

  // Debounced autosave
  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      saveToCloud(spec, canvasId);
    }, debounceMs);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [spec, canvasId, saveToCloud, debounceMs]);

  const reset = useCallback(() => {
    setSpec(buildInitial());
    setCanvasId(null);
  }, [buildInitial]);

  const forceSave = useCallback(() => {
    saveToCloud(spec, canvasId);
  }, [spec, canvasId, saveToCloud]);

  const clear = useCallback(() => {
    clearDesignSpec();
  }, []);

  return {
    spec,
    setSpec,
    reset,
    forceSave,
    clear,
    canvasId,
    isOnline,
    isSyncing,
    lastError,
    userRole,
  };
}

export default useCloudPersistence;
