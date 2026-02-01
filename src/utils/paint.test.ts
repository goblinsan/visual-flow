import { describe, it, expect } from 'vitest';
import { normalizePaint, deriveStrokeVisual, dashArrayToInput, inputToDashArray } from './paint';

describe('normalizePaint', () => {
  it('returns undefined for undefined/null', () => {
    expect(normalizePaint(undefined)).toBeUndefined();
    expect(normalizePaint(null)).toBeUndefined();
  });
  it('returns undefined for empty or whitespace', () => {
    expect(normalizePaint('')).toBeUndefined();
    expect(normalizePaint('   ')).toBeUndefined();
  });
  it('preserves non-empty string', () => {
    expect(normalizePaint('#fff')).toBe('#fff');
  });
});

describe('deriveStrokeVisual', () => {
  it('passes through stroke when provided', () => {
    const v = deriveStrokeVisual('#ffffff', '#222222', 3, undefined);
    expect(v.stroke).toBe('#222222');
    expect(v.strokeEnabled).toBe(true);
    expect(v.strokeWidth).toBe(3);
    expect(v.opacity).toBeUndefined();
    expect(v.dash).toBeUndefined();
    expect(v.bothDisabled).toBe(false);
  });
  it('fallback decoration when both disabled', () => {
    const v = deriveStrokeVisual(undefined, undefined, 5, [4,2]);
    expect(v.bothDisabled).toBe(true);
    expect(v.stroke).toBe('#94a3b8');
    expect(v.strokeWidth).toBe(1); // fallback width not original
    expect(v.opacity).toBe(0.4);
    expect(v.dash).toEqual([3,3]);
  });
  it('dash only included when stroke present', () => {
    const withDash = deriveStrokeVisual('#ffffff', '#000000', 2, [5,2]);
    expect(withDash.dash).toEqual([5,2]);
    const noStroke = deriveStrokeVisual('#ffffff', undefined, 2, [5,2]);
    expect(noStroke.dash).toBeUndefined();
  });
  it('empty dash array excluded', () => {
    const v = deriveStrokeVisual('#ffffff', '#000000', 2, []);
    expect(v.dash).toBeUndefined();
  });
});

describe('dashArrayToInput', () => {
  it('returns empty string for undefined or empty array', () => {
    expect(dashArrayToInput(undefined)).toBe('');
    expect(dashArrayToInput([])).toBe('');
  });
  it('joins numbers with spaces', () => {
    expect(dashArrayToInput([5,2,1])).toBe('5 2 1');
  });
});

describe('inputToDashArray', () => {
  it('returns undefined for empty/whitespace', () => {
    expect(inputToDashArray('')).toBeUndefined();
    expect(inputToDashArray('   ')).toBeUndefined();
  });
  it('parses valid pattern', () => {
    expect(inputToDashArray('4 2 1')).toEqual([4,2,1]);
  });
  it('filters invalid/zero/negative tokens', () => {
    // dashPattern parser will drop invalid & <=0 numbers; returns remaining or []
    expect(inputToDashArray('4 -2 x 0 3')).toEqual([4,3]);
  });
  it('returns undefined if no valid numbers', () => {
    expect(inputToDashArray('x -2 0')).toBeUndefined();
  });
  it('roundtrip matches original array (non-empty)', () => {
    const arr = [5,1,2];
    const str = dashArrayToInput(arr);
    expect(inputToDashArray(str)).toEqual(arr);
  });
});
