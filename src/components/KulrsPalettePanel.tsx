/**
 * Kulrs Palette Panel
 *
 * Integrates with the Kulrs.com color palette API to let
 * Vizail users browse community palettes, generate random ones,
 * and apply colors directly to their designs.
 *
 * Also provides Light / Dark / Custom theme controls that remap
 * neutral background, border, and text colors across the spec tree.
 */

import { useState, useEffect, useCallback } from 'react';
import type { LayoutSpec, LayoutNode } from '../layout-schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ThemeMode = 'light' | 'dark' | 'custom';

interface ThemeColors {
  pageBg: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  isDark: boolean;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KulrsPaletteColor {
  id: string;
  hexValue: string;
  name: string | null;
  position: number;
}

interface KulrsPalette {
  id: string;
  name: string;
  description: string | null;
  likesCount: number;
  createdAt: string;
  colors: KulrsPaletteColor[];
}

interface BrowseResponse {
  success: boolean;
  data: KulrsPalette[];
}

// ---------------------------------------------------------------------------
// API Helpers
// ---------------------------------------------------------------------------

const KULRS_API =
  import.meta.env.VITE_KULRS_API_URL ??
  (import.meta.env.DEV
    ? 'http://localhost:8080'
    : 'https://kulrs-api-jyedwyfhdq-uc.a.run.app');

async function fetchKulrsPalettes(
  sort: 'recent' | 'popular' = 'recent',
  limit = 12
): Promise<KulrsPalette[]> {
  const res = await fetch(
    `${KULRS_API}/palettes?sort=${sort}&limit=${limit}`
  );
  if (!res.ok) throw new Error(`Kulrs API ${res.status}`);
  const json: BrowseResponse = await res.json();
  return json.data;
}

async function fetchKulrsPaletteById(
  id: string
): Promise<KulrsPalette | null> {
  const res = await fetch(`${KULRS_API}/palettes/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Kulrs API ${res.status}`);
  const json: { success: boolean; data: KulrsPalette } = await res.json();
  return json.data;
}

// ---------------------------------------------------------------------------
// Theme helpers
// ---------------------------------------------------------------------------

/** Perceived brightness 0-255 */
function brightness(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function lightenHex(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

function resolveTheme(mode: ThemeMode, customBg: string): ThemeColors {
  if (mode === 'dark') {
    return { pageBg: '#0f172a', cardBg: '#1e293b', textPrimary: '#f1f5f9', textSecondary: '#94a3b8', border: '#334155', isDark: true };
  }
  if (mode === 'custom') {
    const dark = brightness(customBg) < 140;
    return {
      pageBg: customBg,
      cardBg: dark ? lightenHex(customBg, 0.08) : '#ffffff',
      textPrimary: dark ? '#f1f5f9' : '#0f172a',
      textSecondary: dark ? '#94a3b8' : '#64748b',
      border: dark ? lightenHex(customBg, 0.15) : '#e2e8f0',
      isDark: dark,
    };
  }
  return { pageBg: '#f9fafb', cardBg: '#ffffff', textPrimary: '#0f172a', textSecondary: '#64748b', border: '#e2e8f0', isDark: false };
}

/** Hex colours that are "neutral" across both theme variants. */
const LIGHT_NEUTRALS = new Set([
  '#f9fafb', '#f8fafc', '#f1f5f9', '#ffffff', '#fff', '#e5e7eb',
  '#e2e8f0', '#d1d5db', '#0f172a', '#1f2937', '#1a1a2e', '#64748b',
  '#9ca3af', '#94a3b8',
]);
const DARK_NEUTRALS = new Set([
  '#0f172a', '#1e293b', '#334155', '#f1f5f9', '#94a3b8', '#e2e8f0',
]);

function normalise(hex: string): string {
  if (!hex) return '';
  const h = hex.trim().toLowerCase();
  if (h === '#fff') return '#ffffff';
  return h;
}

/** True if a colour is "neutral" (a known light or dark theme scaffold colour
 *  as opposed to a vibrant palette colour the user chose). */
function isNeutral(hex: string): boolean {
  const n = normalise(hex);
  return LIGHT_NEUTRALS.has(n) || DARK_NEUTRALS.has(n);
}

/**
 * Build a remap table: old neutral → new neutral, given the target ThemeColors.
 */
function buildColorMap(target: ThemeColors): Map<string, string> {
  const m = new Map<string, string>();
  // Page / canvas backgrounds
  for (const bg of ['#f9fafb', '#f8fafc', '#f1f5f9', '#e5e7eb', '#0f172a']) {
    m.set(bg, target.pageBg);
  }
  // Card / panel backgrounds
  for (const bg of ['#ffffff', '#fff', '#1e293b']) {
    m.set(bg, target.cardBg);
  }
  // Text primary
  for (const t of ['#0f172a', '#1f2937', '#1a1a2e', '#f1f5f9']) {
    m.set(t, target.textPrimary);
  }
  // Text secondary
  for (const t of ['#64748b', '#9ca3af', '#94a3b8']) {
    m.set(t, target.textSecondary);
  }
  // Borders
  for (const b of ['#e2e8f0', '#e5e7eb', '#d1d5db', '#334155']) {
    m.set(b, target.border);
  }
  return m;
}

/** Walk the entire spec tree and remap neutral fill/stroke/color/background. */
function applyThemeToSpec(spec: LayoutSpec, theme: ThemeColors): LayoutSpec {
  const cmap = buildColorMap(theme);

  function remap(color: string | undefined): string | undefined {
    if (!color) return color;
    const n = normalise(color);
    return cmap.get(n) ?? color;
  }

  function walkNode(node: LayoutNode): LayoutNode {
    const patched: Record<string, unknown> = {};

    // Rect, Ellipse — fill & stroke
    if ('fill' in node && typeof (node as { fill?: string }).fill === 'string') {
      const orig = (node as { fill?: string }).fill!;
      if (isNeutral(orig)) patched.fill = remap(orig);
    }
    if ('stroke' in node && typeof (node as { stroke?: string }).stroke === 'string') {
      const orig = (node as { stroke?: string }).stroke!;
      if (isNeutral(orig)) patched.stroke = remap(orig);
    }
    // Text — color
    if ('color' in node && typeof (node as { color?: string }).color === 'string') {
      const orig = (node as { color?: string }).color!;
      if (isNeutral(orig)) patched.color = remap(orig);
    }
    // Frame / Box — background
    if ('background' in node && typeof (node as { background?: string }).background === 'string') {
      const orig = (node as { background?: string }).background!;
      if (isNeutral(orig)) patched.background = remap(orig);
    }

    const hasChildren = 'children' in node && Array.isArray((node as { children?: LayoutNode[] }).children);
    const children = hasChildren
      ? (node as { children: LayoutNode[] }).children.map(walkNode)
      : undefined;

    if (Object.keys(patched).length === 0 && !hasChildren) return node;
    return { ...node, ...patched, ...(children ? { children } : {}) } as LayoutNode;
  }

  return {
    ...spec,
    root: {
      ...spec.root,
      background: remap(spec.root.background) ?? spec.root.background,
      children: spec.root.children.map(walkNode),
    },
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface KulrsPalettePanelProps {
  /** Called when the user clicks a swatch — colour is a hex string. */
  onPickColor: (hex: string) => void;
  /** Optional: apply to the selected node's fill immediately. */
  onApplyFill?: (hex: string) => void;
  /** Optional: apply to stroke. */
  onApplyStroke?: (hex: string) => void;
  /** Current design spec (for theme remapping). */
  spec?: LayoutSpec;
  /** Spec updater (for theme remapping). */
  setSpec?: (fn: (prev: LayoutSpec) => LayoutSpec) => void;
}

type SortMode = 'recent' | 'popular';

export function KulrsPalettePanel({
  onPickColor,
  onApplyFill,
  onApplyStroke,
  spec,
  setSpec,
}: KulrsPalettePanelProps) {
  const [palettes, setPalettes] = useState<KulrsPalette[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>('recent');
  const [expanded, setExpanded] = useState(false);
  const [applyMode, setApplyMode] = useState<'recent' | 'fill' | 'stroke'>('recent');
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<KulrsPalette | null>(null);
  const [searchNotFound, setSearchNotFound] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [customBg, setCustomBg] = useState('#ffffff');

  /** Apply theme remapping to the current spec whenever themeMode/customBg changes. */
  const handleApplyTheme = useCallback(
    (mode: ThemeMode, bg: string) => {
      if (!spec || !setSpec) return;
      const theme = resolveTheme(mode, bg);
      setSpec((prev) => applyThemeToSpec(prev, theme));
    },
    [spec, setSpec],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchKulrsPalettes(sort);
      setPalettes(data);
    } catch {
      setError('Could not load palettes from Kulrs');
    } finally {
      setLoading(false);
    }
  }, [sort]);

  // Load on first expand & when sort changes while expanded
  useEffect(() => {
    if (expanded) load();
  }, [expanded, load]);

  const handleSearch = useCallback(async () => {
    const trimmed = searchId.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setSearchNotFound(false);
    setSearchResult(null);
    try {
      const result = await fetchKulrsPaletteById(trimmed);
      if (result) {
        setSearchResult(result);
      } else {
        setSearchNotFound(true);
      }
    } catch {
      setError('Could not look up palette');
    } finally {
      setLoading(false);
    }
  }, [searchId]);

  const clearSearch = () => {
    setSearchId('');
    setSearchResult(null);
    setSearchNotFound(false);
  };

  const handleSwatchClick = (hex: string) => {
    onPickColor(hex);
    if (applyMode === 'fill' && onApplyFill) onApplyFill(hex);
    if (applyMode === 'stroke' && onApplyStroke) onApplyStroke(hex);
  };

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left group"
      >
        <span className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 64 64" className="inline-block">
            <rect width="64" height="64" rx="8" fill="#aaffdd" />
            <text
              x="32"
              y="48"
              fontFamily="Monoton, cursive"
              fontSize="46"
              fill="black"
              textAnchor="middle"
            >
              K
            </text>
          </svg>
          Kulrs Palettes
        </span>
        <i
          className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'} text-gray-400 text-[9px] group-hover:text-gray-600 transition-colors`}
        />
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {/* Sort toggle */}
          <div className="flex gap-1">
            {(['recent', 'popular'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                className={`text-[10px] px-2 py-0.5 rounded ${
                  sort === s
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } transition-colors`}
              >
                {s === 'recent' ? 'Recent' : 'Popular'}
              </button>
            ))}

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors ml-auto disabled:opacity-40"
              title="Refresh"
            >
              <i className={`fa-solid fa-arrows-rotate ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Theme toggle */}
          {spec && setSpec && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {(['light', 'dark', 'custom'] as ThemeMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setThemeMode(mode);
                      handleApplyTheme(mode, customBg);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 ${
                      themeMode === mode
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } transition-colors`}
                  >
                    <i
                      className={`fa-solid ${
                        mode === 'light'
                          ? 'fa-sun'
                          : mode === 'dark'
                            ? 'fa-moon'
                            : 'fa-sliders'
                      } text-[8px]`}
                    />
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>

              {themeMode === 'custom' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400">Background</span>
                  <label
                    className="w-5 h-5 rounded border border-gray-300 cursor-pointer inline-block"
                    style={{ backgroundColor: customBg }}
                  >
                    <input
                      type="color"
                      value={customBg}
                      onChange={(e) => {
                        setCustomBg(e.target.value);
                        handleApplyTheme('custom', e.target.value);
                      }}
                      className="sr-only"
                    />
                  </label>
                  <span className="text-[10px] text-gray-500 font-mono">{customBg}</span>
                </div>
              )}
            </div>
          )}

          {/* Palette ID search */}
          <div className="flex gap-1">
            <input
              type="text"
              value={searchId}
              onChange={(e) => { setSearchId(e.target.value); setSearchNotFound(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Paste palette ID…"
              className="flex-1 text-[10px] px-2 py-1 rounded border border-gray-200 bg-white focus:outline-none focus:border-teal-400 placeholder:text-gray-300"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading || !searchId.trim()}
              className="text-[10px] px-2 py-0.5 rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition-colors"
            >
              <i className="fa-solid fa-magnifying-glass" />
            </button>
            {(searchResult || searchNotFound) && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                title="Clear search"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          {searchNotFound && (
            <div className="text-[10px] text-amber-600">No palette found with that ID</div>
          )}

          {/* Search result */}
          {searchResult && (
            <div className="border border-teal-200 rounded p-1.5 bg-teal-50/40">
              <div className="text-[9px] text-teal-700 mb-1 font-semibold">Found palette</div>
              <div className="flex h-7 rounded overflow-hidden border border-gray-200">
                {searchResult.colors
                  .sort((a, b) => a.position - b.position)
                  .map((color, idx) => (
                    <button
                      key={color.id || idx}
                      type="button"
                      title={`${color.hexValue}${color.name ? ` (${color.name})` : ''} — click to apply`}
                      onClick={() => handleSwatchClick(color.hexValue)}
                      className="flex-1 h-full cursor-pointer hover:opacity-80 active:scale-95 transition-all"
                      style={{ backgroundColor: color.hexValue }}
                    />
                  ))}
              </div>
              <div className="flex justify-between text-[9px] text-gray-400 mt-0.5 px-0.5">
                <span>
                  {searchResult.colors.length} colors
                  {searchResult.likesCount > 0 && <> · ❤ {searchResult.likesCount}</>}
                </span>
                <span>{new Date(searchResult.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          {/* Apply-mode selector */}
          <div className="flex gap-1 text-[10px]">
            <span className="text-gray-400 self-center">Click applies to:</span>
            {(['recent', 'fill', 'stroke'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setApplyMode(m)}
                className={`px-1.5 py-0.5 rounded capitalize ${
                  applyMode === m
                    ? 'bg-teal-100 text-teal-800 font-semibold'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {m === 'recent' ? 'Recents' : m}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="text-[10px] text-red-500 flex items-center gap-1">
              <i className="fa-solid fa-triangle-exclamation" />
              {error}
            </div>
          )}

          {/* Loading skeleton */}
          {loading &&
            palettes.length === 0 &&
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-8 rounded bg-gray-100 animate-pulse"
              />
            ))}

          {/* Palette list */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
            {palettes.map((palette) => (
              <div key={palette.id} className="group/palette">
                {/* Color swatches */}
                <div className="flex h-7 rounded overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors">
                  {palette.colors
                    .sort((a, b) => a.position - b.position)
                    .map((color, idx) => (
                      <button
                        key={color.id || idx}
                        type="button"
                        title={`${color.hexValue}${color.name ? ` (${color.name})` : ''} — click to apply`}
                        onClick={() => handleSwatchClick(color.hexValue)}
                        className="flex-1 h-full cursor-pointer hover:opacity-80 active:scale-95 transition-all relative"
                        style={{ backgroundColor: color.hexValue }}
                      />
                    ))}
                </div>
                {/* Meta */}
                <div className="flex justify-between text-[9px] text-gray-400 mt-0.5 px-0.5">
                  <span>
                    {palette.colors.length} colors
                    {palette.likesCount > 0 && (
                      <> · ❤ {palette.likesCount}</>
                    )}
                  </span>
                  <span>{new Date(palette.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer link */}
          {palettes.length > 0 && (
            <a
              href="https://kulrs.com/browse"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              Browse more on Kulrs.com
              <i className="fa-solid fa-arrow-up-right-from-square text-[8px]" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default KulrsPalettePanel;
