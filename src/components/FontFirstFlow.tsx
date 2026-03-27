/**
 * FontFirstFlow
 *
 * Guides the user from a typography preference to downstream style guidance.
 *
 * Flow:
 *  1. The user browses curated font groups, each associated with a personality
 *     (serif, sans-serif, monospace, display) and suggested moods.
 *  2. Selecting a font group shows a live typographic preview and infers
 *     compatible moods and a suggested color palette direction.
 *  3. The caller receives the font choice and inferred moods via
 *     `onApplyFont` and can use them to pre-fill StyleSeed fields.
 *
 * Phase 6 (#196)
 */

import { useState } from 'react';
import type { StyleMood } from '../style-flow/types';

// ---------------------------------------------------------------------------
// Font catalogue
// ---------------------------------------------------------------------------

export type FontPersonality = 'sans-serif' | 'serif' | 'monospace' | 'display';

export interface FontEntry {
  /** Unique slug */
  id: string;
  /** Primary font family name */
  family: string;
  /** Complementary body font (when heading font differs) */
  pairWith: string;
  /** Typographic personality category */
  personality: FontPersonality;
  /** Short description of the font's character */
  description: string;
  /** Inferred moods that fit this typeface */
  suggestedMoods: StyleMood[];
  /** Sample text shown in the preview */
  sampleText: string;
  /** Suggested base colors that complement the font's personality */
  suggestedColors: string[];
}

export const FONT_CATALOGUE: FontEntry[] = [
  // ── Sans-serif ────────────────────────────────────────────────────────────
  {
    id: 'inter',
    family: 'Inter',
    pairWith: 'Inter',
    personality: 'sans-serif',
    description: 'Neutral, highly legible. The go-to for digital products.',
    suggestedMoods: ['minimal', 'technical'],
    sampleText: 'The quick brown fox jumps.',
    suggestedColors: ['#1A1A2E', '#0F3460', '#E94560', '#F5F5F5'],
  },
  {
    id: 'montserrat',
    family: 'Montserrat',
    pairWith: 'Open Sans',
    personality: 'sans-serif',
    description: 'Geometric, energetic. Great for bold brands.',
    suggestedMoods: ['bold', 'playful'],
    sampleText: 'Strong shapes, strong ideas.',
    suggestedColors: ['#FF6B35', '#F7931E', '#EE4266', '#1A1A2E'],
  },
  {
    id: 'nunito',
    family: 'Nunito',
    pairWith: 'Nunito',
    personality: 'sans-serif',
    description: 'Rounded, friendly. Perfect for approachable, playful UIs.',
    suggestedMoods: ['playful', 'minimal'],
    sampleText: 'Fun, warm, and inviting.',
    suggestedColors: ['#6C63FF', '#FF6584', '#43BCCD', '#F9C74F'],
  },
  // ── Serif ─────────────────────────────────────────────────────────────────
  {
    id: 'playfair-display',
    family: 'Playfair Display',
    pairWith: 'Source Serif 4',
    personality: 'serif',
    description: 'High-contrast, editorial. Exudes luxury and sophistication.',
    suggestedMoods: ['elegant', 'bold'],
    sampleText: 'Refined elegance, timeless appeal.',
    suggestedColors: ['#2D2D2D', '#B8A472', '#E8E0D4', '#8B7355'],
  },
  {
    id: 'lora',
    family: 'Lora',
    pairWith: 'Open Sans',
    personality: 'serif',
    description: 'Calligraphic strokes with a warm, literary feel.',
    suggestedMoods: ['elegant', 'minimal'],
    sampleText: 'Stories told in careful strokes.',
    suggestedColors: ['#A0522D', '#D2691E', '#F5DEB3', '#8FBC8F'],
  },
  // ── Monospace ─────────────────────────────────────────────────────────────
  {
    id: 'jetbrains-mono',
    family: 'JetBrains Mono',
    pairWith: 'Inter',
    personality: 'monospace',
    description: 'Designed for code. Crisp, structured, unmistakably technical.',
    suggestedMoods: ['technical', 'minimal'],
    sampleText: 'const style = { precise: true };',
    suggestedColors: ['#0A0E17', '#1B2838', '#66C0F4', '#4C7899'],
  },
  {
    id: 'ibm-plex-mono',
    family: 'IBM Plex Mono',
    pairWith: 'IBM Plex Sans',
    personality: 'monospace',
    description: 'Corporate monospace with a hint of warmth.',
    suggestedMoods: ['technical', 'bold'],
    sampleText: 'data.render(precision);',
    suggestedColors: ['#0F172A', '#1E293B', '#38BDF8', '#0EA5E9'],
  },
  // ── Display ───────────────────────────────────────────────────────────────
  {
    id: 'space-grotesk',
    family: 'Space Grotesk',
    pairWith: 'Inter',
    personality: 'display',
    description: 'Quirky geometric. Great for startups and creative brands.',
    suggestedMoods: ['bold', 'playful'],
    sampleText: 'Launch something new.',
    suggestedColors: ['#D4A843', '#B5541B', '#3B1F14', '#F2E1C1'],
  },
  {
    id: 'cormorant-garamond',
    family: 'Cormorant Garamond',
    pairWith: 'Lato',
    personality: 'display',
    description: 'Ultra-thin serifs with dramatic headlines for editorial luxury.',
    suggestedMoods: ['elegant', 'minimal'],
    sampleText: 'Timeless. Refined. Effortless.',
    suggestedColors: ['#1C1C1E', '#D4AF8C', '#F5EFE6', '#A0856C'],
  },
];

