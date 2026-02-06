import { renderHook, act } from '@testing-library/react';
import { useToolState } from './useToolState';

describe('useToolState', () => {
  it('initializes with select tool', () => {
    const { result } = renderHook(() => useToolState());
    expect(result.current.tool).toBe('select');
    expect(result.current.editingCurveId).toBeNull();
    expect(result.current.selectedCurvePointIndex).toBeNull();
  });

  it('allows custom initial tool', () => {
    const { result } = renderHook(() => useToolState('rect'));
    expect(result.current.tool).toBe('rect');
  });

  it('updates tool', () => {
    const { result } = renderHook(() => useToolState());
    act(() => { result.current.setTool('curve'); });
    expect(result.current.tool).toBe('curve');
  });

  it('manages curve editing state', () => {
    const { result } = renderHook(() => useToolState());
    act(() => {
      result.current.setEditingCurveId('curve-123');
      result.current.setSelectedCurvePointIndex(2);
    });
    expect(result.current.editingCurveId).toBe('curve-123');
    expect(result.current.selectedCurvePointIndex).toBe(2);
  });

  it('clears selected curve point', () => {
    const { result } = renderHook(() => useToolState());
    act(() => {
      result.current.setEditingCurveId('curve-456');
      result.current.setSelectedCurvePointIndex(3);
    });
    act(() => { result.current.clearSelectedCurvePoint(); });
    expect(result.current.selectedCurvePointIndex).toBeNull();
    expect(result.current.editingCurveId).toBe('curve-456');
  });
});
