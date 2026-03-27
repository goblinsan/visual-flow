/**
 * MobileRefineStep
 *
 * A single-screen refinement step for the mobile-first flow.
 * Presents a concise set of mood chips and an industry picker so the user
 * can tune the generated design without leaving the mobile context.
 *
 * Issue #206 – Design the simplified selection-based workflow
 */

import { useState } from 'react';
import type { StyleMood, StyleIndustry } from '../style-flow/types';

// ── Options ──────────────────────────────────────────────────────────────────

const MOOD_OPTIONS: { value: StyleMood; label: string; icon: string }[] = [
  { value: 'minimal',   label: 'Minimal',   icon: 'fa-solid fa-minus' },
  { value: 'bold',      label: 'Bold',      icon: 'fa-solid fa-bolt' },
  { value: 'playful',   label: 'Playful',   icon: 'fa-solid fa-face-smile' },
  { value: 'elegant',   label: 'Elegant',   icon: 'fa-solid fa-gem' },
  { value: 'technical', label: 'Technical', icon: 'fa-solid fa-microchip' },
];

const INDUSTRY_OPTIONS: { value: StyleIndustry; label: string }[] = [
  { value: 'technology', label: 'Technology' },
  { value: 'fashion',    label: 'Fashion' },
  { value: 'finance',    label: 'Finance' },
  { value: 'health',     label: 'Health' },
  { value: 'education',  label: 'Education' },
  { value: 'gaming',     label: 'Gaming' },
  { value: 'food',       label: 'Food & Beverage' },
  { value: 'other',      label: 'Other' },
];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface MobileRefineStepProps {
  /** Pre-selected moods inferred from the entry point (may be empty). */
  initialMoods?: StyleMood[];
  /** Pre-selected industry inferred from the entry point. */
  initialIndustry?: StyleIndustry;
  /** Called with the final mood/industry selection. */
  onConfirm: (moods: StyleMood[], industry: StyleIndustry) => void;
  /** Called when the user taps the back button. */
  onBack: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileRefineStep({
  initialMoods = [],
  initialIndustry = 'technology',
  onConfirm,
  onBack,
}: MobileRefineStepProps) {
  const [moods, setMoods] = useState<StyleMood[]>(initialMoods);
  const [industry, setIndustry] = useState<StyleIndustry>(initialIndustry);

  const toggleMood = (mood: StyleMood) => {
    setMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood],
    );
  };

  const canContinue = moods.length > 0;

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
            Step 2 of 3
          </p>
          <h2 className="text-lg font-bold leading-tight">Refine your style</h2>
        </div>
      </div>

      {/* Mood chips */}
      <section className="mb-8">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
          Pick your mood(s)
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Mood options">
          {MOOD_OPTIONS.map(({ value, label, icon }) => {
            const active = moods.includes(value);
            return (
              <button
                key={value}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() => toggleMood(value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-cyan-400/50
                  ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300'
                      : 'bg-white/[0.04] border-white/10 text-white/60'
                  }`}
              >
                <i className={`${icon} text-[11px]`} />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Industry picker */}
      <section className="mb-10">
        <label
          htmlFor="mobile-industry"
          className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3"
        >
          Industry
        </label>
        <select
          id="mobile-industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value as StyleIndustry)}
          className="w-full bg-white/[0.06] border border-white/15 rounded-xl px-4 py-3 text-white text-base
                     focus:outline-none focus:ring-2 focus:ring-cyan-400/50 appearance-none"
        >
          {INDUSTRY_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value} className="bg-slate-800">
              {label}
            </option>
          ))}
        </select>
      </section>

      {/* Continue CTA */}
      <button
        type="button"
        disabled={!canContinue}
        onClick={() => onConfirm(moods, industry)}
        className="mt-auto w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200
                   disabled:opacity-40 disabled:cursor-not-allowed
                   bg-gradient-to-r from-cyan-500 to-blue-500 text-white
                   active:scale-[0.98]"
      >
        Preview my design
      </button>
    </div>
  );
}
