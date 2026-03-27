/**
 * useMobile
 *
 * Detects whether the current viewport is a mobile/touch device so the app
 * can swap the canvas editor for the simplified, guided mobile flow.
 *
 * Detection strategy (in priority order):
 *  1. User-Agent coarse check – fast, no layout cost.
 *  2. Pointer media query   – catches tablets with coarse touch.
 *  3. Viewport width        – fallback for desktop browsers narrowed below the
 *                             mobile breakpoint (≤ 768 px).
 *
 * The hook re-evaluates on every resize so orientation changes are handled
 * correctly without a page reload.
 */

import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768; // px – matches Tailwind's `md` breakpoint

/** Returns true if the UA string indicates a typical mobile OS. */
function isUaMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

/** Returns true when the primary pointer is coarse (touch screen). */
function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

/** Returns true when the viewport is narrow enough to warrant the mobile UI. */
function isNarrowViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

function computeIsMobile(): boolean {
  return isUaMobile() || isCoarsePointer() || isNarrowViewport();
}

/**
 * Returns `true` when the current environment is considered a mobile device.
 * Updates reactively on window resize.
 */
export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(computeIsMobile);

  useEffect(() => {
    function handleResize() {
      setIsMobile(computeIsMobile());
    }

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}
