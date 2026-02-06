import { describe, it, expect } from 'vitest';
import { snapPosition, snapToGrid, snapValues } from './snapping';

describe('snapping', () => {
  describe('snapPosition', () => {
    it('snaps to target left edge', () => {
      const result = snapPosition(
        102, // x (close to 100)
        50,  // y
        50,  // width
        50,  // height
        [{ x: 100, y: 50, width: 50, height: 50 }] // target at x=100
      );
      
      expect(result.snappedX).toBe(true);
      expect(result.x).toBe(100);
      expect(result.guides.length).toBeGreaterThan(0);
    });

    it('snaps to target center horizontally', () => {
      const result = snapPosition(
        147, // x (center at 172, close to target center 175)
        50,
        50,
        50,
        [{ x: 100, y: 50, width: 150, height: 50 }] // target center at 175
      );
      
      expect(result.snappedX).toBe(true);
      expect(result.x).toBe(150); // centered at 175
    });

    it('does not snap if distance is too large', () => {
      const result = snapPosition(
        120, // x (too far from 100)
        50,
        50,
        50,
        [{ x: 100, y: 50, width: 50, height: 50 }]
      );
      
      expect(result.snappedX).toBe(false);
      expect(result.x).toBe(120);
    });

    it('snaps to canvas edges', () => {
      const result = snapPosition(
        2,   // close to 0
        3,   // close to 0
        50,
        50,
        [],
        800, // canvas width
        600  // canvas height
      );
      
      expect(result.snappedX).toBe(true);
      expect(result.snappedY).toBe(true);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('snaps to grid when enabled', () => {
      const result = snapPosition(
        23,  // should snap to 20
        47,  // should snap to 50
        50,
        50,
        [],
        undefined,
        undefined,
        true,  // snap to grid
        10     // grid size
      );
      
      expect(result.snappedX).toBe(true);
      expect(result.snappedY).toBe(true);
      expect(result.x).toBe(20);
      expect(result.y).toBe(50);
    });
  });

  describe('snapToGrid', () => {
    it('snaps value to grid', () => {
      expect(snapToGrid(23, 10)).toBe(20);
      expect(snapToGrid(27, 10)).toBe(30);
      expect(snapToGrid(25, 10)).toBe(30); // rounds to nearest
    });

    it('handles different grid sizes', () => {
      expect(snapToGrid(23, 5)).toBe(25);
      expect(snapToGrid(23, 20)).toBe(20);
    });
  });

  describe('snapValues', () => {
    it('snaps array of values', () => {
      const result = snapValues([23, 47, 91], 10);
      expect(result).toEqual([20, 50, 90]);
    });

    it('handles different increments', () => {
      const result = snapValues([7, 13, 19], 5);
      expect(result).toEqual([5, 15, 20]);
    });
  });
});
