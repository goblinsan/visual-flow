/**
 * ButtonStylePanel – step 4 of the Style Flow journey.
 * Offers button family options with metadata and live preview effects.
 * Phase 3 (#185)
 */

import type { ButtonStyle } from '../types';

// ── Button style catalog ──────────────────────────────────────────────────────

export const BUTTON_STYLES: ButtonStyle[] = [
  {
    id: 'rounded',
    name: 'Rounded',
    description: 'Balanced corner radius — professional and modern.',
    borderRadius: '0.375rem',
    fontWeight: '600',
    paddingX: '1rem',
    outlined: false,
  },
  {
    id: 'pill',
    name: 'Pill',
    description: 'Fully rounded edges — friendly and approachable.',
    borderRadius: '9999px',
    fontWeight: '600',
    paddingX: '1.25rem',
    outlined: false,
  },
  {
    id: 'sharp',
    name: 'Sharp',
    description: 'Zero radius — precise and decisive.',
    borderRadius: '0',
    fontWeight: '700',
    paddingX: '1rem',
    outlined: false,
  },
  {
    id: 'soft',
    name: 'Soft',
    description: 'Subtle rounding with a gentle feel — warm and inviting.',
    borderRadius: '0.5rem',
    fontWeight: '500',
    paddingX: '1rem',
    outlined: false,
  },
  {
    id: 'outlined',
    name: 'Outlined',
    description: 'Transparent with a visible border — minimal and elegant.',
    borderRadius: '0.375rem',
    fontWeight: '500',
    paddingX: '1rem',
    outlined: true,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface ButtonStylePanelProps {
  /** Currently selected button style ID, or null if none */
  selectedId: string | null;
  /** Accent color used in the button previews */
  accentColor?: string;
  /** Called when the user selects a button style */
  onSelect: (id: string) => void;
}

export function ButtonStylePanel({
  selectedId,
  accentColor = '#06b6d4',
  onSelect,
}: ButtonStylePanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
        Choose a button style
      </p>
      <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-0.5">
        {BUTTON_STYLES.map((style) => {
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
              <div className="flex items-center justify-between gap-4">
                {/* Metadata */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white mb-0.5">{style.name}</p>
                  <p className="text-[10px] text-white/40">{style.description}</p>
                  <p className="text-[9px] text-white/25 font-mono mt-0.5">
                    radius: {style.borderRadius} · weight: {style.fontWeight}
                  </p>
                </div>
                {/* Live button preview */}
                <div className="flex-shrink-0 flex gap-2 items-center">
                  <span
                    className="inline-block text-[11px]"
                    style={{
                      borderRadius: style.borderRadius,
                      fontWeight: style.fontWeight,
                      paddingLeft: style.paddingX,
                      paddingRight: style.paddingX,
                      paddingTop: '0.375rem',
                      paddingBottom: '0.375rem',
                      backgroundColor: style.outlined ? 'transparent' : accentColor,
                      border: style.outlined ? `1.5px solid ${accentColor}` : 'none',
                      color: style.outlined ? accentColor : '#fff',
                    }}
                  >
                    Primary
                  </span>
                  <span
                    className="inline-block text-[11px]"
                    style={{
                      borderRadius: style.borderRadius,
                      fontWeight: style.fontWeight,
                      paddingLeft: style.paddingX,
                      paddingRight: style.paddingX,
                      paddingTop: '0.375rem',
                      paddingBottom: '0.375rem',
                      backgroundColor: 'transparent',
                      border: `1.5px solid ${accentColor}`,
                      color: accentColor,
                    }}
                  >
                    Ghost
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
