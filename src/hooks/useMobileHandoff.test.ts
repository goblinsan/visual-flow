/**
 * Tests for useMobileHandoff
 * Issue #211 – Preserve seamless transitions between mobile and desktop editing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMobileHandoff } from './useMobileHandoff';
import { saveMobileSnapshot, clearMobileSnapshot } from '../utils/persistence';
import type { MobileDesignSnapshot } from '../mobile/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SAMPLE_SNAPSHOT: MobileDesignSnapshot = {
  primaryColor: '#1A1A2E',
  accentColor: '#E94560',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  mood: 'minimal',
  industry: 'technology',
  tokens: { 'color-primary': '#1A1A2E', 'color-accent': '#E94560', 'font-heading': 'Inter', 'font-body': 'Inter', 'font-size-base': '16px', 'line-height-base': '1.6' },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useMobileHandoff', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('returns null when no snapshot is stored', () => {
    const { result } = renderHook(() => useMobileHandoff());
    expect(result.current.snapshot).toBeNull();
  });

  it('returns the stored snapshot when one exists', () => {
    saveMobileSnapshot(SAMPLE_SNAPSHOT);
    const { result } = renderHook(() => useMobileHandoff());
    expect(result.current.snapshot).toMatchObject({
      primaryColor: '#1A1A2E',
      mood: 'minimal',
    });
  });

  it('clears the snapshot from state and localStorage when dismiss is called', () => {
    saveMobileSnapshot(SAMPLE_SNAPSHOT);
    const { result } = renderHook(() => useMobileHandoff());
    expect(result.current.snapshot).not.toBeNull();

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.snapshot).toBeNull();
    expect(localStorage.getItem('vf_mobile_snapshot')).toBeNull();
  });

  it('dismiss is a no-op when no snapshot exists', () => {
    const { result } = renderHook(() => useMobileHandoff());
    expect(() => {
      act(() => { result.current.dismiss(); });
    }).not.toThrow();
    expect(result.current.snapshot).toBeNull();
  });

  it('clearMobileSnapshot removes the item from localStorage', () => {
    saveMobileSnapshot(SAMPLE_SNAPSHOT);
    expect(localStorage.getItem('vf_mobile_snapshot')).not.toBeNull();
    clearMobileSnapshot();
    expect(localStorage.getItem('vf_mobile_snapshot')).toBeNull();
  });
});
