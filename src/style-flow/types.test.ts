/**
 * Tests for the Style Flow domain types
 * Phase 1 (#174)
 */

import { describe, it, expect } from 'vitest';
import type {
  StyleSeed,
  StyleRecommendation,
  StyleSelection,
  StyleExportPackage,
  JourneyState,
  JourneyStep,
} from './types';

describe('StyleSeed', () => {
  it('accepts a valid seed with required fields', () => {
    const seed: StyleSeed = {
      moods: ['minimal'],
      industry: 'technology',
    };
    expect(seed.moods).toHaveLength(1);
    expect(seed.industry).toBe('technology');
    expect(seed.baseColors).toBeUndefined();
    expect(seed.fontPreferences).toBeUndefined();
    expect(seed.notes).toBeUndefined();
  });

  it('accepts a seed with all optional fields', () => {
    const seed: StyleSeed = {
      moods: ['bold', 'playful'],
      industry: 'gaming',
      baseColors: ['#FF0000', '#00FF00'],
      fontPreferences: ['Inter', 'Playfair Display'],
      notes: 'High-energy colour scheme',
    };
    expect(seed.moods).toHaveLength(2);
    expect(seed.baseColors).toHaveLength(2);
    expect(seed.fontPreferences).toHaveLength(2);
    expect(seed.notes).toBe('High-energy colour scheme');
  });
});

describe('StyleRecommendation', () => {
  const recommendation: StyleRecommendation = {
    id: 'rec-1',
    name: 'Ocean Breeze',
    description: 'A calm, minimal palette.',
    confidence: 0.9,
    swatches: [
      { role: 'primary', hex: '#1A73E8' },
      { role: 'surface', hex: '#ffffff' },
    ],
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      baseSizePx: 16,
      lineHeight: 1.6,
    },
    tokens: [
      { name: 'color-primary', value: '#1A73E8', description: 'Primary colour' },
    ],
  };

  it('has a valid shape', () => {
    expect(recommendation.id).toBe('rec-1');
    expect(recommendation.swatches).toHaveLength(2);
    expect(recommendation.typography.baseSizePx).toBe(16);
    expect(recommendation.tokens[0].name).toBe('color-primary');
    expect(recommendation.confidence).toBeGreaterThan(0);
    expect(recommendation.confidence).toBeLessThanOrEqual(1);
  });
});

describe('StyleSelection', () => {
  it('starts with null recommendationId and empty overrides', () => {
    const selection: StyleSelection = {
      recommendationId: null,
      tokenOverrides: {},
      typographyPairingId: null,
      buttonStyleId: null,
      navigationStyleId: null,
    };
    expect(selection.recommendationId).toBeNull();
    expect(Object.keys(selection.tokenOverrides)).toHaveLength(0);
    expect(selection.typographyPairingId).toBeNull();
    expect(selection.buttonStyleId).toBeNull();
    expect(selection.navigationStyleId).toBeNull();
  });

  it('allows overriding specific tokens', () => {
    const selection: StyleSelection = {
      recommendationId: 'rec-1',
      tokenOverrides: { 'color-primary': '#FF0000' },
      typographyPairingId: null,
      buttonStyleId: null,
      navigationStyleId: null,
    };
    expect(selection.tokenOverrides['color-primary']).toBe('#FF0000');
  });

  it('stores Phase 3 style selections', () => {
    const selection: StyleSelection = {
      recommendationId: 'rec-1',
      tokenOverrides: {},
      typographyPairingId: 'serif-elegance',
      buttonStyleId: 'pill',
      navigationStyleId: 'sidebar',
    };
    expect(selection.typographyPairingId).toBe('serif-elegance');
    expect(selection.buttonStyleId).toBe('pill');
    expect(selection.navigationStyleId).toBe('sidebar');
  });
});

describe('StyleExportPackage', () => {
  it('has a valid shape with multiple output formats', () => {
    const pkg: StyleExportPackage = {
      tokens: [{ name: 'color-primary', value: '#1A73E8' }],
      swatches: [{ role: 'primary', hex: '#1A73E8' }],
      typography: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        baseSizePx: 16,
        lineHeight: 1.6,
      },
      outputs: {
        'css-variables': ':root { --color-primary: #1A73E8; }',
        json: '{ "color-primary": "#1A73E8" }',
      },
      generatedAt: new Date().toISOString(),
      sourceRecommendationId: 'rec-1',
    };
    expect(pkg.outputs['css-variables']).toContain('--color-primary');
    expect(pkg.outputs['json']).toContain('color-primary');
    expect(pkg.tokens).toHaveLength(1);
  });
});

describe('JourneyStep', () => {
  const step: JourneyStep = {
    id: 'seeds',
    order: 1,
    title: 'Your Style Seeds',
    description: 'Tell us about the mood.',
    optional: false,
  };

  it('has valid structure', () => {
    expect(step.id).toBe('seeds');
    expect(step.order).toBe(1);
    expect(step.optional).toBe(false);
  });
});

describe('JourneyState', () => {
  it('represents a valid initial state', () => {
    const state: JourneyState = {
      id: 'session-1',
      status: 'idle',
      currentStepId: 'seeds',
      completedSteps: [],
      seeds: null,
      recommendations: [],
      selection: {
        recommendationId: null,
        tokenOverrides: {},
        typographyPairingId: null,
        buttonStyleId: null,
        navigationStyleId: null,
      },
      exportPackage: null,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(state.status).toBe('idle');
    expect(state.completedSteps).toHaveLength(0);
    expect(state.seeds).toBeNull();
    expect(state.selection.typographyPairingId).toBeNull();
    expect(state.selection.buttonStyleId).toBeNull();
    expect(state.selection.navigationStyleId).toBeNull();
  });
});
