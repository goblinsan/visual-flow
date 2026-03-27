/**
 * Tests for flowValidation (Issue #219)
 * Guards against unsupported or desktop-only configuration paths.
 */

import { describe, it, expect } from 'vitest';
import { validateFlowSelections, validateSnapshotForDesktop } from './flowValidation';
import type { MobileDesignSnapshot } from './types';

// ── validateFlowSelections ────────────────────────────────────────────────────

describe('validateFlowSelections (#219)', () => {
  it('returns no issues for a valid selection', () => {
    const issues = validateFlowSelections({
      moods:      ['minimal'],
      industry:   'technology',
      components: { buttonStyle: 'filled', cardStyle: 'flat', navStyle: 'bottom-bar' },
    });
    expect(issues).toHaveLength(0);
  });

  it('returns an error when no mood is selected', () => {
    const issues = validateFlowSelections({ moods: [], industry: 'technology' });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe('NO_MOOD_SELECTED');
    expect(issues[0]?.severity).toBe('error');
  });

  it('returns an error when side-nav is chosen (desktop-only pattern)', () => {
    const issues = validateFlowSelections({
      moods:      ['minimal'],
      industry:   'technology',
      components: { navStyle: 'side-nav' },
    });
    const navError = issues.find((i) => i.code === 'DESKTOP_ONLY_NAV');
    expect(navError).toBeDefined();
    expect(navError?.severity).toBe('error');
  });

  it('returns a warning for conflicting technical + playful moods', () => {
    const issues = validateFlowSelections({
      moods:    ['technical', 'playful'],
      industry: 'technology',
    });
    const warning = issues.find((i) => i.code === 'CONFLICTING_MOODS');
    expect(warning).toBeDefined();
    expect(warning?.severity).toBe('warning');
  });

  it('can return multiple issues at once', () => {
    const issues = validateFlowSelections({
      moods:      ['technical', 'playful'],
      industry:   'technology',
      components: { navStyle: 'side-nav' },
    });
    // CONFLICTING_MOODS warning + DESKTOP_ONLY_NAV error
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });

  it('allows bottom-bar and top-bar nav without errors', () => {
    for (const navStyle of ['bottom-bar', 'top-bar'] as const) {
      const issues = validateFlowSelections({
        moods:      ['bold'],
        industry:   'fashion',
        components: { navStyle },
      });
      expect(issues.find((i) => i.code === 'DESKTOP_ONLY_NAV')).toBeUndefined();
    }
  });
});

// ── validateSnapshotForDesktop ────────────────────────────────────────────────

const VALID_SNAPSHOT: MobileDesignSnapshot = {
  primaryColor: '#1A1A2E',
  accentColor:  '#E94560',
  headingFont:  'Inter',
  bodyFont:     'Inter',
  mood:         'minimal',
  industry:     'technology',
  tokens:       { 'color-primary': '#1A1A2E' },
};

describe('validateSnapshotForDesktop (#219)', () => {
  it('returns no issues for a valid snapshot', () => {
    expect(validateSnapshotForDesktop(VALID_SNAPSHOT)).toHaveLength(0);
  });

  it('returns an error when primaryColor is missing', () => {
    const snap = { ...VALID_SNAPSHOT, primaryColor: '' };
    const issues = validateSnapshotForDesktop(snap);
    expect(issues.some((i) => i.code === 'MISSING_COLORS')).toBe(true);
  });

  it('returns an error when accentColor is missing', () => {
    const snap = { ...VALID_SNAPSHOT, accentColor: '' };
    const issues = validateSnapshotForDesktop(snap);
    expect(issues.some((i) => i.code === 'MISSING_COLORS')).toBe(true);
  });

  it('returns an error when headingFont is missing', () => {
    const snap = { ...VALID_SNAPSHOT, headingFont: '' };
    const issues = validateSnapshotForDesktop(snap);
    expect(issues.some((i) => i.code === 'MISSING_FONTS')).toBe(true);
  });

  it('returns an error when bodyFont is missing', () => {
    const snap = { ...VALID_SNAPSHOT, bodyFont: '' };
    const issues = validateSnapshotForDesktop(snap);
    expect(issues.some((i) => i.code === 'MISSING_FONTS')).toBe(true);
  });

  it('returns a warning (not an error) when side-nav is used', () => {
    const snap: MobileDesignSnapshot = {
      ...VALID_SNAPSHOT,
      components: { buttonStyle: 'filled', cardStyle: 'flat', navStyle: 'side-nav' },
    };
    const issues = validateSnapshotForDesktop(snap);
    const navIssue = issues.find((i) => i.code === 'DESKTOP_ONLY_NAV');
    expect(navIssue).toBeDefined();
    expect(navIssue?.severity).toBe('warning');
  });

  it('returns no nav-related issue when navStyle is bottom-bar', () => {
    const snap: MobileDesignSnapshot = {
      ...VALID_SNAPSHOT,
      components: { buttonStyle: 'filled', cardStyle: 'flat', navStyle: 'bottom-bar' },
    };
    expect(validateSnapshotForDesktop(snap).find((i) => i.code === 'DESKTOP_ONLY_NAV')).toBeUndefined();
  });
});
