/**
 * ContrastBadge
 *
 * Displays the WCAG contrast level (AAA / AA / Fail) for a foreground + background
 * colour pair and surfaces a safer alternative when the pair fails.
 */

import type { ContrastResult } from '../utils/accessibility';
import { checkContrast, suggestAccessibleForeground } from '../utils/accessibility';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContrastBadgeProps {
  /** Foreground (text / icon) colour — hex or rgb string */
  fg: string;
  /** Background colour — hex or rgb string */
  bg: string;
  /** When true, apply the more lenient large-text thresholds */
  largeText?: boolean;
  /** Called when the user clicks the suggested safer colour */
  onAcceptSuggestion?: (hex: string) => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Badge({ level }: { level: ContrastResult['level'] }) {
  const classes: Record<string, string> = {
    AAA: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    AA: 'bg-blue-100 text-blue-800 border-blue-300',
    fail: 'bg-red-100 text-red-700 border-red-300',
  };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold ${classes[level]}`}
    >
      {level === 'fail' ? (
        <>
          <i className="fa-solid fa-triangle-exclamation mr-0.5 text-[8px]" />
          Fail
        </>
      ) : (
        <>
          <i className="fa-solid fa-circle-check mr-0.5 text-[8px]" />
          {level}
        </>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ContrastBadge({
  fg,
  bg,
  largeText = false,
  onAcceptSuggestion,
}: ContrastBadgeProps) {
  const result = checkContrast(fg, bg);

  if (!result) return null;

  const { ratio, level, passesAA, passesAALarge } = result;
  const passes = largeText ? passesAALarge : passesAA;
  const suggestion = !passes ? suggestAccessibleForeground(bg, fg) : null;

  return (
    <div className="flex flex-col gap-1">
      {/* Ratio + level row */}
      <div className="flex items-center gap-1.5">
        {/* Colour preview */}
        <span
          className="inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-bold border border-gray-200 flex-shrink-0"
          style={{ color: fg, backgroundColor: bg }}
          aria-hidden="true"
        >
          Aa
        </span>

        <span className="text-[10px] text-gray-500 tabular-nums">
          {ratio.toFixed(2)}:1
        </span>
        <Badge level={level} />
      </div>

      {/* Warning + safer alternative */}
      {!passes && suggestion && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-1">
          <i className="fa-solid fa-wand-magic-sparkles text-[9px] flex-shrink-0" />
          <span>Safer alternative:</span>

          {/* Colour chip showing the suggestion */}
          <span
            className="inline-block w-4 h-4 rounded border border-gray-300 flex-shrink-0"
            style={{ backgroundColor: suggestion }}
            title={suggestion}
          />
          <span className="font-mono">{suggestion}</span>

          {onAcceptSuggestion && (
            <button
              type="button"
              onClick={() => onAcceptSuggestion(suggestion)}
              className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 hover:bg-amber-300 transition-colors flex-shrink-0"
            >
              Use
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ContrastBadge;
