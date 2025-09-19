import { renderHook, act } from '@testing-library/react';
import { useRecentColors } from './useRecentColors';

// Simple localStorage shim for test isolation
beforeEach(() => {
  localStorage.clear();
});

describe('useRecentColors', () => {
  it('commits only once at session end', () => {
    const { result } = renderHook(() => useRecentColors());
    act(() => { result.current.beginSession('#111111'); });
    act(() => { result.current.previewColor('#222222'); });
    act(() => { result.current.previewColor('#333333'); });
    act(() => { result.current.commitColor(); });
    expect(result.current.recentColors[0]).toBe('#333333');
    // no intermediate entries
    expect(result.current.recentColors.filter(c => c === '#222222')).toHaveLength(0);
  });

  it('cancels session without commit', () => {
    const { result } = renderHook(() => useRecentColors());
    act(() => { result.current.beginSession('#aaaaaa'); });
    act(() => { result.current.previewColor('#bbbbbb'); });
    act(() => { result.current.cancelSession(); });
    // Should contain initial defaults only (plus possibly #ffffff/#000000 baseline)
    expect(result.current.recentColors.includes('#bbbbbb')).toBe(false);
  });

  it('moves duplicate to front', () => {
    const { result } = renderHook(() => useRecentColors());
    const first = result.current.recentColors[0];
    act(() => { result.current.beginSession(first); });
    act(() => { result.current.commitColor(); });
    expect(result.current.recentColors[0]).toBe(first);
  });

  it('allows committing outside a session (single-shot)', () => {
    const { result } = renderHook(() => useRecentColors());
    const lenBefore = result.current.recentColors.length;
    act(() => { result.current.commitColor('#123456'); });
    expect(result.current.recentColors[0]).toBe('#123456');
    expect(result.current.recentColors.length).toBe(lenBefore + 1);
  });
});
