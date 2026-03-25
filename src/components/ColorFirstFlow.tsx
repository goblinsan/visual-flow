/**
 * ColorFirstFlow
 *
 * Guides the user from a single starting color to a full Kulrs palette.
 *
 * Flow:
 *  1. User picks (or is given) a seed hex color.
 *  2. Component calls `fetchKulrsPalettesByColor` to find palettes that
 *     contain a visually similar color.
 *  3. Results are shown as swatchable rows.
 *  4. The user can pick a swatch color or apply a whole palette as a theme.
 */

import { useState, useCallback, useEffect } from 'react';
import type { KulrsPalette } from '../api/kulrsClient';
import { fetchKulrsPalettesByColor } from '../api/kulrsClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColorFirstFlowProps {
  /** Starting seed color (hex, e.g. "#6366f1"). */
  seedColor: string;
  /** Called when the user clicks a single swatch color. */
  onPickColor: (hex: string) => void;
  /** Called when the user applies a whole palette as a design theme. */
  onApplyPalette?: (colors: string[], paletteId?: string) => void;
  /** Matching tolerance (Euclidean RGB distance 0–441, default 60). */
  tolerance?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Swatch({
  hex,
  name,
  onClick,
}: {
  hex: string;
  name: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={name ? `${hex} (${name})` : hex}
      onClick={onClick}
      className="flex-1 h-full cursor-pointer hover:opacity-80 active:scale-95 transition-all"
      style={{ backgroundColor: hex }}
      aria-label={name ?? hex}
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ColorFirstFlow({
  seedColor,
  onPickColor,
  onApplyPalette,
  tolerance = 60,
}: ColorFirstFlowProps) {
  const [palettes, setPalettes] = useState<KulrsPalette[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async () => {
    if (!seedColor) return;
    setLoading(true);
    setError(null);
    setSearched(false);
    try {
      const results = await fetchKulrsPalettesByColor(seedColor, tolerance);
      setPalettes(results);
    } catch {
      setError('Could not load palettes from Kulrs');
      setPalettes([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [seedColor, tolerance]);

  // Auto-search whenever the seed color changes
  useEffect(() => {
    void search();
  }, [search]);

  return (
    <div className="space-y-2">
      {/* Seed color row */}
      <div className="flex items-center gap-2">
        <span
          className="w-6 h-6 rounded border border-gray-300 flex-shrink-0"
          style={{ backgroundColor: seedColor }}
          aria-hidden="true"
        />
        <span className="text-[11px] text-gray-600 font-mono">{seedColor}</span>
        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="ml-auto text-[10px] px-2 py-0.5 rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition-colors flex items-center gap-1"
          title="Search for matching palettes"
        >
          <i className={`fa-solid fa-magnifying-glass text-[8px] ${loading ? 'animate-pulse' : ''}`} />
          {loading ? 'Searching…' : 'Find palettes'}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="text-[10px] text-red-500 flex items-center gap-1">
          <i className="fa-solid fa-triangle-exclamation" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-1.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-7 rounded bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && searched && palettes.length === 0 && (
        <p className="text-[10px] text-gray-400 italic">
          No palettes found matching this color. Try adjusting the seed or increasing tolerance.
        </p>
      )}

      {!loading && palettes.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
          {palettes.map(palette => (
            <div key={palette.id} className="group/palette">
              {/* Name */}
              {palette.name && (
                <div className="text-[9px] text-gray-400 mb-0.5 truncate">{palette.name}</div>
              )}
              {/* Swatches */}
              <div className="flex h-7 rounded overflow-hidden border border-gray-200 hover:border-teal-300 transition-colors">
                {palette.colors
                  .sort((a, b) => a.position - b.position)
                  .map((color, idx) => (
                    <Swatch
                      key={color.id || idx}
                      hex={color.hexValue}
                      name={color.name}
                      onClick={() => onPickColor(color.hexValue)}
                    />
                  ))}
              </div>
              {/* Meta + apply */}
              <div className="flex justify-between items-center text-[9px] text-gray-400 mt-0.5 px-0.5">
                <span>
                  {palette.colors.length} colors
                  {palette.likesCount > 0 && <> · ❤ {palette.likesCount}</>}
                </span>
                {onApplyPalette && (
                  <button
                    type="button"
                    onClick={() =>
                      onApplyPalette(
                        palette.colors
                          .sort((a, b) => a.position - b.position)
                          .map(c => c.hexValue),
                        palette.id,
                      )
                    }
                    className="px-1.5 py-0.5 rounded text-[9px] bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition-colors opacity-0 group-hover/palette:opacity-100 flex items-center gap-0.5 font-medium"
                    title="Use this palette as your design theme"
                  >
                    <i className="fa-solid fa-palette text-[7px]" />
                    Use as Theme
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ColorFirstFlow;
