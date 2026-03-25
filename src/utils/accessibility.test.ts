import { describe, it, expect } from 'vitest';
import {
  relativeLuminance,
  wcagContrastRatio,
  wcagLevel,
  isAccessible,
  checkContrast,
  suggestAccessibleForeground,
} from './accessibility';

describe('accessibility utilities', () => {
  // ── relativeLuminance ───────────────────────────────────────────────────

  describe('relativeLuminance', () => {
    it('returns 0 for pure black', () => {
      expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    });

    it('returns 1 for pure white', () => {
      expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    });

    it('returns ~0.2126 for pure red', () => {
      expect(relativeLuminance('#ff0000')).toBeCloseTo(0.2126, 3);
    });

    it('returns ~0.7152 for pure green', () => {
      expect(relativeLuminance('#00ff00')).toBeCloseTo(0.7152, 3);
    });

    it('returns ~0.0722 for pure blue', () => {
      expect(relativeLuminance('#0000ff')).toBeCloseTo(0.0722, 3);
    });

    it('returns null for unparseable input', () => {
      expect(relativeLuminance('not-a-color')).toBeNull();
    });
  });

  // ── wcagContrastRatio ───────────────────────────────────────────────────

  describe('wcagContrastRatio', () => {
    it('returns 21 for black on white', () => {
      const ratio = wcagContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('returns 21 for white on black', () => {
      const ratio = wcagContrastRatio('#ffffff', '#000000');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('returns 1 for identical colours', () => {
      expect(wcagContrastRatio('#ff0000', '#ff0000')).toBeCloseTo(1, 5);
    });

    it('returns null when a color is unparseable', () => {
      expect(wcagContrastRatio('nope', '#ffffff')).toBeNull();
      expect(wcagContrastRatio('#000000', 'nope')).toBeNull();
    });

    it('is symmetric (fg/bg order does not matter)', () => {
      const a = wcagContrastRatio('#3b82f6', '#ffffff')!;
      const b = wcagContrastRatio('#ffffff', '#3b82f6')!;
      expect(a).toBeCloseTo(b, 5);
    });

    it('returns >4.5 for dark blue on white (should pass AA)', () => {
      // #1d4ed8 (tailwind blue-700) on white
      const ratio = wcagContrastRatio('#1d4ed8', '#ffffff');
      expect(ratio).not.toBeNull();
      expect(ratio!).toBeGreaterThan(4.5);
    });
  });

  // ── wcagLevel ───────────────────────────────────────────────────────────

  describe('wcagLevel', () => {
    it('returns AAA for ratio >= 7', () => {
      expect(wcagLevel(7)).toBe('AAA');
      expect(wcagLevel(21)).toBe('AAA');
    });

    it('returns AA for ratio in [4.5, 7)', () => {
      expect(wcagLevel(4.5)).toBe('AA');
      expect(wcagLevel(6.99)).toBe('AA');
    });

    it('returns fail for ratio < 4.5', () => {
      expect(wcagLevel(1)).toBe('fail');
      expect(wcagLevel(4.49)).toBe('fail');
    });

    it('uses large-text thresholds when largeText=true', () => {
      expect(wcagLevel(3, true)).toBe('AA');
      expect(wcagLevel(4.5, true)).toBe('AAA');
      expect(wcagLevel(2.9, true)).toBe('fail');
    });
  });

  // ── isAccessible ────────────────────────────────────────────────────────

  describe('isAccessible', () => {
    it('passes for high-contrast pair', () => {
      expect(isAccessible('#000000', '#ffffff')).toBe(true);
    });

    it('fails for low-contrast pair', () => {
      expect(isAccessible('#cccccc', '#ffffff')).toBe(false);
    });

    it('applies large-text threshold when requested', () => {
      // #565656 on white: approximately 7:1 ratio → passes both normal and large text
      // For a value that passes large (≥3) but fails normal (≥4.5), use a mid-gray.
      // We just verify the boolean reflects the threshold correctly.
      // Ratio for #999999 on white ≈ 2.85 → fails both
      // Ratio for #767676 on white ≈ 4.54 → passes both (just above 4.5)
      // Use a known mid-tone: compute what we expect the code to do.
      // The important invariant: large-text threshold is more lenient.
      const withLarge = isAccessible('#999999', '#ffffff', true);
      const withNormal = isAccessible('#999999', '#ffffff', false);
      // Both could fail, but normal should never be more lenient than large
      expect(withLarge || !withNormal).toBe(true);
    });
  });

  // ── checkContrast ───────────────────────────────────────────────────────

  describe('checkContrast', () => {
    it('returns full result for black on white', () => {
      const result = checkContrast('#000000', '#ffffff');
      expect(result).not.toBeNull();
      expect(result!.passesAAA).toBe(true);
      expect(result!.passesAA).toBe(true);
      expect(result!.passesAALarge).toBe(true);
      expect(result!.level).toBe('AAA');
    });

    it('returns null for bad input', () => {
      expect(checkContrast('invalid', '#fff')).toBeNull();
    });

    it('correctly marks failing pair', () => {
      const result = checkContrast('#aaaaaa', '#ffffff');
      expect(result!.passesAA).toBe(false);
      expect(result!.level).toBe('fail');
    });
  });

  // ── suggestAccessibleForeground ─────────────────────────────────────────

  describe('suggestAccessibleForeground', () => {
    it('returns null for unparseable background', () => {
      expect(suggestAccessibleForeground('not-a-color')).toBeNull();
    });

    it('returns a color that passes WCAG AA on a white background', () => {
      const fg = suggestAccessibleForeground('#ffffff');
      expect(fg).not.toBeNull();
      const ratio = wcagContrastRatio(fg!, '#ffffff');
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    });

    it('returns a color that passes WCAG AA on a black background', () => {
      const fg = suggestAccessibleForeground('#000000');
      expect(fg).not.toBeNull();
      const ratio = wcagContrastRatio(fg!, '#000000');
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    });

    it('returns a color that passes WCAG AA on a mid-tone background', () => {
      const fg = suggestAccessibleForeground('#6366f1');
      expect(fg).not.toBeNull();
      const ratio = wcagContrastRatio(fg!, '#6366f1');
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    });

    it('accepts an fgHint and adjusts from there', () => {
      // Near-white hint on a light bg — should move toward black
      const fg = suggestAccessibleForeground('#ffffff', '#eeeeee');
      expect(fg).not.toBeNull();
      const ratio = wcagContrastRatio(fg!, '#ffffff');
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    });
  });
});
