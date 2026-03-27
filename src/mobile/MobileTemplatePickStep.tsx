/**
 * MobileTemplatePickStep
 *
 * Presents a curated set of named design presets (templates) the user can
 * select from to instantly pre-configure their color palette, typography,
 * mood and industry.  Selecting a template advances the user into the
 * component-selection step with all values pre-seeded.
 *
 * Issue #213 – Implement template and preset selection screens
 */

import { useState } from 'react';
import type { StyleMood, StyleIndustry } from '../style-flow/types';

// ── Preset templates ──────────────────────────────────────────────────────────

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Tailwind gradient for the icon strip. */
  gradient: string;
  /** Representative colors (primary, accent, surface). */
  colors: [string, string, string, string];
  mood: StyleMood;
  industry: StyleIndustry;
  headingFont: string;
  bodyFont: string;
}

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'saas-dashboard',
    name: 'SaaS Dashboard',
    description: 'Clean metrics UI for B2B products',
    icon: 'fa-solid fa-chart-line',
    gradient: 'from-blue-500 to-indigo-600',
    colors: ['#1E40AF', '#3B82F6', '#BFDBFE', '#0EA5E9'],
    mood: 'minimal',
    industry: 'technology',
    headingFont: 'Inter',
    bodyFont: 'Inter',
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    description: 'Vibrant storefront ready to convert',
    icon: 'fa-solid fa-bag-shopping',
    gradient: 'from-rose-500 to-pink-600',
    colors: ['#BE123C', '#FB7185', '#FFE4E6', '#F43F5E'],
    mood: 'bold',
    industry: 'fashion',
    headingFont: 'Poppins',
    bodyFont: 'Inter',
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'Elegant showcase for creatives',
    icon: 'fa-solid fa-briefcase',
    gradient: 'from-amber-500 to-yellow-600',
    colors: ['#2D2D2D', '#B8A472', '#E8E0D4', '#8B7355'],
    mood: 'elegant',
    industry: 'other',
    headingFont: 'Playfair Display',
    bodyFont: 'Inter',
  },
  {
    id: 'agency',
    name: 'Creative Agency',
    description: 'Bold identity for studios & agencies',
    icon: 'fa-solid fa-wand-sparkles',
    gradient: 'from-violet-500 to-purple-600',
    colors: ['#7C3AED', '#A78BFA', '#EDE9FE', '#6D28D9'],
    mood: 'playful',
    industry: 'other',
    headingFont: 'Poppins',
    bodyFont: 'Inter',
  },
  {
    id: 'developer-tool',
    name: 'Developer Tool',
    description: 'Dark technical UI for power users',
    icon: 'fa-solid fa-terminal',
    gradient: 'from-slate-500 to-slate-700',
    colors: ['#0A0E17', '#1B2838', '#66C0F4', '#4C7899'],
    mood: 'technical',
    industry: 'technology',
    headingFont: 'JetBrains Mono',
    bodyFont: 'JetBrains Mono',
  },
  {
    id: 'food-blog',
    name: 'Food & Lifestyle',
    description: 'Warm, inviting tones for food brands',
    icon: 'fa-solid fa-bowl-food',
    gradient: 'from-orange-500 to-amber-600',
    colors: ['#92400E', '#F59E0B', '#FEF3C7', '#D97706'],
    mood: 'playful',
    industry: 'food',
    headingFont: 'Poppins',
    bodyFont: 'Inter',
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface MobileTemplatePickStepProps {
  /** Called when the user confirms a template. */
  onPick: (preset: TemplatePreset) => void;
  /** Called when the user taps the back button. */
  onBack: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileTemplatePickStep({ onPick, onBack }: MobileTemplatePickStepProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedPreset = TEMPLATE_PRESETS.find((t) => t.id === selectedId) ?? null;

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
          <h2 className="text-lg font-bold leading-tight">Choose a template</h2>
        </div>
      </div>

      {/* Template grid */}
      <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
        Pick a starting preset
      </p>
      <ul className="flex flex-col gap-3" role="list">
        {TEMPLATE_PRESETS.map((preset) => {
          const isSelected = selectedId === preset.id;
          return (
            <li key={preset.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedId(preset.id)}
                className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-cyan-400/50
                  ${
                    isSelected
                      ? 'border-cyan-400/60 bg-cyan-500/10'
                      : 'border-white/10 bg-white/[0.04]'
                  }`}
              >
                {/* Icon */}
                <span
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${preset.gradient}
                               flex items-center justify-center shrink-0`}
                >
                  <i className={`${preset.icon} text-white text-lg`} />
                </span>

                {/* Text */}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-white/90 leading-snug">{preset.name}</p>
                  <p className="text-xs text-white/45 leading-snug truncate">{preset.description}</p>
                </div>

                {/* Color swatches */}
                <div className="flex gap-0.5 shrink-0">
                  {preset.colors.slice(0, 3).map((hex) => (
                    <div
                      key={hex}
                      className="w-4 h-4 rounded-sm"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>

                {isSelected && (
                  <i className="fa-solid fa-check text-cyan-400 shrink-0 text-sm ml-1" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* CTA */}
      <button
        type="button"
        disabled={!selectedPreset}
        onClick={() => {
          if (selectedPreset) onPick(selectedPreset);
        }}
        className="mt-8 w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200
                   disabled:opacity-40 disabled:cursor-not-allowed
                   bg-gradient-to-r from-cyan-500 to-blue-500 text-white
                   active:scale-[0.98]"
      >
        Use this template
      </button>
    </div>
  );
}
