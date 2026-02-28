/**
 * ThemeColorPicker — A dropdown for picking theme token colors.
 * 
 * Used alongside regular color pickers in attribute panels to let
 * users bind an element's color property to a semantic theme token.
 * When a theme token is selected, the element gets a themeBinding
 * so that theme changes automatically update the element.
 */

import { useState, useRef, useEffect } from 'react';
import type { DesignTheme, ColorTokenName } from '../theme/types';
import { COLOR_TOKEN_GROUPS, tokenShortName } from '../theme/types';

export interface ThemeColorPickerProps {
  /** The current theme */
  theme: DesignTheme | null;
  /** The currently bound token (if any) */
  boundToken?: ColorTokenName;
  /** Called when user selects a theme token */
  onSelectToken: (token: ColorTokenName) => void;
  /** Called when user wants to unbind from theme (use manual color) */
  onUnbind: () => void;
  /** Label to display */
  label?: string;
}

export function ThemeColorPicker({
  theme,
  boundToken,
  onSelectToken,
  onUnbind,
  label = 'Theme',
}: ThemeColorPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!theme) return null;

  const boundHex = boundToken ? theme.colors[boundToken] : undefined;

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] transition-colors ${
          boundToken
            ? 'bg-teal-50 text-teal-700 border border-teal-200'
            : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
        }`}
        title={boundToken ? `Bound to ${tokenShortName(boundToken)}` : 'Bind to theme token'}
      >
        {boundHex && (
          <span
            className="w-3 h-3 rounded-sm border border-gray-300 flex-shrink-0"
            style={{ backgroundColor: boundHex }}
          />
        )}
        <i className="fa-solid fa-palette text-[8px]" />
        <span>{boundToken ? tokenShortName(boundToken) : label}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-1.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-600">Theme Tokens</span>
            {boundToken && (
              <button
                type="button"
                onClick={() => { onUnbind(); setOpen(false); }}
                className="text-[9px] text-red-500 hover:text-red-600 px-1"
              >
                Unbind
              </button>
            )}
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {COLOR_TOKEN_GROUPS.map((group) => (
              <div key={group.label} className="mb-1.5">
                <div className="text-[8px] text-gray-400 font-medium px-1 mb-0.5 uppercase tracking-wide">
                  {group.label}
                </div>
                {group.tokens.map((token) => {
                  const hex = theme.colors[token];
                  const isActive = boundToken === token;
                  return (
                    <button
                      key={token}
                      type="button"
                      onClick={() => { onSelectToken(token); setOpen(false); }}
                      className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[9px] transition-colors ${
                        isActive
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-sm border border-gray-200 flex-shrink-0"
                        style={{ backgroundColor: hex }}
                      />
                      <span className="truncate flex-1 text-left">{tokenShortName(token)}</span>
                      <span className="text-[8px] text-gray-400 font-mono">{hex}</span>
                      {isActive && <i className="fa-solid fa-check text-teal-500 text-[8px]" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeColorPicker;
