/**
 * ThemeQuickPicker — reusable palette + font-pair picker.
 *
 * Used by:
 *  - ChooseModeModal (welcome screen, step 2)
 *  - New Design dialog (File > New)
 *
 * Renders color-palette buttons and font-pair buttons inline.
 * Accepts a `variant` prop to switch between the dark welcome-modal
 * style and the light dialog style.
 */

import { useEffect } from 'react';
import { loadGoogleFont } from '../utils/googleFonts';

// ── Preset palettes ────────────────────────────────────────────────────────
export const PRESET_PALETTES: { id: string; name: string; colors: string[]; mood?: string; designGuidance?: { spacingUnit?: number; borderRadiusScale?: Record<string, number>; shadowProfile?: 'subtle' | 'moderate' | 'dramatic' } }[] = [
  { id: 'none', name: 'None', colors: [] },
  { id: 'ocean', name: 'Ocean', colors: ['#0f172a', '#1e3a5f', '#3b82f6', '#93c5fd', '#f0f9ff'], mood: 'Calm marine depth', designGuidance: { spacingUnit: 8, borderRadiusScale: { sm: 4, md: 8, lg: 12 }, shadowProfile: 'subtle' } },
  { id: 'sunset', name: 'Sunset', colors: ['#7c2d12', '#ea580c', '#fb923c', '#fde68a', '#fffbeb'], mood: 'Warm cinematic dusk', designGuidance: { spacingUnit: 8, borderRadiusScale: { sm: 6, md: 10, lg: 14 }, shadowProfile: 'moderate' } },
  { id: 'forest', name: 'Forest', colors: ['#14532d', '#16a34a', '#4ade80', '#bbf7d0', '#f0fdf4'], mood: 'Organic and grounded', designGuidance: { spacingUnit: 8, borderRadiusScale: { sm: 8, md: 12, lg: 16 }, shadowProfile: 'subtle' } },
  { id: 'slate', name: 'Slate', colors: ['#0f172a', '#334155', '#64748b', '#cbd5e1', '#f8fafc'], mood: 'Neutral product UI', designGuidance: { spacingUnit: 8, borderRadiusScale: { sm: 4, md: 6, lg: 8 }, shadowProfile: 'moderate' } },
  { id: 'berry', name: 'Berry', colors: ['#4a044e', '#a21caf', '#e879f9', '#f5d0fe', '#fdf4ff'], mood: 'Playful bold contrast', designGuidance: { spacingUnit: 8, borderRadiusScale: { sm: 6, md: 10, lg: 14 }, shadowProfile: 'dramatic' } },
  { id: 'premium-fintech', name: 'Premium Fintech', colors: ['#533afd', '#061b31', '#ea2261', '#f96bee', '#e5edf5'], mood: 'Premium fintech confidence', designGuidance: { spacingUnit: 8, borderRadiusScale: { sm: 4, md: 6, lg: 8 }, shadowProfile: 'dramatic' } },
  { id: 'editorial-soft', name: 'Editorial Soft', colors: ['#ffffff', '#f6f5f4', '#615d59', '#0075de', '#31302e'], mood: 'Warm editorial minimalism', designGuidance: { spacingUnit: 8, borderRadiusScale: { sm: 4, md: 8, lg: 12 }, shadowProfile: 'subtle' } },
  { id: 'media-night', name: 'Media Night', colors: ['#121212', '#181818', '#1f1f1f', '#1ed760', '#b3b3b3'], mood: 'Immersive dark media', designGuidance: { spacingUnit: 8, borderRadiusScale: { sm: 6, md: 8, lg: 12 }, shadowProfile: 'dramatic' } },
  { id: 'ops-control', name: 'Ops Control', colors: ['#08090a', '#191a1b', '#5e6ad2', '#7170ff', '#d0d6e0'], mood: 'Precision dark tooling', designGuidance: { spacingUnit: 4, borderRadiusScale: { sm: 2, md: 6, lg: 8 }, shadowProfile: 'subtle' } },
  { id: 'warm-hospitality', name: 'Warm Hospitality', colors: ['#ff385c', '#ffb400', '#00a699', '#f7f7f7', '#484848'], mood: 'Hospitality with warmth', designGuidance: { spacingUnit: 8, borderRadiusScale: { sm: 8, md: 12, lg: 16 }, shadowProfile: 'moderate' } },
  { id: 'neon-developer', name: 'Neon Developer', colors: ['#0f172a', '#111827', '#3ecf8e', '#80ed99', '#f8fafc'], mood: 'Developer green glow', designGuidance: { spacingUnit: 8, borderRadiusScale: { sm: 4, md: 8, lg: 12 }, shadowProfile: 'dramatic' } },
  { id: 'mono-ink', name: 'Monochrome Ink', colors: ['#000000', '#171717', '#404040', '#fafafa', '#2563eb'], mood: 'Monochrome with sharp accent', designGuidance: { spacingUnit: 8, borderRadiusScale: { sm: 2, md: 4, lg: 6 }, shadowProfile: 'subtle' } },
  { id: 'electric-builder', name: 'Electric Builder', colors: ['#146ef5', '#2f66f3', '#9ec5fe', '#f8fbff', '#0b1220'], mood: 'Energetic builder UI', designGuidance: { spacingUnit: 8, borderRadiusScale: { sm: 6, md: 10, lg: 16 }, shadowProfile: 'dramatic' } },
];

