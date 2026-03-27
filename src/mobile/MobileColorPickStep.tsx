/**
 * MobileColorPickStep
 *
 * Offline-capable color selection step for the 'color' mobile entry point.
 * Shows a curated grid of color palettes (one per mood) so the user can
 * pick their starting palette without requiring an API call.
 *
 * Issue #206 – Design the simplified selection-based workflow
 */

import { useState } from 'react';
import type { StyleMood } from '../style-flow/types';

// ── Preset palettes ──────────────────────────────────────────────────────────

interface PaletteOption {
  id: StyleMood;
  name: string;
  colors: [string, string, string, string];
}

const PALETTE_OPTIONS: PaletteOption[] = [
  { id: 'minimal',   name: 'Clean & Minimal',    colors: ['#1A1A2E', '#16213E', '#0F3460', '#E94560'] },
  { id: 'bold',      name: 'Bold & Energetic',    colors: ['#FF6B35', '#F7931E', '#FFD23F', '#EE4266'] },
  { id: 'playful',   name: 'Playful & Vibrant',   colors: ['#6C63FF', '#FF6584', '#43BCCD', '#F9C74F'] },
  { id: 'elegant',   name: 'Elegant & Luxurious', colors: ['#2D2D2D', '#B8A472', '#E8E0D4', '#8B7355'] },
  { id: 'technical', name: 'Technical & Precise', colors: ['#0A0E17', '#1B2838', '#66C0F4', '#4C7899'] },
  { id: 'minimal',   name: 'Warm & Organic',      colors: ['#A0522D', '#D2691E', '#F5DEB3', '#8FBC8F'] },
];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface MobileColorPickStepProps {
  /** Called with the 4-hex palette the user selected. */
  onPick: (colors: string[], mood: StyleMood) => void;
  /** Called when the user taps the back button. */
  onBack: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileColorPickStep({ onPick, onBack }: MobileColorPickStepProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white px-5 pt-6 pb-8">
      {/* Top nav */}
      <div className="flex items-center gap-3 mb-8">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/10 text-white/60"
        >
          <i className="fa-solid fa-chevron-left text-sm" />
        </button>
        <div>
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
            Step 1 of 4
          </p>
          <h2 className="text-lg font-bold leading-tight">Pick a palette</h2>
        </div>
      </div>

      {/* Palette grid */}
      <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
        Choose a starting palette
      </p>
      <ul className="flex flex-col gap-3" role="list">
        {PALETTE_OPTIONS.map((opt, idx) => {
          const isSelected = selectedIdx === idx;
          return (
            <li key={idx}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedIdx(idx)}
                className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all duration-150
                  ${isSelected
                    ? 'border-cyan-400/60 bg-cyan-500/10'
                    : 'border-white/10 bg-white/[0.04]'
                  }`}
              >
                {/* Swatch strip */}
                <div className="flex rounded-lg overflow-hidden shrink-0" style={{ width: 80, height: 32 }}>
                  {opt.colors.map((hex) => (
                    <div key={hex} className="flex-1 h-full" style={{ backgroundColor: hex }} />
                  ))}
                </div>

                {/* Label */}
                <span className="flex-1 text-left text-sm font-medium text-white/80">
                  {opt.name}
                </span>

                {isSelected && (
                  <i className="fa-solid fa-check text-cyan-400 shrink-0 text-sm" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* CTA */}
      <button
        type="button"
        disabled={selectedIdx === null}
        onClick={() => {
          if (selectedIdx === null) return;
          const opt = PALETTE_OPTIONS[selectedIdx]!;
          onPick([...opt.colors], opt.id);
        }}
        className="mt-auto w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200
                   disabled:opacity-40 disabled:cursor-not-allowed
                   bg-gradient-to-r from-cyan-500 to-blue-500 text-white
                   active:scale-[0.98]"
      >
        Use this palette
      </button>
    </div>
  );
}
