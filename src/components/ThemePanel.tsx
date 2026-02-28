/**
 * ThemePanel — Detailed theme editor for colors and typography.
 * 
 * Shows:
 * - Active palette swatches (drag to reorder)
 * - Light/Dark mode toggle
 * - Semantic color token grid (editable)
 * - Typography (heading/body font pickers)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { DesignTheme, ColorTokenName, ThemeTypography } from '../theme/types';
import { COLOR_TOKEN_GROUPS, tokenShortName } from '../theme/types';

// ---------------------------------------------------------------------------
// Font list (reuse from ToolSettingsBar pattern)
// ---------------------------------------------------------------------------

const FONT_OPTIONS = [
  'Arial', 'Helvetica', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New',
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Nunito',
  'Raleway', 'Work Sans', 'DM Sans', 'Rubik', 'Space Grotesk', 'Outfit', 'Figtree',
  'Playfair Display', 'Merriweather', 'Lora', 'Libre Baskerville',
  'Oswald', 'Bebas Neue', 'Dancing Script', 'Pacifico', 'Caveat',
  'Fira Code', 'JetBrains Mono', 'Source Code Pro',
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
}

export function ThemePanel({
  theme,
  onUpdateTokenColor,
  onUpdateTypography,
  onUpdatePaletteOrder,
  onToggleMode,
  onPickThemeColor,
}: ThemePanelProps) {
  const [expanded, setExpanded] = useState(true);
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

  const filteredFonts = useCallback((search: string) => {
    const q = search.toLowerCase().trim();
    return q ? FONT_OPTIONS.filter(f => f.toLowerCase().includes(q)) : FONT_OPTIONS;
  }, []);

  if (!theme) {
    return (
      <div className="text-[10px] text-gray-400 italic py-2">
        No theme active. Apply a palette from Kulrs to get started.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left group"
      >
        <span className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 flex items-center gap-1.5">
          <i className="fa-solid fa-palette text-teal-500 text-[10px]" />
          Theme: {theme.name}
        </span>
        <i className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'} text-gray-400 text-[9px] group-hover:text-gray-600 transition-colors`} />
      </button>

      {expanded && (
        <div className="space-y-3">
          {/* Palette swatches — drag to reorder */}
          <div>
            <div className="text-[9px] text-gray-400 mb-1 flex items-center justify-between">
              <span>Palette Colors</span>
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
                  title={`${hex} — click to apply, drag to reorder`}
                />
              ))}
            </div>
          </div>

          {/* Light/Dark toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">Mode:</span>
            <button
              type="button"
              onClick={onToggleMode}
              className={`text-[10px] px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                theme.mode === 'light'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-700 text-slate-200 border border-slate-600'
              }`}
            >
              <i className={`fa-solid ${theme.mode === 'light' ? 'fa-sun' : 'fa-moon'} text-[9px]`} />
              {theme.mode === 'light' ? 'Light' : 'Dark'}
            </button>
          </div>

          {/* ─── Color Tokens ─── */}
          <div>
            <div className="text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
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

          {/* ─── Typography ─── */}
          <div ref={fontDropdownRef}>
            <div className="text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Typography
            </div>
            <div className="space-y-2">
              {/* Heading font */}
              <div>
                <div className="text-[9px] text-gray-400 mb-0.5">Heading Font</div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setFontDropdownOpen(fontDropdownOpen === 'heading' ? null : 'heading');
                      setFontSearchHeading('');
                    }}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 border border-gray-200 rounded text-[11px] bg-white hover:bg-gray-50 text-left"
                    style={{ fontFamily: theme.typography.headingFont }}
                  >
                    <span className="truncate flex-1">{theme.typography.headingFont}</span>
                    <i className="fa-solid fa-caret-down text-[8px] text-gray-400 flex-shrink-0" />
                  </button>
                  {fontDropdownOpen === 'heading' && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                      <div className="p-1.5 border-b border-gray-100">
                        <input
                          value={fontSearchHeading}
                          onChange={(e) => setFontSearchHeading(e.target.value)}
                          placeholder="Search fonts..."
                          className="w-full px-2 py-1 text-[10px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-400"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-36 overflow-y-auto">
                        {filteredFonts(fontSearchHeading).map(f => (
                          <button
                            key={f}
                            type="button"
                            onMouseEnter={() => ensureFont(f)}
                            onClick={() => {
                              onUpdateTypography({ headingFont: f });
                              setFontDropdownOpen(null);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 text-[10px] hover:bg-teal-50 transition-colors ${
                              theme.typography.headingFont === f ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'
                            }`}
                            style={{ fontFamily: f }}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Body font */}
              <div>
                <div className="text-[9px] text-gray-400 mb-0.5">Body Font</div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setFontDropdownOpen(fontDropdownOpen === 'body' ? null : 'body');
                      setFontSearchBody('');
                    }}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 border border-gray-200 rounded text-[11px] bg-white hover:bg-gray-50 text-left"
                    style={{ fontFamily: theme.typography.bodyFont }}
                  >
                    <span className="truncate flex-1">{theme.typography.bodyFont}</span>
                    <i className="fa-solid fa-caret-down text-[8px] text-gray-400 flex-shrink-0" />
                  </button>
                  {fontDropdownOpen === 'body' && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                      <div className="p-1.5 border-b border-gray-100">
                        <input
                          value={fontSearchBody}
                          onChange={(e) => setFontSearchBody(e.target.value)}
                          placeholder="Search fonts..."
                          className="w-full px-2 py-1 text-[10px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-400"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-36 overflow-y-auto">
                        {filteredFonts(fontSearchBody).map(f => (
                          <button
                            key={f}
                            type="button"
                            onMouseEnter={() => ensureFont(f)}
                            onClick={() => {
                              onUpdateTypography({ bodyFont: f });
                              setFontDropdownOpen(null);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 text-[10px] hover:bg-teal-50 transition-colors ${
                              theme.typography.bodyFont === f ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'
                            }`}
                            style={{ fontFamily: f }}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemePanel;