// ── Font pair presets ──────────────────────────────────────────────────────
export const FONT_PAIRS: { id: string; heading: string; body: string; label: string; style: string; designGuidance?: { headingSize?: number; bodySize?: number; lineHeightMultiplier?: number; letterSpacing?: Record<string, number> } }[] = [
  { id: 'default', heading: 'Inter', body: 'Inter', label: 'Clean', style: 'Modern sans-serif', designGuidance: { headingSize: 32, bodySize: 16, lineHeightMultiplier: 1.5, letterSpacing: { heading: -0.5, body: 0 } } },
  { id: 'elegant', heading: 'Playfair Display', body: 'Inter', label: 'Elegant', style: 'Serif + sans', designGuidance: { headingSize: 36, bodySize: 16, lineHeightMultiplier: 1.6, letterSpacing: { heading: -1, body: 0 } } },
  { id: 'modern', heading: 'Space Grotesk', body: 'DM Sans', label: 'Techy', style: 'Geometric sans', designGuidance: { headingSize: 32, bodySize: 15, lineHeightMultiplier: 1.4, letterSpacing: { heading: -0.3, body: 0.5 } } },
  { id: 'friendly', heading: 'Poppins', body: 'Open Sans', label: 'Friendly', style: 'Rounded sans', designGuidance: { headingSize: 34, bodySize: 16, lineHeightMultiplier: 1.6, letterSpacing: { heading: 0, body: 0.2 } } },
  { id: 'fintech', heading: 'Space Grotesk', body: 'Source Sans 3', label: 'Fintech', style: 'Engineered and premium', designGuidance: { headingSize: 32, bodySize: 14, lineHeightMultiplier: 1.4, letterSpacing: { heading: -0.6, body: 0 } } },
  { id: 'editorial', heading: 'DM Sans', body: 'Inter', label: 'Editorial', style: 'Calm product documentation', designGuidance: { headingSize: 28, bodySize: 16, lineHeightMultiplier: 1.7, letterSpacing: { heading: -0.2, body: 0.3 } } },
  { id: 'ops', heading: 'Inter', body: 'Inter', label: 'Ops', style: 'Dense and precise', designGuidance: { headingSize: 24, bodySize: 13, lineHeightMultiplier: 1.3, letterSpacing: { heading: -0.3, body: 0 } } },
  { id: 'music', heading: 'Montserrat', body: 'Nunito Sans', label: 'Music', style: 'Bold and compact', designGuidance: { headingSize: 36, bodySize: 15, lineHeightMultiplier: 1.4, letterSpacing: { heading: -0.5, body: 0.1 } } },
  { id: 'hospitality', heading: 'Nunito Sans', body: 'Source Sans 3', label: 'Hospitality', style: 'Friendly and human', designGuidance: { headingSize: 34, bodySize: 16, lineHeightMultiplier: 1.6, letterSpacing: { heading: 0, body: 0.3 } } },
  { id: 'luxury', heading: 'Cormorant Garamond', body: 'Work Sans', label: 'Luxury', style: 'High-contrast serif voice', designGuidance: { headingSize: 40, bodySize: 16, lineHeightMultiplier: 1.8, letterSpacing: { heading: -1.5, body: 0.5 } } },
  { id: 'neo-grotesk', heading: 'Plus Jakarta Sans', body: 'Manrope', label: 'SaaS', style: 'Neutral modern app', designGuidance: { headingSize: 30, bodySize: 16, lineHeightMultiplier: 1.5, letterSpacing: { heading: -0.3, body: 0.2 } } },
  { id: 'retro-tech', heading: 'Bebas Neue', body: 'Space Mono', label: 'Retro Tech', style: 'Display plus mono', designGuidance: { headingSize: 40, bodySize: 13, lineHeightMultiplier: 1.6, letterSpacing: { heading: 1, body: 0 } } },
];

