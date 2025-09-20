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
    // Merge persisted values over provided initial defaults.
    // Legacy builds sometimes stored a default dash pattern [5,2] unintentionally. UX expectation now: empty dash by default.
    // Sanitize that specific legacy artifact to 'undefined'. (If user explicitly sets another pattern it will persist normally.)
    const merged = { ...initial, ...(loaded || {}) } as RectDefaults;
    if (Array.isArray(merged.strokeDash) && merged.strokeDash.length === 2 && merged.strokeDash[0] === 5 && merged.strokeDash[1] === 2) {
      merged.strokeDash = undefined; // clear legacy unintended default
    }
    return merged;
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
