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
export const PRESET_PALETTES: { id: string; name: string; colors: string[] }[] = [
  { id: 'none', name: 'None', colors: [] },
  { id: 'ocean', name: 'Ocean', colors: ['#0f172a', '#1e3a5f', '#3b82f6', '#93c5fd', '#f0f9ff'] },
  { id: 'sunset', name: 'Sunset', colors: ['#7c2d12', '#ea580c', '#fb923c', '#fde68a', '#fffbeb'] },
  { id: 'forest', name: 'Forest', colors: ['#14532d', '#16a34a', '#4ade80', '#bbf7d0', '#f0fdf4'] },
  { id: 'slate', name: 'Slate', colors: ['#0f172a', '#334155', '#64748b', '#cbd5e1', '#f8fafc'] },
  { id: 'berry', name: 'Berry', colors: ['#4a044e', '#a21caf', '#e879f9', '#f5d0fe', '#fdf4ff'] },
];

// ── Font pair presets ──────────────────────────────────────────────────────
export const FONT_PAIRS: { id: string; heading: string; body: string; label: string; style: string }[] = [
  { id: 'default', heading: 'Inter', body: 'Inter', label: 'Clean', style: 'Modern sans-serif' },
  { id: 'elegant', heading: 'Playfair Display', body: 'Inter', label: 'Elegant', style: 'Serif + sans' },
  { id: 'modern', heading: 'Space Grotesk', body: 'DM Sans', label: 'Techy', style: 'Geometric sans' },
  { id: 'friendly', heading: 'Poppins', body: 'Open Sans', label: 'Friendly', style: 'Rounded sans' },
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
            </button>
          ))}
        </div>
      </div>

      {/* Font pair picker */}
      <div>
        <p className={sectionLabel}>Font Pairing</p>
        <div className={`grid gap-2 ${fontPairs.length > 4 ? 'grid-cols-5' : 'grid-cols-4'}`}>
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
