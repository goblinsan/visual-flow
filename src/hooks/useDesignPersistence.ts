import { useCallback, useEffect, useRef, useState } from 'react';
import { loadDesignSpec, saveDesignSpec, clearDesignSpec } from '../utils/persistence';
import type { LayoutSpec } from '../layout-schema';

export interface UseDesignPersistenceOptions {
  /** Provide an initial spec factory; only used if nothing persisted. */
  buildInitial: () => LayoutSpec;
  /** Autosave debounce ms (default microtask via 0). */
  debounceMs?: number;
  /** Optional migration step for older saved blobs. */
  migrate?: (raw: unknown) => LayoutSpec;
}

interface UseDesignPersistenceResult {
  spec: LayoutSpec;
  setSpec: React.Dispatch<React.SetStateAction<LayoutSpec>>;
  reset: () => void;
  forceSave: () => void;
  clear: () => void;
  hasPersisted: boolean;
}

/**
 * Central design (LayoutSpec) persistence hook.
 * - Loads once on mount (with optional migration)
 * - Persists after each change (microtask or debounced)
 * - Provides reset / clear helpers
 */
export function useDesignPersistence(opts: UseDesignPersistenceOptions): UseDesignPersistenceResult {
  const { buildInitial, debounceMs = 0, migrate } = opts;
  const loaded = loadDesignSpec<LayoutSpec | null>();
  const initialSpec = ((): LayoutSpec => {
    if (loaded) {
      try { return migrate ? migrate(loaded) : loaded; } catch { /* fall through */ }
    }
    return buildInitial();
  })();
  const [spec, setSpec] = useState<LayoutSpec>(initialSpec);
  const hasPersisted = !!loaded;
  const timer = useRef<number | null>(null);

  const persist = useCallback((next: LayoutSpec) => {
    try { saveDesignSpec(next); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { persist(spec); }, debounceMs);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [spec, persist, debounceMs]);

  const reset = useCallback(() => {
    setSpec(buildInitial());
  }, [buildInitial]);

  const forceSave = useCallback(() => { persist(spec); }, [spec, persist]);
  const clear = useCallback(() => { clearDesignSpec(); }, []);

  return { spec, setSpec, reset, forceSave, clear, hasPersisted };
}

export default useDesignPersistence;
