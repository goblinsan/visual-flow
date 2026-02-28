/**
 * ThemePanel — Detailed theme editor for colors and typography.
 *
 * Shows:
 * - Active palette swatches (drag to reorder)
 * - Light/Dark mode buttons
 * - Typography section with category-filtered font pickers
 * - Semantic color token grid (editable)
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { DesignTheme, ColorTokenName, ThemeTypography } from '../theme/types';
import { COLOR_TOKEN_GROUPS, tokenShortName } from '../theme/types';

// ---------------------------------------------------------------------------
// Font catalogue with categories
// ---------------------------------------------------------------------------

export type FontCategory = 'all' | 'sans-serif' | 'serif' | 'display' | 'handwriting' | 'monospace';

interface FontEntry { name: string; category: Exclude<FontCategory, 'all'> }

const FONT_CATALOGUE: FontEntry[] = [
  // Sans-serif
  { name: 'Arial', category: 'sans-serif' },
  { name: 'Helvetica', category: 'sans-serif' },
  { name: 'Verdana', category: 'sans-serif' },
  { name: 'Inter', category: 'sans-serif' },
  { name: 'Roboto', category: 'sans-serif' },
  { name: 'Open Sans', category: 'sans-serif' },
  { name: 'Lato', category: 'sans-serif' },
  { name: 'Montserrat', category: 'sans-serif' },
  { name: 'Poppins', category: 'sans-serif' },
  { name: 'Nunito', category: 'sans-serif' },
  { name: 'Raleway', category: 'sans-serif' },
  { name: 'Work Sans', category: 'sans-serif' },
  { name: 'DM Sans', category: 'sans-serif' },
  { name: 'Rubik', category: 'sans-serif' },
  { name: 'Space Grotesk', category: 'sans-serif' },
  { name: 'Outfit', category: 'sans-serif' },
  { name: 'Figtree', category: 'sans-serif' },
  { name: 'Manrope', category: 'sans-serif' },
  { name: 'Plus Jakarta Sans', category: 'sans-serif' },
  { name: 'Source Sans 3', category: 'sans-serif' },
  { name: 'Noto Sans', category: 'sans-serif' },
  // Serif
  { name: 'Georgia', category: 'serif' },
  { name: 'Times New Roman', category: 'serif' },
  { name: 'Playfair Display', category: 'serif' },
  { name: 'Merriweather', category: 'serif' },
  { name: 'Lora', category: 'serif' },
  { name: 'Libre Baskerville', category: 'serif' },
  { name: 'PT Serif', category: 'serif' },
  { name: 'Crimson Text', category: 'serif' },
  { name: 'EB Garamond', category: 'serif' },
  { name: 'Cormorant Garamond', category: 'serif' },
  { name: 'Noto Serif', category: 'serif' },
  { name: 'Source Serif 4', category: 'serif' },
  // Display
  { name: 'Oswald', category: 'display' },
  { name: 'Bebas Neue', category: 'display' },
  { name: 'Anton', category: 'display' },
  { name: 'Abril Fatface', category: 'display' },
  { name: 'Righteous', category: 'display' },
  { name: 'Archivo Black', category: 'display' },
  { name: 'Alfa Slab One', category: 'display' },
  { name: 'Bungee', category: 'display' },
  { name: 'Permanent Marker', category: 'display' },
  // Handwriting
  { name: 'Dancing Script', category: 'handwriting' },
  { name: 'Pacifico', category: 'handwriting' },
  { name: 'Caveat', category: 'handwriting' },
  { name: 'Satisfy', category: 'handwriting' },
  { name: 'Great Vibes', category: 'handwriting' },
  { name: 'Indie Flower', category: 'handwriting' },
  { name: 'Sacramento', category: 'handwriting' },
  { name: 'Kalam', category: 'handwriting' },
  { name: 'Shadows Into Light', category: 'handwriting' },
  // Monospace
  { name: 'Courier New', category: 'monospace' },
  { name: 'Fira Code', category: 'monospace' },
  { name: 'JetBrains Mono', category: 'monospace' },
  { name: 'Source Code Pro', category: 'monospace' },
  { name: 'IBM Plex Mono', category: 'monospace' },
  { name: 'Space Mono', category: 'monospace' },
  { name: 'Roboto Mono', category: 'monospace' },
];

const FONT_CATEGORIES: { key: FontCategory; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'fa-font' },
  { key: 'sans-serif', label: 'Sans', icon: 'fa-a' },
  { key: 'serif', label: 'Serif', icon: 'fa-t' },
  { key: 'display', label: 'Display', icon: 'fa-heading' },
  { key: 'handwriting', label: 'Script', icon: 'fa-pen-nib' },
  { key: 'monospace', label: 'Mono', icon: 'fa-code' },
];

const SYSTEM_FONTS = new Set(['Arial', 'Helvetica', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New']);
const loadedFonts = new Set<string>();

function ensureFont(name: string) {
  if (SYSTEM_FONTS.has(name) || loadedFonts.has(name)) return;
  loadedFonts.add(name);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface ThemePanelProps {
  theme: DesignTheme | null;
  onUpdateTokenColor: (token: ColorTokenName, hex: string) => void;
  onUpdateTypography: (updates: Partial<ThemeTypography>) => void;
  onUpdatePaletteOrder: (newOrder: string[]) => void;
  onToggleMode: () => void;
  /** Called when a token color is picked — can apply to selection or tool */
  onPickThemeColor?: (hex: string, token: ColorTokenName) => void;
  /** Called to clear / remove the active theme */
  onClearTheme?: () => void;
}

