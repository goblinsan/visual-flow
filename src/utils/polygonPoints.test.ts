import { describe, it, expect } from 'vitest';
import { generateRegularPolygonPoints } from './polygonPoints';

describe('generateRegularPolygonPoints', () => {
  it('generates the correct number of points', () => {
    const pts = generateRegularPolygonPoints(100, 100, 5);
    expect(pts.length).toBe(10); // 5 vertices × 2 coords
  });

  it('normalizes points to fill the full bounding box for a pentagon', () => {
    const pts = generateRegularPolygonPoints(100, 100, 5);
    // Extract x and y coords
    const xs = pts.filter((_, i) => i % 2 === 0);
    const ys = pts.filter((_, i) => i % 2 === 1);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // After normalization, points should span 0 to width and 0 to height
    expect(minX).toBeCloseTo(0, 5);
    expect(maxX).toBeCloseTo(100, 5);
    expect(minY).toBeCloseTo(0, 5);
    expect(maxY).toBeCloseTo(100, 5);
  });

  it('normalizes points for a triangle (worst case)', () => {
    const pts = generateRegularPolygonPoints(80, 60, 3);
    const xs = pts.filter((_, i) => i % 2 === 0);
    const ys = pts.filter((_, i) => i % 2 === 1);

    expect(Math.min(...xs)).toBeCloseTo(0, 5);
    expect(Math.max(...xs)).toBeCloseTo(80, 5);
    expect(Math.min(...ys)).toBeCloseTo(0, 5);
    expect(Math.max(...ys)).toBeCloseTo(60, 5);
  });

  it('produces identical bounds for even-sided polygons (square)', () => {
    const pts = generateRegularPolygonPoints(100, 100, 4);
    const xs = pts.filter((_, i) => i % 2 === 0);
    const ys = pts.filter((_, i) => i % 2 === 1);

    expect(Math.min(...xs)).toBeCloseTo(0, 5);
    expect(Math.max(...xs)).toBeCloseTo(100, 5);
    expect(Math.min(...ys)).toBeCloseTo(0, 5);
    expect(Math.max(...ys)).toBeCloseTo(100, 5);
  });

  it('handles non-square bounding boxes', () => {
    const pts = generateRegularPolygonPoints(200, 50, 7);
    const xs = pts.filter((_, i) => i % 2 === 0);
    const ys = pts.filter((_, i) => i % 2 === 1);

    expect(Math.min(...xs)).toBeCloseTo(0, 5);
    expect(Math.max(...xs)).toBeCloseTo(200, 5);
    expect(Math.min(...ys)).toBeCloseTo(0, 5);
    expect(Math.max(...ys)).toBeCloseTo(50, 5);
  });

  it('top vertex is at center-x for odd-sided polygons', () => {
    const pts = generateRegularPolygonPoints(100, 100, 5);
    // First vertex should be at the top center (x=50, y=0)
    expect(pts[0]).toBeCloseTo(50, 5); // center-x
    expect(pts[1]).toBeCloseTo(0, 5);  // top (y=0)
  });
});
