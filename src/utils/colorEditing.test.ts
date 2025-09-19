import { describe, it, expect } from 'vitest';
import { adjustAlpha, toggleColor, swapColors } from './colorEditing';

describe('colorEditing.adjustAlpha', () => {
  it('adjusts alpha adding channel when needed', () => {
    const out = adjustAlpha('#ff0000', 0.5);
    expect(out.toLowerCase()).toBe('#ff000080');
  });
  it('clamps alpha within 0..1', () => {
    expect(adjustAlpha('#00ff00', 2)).toBe('#00ff00');
    expect(adjustAlpha('#00ff00', -1)).toBe('#00ff00');
  });
});

describe('colorEditing.toggleColor', () => {
  it('turns color off and stores previous', () => {
    const r = toggleColor('#123456', 'node1', {}, '#ffffff');
    expect(r.next).toBeUndefined();
    expect(r.storage.node1).toBe('#123456');
  });
  it('restores stored color when turning back on', () => {
    const off = toggleColor('#123456', 'n', {}, '#fff');
    const on = toggleColor(off.next, 'n', off.storage, '#fff');
    expect(on.next).toBe('#123456');
  });
  it('uses fallback when no stored color', () => {
    const on = toggleColor(undefined, 'n', {}, '#abcabc');
    expect(on.next).toBe('#abcabc');
  });
});

describe('colorEditing.swapColors', () => {
  it('swaps both colors', () => {
    expect(swapColors('#111111', '#222222')).toEqual({ fill: '#222222', stroke: '#111111' });
  });
  it('handles undefined values', () => {
    expect(swapColors(undefined, '#333333')).toEqual({ fill: '#333333', stroke: undefined });
  });
});
