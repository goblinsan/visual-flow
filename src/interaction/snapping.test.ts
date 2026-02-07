import { describe, it, expect } from 'vitest';
import {
  snapToGridValue,
  computeGridSnap,
  computeObjectSnap,
  computeSpacingSnap,
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
      snapToSpacing: false,
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
      snapToSpacing: false,
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
      snapToSpacing: false,
      gridSize: 20,
    });
    expect(result).toEqual({ dx: 23, dy: 37, guides: [], spacingGuides: [] });
  });
});

describe('computeGridSnap with bounds & snapAnchor', () => {
  it('prioritises bottom edge in both mode', () => {
    const origins = { a: { x: 0, y: 0 } };
    const bounds: SnapBounds[] = [{ id: 'a', x: 0, y: 0, width: 40, height: 47 }];
    // dy=0, bottom = 0+47=47 → nearest grid (20) = 40 → adj -7
    // top = 0 → snap 0 → adj 0 → dist 0 (closer!) BUT both mode lists bottom first:
    //   bottom 47→40 dist=7, center 23.5→20 dist=3.5, top 0→0 dist=0
    //   best = top (dist=0), so adj = 0
    const result = computeGridSnap(0, 0, origins, ['a'], 20, bounds, 'both');
    expect(result.dy).toBe(0); // top is already on grid, wins with dist 0
  });

  it('snaps bottom edge to grid when it is the closest', () => {
    const origins = { a: { x: 0, y: 3 } };
    const bounds: SnapBounds[] = [{ id: 'a', x: 0, y: 3, width: 40, height: 40 }];
    // bottom = 3+40=43 → snap 40 → dist 3
    // center = 23 → snap 20 → dist 3  (tie, but bottom is listed first → wins)
    // top = 3 → snap 0 → dist 3
    const result = computeGridSnap(0, 0, origins, ['a'], 20, bounds, 'both');
    // All equal distance 3; bottom has priority → adj = 40-43 = -3
    expect(result.dy).toBe(-3);
  });

  it('snaps only center in center mode', () => {
    const origins = { a: { x: 0, y: 0 } };
    const bounds: SnapBounds[] = [{ id: 'a', x: 0, y: 0, width: 40, height: 43 }];
    // center = 21.5 → snap 20 → dist 1.5
    const result = computeGridSnap(0, 0, origins, ['a'], 20, bounds, 'center');
    expect(result.dy).toBeCloseTo(-1.5);
  });

  it('snaps only borders in border mode', () => {
    const origins = { a: { x: 0, y: 2 } };
    const bounds: SnapBounds[] = [{ id: 'a', x: 0, y: 2, width: 40, height: 40 }];
    // border mode: bottom=42→40 dist=2, top=2→0 dist=2 → bottom first wins → adj=-2
    const result = computeGridSnap(0, 0, origins, ['a'], 20, bounds, 'border');
    expect(result.dy).toBe(-2);
  });

  it('falls back to top-left snap without bounds', () => {
    const origins = { a: { x: 0, y: 0 } };
    const result = computeGridSnap(23, 37, origins, ['a'], 20);
    expect(result.dx).toBe(20);
    expect(result.dy).toBe(40);
  });
});

