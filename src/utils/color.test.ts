import { describe, it, expect } from 'vitest';
import { parseColor, toHex, toRgba, adjustAlpha, normalizeHex, isSameColor, addRecentColor } from './color';

describe('color utilities', () => {
  it('parses hex 6', () => {
    const c = parseColor('#3366cc');
    expect(c).toMatchObject({ r:51, g:102, b:204, a:1 });
  });
  it('parses hex 8 with alpha', () => {
    const c = parseColor('#ff000080');
    expect(c && Math.round(c.a*100)).toBe(50);
  });
  it('parses rgb/rgba', () => {
    const r = parseColor('rgb(10,20,30)');
    const a = parseColor('rgba(10,20,30,0.25)');
    expect(r?.r).toBe(10); expect(a?.a).toBeCloseTo(0.25, 2);
  });
  it('formats hex with optional alpha', () => {
    const c = parseColor('#123456')!;
    expect(toHex(c)).toBe('#123456');
    expect(toHex({ ...c, a: 0.5 }, true)).toBe('#12345680');
  });
  it('produces rgba string', () => {
    const c = parseColor('#ffffff')!;
    expect(toRgba({ ...c, a: 0.333 })).toBe('rgba(255, 255, 255, 0.333)');
  });
  it('adjusts alpha', () => {
    const s = adjustAlpha('#336699', 0.2);
    expect(s).toBe('rgba(51, 102, 153, 0.2)');
  });
  it('normalizes hex retaining alpha only if needed', () => {
    expect(normalizeHex('#ffffff')).toBe('#ffffff');
    expect(normalizeHex('#ffffff80')).toBe('#ffffff80');
  });
  it('compares colors with tolerance', () => {
    expect(isSameColor('#ffffff', 'rgb(255,255,255)')).toBe(true);
    expect(isSameColor('#ffffff', 'rgba(255,255,255,0.9)')).toBe(false);
  });
  it('recent colors pushes unique & caps length', () => {
    const start: string[] = [];
    let next = addRecentColor(start, '#ffffff');
    next = addRecentColor(next, '#ff0000');
    next = addRecentColor(next, '#ffffff'); // duplicate should move to front once
    expect(next[0]).toMatch(/#ffffff/i);
    expect(next.length).toBe(2);
  });
});
