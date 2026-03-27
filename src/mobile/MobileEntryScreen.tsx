/**
 * MobileEntryScreen
 *
 * Landing screen for the mobile-first flow.
 * Presents six entry point cards; selecting one advances the user into the
 * appropriate guided step.
 *
 * Entry points:
 *  - By Template → preset template gallery (MobileTemplatePickStep)  #213
 *  - By Theme  → theme taxonomy cards (ThemeFirstFlow)
 *  - By Color  → color picker → palette (ColorFirstFlow)
 *  - By Font   → font catalogue (FontFirstFlow)
 *  - By Image  → image upload → color extraction (ImageFirstFlow)
 *  - Start Blank → skip straight to style seed step
 */

import type { MobileEntryPoint } from './types';

interface EntryCard {
  id: MobileEntryPoint;
  icon: string;
  label: string;
  description: string;
  /** Tailwind gradient classes for the card accent strip */
  gradient: string;
}

const ENTRY_CARDS: EntryCard[] = [
  {
    id: 'template',
    icon: 'fa-solid fa-table-cells-large',
    label: 'By Template',
    description: 'Pick a ready-made preset to get started fast',
    gradient: 'from-cyan-500 to-teal-600',
  },
  {
    id: 'theme',
    icon: 'fa-solid fa-palette',
    label: 'By Theme',
    description: 'Pick a mood — minimal, bold, playful…',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    id: 'color',
    icon: 'fa-solid fa-droplet',
    label: 'By Color',
    description: 'Start with a colour you love',
    gradient: 'from-pink-500 to-rose-600',
  },
  {
    id: 'font',
    icon: 'fa-solid fa-font',
    label: 'By Font',
    description: 'Let typography set the tone',
    gradient: 'from-sky-500 to-blue-600',
  },
  {
    id: 'image',
    icon: 'fa-solid fa-image',
    label: 'By Image',
    description: 'Extract a palette from a photo',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'blank',
    icon: 'fa-solid fa-wand-magic-sparkles',
    label: 'Start Blank',
    description: 'Choose moods and industry yourself',
    gradient: 'from-emerald-500 to-teal-600',
  },
];

export interface MobileEntryScreenProps {
  /** Called when the user taps an entry point card */
  onSelect: (entry: MobileEntryPoint) => void;
}

export function MobileEntryScreen({ onSelect }: MobileEntryScreenProps) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white px-5 pt-14 pb-8">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Visual Flow</h1>
        <p className="text-white/50 text-base leading-relaxed">
          Build a beautiful design system in a few taps. How do you want to start?
        </p>
      </div>

      {/* Entry point cards */}
      <ul className="flex flex-col gap-4" role="list">
        {ENTRY_CARDS.map((card) => (
          <li key={card.id}>
            <button
              type="button"
              role="button"
              aria-label={`Start by ${card.label}`}
              onClick={() => onSelect(card.id)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.05] border border-white/10
                         active:scale-[0.98] transition-transform duration-100 text-left"
            >
              {/* Icon strip */}
              <span
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient}
                            flex items-center justify-center shrink-0`}
              >
                <i className={`${card.icon} text-white text-xl`} />
              </span>

              {/* Text */}
              <div className="min-w-0">
                <p className="font-semibold text-white text-base leading-none mb-1">
                  {card.label}
                </p>
                <p className="text-white/50 text-sm leading-snug truncate">
                  {card.description}
                </p>
              </div>

              {/* Arrow */}
              <i className="fa-solid fa-chevron-right text-white/25 ml-auto shrink-0" />
            </button>
          </li>
        ))}
      </ul>

      {/* Footer note */}
      <p className="mt-auto pt-10 text-center text-white/25 text-xs">
        Tap any option to begin your guided flow
      </p>
    </div>
  );
}
