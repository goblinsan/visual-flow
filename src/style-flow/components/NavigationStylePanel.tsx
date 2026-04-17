/**
 * NavigationStylePanel – step 5 of the Style Flow journey.
 * Offers navigation layout variants with mini preview scenes.
 * Phase 3 (#186)
 */

import type { NavigationStyle } from '../types';
export { NAVIGATION_STYLES } from '../themeCatalog';
import { NAVIGATION_STYLES } from '../themeCatalog';

// ── Mini preview scenes ───────────────────────────────────────────────────────

const NAV_ITEMS = ['Home', 'Explore', 'Profile'];

interface NavSceneProps {
  style: NavigationStyle;
  primaryColor: string;
}

function NavScene({ style, primaryColor }: NavSceneProps) {
  const { variant } = style;

  if (variant === 'top-bar') {
    return (
      <div
        aria-hidden="true"
        className="rounded-lg overflow-hidden border border-white/10 bg-white/5 w-28 h-20 flex flex-col flex-shrink-0"
      >
        <div
          className="flex items-center gap-1.5 px-2 py-1.5"
          style={{ backgroundColor: primaryColor }}
        >
          {NAV_ITEMS.map((item) => (
            <span key={item} className="text-[7px] text-white font-medium whitespace-nowrap">
              {item}
            </span>
          ))}
        </div>
        <div className="flex-1 p-2 space-y-1">
          <div className="h-1.5 w-3/4 rounded bg-white/20" />
          <div className="h-1 w-1/2 rounded bg-white/10" />
        </div>
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div
        aria-hidden="true"
        className="rounded-lg overflow-hidden border border-white/10 bg-white/5 w-28 h-20 flex flex-row flex-shrink-0"
      >
        <div
          className="flex flex-col gap-1 px-1.5 py-2 w-12"
          style={{ backgroundColor: primaryColor, opacity: 0.8 }}
        >
          {NAV_ITEMS.map((item) => (
            <span key={item} className="text-[6px] text-white font-medium truncate">
              {item}
            </span>
          ))}
        </div>
        <div className="flex-1 p-2 space-y-1">
          <div className="h-1.5 w-full rounded bg-white/20" />
          <div className="h-1 w-3/4 rounded bg-white/10" />
        </div>
      </div>
    );
  }

  if (variant === 'tab-bar') {
    return (
      <div
        aria-hidden="true"
        className="rounded-lg overflow-hidden border border-white/10 bg-white/5 w-28 h-20 flex flex-col flex-shrink-0"
      >
        <div className="flex border-b border-white/10">
          {NAV_ITEMS.map((item, i) => (
            <span
              key={item}
              className="flex-1 text-center text-[7px] py-1 font-medium"
              style={{
                borderBottom: i === 0 ? `2px solid ${primaryColor}` : '2px solid transparent',
                color: i === 0 ? primaryColor : 'rgba(255,255,255,0.35)',
              }}
            >
              {item}
            </span>
          ))}
        </div>
        <div className="flex-1 p-2 space-y-1">
          <div className="h-1.5 w-3/4 rounded bg-white/20" />
          <div className="h-1 w-1/2 rounded bg-white/10" />
        </div>
      </div>
    );
  }

  if (variant === 'floating') {
    return (
      <div
        aria-hidden="true"
        className="rounded-lg border border-white/10 bg-white/5 w-28 h-20 relative flex-shrink-0"
      >
        <div className="p-2 space-y-1">
          <div className="h-1.5 w-3/4 rounded bg-white/20" />
          <div className="h-1 w-1/2 rounded bg-white/10" />
        </div>
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 px-2 py-1 rounded-full"
          style={{ backgroundColor: primaryColor }}
        >
          {NAV_ITEMS.map((item) => (
            <span key={item} className="text-[6px] text-white font-medium whitespace-nowrap">
              {item}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'bottom-bar') {
    return (
      <div
        aria-hidden="true"
        className="rounded-lg overflow-hidden border border-white/10 bg-white/5 w-28 h-20 flex flex-col flex-shrink-0"
      >
        <div className="flex-1 p-2 space-y-1">
          <div className="h-1.5 w-3/4 rounded bg-white/20" />
          <div className="h-1 w-1/2 rounded bg-white/10" />
        </div>
        <div
          className="flex items-center justify-around py-1.5"
          style={{ backgroundColor: primaryColor }}
        >
          {NAV_ITEMS.map((item) => (
            <span key={item} className="text-[7px] text-white font-medium">
              {item}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface NavigationStylePanelProps {
  /** Currently selected navigation style ID, or null if none */
  selectedId: string | null;
  /** Primary color used to tint nav preview scenes */
  primaryColor?: string;
  /** Called when the user selects a navigation style */
  onSelect: (id: string) => void;
}

export function NavigationStylePanel({
  selectedId,
  primaryColor = '#06b6d4',
  onSelect,
}: NavigationStylePanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
        Choose a navigation style
      </p>
      <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-0.5">
        {NAVIGATION_STYLES.map((style) => {
          const isSelected = selectedId === style.id;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelect(style.id)}
              aria-pressed={isSelected}
              className={`text-left rounded-xl border px-4 py-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 ${
                isSelected
                  ? 'bg-cyan-500/15 border-cyan-400/50'
                  : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Mini preview scene */}
                <NavScene style={style} primaryColor={primaryColor} />
                {/* Metadata */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white mb-0.5">{style.name}</p>
                  <p className="text-[10px] text-white/40 leading-relaxed">{style.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
