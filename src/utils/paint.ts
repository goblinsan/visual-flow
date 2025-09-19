/** Paint utilities consolidating normalization + stroke visual derivation.
 * Behavior parity with prior inline logic in computeRectVisual.
 */
import { parseDashPattern } from './dashPattern';

export interface StrokeVisual {
  stroke: string | undefined;
  strokeEnabled: boolean;
  strokeWidth: number;
  opacity: number | undefined;
  dash: number[] | undefined;
  bothDisabled: boolean; // original state (fill + stroke disabled)
}

/** Treat undefined, null, empty or whitespace-only string as disabled (undefined). */
export function normalizePaint(value: string | undefined | null): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : value; // preserve original (untrimmed) for potential exact color tokens
}

/** Derive stroke-related Konva props including fallback decoration when both paint channels disabled. */
export function deriveStrokeVisual(
  fill: string | undefined,
  stroke: string | undefined,
  strokeWidth?: number,
  strokeDash?: number[]
): StrokeVisual {
  const fillVal = normalizePaint(fill);
  const strokeVal = normalizePaint(stroke);
  const bothOff = fillVal === undefined && strokeVal === undefined;
  const effectiveStroke = bothOff ? '#94a3b8' : strokeVal;
  const strokeEnabled = bothOff ? true : strokeVal !== undefined;
  const effectiveStrokeWidth = bothOff ? 1 : strokeVal !== undefined ? (strokeWidth ?? 1) : 0;
  const opacity = bothOff ? 0.4 : undefined;
  const dash = bothOff ? [3,3] : (strokeVal !== undefined && strokeDash && strokeDash.length ? strokeDash : undefined);
  return {
    stroke: effectiveStroke,
    strokeEnabled,
    strokeWidth: effectiveStrokeWidth,
    opacity,
    dash,
    bothDisabled: bothOff,
  };
}

/** Convert dash array to UI input string. */
export function dashArrayToInput(dash?: number[]): string {
  if (!dash || dash.length === 0) return '';
  return dash.join(' ');
}

/** Parse a user-provided dash pattern string into a normalized dash array (undefined if empty or invalid). */
export function inputToDashArray(raw: string | undefined | null): number[] | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const res = parseDashPattern(trimmed);
  return res.pattern.length ? res.pattern : undefined;
}
