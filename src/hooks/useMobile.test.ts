/**
 * Tests for the useMobile hook
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMobile } from './useMobile';

// ── Helpers ──────────────────────────────────────────────────────────────────

function setWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true });
}

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, writable: true, configurable: true });
}

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockReturnValue({ matches }),
    writable: true,
    configurable: true,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useMobile', () => {
  beforeEach(() => {
    // Reset UA and viewport to desktop defaults
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    setWindowWidth(1440);
    mockMatchMedia(false); // coarse pointer = false
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false on a wide desktop viewport with no touch', () => {
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(false);
  });

  it('returns true when viewport width is ≤ 768 px', () => {
    setWindowWidth(375);
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(true);
  });

  it('returns true when viewport width is exactly 768 px', () => {
    setWindowWidth(768);
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(true);
  });

  it('returns false when viewport width is 769 px', () => {
    setWindowWidth(769);
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(false);
  });

  it('returns true for an Android UA string', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 10; SM-G975F)');
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(true);
  });

  it('returns true for an iPhone UA string', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)');
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(true);
  });

  it('returns true when (pointer: coarse) matches', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(true);
  });

  it('re-evaluates when the window is resized', () => {
    setWindowWidth(1440);
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(false);

    act(() => {
      setWindowWidth(375);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(true);
  });

  it('removes the resize listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useMobile());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
