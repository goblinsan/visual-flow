/**
 * Tests for the Phase 4 concept generator (#188)
 */

import { describe, it, expect } from 'vitest';
import { generateConcepts } from './conceptGenerator';

describe('generateConcepts', () => {
  // ── Basic output shape ──────────────────────────────────────────────────────

  it('returns the requested number of concepts (default 3)', () => {
    const concepts = generateConcepts(['minimal'], 'technology');
    expect(concepts).toHaveLength(3);
  });

  it('respects the count option', () => {
    expect(generateConcepts(['bold'], 'gaming', { count: 2 })).toHaveLength(2);
    expect(generateConcepts(['playful'], 'food', { count: 5 })).toHaveLength(5);
  });

  it('each concept has required fields', () => {
    const concepts = generateConcepts(['elegant'], 'fashion');
    for (const c of concepts) {
      expect(typeof c.id).toBe('string');
      expect(typeof c.name).toBe('string');
      expect(typeof c.tagline).toBe('string');
      expect(c.recommendation).toBeTruthy();
      expect(typeof c.typographyPairingId).toBe('string');
      expect(typeof c.buttonStyleId).toBe('string');
      expect(typeof c.navigationStyleId).toBe('string');
    }
  });

  // ── Determinism ─────────────────────────────────────────────────────────────

  it('produces the same output given the same inputs (determinism)', () => {
    const first = generateConcepts(['technical'], 'finance');
    const second = generateConcepts(['technical'], 'finance');
    expect(first).toEqual(second);
  });

  it('produces different output for different moods', () => {
    const minimal = generateConcepts(['minimal'], 'technology');
    const bold = generateConcepts(['bold'], 'technology');
    // At least concept IDs or names must differ
    expect(minimal[0].id).not.toBe(bold[0].id);
  });

  // ── Distinctness ────────────────────────────────────────────────────────────

  it('all concept IDs are unique within a single generation', () => {
    const concepts = generateConcepts(['playful'], 'education', { count: 5 });
    const ids = concepts.map((c) => c.id);
    expect(new Set(ids).size).toBe(5);
  });

  it('at least one dimension varies between concepts', () => {
    const concepts = generateConcepts(['minimal'], 'technology', { count: 3 });
    const typographyIds = concepts.map((c) => c.typographyPairingId);
    const buttonIds = concepts.map((c) => c.buttonStyleId);
    const navIds = concepts.map((c) => c.navigationStyleId);
    const paletteIds = concepts.map((c) => c.recommendation.id);
    // Not all four dimensions should be identical across all concepts
    const allSame =
      new Set(typographyIds).size === 1 &&
      new Set(buttonIds).size === 1 &&
      new Set(navIds).size === 1 &&
      new Set(paletteIds).size === 1;
    expect(allSame).toBe(false);
  });

  // ── Locked aspects ──────────────────────────────────────────────────────────

  it('respects a locked typography aspect', () => {
    const lockedTypoId = 'serif-elegance';
    const concepts = generateConcepts(['minimal'], 'fashion', {
      lockedAspects: ['typography'],
      lockedValues: { typography: lockedTypoId },
    });
    for (const c of concepts) {
      expect(c.typographyPairingId).toBe(lockedTypoId);
    }
  });

  it('respects a locked button aspect', () => {
    const lockedBtnId = 'pill';
    const concepts = generateConcepts(['bold'], 'gaming', {
      lockedAspects: ['buttons'],
      lockedValues: { buttons: lockedBtnId },
    });
    for (const c of concepts) {
      expect(c.buttonStyleId).toBe(lockedBtnId);
    }
  });

  it('respects a locked navigation aspect', () => {
    const lockedNavId = 'sidebar';
    const concepts = generateConcepts(['technical'], 'technology', {
      lockedAspects: ['navigation'],
      lockedValues: { navigation: lockedNavId },
    });
    for (const c of concepts) {
      expect(c.navigationStyleId).toBe(lockedNavId);
    }
  });

  it('when no locked values provided, still generates without errors', () => {
    expect(() =>
      generateConcepts(['minimal'], 'health', { lockedAspects: ['typography'] }),
    ).not.toThrow();
  });

  // ── Recommendation content ──────────────────────────────────────────────────

  it('each recommendation has the expected roles in swatches', () => {
    const concepts = generateConcepts(['playful'], 'education');
    for (const c of concepts) {
      const roles = c.recommendation.swatches.map((s) => s.role);
      expect(roles).toContain('primary');
      expect(roles).toContain('surface');
      expect(roles).toContain('text');
    }
  });

  it('confidence values are between 0 and 1', () => {
    const concepts = generateConcepts(['elegant'], 'fashion', { count: 5 });
    for (const c of concepts) {
      expect(c.recommendation.confidence).toBeGreaterThanOrEqual(0);
      expect(c.recommendation.confidence).toBeLessThanOrEqual(1);
    }
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  it('falls back to "minimal" when moods array is empty', () => {
    const concepts = generateConcepts([], 'other');
    expect(concepts).toHaveLength(3);
    concepts.forEach((c) => expect(c.id).toBeTruthy());
  });
});
