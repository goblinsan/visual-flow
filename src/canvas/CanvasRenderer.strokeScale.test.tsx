import { describe, it, expect } from 'vitest';
import { computeRectVisual } from '../renderer/rectVisual';

// This test validates the design intent that stroke width remains constant logically; the runtime
// constancy during interactive scale is achieved via strokeScaleEnabled={false} on the Konva Rect.
// We only assert that computeRectVisual does not itself modify strokeWidth when size changes.

describe('stroke width invariance across size changes', () => {
  it('keeps stroke width value independent of size', () => {
    const base = { id: 'r', type: 'rect' as const, position: { x:0,y:0 }, size: { width: 100, height: 80 }, stroke: '#334155', strokeWidth: 2 };
    const v1 = computeRectVisual(base as any);
    const bigger = { ...base, size: { width: 400, height: 320 } };
    const v2 = computeRectVisual(bigger as any);
    expect(v1.strokeWidth).toBe(2);
    expect(v2.strokeWidth).toBe(2);
  });
});
