/**
 * Tests for monetization feature flags
 */

import { describe, it, expect } from 'vitest';
import {
  PLAN_LIMITS,
  canExportFormat,
  canUseRobloxExport,
  canUseAiAgents,
  getMaxExportsPerDay,
  getMaxCanvases,
} from './featureFlags';

describe('PLAN_LIMITS', () => {
  it('free plan disallows roblox-lua export', () => {
    expect(PLAN_LIMITS.free.allowedExportFormats).not.toContain('roblox-lua');
  });

  it('pro plan allows all export formats including roblox-lua', () => {
    expect(PLAN_LIMITS.pro.allowedExportFormats).toContain('roblox-lua');
    expect(PLAN_LIMITS.pro.allowedExportFormats).toContain('json');
    expect(PLAN_LIMITS.pro.allowedExportFormats).toContain('react');
  });

  it('free plan has a daily export cap', () => {
    expect(PLAN_LIMITS.free.maxExportsPerDay).toBeGreaterThan(0);
  });

  it('pro plan has no daily export cap', () => {
    expect(PLAN_LIMITS.pro.maxExportsPerDay).toBeNull();
  });

  it('free plan has a canvas count limit', () => {
    expect(PLAN_LIMITS.free.maxCanvases).toBeGreaterThan(0);
  });

  it('pro plan has no canvas count limit', () => {
    expect(PLAN_LIMITS.pro.maxCanvases).toBeNull();
  });
});

describe('canExportFormat', () => {
  it('free users can export JSON', () => {
    expect(canExportFormat('free', 'json')).toBe(true);
  });

  it('free users cannot export roblox-lua', () => {
    expect(canExportFormat('free', 'roblox-lua')).toBe(false);
  });

  it('pro users can export roblox-lua', () => {
    expect(canExportFormat('pro', 'roblox-lua')).toBe(true);
  });

  it('pro users can export all formats', () => {
    for (const fmt of ['json', 'react', 'tokens-json', 'tokens-css', 'roblox-lua']) {
      expect(canExportFormat('pro', fmt)).toBe(true);
    }
  });
});

describe('canUseRobloxExport', () => {
  it('returns false for free plan', () => {
    expect(canUseRobloxExport('free')).toBe(false);
  });

  it('returns true for pro plan', () => {
    expect(canUseRobloxExport('pro')).toBe(true);
  });
});

describe('canUseAiAgents', () => {
  it('returns false for free plan', () => {
    expect(canUseAiAgents('free')).toBe(false);
  });

  it('returns true for pro plan', () => {
    expect(canUseAiAgents('pro')).toBe(true);
  });
});

describe('getMaxExportsPerDay', () => {
  it('returns a number for free plan', () => {
    expect(typeof getMaxExportsPerDay('free')).toBe('number');
  });

  it('returns null for pro plan', () => {
    expect(getMaxExportsPerDay('pro')).toBeNull();
  });
});

describe('getMaxCanvases', () => {
  it('returns a number for free plan', () => {
    expect(typeof getMaxCanvases('free')).toBe('number');
  });

  it('returns null for pro plan', () => {
    expect(getMaxCanvases('pro')).toBeNull();
  });
});
