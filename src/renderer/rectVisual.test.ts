import { describe, it, expect } from 'vitest';
import type { RectNode } from '../layout-schema';
import { computeRectVisual } from './rectVisual';

function makeRect(overrides: Partial<RectNode> = {}): RectNode {
  return {
    id: 'r1',
    type: 'rect',
    position: { x: 0, y: 0 },
    size: { width: 100, height: 50 },
    fill: '#ff0000',
    stroke: '#000000',
    strokeWidth: 2,
    radius: 4,
    ...overrides,
  } as RectNode; // test convenience
}

describe('computeRectVisual', () => {
  it('passes through basic props when both fill and stroke present', () => {
    const r = makeRect();
    const v = computeRectVisual(r);
    expect(v.fill).toBe('#ff0000');
    expect(v.fillEnabled).toBe(true);
    expect(v.stroke).toBe('#000000');
    expect(v.strokeEnabled).toBe(true);
    expect(v.strokeWidth).toBe(2);
    expect(v.opacity).toBeUndefined();
    expect(v.dash).toBeUndefined();
    expect(v.bothDisabled).toBe(false);
  });

  it('treats empty string fill as disabled', () => {
    const v = computeRectVisual(makeRect({ fill: '' }));
    expect(v.fill).toBeUndefined();
    expect(v.fillEnabled).toBe(false);
  });

  it('applies fallback decoration when both fill and stroke disabled', () => {
    const v = computeRectVisual(makeRect({ fill: undefined, stroke: undefined }));
    expect(v.bothDisabled).toBe(true);
    expect(v.stroke).toBe('#94a3b8');
    expect(v.strokeEnabled).toBe(true);
    expect(v.strokeWidth).toBe(1); // fallback width
    expect(v.opacity).toBe(0.4);
    expect(v.dash).toEqual([3,3]);
  });

  it('includes strokeDash only when stroke defined and non-empty', () => {
    const v1 = computeRectVisual(makeRect({ strokeDash: [5, 2] }));
    expect(v1.dash).toEqual([5,2]);
    const v2 = computeRectVisual(makeRect({ stroke: undefined, strokeDash: [5,2] }));
    expect(v2.dash).toBeUndefined();
    const v3 = computeRectVisual(makeRect({ strokeDash: [] }));
    expect(v3.dash).toBeUndefined();
  });

  it('provides defaults for size and radius', () => {
    const v = computeRectVisual(makeRect({ size: undefined, radius: undefined }));
    expect(v.width).toBe(80); // default from renderer logic
    expect(v.height).toBe(60);
    expect(v.cornerRadius).toBe(0);
  });
});
