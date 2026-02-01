import { useCallback, useRef, useState } from 'react';
import { loadRecentColors, saveRecentColors } from '../utils/persistence';
import { addRecentColor, isSameColor } from '../utils/color';

export interface UseRecentColorsOptions {
  max?: number; // optional future limit (delegated to addRecentColor for uniqueness semantics)
}

interface SessionState {
  active: boolean;
  baseValue?: string; // starting value when session began
  lastPreview?: string; // most recent preview value
}

/**
 * Recent colors manager with explicit session semantics so we only commit once per picker close.
 */
export function useRecentColors(/* opts: UseRecentColorsOptions = {} - reserved for future options */) {
  // max reserved for future list size constraint (currently handled in addRecentColor semantics)
  const [recent, setRecent] = useState<string[]>(() => loadRecentColors() || ['#ffffff','#000000']);
  const session = useRef<SessionState>({ active: false });

  const persist = (next: string[]) => { saveRecentColors(next); };

  const beginSession = useCallback((current?: string) => {
    session.current = { active: true, baseValue: current, lastPreview: current };
  }, []);

  const preview = useCallback((value: string) => {
    if (!session.current.active) return; // ignore stray previews
    session.current.lastPreview = value;
  }, []);

  const commit = useCallback((finalValue?: string) => {
    // Outside-session single-shot commit (swap, text blur, swatch click)
    if (!session.current.active) {
      if (!finalValue) return;
      setRecent(r => { const next = addRecentColor(r, finalValue); persist(next); return next; });
      return;
    }
    const value = finalValue ?? session.current.lastPreview;
    const base = session.current.baseValue;
    session.current.active = false; // end session
    if (!value) return;
    // Skip commit if value unchanged from base to avoid duplicate noise when user cancels or picks same color
    if (base && isSameColor(base, value)) return;
    setRecent(r => { const next = addRecentColor(r, value); persist(next); return next; });
  }, []);

  const cancel = useCallback(() => {
    session.current.active = false; // drop without commit
  }, []);

  return {
    recentColors: recent,
    beginSession,
    previewColor: preview,
  commitColor: commit,
    cancelSession: cancel,
  } as const;
}
