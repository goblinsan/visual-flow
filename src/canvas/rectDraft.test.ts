import { describe, it, expect } from 'vitest';
import { computeRectDraft } from './rectDraft';

const base = { start: { x: 100, y: 200 }, current: { x: 180, y: 260 } };

describe('computeRectDraft', () => {
  it('computes standard drag', () => {
    const res = computeRectDraft({ ...base, alt: false, shift: false });
    expect(res.position).toEqual({ x: 100, y: 200 });
    expect(res.size).toEqual({ width: 80, height: 60 });
  });

  it('normalizes negative drag', () => {
    const res = computeRectDraft({ start: { x: 180, y: 260 }, current: { x: 100, y: 200 }, alt: false, shift: false });
    expect(res.position).toEqual({ x: 100, y: 200 });
    expect(res.size).toEqual({ width: 80, height: 60 });
  });

  it('applies square constraint with shift', () => {
    const res = computeRectDraft({ ...base, alt: false, shift: true });
    // max delta = width 80 vs height 60 -> width drives -> both become 80
    expect(res.size.width).toBe(80);
    expect(res.size.height).toBe(80);
  });

  it('center-out with alt', () => {
    const res = computeRectDraft({ ...base, alt: true, shift: false });
    // doubled deltas: width=160, height=120, centered around start
    expect(res.size).toEqual({ width: 160, height: 120 });
    expect(res.position.x).toBeCloseTo(100 - 160/2);
    expect(res.position.y).toBeCloseTo(200 - 120/2);
  });

  it('center-out + shift square', () => {
    const res = computeRectDraft({ ...base, alt: true, shift: true });
    // doubled deltas -> 160x120 -> square -> 160x160, centered
    expect(res.size.width).toBe(160);
    expect(res.size.height).toBe(160);
    expect(res.position.x).toBeCloseTo(100 - 160/2);
    expect(res.position.y).toBeCloseTo(200 - 160/2);
  });

  it('tiny drag produces default size', () => {
    const res = computeRectDraft({ start: { x: 50, y: 50 }, current: { x: 51, y: 51 }, alt: false, shift: false, minSize: 4, clickDefault: { width: 80, height: 60 } });
    expect(res.size).toEqual({ width: 80, height: 60 });
  });
});
