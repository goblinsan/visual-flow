/**
 * Kulrs Palette Panel
 *
 * Integrates with the Kulrs.com color palette API to let
 * Vizail users browse community palettes, generate random ones,
 * and apply colors directly to their designs.
 */

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KulrsPaletteColor {
  id: string;
  hexValue: string;
  name: string | null;
  sortOrder: number;
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
}

type SortMode = 'recent' | 'popular';

export function KulrsPalettePanel({
  onPickColor,
  onApplyFill,
  onApplyStroke,
}: KulrsPalettePanelProps) {
  const [palettes, setPalettes] = useState<KulrsPalette[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>('recent');
  const [expanded, setExpanded] = useState(false);
  const [applyMode, setApplyMode] = useState<'recent' | 'fill' | 'stroke'>('recent');

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
                    .sort((a, b) => a.sortOrder - b.sortOrder)
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
