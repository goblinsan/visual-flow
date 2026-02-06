import { renderHook, act } from '@testing-library/react';
import { useAttributeState } from './useAttributeState';

describe('useAttributeState', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useAttributeState());
    expect(result.current.attributeTab).toBe('element');
    expect(result.current.panelMode).toBe('attributes');
    expect(result.current.rawDashInput).toBe('');
    expect(result.current.lastFillById).toEqual({});
    expect(result.current.lastStrokeById).toEqual({});
  });

  it('switches attribute tab', () => {
    const { result } = renderHook(() => useAttributeState());
    act(() => { result.current.setAttributeTab('flow'); });
    expect(result.current.attributeTab).toBe('flow');
  });

  it('switches panel mode', () => {
    const { result } = renderHook(() => useAttributeState());
    act(() => { result.current.setPanelMode('agent'); });
    expect(result.current.panelMode).toBe('agent');
  });

  it('updates raw dash input', () => {
    const { result } = renderHook(() => useAttributeState());
    act(() => { result.current.setRawDashInput('5,10'); });
    expect(result.current.rawDashInput).toBe('5,10');
  });

  it('stores last fill by id', () => {
    const { result } = renderHook(() => useAttributeState());
    act(() => {
      result.current.setLastFillById({ 'rect-1': '#ff0000', 'rect-2': '#00ff00' });
    });
    expect(result.current.lastFillById).toEqual({
      'rect-1': '#ff0000',
      'rect-2': '#00ff00'
    });
  });

  it('stores last stroke by id', () => {
    const { result } = renderHook(() => useAttributeState());
    act(() => {
      result.current.setLastStrokeById({ 'rect-1': '#0000ff' });
    });
    expect(result.current.lastStrokeById).toEqual({ 'rect-1': '#0000ff' });
  });
});
