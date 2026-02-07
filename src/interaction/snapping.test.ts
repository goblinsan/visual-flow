import { describe, it, expect } from 'vitest';
import {
  snapToGridValue,
  computeGridSnap,
  computeObjectSnap,
  computeSnap,
  type SnapBounds,
} from './snapping';

describe('snapToGridValue', () => {
  it('rounds to nearest grid multiple', () => {
    expect(snapToGridValue(23, 20)).toBe(20);
    expect(snapToGridValue(31, 20)).toBe(40);
    expect(snapToGridValue(10, 20)).toBe(20);
    expect(snapToGridValue(0, 20)).toBe(0);
    expect(snapToGridValue(-7, 20)).toEqual(-0);
    expect(snapToGridValue(-13, 20)).toBe(-20);
  });
});

describe('computeGridSnap', () => {
  it('adjusts dx/dy so first node snaps to grid', () => {
    const origins = { a: { x: 0, y: 0 } };
    const result = computeGridSnap(23, 37, origins, ['a'], 20);
    expect(result.dx).toBe(20); // 0+23=23 → snap 20 → adj -3
    expect(result.dy).toBe(40); // 0+37=37 → snap 40 → adj +3
  });

  it('returns original delta if no nodes', () => {
    const result = computeGridSnap(15, 25, {}, [], 20);
    expect(result).toEqual({ dx: 15, dy: 25 });
  });

  it('snaps based on origin of first node', () => {
    const origins = { a: { x: 5, y: 5 }, b: { x: 100, y: 100 } };
    const result = computeGridSnap(10, 10, origins, ['a', 'b'], 20);
    // a: 5+10=15 → snap 20 → adj +5 → dx=15
    expect(result.dx).toBe(15);
    expect(result.dy).toBe(15);
  });
});

describe('computeObjectSnap', () => {
  const otherBounds: SnapBounds[] = [
    { id: 'target', x: 100, y: 100, width: 50, height: 50 },
  ];

  it('snaps left edge to left edge of another object', () => {
    // Dragged node at x=95 (close to 100, the left edge of target)
    const dragged: SnapBounds[] = [
      { id: 'dragged', x: 50, y: 200, width: 40, height: 40 },
    ];
    // dx=45 → tentative x=95, should snap to 100
    const result = computeObjectSnap(45, 0, dragged, otherBounds);
    expect(result.dx).toBe(50); // snaps from 95 to 100
    expect(result.guides.length).toBeGreaterThan(0);
    expect(result.guides.some(g => g.orientation === 'vertical' && g.position === 100)).toBe(true);
  });

  it('snaps right edge to right edge of another object', () => {
    // Dragged node: x=50, width=40 → right=90. target right=150.
    // dx=59 → tentative left=109, center=129, right=149
    // vs target left=100, center=125, right=150
    // right 149 vs 150 → dist 1 (best)
    const dragged: SnapBounds[] = [
      { id: 'dragged', x: 50, y: 200, width: 40, height: 40 },
    ];
    const result = computeObjectSnap(59, 0, dragged, otherBounds);
    expect(result.dx).toBe(60); // 59 + 1 = 60 → right at 150
    expect(result.guides.some(g => g.orientation === 'vertical' && g.position === 150)).toBe(true);
  });

  it('snaps center-x to center-x', () => {
    // target center-x = 125. dragged: x=50, w=40 → center = 50+20 = 70.
    // dx=53 → tentative center = 70+53 = 123 → snap to 125 → adj +2
    const dragged: SnapBounds[] = [
      { id: 'dragged', x: 50, y: 200, width: 40, height: 40 },
    ];
    const result = computeObjectSnap(53, 0, dragged, otherBounds);
    expect(result.dx).toBe(55); // 53 + 2
    expect(result.guides.some(g => g.orientation === 'vertical' && g.position === 125)).toBe(true);
  });

  it('does not snap when outside threshold', () => {
    const dragged: SnapBounds[] = [
      { id: 'dragged', x: 50, y: 200, width: 40, height: 40 },
    ];
    // dx=30 → tentative left=80, center=100, right=120
    // vs target left=100, center=125, right=150
    // left 80 vs 100 → dist 20 (outside threshold)
    // center 100 vs 100 → dist 0!  Actually center 100 matches target left edge 100
    // Hmm, let me pick a better example
    const result = computeObjectSnap(0, 0, dragged, otherBounds);
    // tentative left=50, center=70, right=90 vs target left=100, center=125, right=150
    // closest: right 90 vs 100 → dist 10 (outside 6 threshold)
    expect(result.dx).toBe(0);
    expect(result.guides).toEqual([]);
  });

  it('returns original deltas when no other bounds', () => {
    const dragged: SnapBounds[] = [
      { id: 'dragged', x: 50, y: 200, width: 40, height: 40 },
    ];
    const result = computeObjectSnap(10, 20, dragged, []);
    expect(result).toEqual({ dx: 10, dy: 20, guides: [] });
  });

  it('snaps top edge to top edge', () => {
    // target top = 100. dragged: y=0, h=40. dy=97 → tentative top = 97 → snap to 100
    const dragged: SnapBounds[] = [
      { id: 'dragged', x: 200, y: 0, width: 40, height: 40 },
    ];
    const result = computeObjectSnap(0, 97, dragged, otherBounds);
    expect(result.dy).toBe(100);
    expect(result.guides.some(g => g.orientation === 'horizontal' && g.position === 100)).toBe(true);
  });
});

describe('computeSnap (combined)', () => {
  it('applies grid snap only when snapToObjects is false', () => {
    const origins = { a: { x: 0, y: 0 } };
    const dragged: SnapBounds[] = [{ id: 'a', x: 0, y: 0, width: 40, height: 40 }];
    const others: SnapBounds[] = [{ id: 'b', x: 100, y: 100, width: 50, height: 50 }];
    const result = computeSnap(23, 37, origins, ['a'], dragged, others, {
      snapToGrid: true,
      snapToObjects: false,
      gridSize: 20,
    });
    expect(result.dx).toBe(20);
    expect(result.dy).toBe(40);
    expect(result.guides).toEqual([]);
  });

  it('applies object snap only when snapToGrid is false', () => {
    const origins = { a: { x: 50, y: 0 } };
    const dragged: SnapBounds[] = [{ id: 'a', x: 50, y: 0, width: 40, height: 40 }];
    const others: SnapBounds[] = [{ id: 'b', x: 100, y: 100, width: 50, height: 50 }];
    // dx=45 → tentative left=95, snap to 100 (target left)
    const result = computeSnap(45, 97, origins, ['a'], dragged, others, {
      snapToGrid: false,
      snapToObjects: true,
      gridSize: 20,
    });
    expect(result.dx).toBe(50); // snaps left edge 95→100
    expect(result.dy).toBe(100); // snaps top edge 97→100
    expect(result.guides.length).toBeGreaterThan(0);
  });

  it('returns raw deltas when both disabled', () => {
    const origins = { a: { x: 0, y: 0 } };
    const result = computeSnap(23, 37, origins, ['a'], [], [], {
      snapToGrid: false,
      snapToObjects: false,
      gridSize: 20,
    });
    expect(result).toEqual({ dx: 23, dy: 37, guides: [] });
  });
});
