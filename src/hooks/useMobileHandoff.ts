/**
 * useMobileHandoff
 *
 * Reads the pending mobile design snapshot from localStorage and exposes a
 * `dismiss` action that clears it.  Used by the desktop editor to offer a
 * "Continue from mobile" import when the user switches devices.
 *
 * Issue #211 – Preserve seamless transitions between mobile and desktop editing
 */

import { useCallback, useState } from 'react';
import type { MobileDesignSnapshot } from '../mobile/types';
import { loadMobileSnapshot, clearMobileSnapshot } from '../utils/persistence';

export interface MobileHandoffResult {
  /** The pending mobile snapshot, or null when none exists. */
  snapshot: MobileDesignSnapshot | null;
  /** Clears the snapshot from storage and local state. */
  dismiss: () => void;
}

/**
 * Returns the pending mobile snapshot (if any) and a `dismiss` callback.
 * The snapshot is read once on mount; call `dismiss` to clear it both from
 * state and from localStorage.
 */
export function useMobileHandoff(): MobileHandoffResult {
  const [snapshot, setSnapshot] = useState<MobileDesignSnapshot | null>(
    () => loadMobileSnapshot(),
  );

  const dismiss = useCallback(() => {
    clearMobileSnapshot();
    setSnapshot(null);
  }, []);

  return { snapshot, dismiss };
}
