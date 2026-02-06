import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSelectionManager } from './useSelectionManager';

describe('useSelectionManager', () => {
  it('normalizeSelection removes duplicates', () => {
    const mockStage = {
      findOne: vi.fn()
    } as any;
    const stageRef = { current: mockStage };
    const getTopContainerAncestor = vi.fn((stage, id) => id);

    const { result } = renderHook(() => 
      useSelectionManager(stageRef, 'root', getTopContainerAncestor)
    );

    const normalized = result.current.normalizeSelection(['a', 'b', 'a', 'c']);
    expect(normalized).toEqual(['a', 'b', 'c']);
  });

  it('normalizeSelection filters out root id', () => {
    const mockStage = {
      findOne: vi.fn()
    } as any;
    const stageRef = { current: mockStage };
    const getTopContainerAncestor = vi.fn((stage, id) => id);

    const { result } = renderHook(() => 
      useSelectionManager(stageRef, 'root', getTopContainerAncestor)
    );

    const normalized = result.current.normalizeSelection(['root', 'a', 'b']);
    expect(normalized).toEqual(['a', 'b']);
  });

  it('normalizeSelection promotes to top container ancestor', () => {
    const mockStage = {
      findOne: vi.fn()
    } as any;
    const stageRef = { current: mockStage };
    const getTopContainerAncestor = vi.fn((stage, id) => {
      if (id === 'child1' || id === 'child2') return 'parent';
      return id;
    });

    const { result } = renderHook(() => 
      useSelectionManager(stageRef, 'root', getTopContainerAncestor)
    );

    const normalized = result.current.normalizeSelection(['child1', 'child2', 'a']);
    expect(normalized).toEqual(['parent', 'a']);
  });

  it('normalizeSelection returns empty array if no stage', () => {
    const stageRef = { current: null };
    const getTopContainerAncestor = vi.fn((stage, id) => id);

    const { result } = renderHook(() => 
      useSelectionManager(stageRef, 'root', getTopContainerAncestor)
    );

    const normalized = result.current.normalizeSelection(['a', 'b']);
    expect(normalized).toEqual(['a', 'b']);
  });
});