describe('computeSpacingSnap', () => {
  it('snaps to equal horizontal spacing between objects', () => {
    // Two objects with a 50px gap between them
    const objA: SnapBounds = { id: 'a', x: 0, y: 100, width: 40, height: 40 };
    const objB: SnapBounds = { id: 'b', x: 90, y: 100, width: 40, height: 40 };
    // Gap between A and B: 90 - (0+40) = 50px
    // Dragging a third object: origin x=200, width=40
    // dx=-18 → tentative left=182, right=222
    // Gap from B right edge (130) to dragged left (182) = 52 → close to 50 → snap to 50
    const dragged: SnapBounds[] = [
      { id: 'c', x: 200, y: 100, width: 40, height: 40 },
    ];
    const others: SnapBounds[] = [objA, objB];
    const result = computeSpacingSnap(-18, 0, dragged, others);
    // Tentative gap = 200-18 - 130 = 52, existing gap = 50, so adj = -2
    expect(result.dx).toBe(-20); // -18 + (-2) = -20, placing dragged at x=180
    expect(result.spacingGuides.length).toBeGreaterThan(0);
    expect(result.spacingGuides.some(g => g.orientation === 'horizontal')).toBe(true);
  });

  it('snaps to equal vertical spacing between objects', () => {
    const objA: SnapBounds = { id: 'a', x: 100, y: 0, width: 40, height: 40 };
    const objB: SnapBounds = { id: 'b', x: 100, y: 80, width: 40, height: 40 };
    // Gap between A and B: 80 - 40 = 40px
    const dragged: SnapBounds[] = [
      { id: 'c', x: 100, y: 200, width: 40, height: 40 },
    ];
    const others: SnapBounds[] = [objA, objB];
    // dx=0, dy=-38 → tentative top=162, gap from B bottom (120) = 42 → snap to 40
    const result = computeSpacingSnap(0, -38, dragged, others);
    expect(result.dy).toBe(-40); // -38 + (-2) = -40, placing at y=160
    expect(result.spacingGuides.some(g => g.orientation === 'vertical')).toBe(true);
  });

  it('returns original deltas when fewer than 2 other objects', () => {
    const dragged: SnapBounds[] = [
      { id: 'c', x: 200, y: 100, width: 40, height: 40 },
    ];
    const result = computeSpacingSnap(10, 20, dragged, [
      { id: 'a', x: 0, y: 0, width: 40, height: 40 },
    ]);
    expect(result).toEqual({ dx: 10, dy: 20, spacingGuides: [] });
  });

  it('does not snap when gap difference exceeds threshold', () => {
    const objA: SnapBounds = { id: 'a', x: 0, y: 100, width: 40, height: 40 };
    const objB: SnapBounds = { id: 'b', x: 90, y: 100, width: 40, height: 40 };
    // Gap = 50
    const dragged: SnapBounds[] = [
      { id: 'c', x: 200, y: 100, width: 40, height: 40 },
    ];
    // dx=0 → tentative gap = 200-130 = 70 → diff from 50 = 20 → way outside threshold
    const result = computeSpacingSnap(0, 0, dragged, [objA, objB]);
    expect(result.dx).toBe(0);
    expect(result.spacingGuides).toEqual([]);
  });

  it('shows spacing arrows between all equally-spaced objects in a row', () => {
    // 4 boxes in a row, each 40px wide, 50px gap between them:
    // A: x=0..40, B: x=90..130, C: x=180..220, D: x=270..310
    // Gaps: A-B=50, B-C=50, C-D=50
    const objA: SnapBounds = { id: 'a', x: 0,   y: 100, width: 40, height: 40 };
    const objB: SnapBounds = { id: 'b', x: 90,  y: 100, width: 40, height: 40 };
    const objC: SnapBounds = { id: 'c', x: 180, y: 100, width: 40, height: 40 };
    const objD: SnapBounds = { id: 'd', x: 270, y: 100, width: 40, height: 40 };
    const others = [objA, objB, objC, objD];

    // Dragging a 5th box to the right of D.
    // D right edge = 310. Want a 50px gap → placed at x=360.
    // Origin at x=400, dx needed to get to x=360 is -40.
    // Tentative with dx=-38: left=362, gap=362-310=52, diff from 50=2 → within threshold
    const dragged: SnapBounds[] = [
      { id: 'e', x: 400, y: 100, width: 40, height: 40 },
    ];
    const result = computeSpacingSnap(-38, 0, dragged, others);

    // Should snap to 50px gap: adj = -2, final dx = -40
    expect(result.dx).toBe(-40);

    // Should have spacing guides between ALL 4 gaps:
    // 1) dragged↔D gap, 2) A↔B, 3) B↔C, 4) C↔D
    const hGuides = result.spacingGuides.filter(g => g.orientation === 'horizontal');
    expect(hGuides.length).toBe(4);
  });
});
