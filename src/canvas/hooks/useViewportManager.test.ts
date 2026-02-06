import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useViewportManager } from './useViewportManager';
import type { LayoutSpec } from '../../layout-schema';

function mkSpec(): LayoutSpec {
  return {
    root: {
      id: "root",
      type: "frame",
      size: { width: 800, height: 600 },
      children: [
        { id: "a", type: "box", position: { x: 10, y: 10 }, size: { width: 100, height: 50 } },
      ]
    }
  } as LayoutSpec;
}

describe('useViewportManager', () => {
  it('initializes without errors', () => {
    const setScale = vi.fn();
    const setPos = vi.fn();
    const getNodeBounds = vi.fn(() => ({ x: 0, y: 0, width: 100, height: 100 }));

    const { result } = renderHook(() =>
      useViewportManager(
        800,
        600,
        1,
        setScale,
        { x: 0, y: 0 },
        setPos,
        mkSpec(),
        getNodeBounds
      )
    );

    expect(result.current.easingFn).toBeDefined();
    expect(result.current.findNodeBoundsById).toBeDefined();
  });

  it('easingFn returns correct easing function', () => {
    const setScale = vi.fn();
    const setPos = vi.fn();
    const getNodeBounds = vi.fn(() => ({ x: 0, y: 0, width: 100, height: 100 }));

    const { result } = renderHook(() =>
      useViewportManager(
        800,
        600,
        1,
        setScale,
        { x: 0, y: 0 },
        setPos,
        mkSpec(),
        getNodeBounds
      )
    );

    const linear = result.current.easingFn('linear');
    expect(linear(0.5)).toBe(0.5);

    const easeIn = result.current.easingFn('ease-in');
    expect(easeIn(0)).toBe(0);
    expect(easeIn(1)).toBe(1);
  });

  it('findNodeBoundsById finds node bounds', () => {
    const setScale = vi.fn();
    const setPos = vi.fn();
    const getNodeBounds = vi.fn((node) => {
      if (node.id === 'a') return { x: 10, y: 10, width: 100, height: 50 };
      return null;
    });

    const { result } = renderHook(() =>
      useViewportManager(
        800,
        600,
        1,
        setScale,
        { x: 0, y: 0 },
        setPos,
        mkSpec(),
        getNodeBounds
      )
    );

    const bounds = result.current.findNodeBoundsById(mkSpec().root, 'a');
    expect(bounds).toEqual({ x: 10, y: 10, width: 100, height: 50 });
  });

  it('findNodeBoundsById returns null for non-existent node', () => {
    const setScale = vi.fn();
    const setPos = vi.fn();
    const getNodeBounds = vi.fn(() => null);

    const { result } = renderHook(() =>
      useViewportManager(
        800,
        600,
        1,
        setScale,
        { x: 0, y: 0 },
        setPos,
        mkSpec(),
        getNodeBounds
      )
    );

    const bounds = result.current.findNodeBoundsById(mkSpec().root, 'nonexistent');
    expect(bounds).toBeNull();
  });

  it('calls onViewportChange when viewport changes', () => {
    const setScale = vi.fn();
    const setPos = vi.fn();
    const getNodeBounds = vi.fn(() => ({ x: 0, y: 0, width: 100, height: 100 }));
    const onViewportChange = vi.fn();

    const { rerender } = renderHook(
      ({ scale, pos }) =>
        useViewportManager(
          800,
          600,
          scale,
          setScale,
          pos,
          setPos,
          mkSpec(),
          getNodeBounds,
          null,
          onViewportChange
        ),
      { initialProps: { scale: 1, pos: { x: 0, y: 0 } } }
    );

    expect(onViewportChange).toHaveBeenCalledWith({ scale: 1, x: 0, y: 0 });

    rerender({ scale: 1.5, pos: { x: 10, y: 20 } });
    expect(onViewportChange).toHaveBeenCalledWith({ scale: 1.5, x: 10, y: 20 });
  });
});
