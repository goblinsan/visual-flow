import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTransformManager } from './useTransformManager';
import type { LayoutSpec } from '../../layout-schema';

function mkSpec(): LayoutSpec {
  return {
    root: {
      id: "root",
      type: "frame",
      size: { width: 800, height: 600 },
      children: [
        { id: "a", type: "rect", position: { x: 10, y: 10 }, size: { width: 100, height: 50 }, fill: '#fff', stroke: '#000', strokeWidth: 1 },
      ]
    }
  } as LayoutSpec;
}

describe('useTransformManager', () => {
  it('initializes with null transform session', () => {
    const trRef = { current: null };
    const setSpec = vi.fn();
    const findNode = vi.fn();

    const { result } = renderHook(() =>
      useTransformManager(trRef, mkSpec(), setSpec, [], findNode)
    );

    expect(result.current.transformSession).toBeNull();
  });

  it('onTransform creates transform session', () => {
    const mockNode = {
      id: () => 'a',
      x: () => 10,
      y: () => 10,
      getClientRect: () => ({ width: 100, height: 50 })
    };
    const mockStage = {};
    const mockTransformer = {
      getStage: () => mockStage,
      nodes: () => [mockNode]
    };
    const trRef = { current: mockTransformer as any };
    const setSpec = vi.fn();
    const findNode = vi.fn((root, id) => {
      if (id === 'a') return mkSpec().root.children[0];
      return null;
    });

    const { result } = renderHook(() =>
      useTransformManager(trRef, mkSpec(), setSpec, ['a'], findNode)
    );

    result.current.onTransform();

    expect(result.current.transformSession).not.toBeNull();
    expect(result.current.transformSession?.nodes).toBeDefined();
  });

  it('onTransform does nothing if session already exists', () => {
    const mockNode = {
      id: () => 'a',
      x: () => 10,
      y: () => 10,
      getClientRect: () => ({ width: 100, height: 50 })
    };
    const mockStage = {};
    const mockTransformer = {
      getStage: () => mockStage,
      nodes: () => [mockNode]
    };
    const trRef = { current: mockTransformer as any };
    const setSpec = vi.fn();
    const findNode = vi.fn((root, id) => {
      if (id === 'a') return mkSpec().root.children[0];
      return null;
    });

    const { result } = renderHook(() =>
      useTransformManager(trRef, mkSpec(), setSpec, ['a'], findNode)
    );

    result.current.onTransform();
    const firstSession = result.current.transformSession;
    
    result.current.onTransform();
    const secondSession = result.current.transformSession;

    expect(firstSession).toBe(secondSession);
  });

  it('onTransformEnd does nothing if no nodes', () => {
    const mockTransformer = {
      nodes: () => []
    };
    const trRef = { current: mockTransformer as any };
    const setSpec = vi.fn();
    const findNode = vi.fn();

    const { result } = renderHook(() =>
      useTransformManager(trRef, mkSpec(), setSpec, [], findNode)
    );

    result.current.onTransformEnd();

    expect(setSpec).not.toHaveBeenCalled();
  });

  it('onTransformEnd clears transform session', () => {
    const mockNode = {
      id: () => 'a',
      x: () => 10,
      y: () => 10,
      scaleX: () => 1,
      scaleY: () => 1,
      rotation: () => 0
    };
    const mockStage = {
      findOne: () => mockNode
    };
    const mockTransformer = {
      getStage: () => mockStage,
      nodes: () => [mockNode],
      forceUpdate: vi.fn(),
      getLayer: () => ({ batchDraw: vi.fn() })
    };
    const trRef = { current: mockTransformer as any };
    const setSpec = vi.fn();
    const findNode = vi.fn((root, id) => {
      if (id === 'a') return mkSpec().root.children[0];
      return null;
    });

    const { result } = renderHook(() =>
      useTransformManager(trRef, mkSpec(), setSpec, ['a'], findNode)
    );

    result.current.onTransform();
    expect(result.current.transformSession).not.toBeNull();

    vi.useFakeTimers();
    result.current.onTransformEnd();
    vi.runAllTimers();
    vi.useRealTimers();

    expect(result.current.transformSession).toBeNull();
  });
});
