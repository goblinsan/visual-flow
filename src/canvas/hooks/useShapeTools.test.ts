import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useShapeTools } from './useShapeTools';
import type { LayoutSpec } from '../../layout-schema';

function mkSpec(): LayoutSpec {
  return {
    root: {
      id: "root",
      type: "frame",
      size: { width: 800, height: 600 },
      children: []
    }
  } as LayoutSpec;
}

describe('useShapeTools', () => {
  it('finalizeRect creates a rectangle node', () => {
    const spec = mkSpec();
    let updatedSpec = spec;
    const setSpec = vi.fn((updater: any) => {
      updatedSpec = typeof updater === 'function' ? updater(updatedSpec) : updater;
    });
    const setSelection = vi.fn();
    const onToolChange = vi.fn();

    const { result } = renderHook(() => useShapeTools(setSpec, setSelection, onToolChange));

    const rectDraft = { start: { x: 10, y: 10 }, current: { x: 110, y: 70 } };
    result.current.finalizeRect(rectDraft, false, false);

    expect(setSpec).toHaveBeenCalled();
    expect(setSelection).toHaveBeenCalled();
    expect(onToolChange).toHaveBeenCalledWith('select');
    expect(updatedSpec.root.children.length).toBe(1);
    expect(updatedSpec.root.children[0].type).toBe('rect');
  });

  it('finalizeRect handles alt key (center-based)', () => {
    const spec = mkSpec();
    let updatedSpec = spec;
    const setSpec = vi.fn((updater: any) => {
      updatedSpec = typeof updater === 'function' ? updater(updatedSpec) : updater;
    });
    const setSelection = vi.fn();

    const { result } = renderHook(() => useShapeTools(setSpec, setSelection));

    const rectDraft = { start: { x: 50, y: 50 }, current: { x: 100, y: 80 } };
    result.current.finalizeRect(rectDraft, true, false);

    expect(updatedSpec.root.children.length).toBe(1);
    const rect = updatedSpec.root.children[0];
    expect(rect.type).toBe('rect');
  });

  it('finalizeRect handles shift key (constrain proportions)', () => {
    const spec = mkSpec();
    let updatedSpec = spec;
    const setSpec = vi.fn((updater: any) => {
      updatedSpec = typeof updater === 'function' ? updater(updatedSpec) : updater;
    });
    const setSelection = vi.fn();

    const { result } = renderHook(() => useShapeTools(setSpec, setSelection));

    const rectDraft = { start: { x: 10, y: 10 }, current: { x: 60, y: 40 } };
    result.current.finalizeRect(rectDraft, false, true);

    expect(updatedSpec.root.children.length).toBe(1);
    const rect = updatedSpec.root.children[0];
    expect(rect.type).toBe('rect');
  });

  it('finalizeEllipse creates an ellipse node', () => {
    const spec = mkSpec();
    let updatedSpec = spec;
    const setSpec = vi.fn((updater: any) => {
      updatedSpec = typeof updater === 'function' ? updater(updatedSpec) : updater;
    });
    const setSelection = vi.fn();
    const onToolChange = vi.fn();

    const { result } = renderHook(() => useShapeTools(setSpec, setSelection, onToolChange));

    const ellipseDraft = { start: { x: 10, y: 10 }, current: { x: 110, y: 110 } };
    result.current.finalizeEllipse(ellipseDraft, false, false);

    expect(setSpec).toHaveBeenCalled();
    expect(setSelection).toHaveBeenCalled();
    expect(onToolChange).toHaveBeenCalledWith('select');
    expect(updatedSpec.root.children.length).toBe(1);
    expect(updatedSpec.root.children[0].type).toBe('ellipse');
  });

  it('finalizeLine creates a line node', () => {
    const spec = mkSpec();
    let updatedSpec = spec;
    const setSpec = vi.fn((updater: any) => {
      updatedSpec = typeof updater === 'function' ? updater(updatedSpec) : updater;
    });
    const setSelection = vi.fn();
    const onToolChange = vi.fn();

    const { result } = renderHook(() => useShapeTools(setSpec, setSelection, onToolChange));

    const lineDraft = { start: { x: 10, y: 10 }, current: { x: 110, y: 60 } };
    result.current.finalizeLine(lineDraft);

    expect(setSpec).toHaveBeenCalled();
    expect(setSelection).toHaveBeenCalled();
    expect(onToolChange).toHaveBeenCalledWith('select');
    expect(updatedSpec.root.children.length).toBe(1);
    expect(updatedSpec.root.children[0].type).toBe('line');
  });

  it('finalizeCurve creates a curve node', () => {
    const spec = mkSpec();
    let updatedSpec = spec;
    const setSpec = vi.fn((updater: any) => {
      updatedSpec = typeof updater === 'function' ? updater(updatedSpec) : updater;
    });
    const setSelection = vi.fn();
    const onToolChange = vi.fn();

    const { result } = renderHook(() => useShapeTools(setSpec, setSelection, onToolChange));

    const curveDraft = {
      points: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
      current: { x: 110, y: 60 }
    };
    result.current.finalizeCurve(curveDraft);

    expect(setSpec).toHaveBeenCalled();
    expect(setSelection).toHaveBeenCalled();
    expect(onToolChange).toHaveBeenCalledWith('select');
    expect(updatedSpec.root.children.length).toBe(1);
    expect(updatedSpec.root.children[0].type).toBe('curve');
  });

  it('finalizeRect does nothing if no draft', () => {
    const setSpec = vi.fn();
    const setSelection = vi.fn();

    const { result } = renderHook(() => useShapeTools(setSpec, setSelection));

    result.current.finalizeRect(null, false, false);

    expect(setSpec).not.toHaveBeenCalled();
    expect(setSelection).not.toHaveBeenCalled();
  });

  it('finalizeCurve does nothing if no points', () => {
    const spec = mkSpec();
    const setSpec = vi.fn();
    const setSelection = vi.fn();

    const { result } = renderHook(() => useShapeTools(setSpec, setSelection));

    const curveDraft = { points: [], current: { x: 100, y: 100 } };
    result.current.finalizeCurve(curveDraft);

    expect(setSpec).not.toHaveBeenCalled();
    expect(setSelection).not.toHaveBeenCalled();
  });
});

  it('finalizePolygon creates a polygon node', () => {
    const spec = mkSpec();
    let updatedSpec = spec;
    const setSpec = vi.fn((updater: any) => {
      updatedSpec = typeof updater === 'function' ? updater(updatedSpec) : updater;
    });
    const setSelection = vi.fn();
    const onToolChange = vi.fn();

    const { result } = renderHook(() => useShapeTools(setSpec, setSelection, onToolChange));

    const polygonDraft = {
      start: { x: 10, y: 10 },
      current: { x: 90, y: 90 }
    };
    result.current.finalizePolygon(polygonDraft, false, false, 5);

    expect(setSpec).toHaveBeenCalled();
    expect(setSelection).toHaveBeenCalled();
    expect(onToolChange).toHaveBeenCalledWith('select');
    expect(updatedSpec.root.children.length).toBe(1);
    expect(updatedSpec.root.children[0].type).toBe('polygon');
  });

  it('finalizePolygon handles click (no drag) with default size', () => {
    const spec = mkSpec();
    let updatedSpec = spec;
    const setSpec = vi.fn((updater: any) => {
      updatedSpec = typeof updater === 'function' ? updater(updatedSpec) : updater;
    });
    const setSelection = vi.fn();

    const { result } = renderHook(() => useShapeTools(setSpec, setSelection));

    const polygonDraft = {
      start: { x: 10, y: 10 },
      current: { x: 11, y: 11 } // Almost no drag — click
    };
    result.current.finalizePolygon(polygonDraft, false, false, 5);

    // Should still create polygon with default size
    expect(setSpec).toHaveBeenCalled();
    expect(updatedSpec.root.children.length).toBe(1);
    expect(updatedSpec.root.children[0].type).toBe('polygon');
  });
