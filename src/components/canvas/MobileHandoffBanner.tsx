/**
 * MobileHandoffBanner
 *
 * Non-intrusive top banner shown in the desktop editor when a design
 * snapshot from the mobile flow is waiting to be applied.  The user can
 * accept (apply the mobile colors + typography) or dismiss the banner.
 *
 * Issue #211 – Preserve seamless transitions between mobile and desktop editing
 */

import type { MobileDesignSnapshot } from '../../mobile/types';

export interface MobileHandoffBannerProps {
  snapshot: MobileDesignSnapshot;
  /** Called when the user clicks "Apply design". */
  onApply: (snapshot: MobileDesignSnapshot) => void;
  /** Called when the user dismisses the banner. */
  onDismiss: () => void;
}

export function MobileHandoffBanner({
  snapshot,
  onApply,
  onDismiss,
}: MobileHandoffBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 px-4 py-2 bg-cyan-950 border-b border-cyan-800/60 text-sm text-cyan-100"
    >
      {/* Color swatches */}
      <div className="flex gap-1 shrink-0">
        <span
          className="w-4 h-4 rounded-full border border-white/20"
          style={{ backgroundColor: snapshot.primaryColor }}
          title={snapshot.primaryColor}
        />
        <span
          className="w-4 h-4 rounded-full border border-white/20"
          style={{ backgroundColor: snapshot.accentColor }}
          title={snapshot.accentColor}
        />
      </div>

      <span className="flex-1 min-w-0 truncate">
        <span className="font-semibold">Mobile design ready</span>
        {' — '}
        <span className="text-cyan-300/80 capitalize">{snapshot.mood}</span>
        {' · '}
        <span className="text-cyan-300/80">{snapshot.headingFont}</span>
      </span>

      <button
        type="button"
        onClick={() => onApply(snapshot)}
        className="shrink-0 px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400
                   text-white font-semibold text-xs transition-colors duration-100"
      >
        Apply design
      </button>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss mobile design"
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded
                   text-cyan-400/70 hover:text-cyan-200 transition-colors duration-100"
      >
        <i className="fa-solid fa-xmark text-xs" aria-hidden="true" />
      </button>
    </div>
  );
}