// ── Personality metadata ──────────────────────────────────────────────────────

const PERSONALITY_META: Record<FontPersonality, { label: string; icon: string }> = {
  'sans-serif': { label: 'Sans-Serif', icon: 'fa-solid fa-font' },
  serif: { label: 'Serif', icon: 'fa-solid fa-feather-pointed' },
  monospace: { label: 'Monospace', icon: 'fa-solid fa-code' },
  display: { label: 'Display', icon: 'fa-solid fa-star' },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FontFirstFlowProps {
  /**
   * Called when the user confirms a font entry.
   * Receives the chosen font family, its companion body font, and the
   * inferred mood suggestions.
   */
  onApplyFont: (fontFamily: string, bodyFont: string, suggestedMoods: StyleMood[], suggestedColors: string[]) => void;
  /**
   * Called whenever the user selects (previews) a font entry, even before
   * confirming. Useful for live preview in a parent component.
   */
  onSelectFont?: (entry: FontEntry) => void;
  /** Optionally restrict which personality categories are shown. */
  personalities?: FontPersonality[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PERSONALITIES: FontPersonality[] = ['sans-serif', 'serif', 'monospace', 'display'];

function SwatchStrip({ colors }: { colors: string[] }) {
  return (
    <div className="flex h-3 rounded overflow-hidden border border-gray-200 mt-1">
      {colors.map((hex) => (
        <span key={hex} className="flex-1" style={{ backgroundColor: hex }} aria-hidden="true" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FontFirstFlow({
  onApplyFont,
  onSelectFont,
  personalities,
}: FontFirstFlowProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePersonality, setActivePersonality] = useState<FontPersonality | null>(null);

  const allowedPersonalities = personalities ?? PERSONALITIES;

  const visibleFonts = FONT_CATALOGUE.filter(
    (f) =>
      allowedPersonalities.includes(f.personality) &&
      (activePersonality === null || f.personality === activePersonality),
  );

  const handleSelect = (entry: FontEntry) => {
    setSelectedId(entry.id);
    onSelectFont?.(entry);
  };

  const handleApply = (entry: FontEntry) => {
    onApplyFont(entry.family, entry.pairWith, entry.suggestedMoods, entry.suggestedColors);
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-500 italic">
        Choose a typeface personality to kick off your style journey.
      </p>

      {/* Personality filter tabs */}
      <div className="flex gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => setActivePersonality(null)}
          className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors
            ${activePersonality === null
              ? 'bg-teal-600 text-white border-teal-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
            }`}
        >
          All
        </button>
        {allowedPersonalities.map((p) => {
          const meta = PERSONALITY_META[p];
          return (
            <button
              key={p}
              type="button"
              aria-label={`Filter by ${meta.label}`}
              onClick={() => setActivePersonality(activePersonality === p ? null : p)}
              className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors flex items-center gap-1
                ${activePersonality === p
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
                }`}
            >
              <i className={`${meta.icon} text-[8px]`} />
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Font cards */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
        {visibleFonts.map((entry) => {
          const isSelected = selectedId === entry.id;
          return (
            <div
              key={entry.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => handleSelect(entry)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleSelect(entry);
              }}
              className={`p-2.5 rounded-lg border cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-teal-400/50
                ${isSelected
                  ? 'border-teal-400 bg-teal-50'
                  : 'border-gray-200 bg-white hover:border-teal-200 hover:bg-gray-50'
                }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {/* Sample text preview */}
                  <p
                    className="text-[13px] text-gray-900 truncate font-medium leading-tight"
                    style={{ fontFamily: `'${entry.family}', sans-serif` }}
                  >
                    {entry.sampleText}
                  </p>
                  {/* Font name + personality */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-semibold text-gray-700">{entry.family}</span>
                    <span className="text-[9px] text-gray-400">
                      <i className={`${PERSONALITY_META[entry.personality].icon} text-[7px]`} />{' '}
                      {PERSONALITY_META[entry.personality].label}
                    </span>
                  </div>
                  {/* Description */}
                  <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">{entry.description}</p>
                  {/* Color suggestions */}
                  <SwatchStrip colors={entry.suggestedColors} />
                </div>

                {/* Mood tags */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  {entry.suggestedMoods.map((m) => (
                    <span
                      key={m}
                      className="px-1.5 py-0.5 rounded-full text-[8px] bg-gray-100 text-gray-500 capitalize"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Apply button – visible when selected */}
              {isSelected && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApply(entry);
                  }}
                  className="mt-2 w-full px-2 py-1 rounded text-[10px] bg-teal-600 text-white hover:bg-teal-700 transition-colors flex items-center justify-center gap-1 font-medium"
                >
                  <i className="fa-solid fa-arrow-right text-[8px]" />
                  Use {entry.family}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FontFirstFlow;
