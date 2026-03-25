/**
 * Accessibility / contrast helpers
 *
 * Implements WCAG 2.1 contrast ratio calculation and level classification
 * (AA / AAA) for both normal and large text, plus a utility that suggests
 * a safer foreground colour when the original pair fails.
 *
 * References:
 *  https://www.w3.org/TR/WCAG21/#contrast-minimum (Success Criterion 1.4.3)
 *  https://www.w3.org/TR/WCAG21/#contrast-enhanced (Success Criterion 1.4.6)
 */

import { parseColor } from './color';

// ---------------------------------------------------------------------------
// Relative luminance  (WCAG 2.1 formula)
// ---------------------------------------------------------------------------

/**
 * Compute the relative luminance of a color string (hex, rgb, rgba, …).
 * Returns a value in [0, 1] where 0 = black and 1 = white.
 * Returns null for unparseable input.
 */
export function relativeLuminance(color: string): number | null {
  const p = parseColor(color);
  if (!p) return null;

  function linearize(channel: number): number {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }

  const r = linearize(p.r);
  const g = linearize(p.g);
  const b = linearize(p.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ---------------------------------------------------------------------------
// Contrast ratio
// ---------------------------------------------------------------------------

/**
 * Compute the WCAG 2.1 contrast ratio between two colors.
 * Returns a value in [1, 21].
 * Returns null if either color cannot be parsed.
 */
export function wcagContrastRatio(fg: string, bg: string): number | null {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  if (l1 === null || l2 === null) return null;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// WCAG level classification
// ---------------------------------------------------------------------------

export type WcagLevel = 'AAA' | 'AA' | 'fail';

/**
 * Classify a contrast ratio as AAA, AA, or fail.
 *
 * @param ratio      Contrast ratio (from `wcagContrastRatio`)
 * @param largeText  True for large text (≥18pt normal or ≥14pt bold).
 *                   Large text has lower thresholds: AA ≥ 3:1, AAA ≥ 4.5:1.
 */
export function wcagLevel(ratio: number, largeText = false): WcagLevel {
  const aaThreshold = largeText ? 3 : 4.5;
  const aaaThreshold = largeText ? 4.5 : 7;
  if (ratio >= aaaThreshold) return 'AAA';
  if (ratio >= aaThreshold) return 'AA';
  return 'fail';
}

/**
 * Quick pass/fail accessibility check.
 *
 * @param fg        Foreground color string
 * @param bg        Background color string
 * @param largeText Whether to apply the more lenient large-text thresholds
 */
export function isAccessible(fg: string, bg: string, largeText = false): boolean {
  const ratio = wcagContrastRatio(fg, bg);
  if (ratio === null) return false;
  return wcagLevel(ratio, largeText) !== 'fail';
}

// ---------------------------------------------------------------------------
// Accessibility result type
// ---------------------------------------------------------------------------

export interface ContrastResult {
  ratio: number;
  level: WcagLevel;
  /** True when the pair passes WCAG AA (normal text). */
  passesAA: boolean;
  /** True when the pair passes WCAG AAA (normal text). */
  passesAAA: boolean;
  /** True when the pair passes WCAG AA for large text (≥18pt normal / ≥14pt bold). */
  passesAALarge: boolean;
}

/**
 * Full accessibility check returning structured results.
 * Returns null if either color cannot be parsed.
 */
export function checkContrast(fg: string, bg: string): ContrastResult | null {
  const ratio = wcagContrastRatio(fg, bg);
  if (ratio === null) return null;
  return {
    ratio,
    level: wcagLevel(ratio),
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7,
    passesAALarge: ratio >= 3,
  };
}

// ---------------------------------------------------------------------------
// Safer alternative suggestion
// ---------------------------------------------------------------------------

/**
 * Suggest a safer foreground colour for the given background that achieves at
 * least WCAG AA (contrast ≥ 4.5:1).  The algorithm starts from the colour
 * (black or white) that produces the highest contrast with `bg`, then falls
 * back to adjusting `fgHint` toward that extreme if provided.
 *
 * @param bg      Background color string
 * @param fgHint  Optional starting foreground color; when provided the
 *                algorithm tries to adjust this colour toward a passing value
 *                before falling back to pure black or white
 * @returns       A hex string for the adjusted foreground, or null if the
 *                input background cannot be parsed
 */
export function suggestAccessibleForeground(
  bg: string,
  fgHint?: string,
): string | null {
  const bgParsed = parseColor(bg);
  if (!bgParsed) return null;

  const bgLum = relativeLuminance(bg)!;
  const TARGET_RATIO = 4.5;

  // Choose the better of pure black / pure white as the base candidate.
  const crBlack = (bgLum + 0.05) / 0.05;
  const crWhite = 1.05 / (bgLum + 0.05);
  const bestBase = crBlack >= crWhite ? '#000000' : '#ffffff';

  // If no hint provided, the best base is the answer.
  if (!fgHint) {
    // Quick path: black or white always satisfies the ratio except on exact
    // mid-tone backgrounds (extremely rare), so return the better one.
    return bestBase;
  }

  // With a hint, try adjusting it toward the best base extreme.
  const baseRatio = wcagContrastRatio(fgHint, bg);
  if (baseRatio !== null && baseRatio >= TARGET_RATIO) return fgHint;

  // Iterate: blend the hint 1 % closer to bestBase each step.
  let fg = fgHint;
  const baseParsed = parseColor(bestBase)!;
  for (let i = 1; i <= 100; i++) {
    const amount = i / 100;
    const fgParsed = parseColor(fg)!;
    const blended = `#${[
      Math.round(fgParsed.r + (baseParsed.r - fgParsed.r) * amount),
      Math.round(fgParsed.g + (baseParsed.g - fgParsed.g) * amount),
      Math.round(fgParsed.b + (baseParsed.b - fgParsed.b) * amount),
    ]
      .map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0'))
      .join('')}`;
    const ratio = wcagContrastRatio(blended, bg);
    if (ratio !== null && ratio >= TARGET_RATIO) return blended;
  }

  // Guaranteed fallback
  return bestBase;
}
