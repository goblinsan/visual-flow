import { describe, it, expect } from 'vitest';
import { parseDashPattern, dashPatternToString } from './dashPattern';

describe('dashPattern.parseDashPattern', () => {
  it('returns empty for undefined', () => {
    expect(parseDashPattern(undefined)).toEqual({ pattern: [], normalized: false });
  });

  it('parses space separated string', () => {
    expect(parseDashPattern('4 2 1').pattern).toEqual([4,2,1]);
  });

  it('filters invalid and negative tokens', () => {
    const r = parseDashPattern('4 -2 x 0 3');
    expect(r.pattern).toEqual([4,3]);
    expect(r.normalized).toBe(true);
    expect(r.error).toBeUndefined();
  });

  it('errors when nothing valid remains', () => {
    const r = parseDashPattern('x -2 0');
    expect(r.pattern).toEqual([]);
    expect(r.error).toBeDefined();
  });

  it('accepts number[] directly', () => {
    const r = parseDashPattern([5, 1, 2]);
    expect(r.pattern).toEqual([5,1,2]);
  });
});

describe('dashPattern.dashPatternToString', () => {
  it('serializes pattern', () => {
    expect(dashPatternToString([4,2,1])).toBe('4 2 1');
  });
});
