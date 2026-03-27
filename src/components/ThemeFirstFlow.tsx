/**
 * ThemeFirstFlow
 *
 * Guides the user from a mood/theme selection to pre-filled style seeds.
 *
 * Flow:
 *  1. The user browses a curated taxonomy of moods and themes, each with
 *     a short description and illustrative swatch colors.
 *  2. Clicking a theme card immediately produces a StyleSeed with matching
 *     moods, suggested base colors, and font preferences.
 *  3. The caller receives the seed via `onApplyTheme` and can feed it
 *     straight into the StyleFlow journey.
 *
 * Phase 6 (#195)
 */

import { useState } from 'react';
import type { StyleMood, StyleIndustry, StyleSeed } from '../style-flow/types';

// ---------------------------------------------------------------------------
// Theme taxonomy
// ---------------------------------------------------------------------------

export interface ThemeEntry {
  /** Unique slug */
  id: string;
  /** Display name */
  name: string;
  /** Short description shown in the card */
  description: string;
  /** FontAwesome icon class */
  icon: string;
  /** Primary style mood */
  mood: StyleMood;
  /** Additional moods that complement the primary one */
  secondaryMoods: StyleMood[];
  /** Suggested base colors (hex) */
  suggestedColors: string[];
  /** Suggested font preferences */
  suggestedFonts: string[];
  /** Best-fit industries for this theme */
  industries: StyleIndustry[];
}

