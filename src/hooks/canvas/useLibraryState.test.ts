import { renderHook, act } from '@testing-library/react';
import { useLibraryState } from './useLibraryState';

describe('useLibraryState', () => {
  it('initializes with first icon and component', () => {
    const { result } = renderHook(() => useLibraryState());
    expect(result.current.selectedIconId).toBeTruthy();
    expect(result.current.selectedComponentId).toBeTruthy();
    expect(result.current.iconSearch).toBe('');
  });

  it('updates selected icon', () => {
    const { result } = renderHook(() => useLibraryState());
    act(() => { result.current.setSelectedIconId('heart'); });
    expect(result.current.selectedIconId).toBe('heart');
  });

  it('updates selected component', () => {
    const { result } = renderHook(() => useLibraryState());
    act(() => { result.current.setSelectedComponentId('card'); });
    expect(result.current.selectedComponentId).toBe('card');
  });

  it('updates icon search', () => {
    const { result } = renderHook(() => useLibraryState());
    act(() => { result.current.setIconSearch('arrow'); });
    expect(result.current.iconSearch).toBe('arrow');
  });
});
