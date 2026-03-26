/**
 * TypographyPanel – step 3 of the Style Flow journey.
 * Provides a curated pairing catalog with live preview text rendering.
 * Phase 3 (#184)
 */

import type { TypographyPairing } from '../types';

// ── Curated typography pairings ───────────────────────────────────────────────

export const TYPOGRAPHY_PAIRINGS: TypographyPairing[] = [
  {
    id: 'modern-sans',
    name: 'Modern Sans',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    description: 'Clean and neutral — works for any brand.',
    tags: ['minimal', 'technical', 'universal'],
  },
  {
    id: 'serif-elegance',
    name: 'Serif Elegance',
    headingFont: 'Playfair Display',
    bodyFont: 'Lato',
    description: 'Editorial feel with refined serif headings.',
    tags: ['elegant', 'fashion', 'editorial'],
  },
  {
    id: 'display-bold',
    name: 'Display Bold',
    headingFont: 'Montserrat',
    bodyFont: 'Open Sans',
    description: 'Strong, prominent headings with readable body copy.',
    tags: ['bold', 'marketing'],
  },
  {
    id: 'humanist',
    name: 'Humanist',
    headingFont: 'Nunito',
    bodyFont: 'Source Sans 3',
    description: 'Friendly and accessible, ideal for consumer apps.',
    tags: ['playful', 'friendly', 'health'],
  },
  {
    id: 'classic-mix',
    name: 'Classic Mix',
    headingFont: 'Merriweather',
    bodyFont: 'Inter',
    description: 'Classic serif headings paired with a modern sans body.',
    tags: ['elegant', 'education', 'finance'],
  },
  {
    id: 'tech-mono',
    name: 'Tech Mono',
    headingFont: 'Space Grotesk',
    bodyFont: 'JetBrains Mono',
    description: 'Distinctive technical feel for developer-focused products.',
    tags: ['technical', 'developer'],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface TypographyPanelProps {
  /** Currently selected pairing ID, or null if none */
  selectedId: string | null;
  /** Called when the user selects a pairing */
  onSelect: (id: string) => void;
}

export function TypographyPanel({ selectedId, onSelect }: TypographyPanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
        Choose a font pairing
      </p>
      <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-0.5">
        {TYPOGRAPHY_PAIRINGS.map((pairing) => {
          const isSelected = selectedId === pairing.id;
          return (
            <button
              key={pairing.id}
              type="button"
              onClick={() => onSelect(pairing.id)}
              aria-pressed={isSelected}
              className={`text-left rounded-xl border px-4 py-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 ${
                isSelected
                  ? 'bg-cyan-500/15 border-cyan-400/50'
                  : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20'
              }`}
            >
              {/* Heading preview */}
              <p
                className="text-base font-bold text-white mb-1"
                style={{ fontFamily: pairing.headingFont }}
              >
                {pairing.name}
              </p>
              {/* Body preview */}
              <p
                className="text-[11px] text-white/50 mb-1.5 leading-relaxed"
                style={{ fontFamily: pairing.bodyFont }}
              >
                The quick brown fox — body copy in {pairing.bodyFont}
              </p>
              {/* Metadata */}
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-white/30 font-mono">
                  {pairing.headingFont} / {pairing.bodyFont}
                </span>
                <span className="text-[9px] text-white/25 italic">{pairing.description}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