export const THEME_TAXONOMY: ThemeEntry[] = [
  {
    id: 'clean-minimal',
    name: 'Clean & Minimal',
    description: 'White space, neutral tones, and crisp typography.',
    icon: 'fa-solid fa-minus',
    mood: 'minimal',
    secondaryMoods: [],
    suggestedColors: ['#FFFFFF', '#F5F5F5', '#1A1A2E', '#9E9E9E'],
    suggestedFonts: ['Inter', 'DM Sans'],
    industries: ['technology', 'health', 'finance'],
  },
  {
    id: 'bold-energetic',
    name: 'Bold & Energetic',
    description: 'Saturated colors, strong contrasts, and confident shapes.',
    icon: 'fa-solid fa-bolt',
    mood: 'bold',
    secondaryMoods: ['playful'],
    suggestedColors: ['#FF6B35', '#F7931E', '#EE4266', '#FFD23F'],
    suggestedFonts: ['Montserrat', 'Poppins'],
    industries: ['gaming', 'food', 'fashion'],
  },
  {
    id: 'playful-vibrant',
    name: 'Playful & Vibrant',
    description: 'Fun gradients, rounded corners, and joyful hues.',
    icon: 'fa-solid fa-face-smile',
    mood: 'playful',
    secondaryMoods: ['bold'],
    suggestedColors: ['#6C63FF', '#FF6584', '#43BCCD', '#F9C74F'],
    suggestedFonts: ['Nunito', 'Poppins'],
    industries: ['education', 'food', 'gaming'],
  },
  {
    id: 'elegant-luxury',
    name: 'Elegant & Luxurious',
    description: 'Serif fonts, gold accents, and refined dark or ivory palettes.',
    icon: 'fa-solid fa-gem',
    mood: 'elegant',
    secondaryMoods: ['minimal'],
    suggestedColors: ['#2D2D2D', '#B8A472', '#E8E0D4', '#8B7355'],
    suggestedFonts: ['Playfair Display', 'Cormorant Garamond'],
    industries: ['fashion', 'finance', 'health'],
  },
  {
    id: 'technical-precise',
    name: 'Technical & Precise',
    description: 'Dark backgrounds, monospace accents, and systematic spacing.',
    icon: 'fa-solid fa-microchip',
    mood: 'technical',
    secondaryMoods: ['minimal'],
    suggestedColors: ['#0A0E17', '#1B2838', '#66C0F4', '#4C7899'],
    suggestedFonts: ['JetBrains Mono', 'IBM Plex Mono'],
    industries: ['technology', 'finance', 'education'],
  },
  {
    id: 'warm-organic',
    name: 'Warm & Organic',
    description: 'Earth tones, rounded shapes, and a natural, grounded feel.',
    icon: 'fa-solid fa-leaf',
    mood: 'elegant',
    secondaryMoods: ['minimal'],
    suggestedColors: ['#A0522D', '#D2691E', '#F5DEB3', '#8FBC8F'],
    suggestedFonts: ['Lora', 'Source Serif 4'],
    industries: ['food', 'health', 'other'],
  },
  {
    id: 'corporate-professional',
    name: 'Corporate & Professional',
    description: 'Conservative blues, structured layouts, and authoritative typography.',
    icon: 'fa-solid fa-briefcase',
    mood: 'minimal',
    secondaryMoods: ['technical'],
    suggestedColors: ['#003366', '#0066CC', '#E8F0FE', '#333333'],
    suggestedFonts: ['Inter', 'Open Sans'],
    industries: ['finance', 'technology', 'health'],
  },
  {
    id: 'retro-nostalgic',
    name: 'Retro & Nostalgic',
    description: 'Warm gradients, vintage palette, and expressive display fonts.',
    icon: 'fa-solid fa-record-vinyl',
    mood: 'bold',
    secondaryMoods: ['playful'],
    suggestedColors: ['#D4A843', '#B5541B', '#3B1F14', '#F2E1C1'],
    suggestedFonts: ['Abril Fatface', 'Space Grotesk'],
    industries: ['food', 'fashion', 'other'],
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ThemeFirstFlowProps {
  /**
   * Called when the user clicks "Apply theme" on a theme card.
   * Receives a fully-formed StyleSeed ready to seed the style journey.
   */
  onApplyTheme: (seed: StyleSeed) => void;
  /**
   * Called whenever the user selects (previews) a theme, even before
   * confirming. Useful for live-previewing palettes in a parent component.
   */
  onSelectTheme?: (entry: ThemeEntry) => void;
  /** Pre-selected industry context to propagate into the generated seed. */
  industry?: StyleIndustry;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SwatchRow({ colors }: { colors: string[] }) {
  return (
    <div className="flex h-4 rounded overflow-hidden border border-gray-200">
      {colors.map((hex) => (
        <span
          key={hex}
          className="flex-1"
          style={{ backgroundColor: hex }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ThemeFirstFlow({
  onApplyTheme,
  onSelectTheme,
  industry = 'technology',
}: ThemeFirstFlowProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (entry: ThemeEntry) => {
    setSelectedId(entry.id);
    onSelectTheme?.(entry);
  };

  const handleApply = (entry: ThemeEntry) => {
    const seed: StyleSeed = {
      moods: [entry.mood, ...entry.secondaryMoods].slice(0, 2) as StyleMood[],
      industry: entry.industries.includes(industry) ? industry : (entry.industries[0] ?? industry),
      baseColors: entry.suggestedColors,
      fontPreferences: entry.suggestedFonts,
    };
    onApplyTheme(seed);
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-500 italic mb-1">
        Pick a mood &amp; theme to seed your style journey.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {THEME_TAXONOMY.map((entry) => {
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
              className={`p-2.5 rounded-lg border cursor-pointer transition-all text-left focus:outline-none focus:ring-2 focus:ring-teal-400/50
                ${isSelected
                  ? 'border-teal-400 bg-teal-50'
                  : 'border-gray-200 bg-white hover:border-teal-200 hover:bg-gray-50'
                }`}
            >
              {/* Header */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <i className={`${entry.icon} text-[11px] text-teal-600`} />
                <span className="text-[11px] font-semibold text-gray-800 truncate">
                  {entry.name}
                </span>
              </div>

              {/* Swatch preview */}
              <SwatchRow colors={entry.suggestedColors} />

              {/* Description */}
              <p className="text-[9px] text-gray-500 mt-1.5 leading-tight line-clamp-2">
                {entry.description}
              </p>

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
                  Apply theme
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ThemeFirstFlow;