export function ThemePanel({
  theme,
  onUpdateTokenColor,
  onUpdateTypography,
  onUpdatePaletteOrder,
  onToggleMode,
  onPickThemeColor,
  onClearTheme,
}: ThemePanelProps) {
  const [fontCategory, setFontCategory] = useState<FontCategory>('all');
  const [fontSearchHeading, setFontSearchHeading] = useState('');
  const [fontSearchBody, setFontSearchBody] = useState('');
  const [fontDropdownOpen, setFontDropdownOpen] = useState<'heading' | 'body' | null>(null);
  const fontDropdownRef = useRef<HTMLDivElement>(null);

  // Load theme fonts
  useEffect(() => {
    if (theme?.typography?.headingFont) ensureFont(theme.typography.headingFont);
    if (theme?.typography?.bodyFont) ensureFont(theme.typography.bodyFont);
  }, [theme?.typography?.headingFont, theme?.typography?.bodyFont]);

  // Close font dropdown on outside click
  useEffect(() => {
    if (!fontDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target as Node)) {
        setFontDropdownOpen(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [fontDropdownOpen]);

  // Palette drag-reorder state
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handlePaletteDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handlePaletteDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx || !theme) return;
    const newOrder = [...theme.paletteColors];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(idx, 0, moved);
    onUpdatePaletteOrder(newOrder);
    setDragIdx(idx);
  }, [dragIdx, theme, onUpdatePaletteOrder]);

  const filteredFonts = useMemo(() => {
    let fonts: FontEntry[] = FONT_CATALOGUE;
    if (fontCategory !== 'all') {
      fonts = fonts.filter(f => f.category === fontCategory);
    }
    const search = fontDropdownOpen === 'heading' ? fontSearchHeading : fontSearchBody;
    const q = search.toLowerCase().trim();
    if (q) {
      fonts = fonts.filter(f => f.name.toLowerCase().includes(q));
    }
    return fonts;
  }, [fontCategory, fontDropdownOpen, fontSearchHeading, fontSearchBody]);

  if (!theme) {
    return (
      <div className="text-[10px] text-gray-400 italic py-2">
        No theme active. Apply a palette from Kulrs to get started.
      </div>
    );
  }

  const renderFontPicker = (
    role: 'heading' | 'body',
    label: string,
    currentFont: string,
    searchValue: string,
    setSearchValue: (v: string) => void,
  ) => (
    <div>
      <div className="text-[10px] text-gray-500 font-medium mb-1">{label}</div>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setFontDropdownOpen(fontDropdownOpen === role ? null : role);
            setSearchValue('');
            setFontCategory('all');
          }}
          className="w-full flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-[12px] bg-white hover:bg-gray-50 text-left transition-colors"
          style={{ fontFamily: currentFont }}
        >
          <span className="truncate flex-1 font-medium">{currentFont}</span>
          <i className="fa-solid fa-caret-down text-[9px] text-gray-400 flex-shrink-0" />
        </button>
        {/* Preview line */}
        <div
          className="mt-1 text-[14px] text-gray-700 truncate px-1"
          style={{ fontFamily: currentFont }}
        >
          The quick brown fox jumps over the lazy dog
        </div>
        {fontDropdownOpen === role && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden"
               style={{ minWidth: '260px' }}>
            {/* Search */}
            <div className="p-2 border-b border-gray-100">
              <input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search fonts\u2026"
                className="w-full px-2.5 py-1.5 text-[11px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-400"
                autoFocus
              />
            </div>
            {/* Category filter pills */}
            <div className="flex gap-1 px-2 py-1.5 border-b border-gray-100 flex-wrap">
              {FONT_CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setFontCategory(cat.key)}
                  className={`text-[9px] px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 ${
                    fontCategory === cat.key
                      ? 'bg-teal-100 text-teal-700 font-semibold'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <i className={`fa-solid ${cat.icon} text-[8px]`} />
                  {cat.label}
                </button>
              ))}
            </div>
            {/* Font list */}
            <div className="max-h-48 overflow-y-auto">
              {filteredFonts.length === 0 && (
                <div className="px-3 py-2 text-[10px] text-gray-400 italic">No fonts match</div>
              )}
              {filteredFonts.map(f => (
                <button
                  key={f.name}
                  type="button"
                  onMouseEnter={() => ensureFont(f.name)}
                  onClick={() => {
                    onUpdateTypography(role === 'heading' ? { headingFont: f.name } : { bodyFont: f.name });
                    setFontDropdownOpen(null);
                  }}
                  className={`w-full text-left px-3 py-2 text-[11px] hover:bg-teal-50 transition-colors flex items-center justify-between ${
                    currentFont === f.name ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'
                  }`}
                  style={{ fontFamily: f.name }}
                >
                  <span>{f.name}</span>
                  <span className="text-[8px] text-gray-400 ml-2 font-sans">{f.category}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* \u2500\u2500\u2500 Palette swatches \u2014 drag to reorder \u2500\u2500\u2500 */}
      <div>
        <div className="text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
          <i className="fa-solid fa-palette text-teal-500 text-[10px]" />
          Palette Colors
        </div>
        <div className="text-[9px] text-gray-400 mb-1 flex items-center justify-between">
          <span>{theme.name}</span>
          <span className="text-gray-300">drag to reorder</span>
        </div>
        <div className="flex h-8 rounded overflow-hidden border border-gray-200">
          {theme.paletteColors.map((hex, idx) => (
            <button
              key={`${hex}-${idx}`}
              type="button"
              draggable
              onDragStart={() => handlePaletteDragStart(idx)}
              onDragOver={(e) => handlePaletteDragOver(e, idx)}
              onDragEnd={() => setDragIdx(null)}
              onClick={() => onPickThemeColor?.(hex, 'color.accent.primary')}
              className="flex-1 h-full cursor-grab active:cursor-grabbing hover:opacity-80 transition-all"
              style={{ backgroundColor: hex }}
              title={`${hex} \u2014 click to apply, drag to reorder`}
            />
          ))}
        </div>        {/* Revert to neutral greyscale theme */}
        {onClearTheme && (
          <button
            type="button"
            onClick={onClearTheme}
            className="mt-1.5 w-full flex items-center justify-center gap-1.5 text-[10px] text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded py-1 transition-colors"
            title="Revert to neutral greyscale colors"
          >
            <i className="fa-solid fa-circle-half-stroke text-[9px]" />
            Reset to Neutral
          </button>
        )}      </div>

      {/* \u2500\u2500\u2500 Light / Dark mode \u2500\u2500\u2500 */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500">Mode:</span>
        <button
          type="button"
          onClick={() => { if (theme.mode !== 'light') onToggleMode(); }}
          className={`text-[10px] px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
            theme.mode === 'light'
              ? 'bg-amber-100 text-amber-800 border border-amber-300 font-semibold'
              : 'bg-white text-gray-500 border border-gray-200 hover:bg-amber-50 hover:text-amber-700'
          }`}
        >
          <i className="fa-solid fa-sun text-[9px]" />
          Light
        </button>
        <button
          type="button"
          onClick={() => { if (theme.mode !== 'dark') onToggleMode(); }}
          className={`text-[10px] px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
            theme.mode === 'dark'
              ? 'bg-slate-700 text-slate-100 border border-slate-600 font-semibold'
              : 'bg-white text-gray-500 border border-gray-200 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          <i className="fa-solid fa-moon text-[9px]" />
          Dark
        </button>
      </div>

      {/* \u2500\u2500\u2500 Typography \u2500\u2500\u2500 */}
      <div ref={fontDropdownRef}>
        <div className="text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
          <i className="fa-solid fa-font text-teal-500 text-[10px]" />
          Typography
        </div>
        <div className="space-y-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
          {renderFontPicker('heading', 'Heading Font', theme.typography.headingFont, fontSearchHeading, setFontSearchHeading)}
          <div className="border-t border-gray-200" />
          {renderFontPicker('body', 'Body Font', theme.typography.bodyFont, fontSearchBody, setFontSearchBody)}
        </div>
      </div>

      {/* \u2500\u2500\u2500 Color Tokens \u2500\u2500\u2500 */}
      <div>
        <div className="text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
          <i className="fa-solid fa-droplet text-teal-500 text-[10px]" />
          Color Tokens
        </div>
        {COLOR_TOKEN_GROUPS.map((group) => (
          <div key={group.label} className="mb-2">
            <div className="text-[9px] text-gray-400 font-medium mb-0.5">{group.label}</div>
            <div className="grid grid-cols-2 gap-1">
              {group.tokens.map((token) => {
                const hex = theme.colors[token];
                return (
                  <div
                    key={token}
                    className="flex items-center gap-1.5 group/token"
                  >
                    <label
                      className="w-5 h-5 rounded border border-gray-300 cursor-pointer flex-shrink-0 hover:ring-2 hover:ring-teal-300 transition-all relative"
                      style={{ backgroundColor: hex }}
                      title={`${tokenShortName(token)}: ${hex}`}
                    >
                      <input
                        type="color"
                        value={hex}
                        onChange={(e) => onUpdateTokenColor(token, e.target.value)}
                        className="sr-only"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => onPickThemeColor?.(hex, token)}
                      className="text-[9px] text-gray-500 hover:text-teal-600 truncate cursor-pointer transition-colors text-left flex-1"
                      title={`Click to apply ${tokenShortName(token)} (${hex}) to selection`}
                    >
                      {tokenShortName(token)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ThemePanel;
