import { useCallback, useEffect, useRef, useState } from 'react';
import { loadRectDefaults, saveRectDefaults } from '../utils/persistence';

/** Shape default style we persist (extend as needed) */
export interface RectDefaults {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  opacity?: number;
  strokeDash?: number[];
}

interface UsePersistentRectDefaultsOptions {
  /** key used inside persistence blob */
  key?: string;
}

/**
 * Provides persisted rectangle defaults with behavior parity to prior inline logic.
 * Reads once on mount; writes debounced (micro) after changes.
 */
export function usePersistentRectDefaults(initial: RectDefaults, opts: UsePersistentRectDefaultsOptions = {}) {
  const { key = 'rectDefaults' } = opts;
  const [defaults, setDefaults] = useState<RectDefaults>(() => {
    const loaded = loadRectDefaults();
    return { ...initial, ...(loaded || {}) };
  });
  const writeTimer = useRef<number | null>(null);

  useEffect(() => {
    // schedule micro task save (replace with real debounce if needed)
    if (writeTimer.current) window.clearTimeout(writeTimer.current);
    writeTimer.current = window.setTimeout(() => {
      // Persist full object
      saveRectDefaults(defaults);
    }, 0);
    return () => { if (writeTimer.current) window.clearTimeout(writeTimer.current); };
  }, [defaults, key]);

  const update = useCallback((patch: Partial<RectDefaults>) => {
    setDefaults(d => ({ ...d, ...patch }));
  }, []);

  return { defaults, update } as const;
}