export interface ThemeQuickPickerProps {
  selectedPalette: string;
  onSelectPalette: (id: string) => void;
  selectedFontPair: string;
  onSelectFontPair: (id: string) => void;
  /** Visual variant: "dark" for the welcome modal, "light" for in-editor dialogs */
  variant?: 'dark' | 'light';
  /** Include the "current" option that preserves the existing theme */
  showCurrentOption?: boolean;
}

const ensureFont = (name: string) => loadGoogleFont(name, [400, 600, 700]);

export function ThemeQuickPicker({
  selectedPalette,
  onSelectPalette,
  selectedFontPair,
  onSelectFontPair,
  variant = 'light',
  showCurrentOption = false,
}: ThemeQuickPickerProps) {
  // Preload fonts for preview
  useEffect(() => {
    FONT_PAIRS.forEach(fp => {
      ensureFont(fp.heading);
      ensureFont(fp.body);
    });
  }, []);

  const isDark = variant === 'dark';

  // Style class helpers
  const sectionLabel = isDark
    ? "text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1"
    : "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2";

  const chipBase = isDark
    ? 'rounded-lg border transition-all duration-200 p-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/50'
    : 'rounded-lg border transition-all duration-150 p-2 focus:outline-none focus:ring-2 focus:ring-blue-400/50';

  const chipSelected = isDark
    ? 'bg-white/15 border-cyan-400/70 ring-1 ring-cyan-400/40'
    : 'bg-blue-50 border-blue-400 ring-1 ring-blue-300';

  const chipUnselected = isDark
    ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20'
    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50';

  const fontChipBase = isDark
    ? 'rounded-lg border transition-all duration-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 text-left'
    : 'rounded-lg border transition-all duration-150 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-left';

  const palettes = showCurrentOption
    ? [{ id: 'current', name: 'Current', colors: [] as string[] }, ...PRESET_PALETTES]
    : PRESET_PALETTES;

  const fontPairs = showCurrentOption
    ? [{ id: 'current', heading: '', body: '', label: 'Current', style: 'Keep existing fonts' }, ...FONT_PAIRS]
    : FONT_PAIRS;

  return (
    <div className="space-y-4">
      {/* Palette picker */}
      <div>
        <p className={sectionLabel}>Color Palette</p>
        <div className="flex gap-2 flex-wrap">
          {palettes.map((pal) => (
            <button
              key={pal.id}
              onClick={() => onSelectPalette(pal.id)}
              className={`${chipBase} min-w-[80px] ${
                selectedPalette === pal.id ? chipSelected : chipUnselected
              }`}
              title={pal.name}
            >
              {pal.colors.length > 0 ? (
                <div className="flex h-5 rounded overflow-hidden mb-1.5">
                  {pal.colors.map((c, i) => (
                    <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
              ) : (
                <div className={`flex h-5 rounded overflow-hidden mb-1.5 border border-dashed items-center justify-center ${
                  isDark ? 'border-white/20' : 'border-gray-300'
                }`}>
                  <i className={`text-[8px] ${
                    pal.id === 'current'
                      ? `fa-solid fa-palette ${isDark ? 'text-cyan-300/40' : 'text-blue-400/50'}`
                      : `fa-solid fa-ban ${isDark ? 'text-white/25' : 'text-gray-300'}`
                  }`} />
                </div>
              )}
              <div className={`text-[10px] text-center ${
                selectedPalette === pal.id
                  ? (isDark ? 'text-white/80' : 'text-gray-800')
                  : (isDark ? 'text-white/40' : 'text-gray-500')
              }`}>{pal.name}</div>
              {pal.mood && (
                <div className={`text-[9px] mt-0.5 text-center ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                  {pal.mood}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Font pair picker */}
      <div>
        <p className={sectionLabel}>Font Pairing</p>
        <div className={`grid gap-2 ${fontPairs.length > 8 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : fontPairs.length > 4 ? 'grid-cols-5' : 'grid-cols-4'}`}>
          {fontPairs.map((fp) => (
            <button
              key={fp.id}
              onClick={() => onSelectFontPair(fp.id)}
              className={`${fontChipBase} ${
                selectedFontPair === fp.id ? chipSelected : chipUnselected
              }`}
            >
              <div
                className={`text-[13px] font-semibold mb-0.5 truncate ${
                  selectedFontPair === fp.id
                    ? (isDark ? 'text-white' : 'text-gray-900')
                    : (isDark ? 'text-white/80' : 'text-gray-700')
                }`}
                style={fp.heading ? { fontFamily: fp.heading } : undefined}
              >
                {fp.label}
              </div>
              <div
                className={`text-[10px] truncate ${isDark ? 'text-white/35' : 'text-gray-400'}`}
                style={fp.body ? { fontFamily: fp.body } : undefined}
              >
                {fp.style}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ThemeQuickPicker;
