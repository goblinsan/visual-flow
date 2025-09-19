import { useCallback, useEffect, useState } from 'react';

export interface UseSelectionOptions {
  /** Optional callback whenever normalized selection changes */
  onChange?: (ids: string[]) => void;
  /** Provide a normalize function if needed (dedupe/promotion) */
  normalize?: (ids: string[]) => string[];
}

export interface SelectionApi {
  selection: string[];
  setSelection: (ids: string[]) => void;
  clear: () => void;
  toggle: (id: string) => void;
  replace: (ids: string[]) => void;
}

export function useSelection(opts: UseSelectionOptions = {}): SelectionApi {
  const { onChange, normalize } = opts;
  const [selection, setSelectionState] = useState<string[]>([]);

  const apply = useCallback((ids: string[]) => {
    let out = ids.slice();
    if (normalize) out = normalize(out);
    setSelectionState(out);
    onChange?.(out);
  }, [normalize, onChange]);

  const setSelection = useCallback((ids: string[]) => apply(ids), [apply]);
  const clear = useCallback(() => apply([]), [apply]);
  const toggle = useCallback((id: string) => {
    apply(selection.includes(id) ? selection.filter(s => s !== id) : [...selection, id]);
  }, [selection, apply]);
  const replace = useCallback((ids: string[]) => apply(ids), [apply]);

  // Ensure normalization re-runs if function identity changes
  useEffect(() => { if (normalize) apply(selection); }, [normalize]); // eslint-disable-line react-hooks/exhaustive-deps

  return { selection, setSelection, clear, toggle, replace };
}

export default useSelection;
