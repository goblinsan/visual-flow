/**
 * ThemeTokenBinder — Shows/edits theme token bindings for a selected element.
 *
 * Displays current bindings (fill, stroke, color) → token name with the
 * resolved hex. Users can bind/unbind any property to a named color token
 * so that future theme changes propagate automatically.
 *
 * Also exposes font token selection (heading / body) for text nodes.
 */

import { useState } from 'react';
import type { DesignTheme, ColorTokenName, ThemeTypography } from '../theme/types';
import { COLOR_TOKEN_NAMES, tokenShortName } from '../theme/types';
import type { ThemeBindings } from '../theme/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BindableColorProp = 'fill' | 'stroke' | 'color';

interface ThemeTokenBinderProps {
  /** The active design theme */
  theme: DesignTheme;
  /** Current themeBindings on the node (may be undefined) */
  bindings: ThemeBindings | undefined;
  /** Node type — shows font selector only for text */
  nodeType: string;
  /** Current fontFamily of the node (for text nodes) */
  fontFamily?: string;
  /** Which color properties this node has (only shows controls for these) */
  colorProps: { prop: BindableColorProp; currentValue?: string }[];
  /** Called when the user changes a binding */
  onUpdateBindings: (updated: ThemeBindings) => void;
  /** Called when font binding changes (for text nodes) */
  onUpdateFont?: (fontFamily: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ThemeTokenBinder({
  theme,
  bindings = {},
  nodeType,
  fontFamily,
  colorProps,
  onUpdateBindings,
  onUpdateFont,
}: ThemeTokenBinderProps) {
  const [expandedProp, setExpandedProp] = useState<BindableColorProp | 'font' | null>(null);

  const propLabels: Record<BindableColorProp, { icon: string; label: string }> = {
    fill: { icon: 'fa-fill-drip', label: 'Fill' },
    stroke: { icon: 'fa-border-all', label: 'Stroke' },
    color: { icon: 'fa-font', label: 'Text Color' },
  };

  const isText = nodeType === 'text';
  const headingFont = theme.typography?.headingFont ?? 'Inter';
  const bodyFont = theme.typography?.bodyFont ?? 'Inter';

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <div className="flex items-center gap-1.5 mb-2">
        <i className="fa-solid fa-link text-teal-500 text-[10px]" />
        <span className="text-[11px] font-semibold text-gray-700">Theme Bindings</span>
      </div>

      {/* Color property bindings */}
      {colorProps.map(({ prop, currentValue }) => {
        const bound = bindings[prop];
        const resolved = bound ? theme.colors[bound] : undefined;

        return (
          <div key={prop} className="mb-2">
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors text-left"
              onClick={() => setExpandedProp(expandedProp === prop ? null : prop)}
            >
              <i className={`fa-solid ${propLabels[prop].icon} text-gray-400 text-[10px] w-3`} />
              <span className="text-[11px] text-gray-600 flex-1">{propLabels[prop].label}</span>
              {bound ? (
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-4 h-4 rounded border border-gray-300 inline-block"
                    style={{ background: resolved ?? currentValue }}
                  />
                  <span className="text-[10px] text-teal-600 font-medium">{tokenShortName(bound)}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  {currentValue && (
                    <span
                      className="w-4 h-4 rounded border border-gray-300 inline-block"
                      style={{ background: currentValue }}
                    />
                  )}
                  <span className="text-[10px] text-gray-400 italic">unbound</span>
                </span>
              )}
              <i className={`fa-solid fa-chevron-${expandedProp === prop ? 'up' : 'down'} text-gray-300 text-[8px]`} />
            </button>

            {expandedProp === prop && (
              <div className="ml-5 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-sm">
                {/* Unbind option */}
                <button
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-gray-50 transition-colors ${
                    !bound ? 'bg-gray-50' : ''
                  }`}
                  onClick={() => {
                    const next = { ...bindings };
                    delete next[prop];
                    onUpdateBindings(next);
                    setExpandedProp(null);
                  }}
                >
                  <span className="w-4 h-4 rounded border border-dashed border-gray-300 inline-block" />
                  <span className="text-[10px] text-gray-500 italic">None (manual)</span>
                </button>
                {/* Token options */}
                {COLOR_TOKEN_NAMES.map(token => {
                  const hex = theme.colors[token];
                  const isActive = bound === token;
                  return (
                    <button
                      key={token}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-gray-50 transition-colors ${
                        isActive ? 'bg-teal-50' : ''
                      }`}
                      onClick={() => {
                        onUpdateBindings({ ...bindings, [prop]: token });
                        setExpandedProp(null);
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded border border-gray-300 inline-block flex-shrink-0"
                        style={{ background: hex }}
                      />
                      <span className={`text-[10px] ${isActive ? 'text-teal-700 font-medium' : 'text-gray-600'}`}>
                        {tokenShortName(token)}
                      </span>
                      <span className="text-[9px] text-gray-400 ml-auto font-mono">{hex}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Font binding for text nodes */}
      {isText && onUpdateFont && (
        <div className="mb-2">
          <button
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors text-left"
            onClick={() => setExpandedProp(expandedProp === 'font' ? null : 'font')}
          >
            <i className="fa-solid fa-text-height text-gray-400 text-[10px] w-3" />
            <span className="text-[11px] text-gray-600 flex-1">Font</span>
            <span className="text-[10px] text-gray-500 truncate max-w-[100px]">{fontFamily ?? 'default'}</span>
            <i className={`fa-solid fa-chevron-${expandedProp === 'font' ? 'up' : 'down'} text-gray-300 text-[8px]`} />
          </button>

          {expandedProp === 'font' && (
            <div className="ml-5 mt-1 bg-white border border-gray-200 rounded-lg shadow-sm">
              <button
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-gray-50 transition-colors ${
                  fontFamily === headingFont ? 'bg-teal-50' : ''
                }`}
                onClick={() => { onUpdateFont(headingFont); setExpandedProp(null); }}
              >
                <i className="fa-solid fa-heading text-teal-500 text-[10px] w-3" />
                <span className="text-[10px] text-gray-600">Heading Font</span>
                <span className="text-[10px] text-gray-400 ml-auto" style={{ fontFamily: headingFont }}>{headingFont}</span>
              </button>
              <button
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-gray-50 transition-colors ${
                  fontFamily === bodyFont ? 'bg-teal-50' : ''
                }`}
                onClick={() => { onUpdateFont(bodyFont); setExpandedProp(null); }}
              >
                <i className="fa-solid fa-paragraph text-teal-500 text-[10px] w-3" />
                <span className="text-[10px] text-gray-600">Body Font</span>
                <span className="text-[10px] text-gray-400 ml-auto" style={{ fontFamily: bodyFont }}>{bodyFont}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
