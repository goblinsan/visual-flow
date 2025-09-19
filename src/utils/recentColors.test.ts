import { describe, it, expect } from 'vitest';
import { addRecentColor, isSameColor } from './color';

// Focused tests on recent color logic semantics we rely on in CanvasApp

describe('recent colors behavior', () => {
  it('adds new colors to the front and caps length', () => {
    let list: string[] = [];
    list = addRecentColor(list, '#ffffff');
    list = addRecentColor(list, '#ff0000');
    list = addRecentColor(list, '#00ff00');
    expect(list[0]).toBe('#00ff00');
    expect(list).toHaveLength(3);
  });

  it('moves duplicate (same color) to front without growing list', () => {
    let list: string[] = [];
    list = addRecentColor(list, '#ffffff');
    list = addRecentColor(list, '#ff0000');
    const before = list.slice();
    list = addRecentColor(list, '#ffffff');
    expect(list[0]).toBe('#ffffff');
    expect(list.length).toBe(2);
    // Ensure second item became old first non-duplicate
    expect(isSameColor(list[1], '#ff0000')).toBe(true);
    // List reference must change
    expect(list).not.toBe(before);
  });

  it('supports alpha variants as distinct unless identical RGBA', () => {
    let list: string[] = [];
    list = addRecentColor(list, '#336699');
    list = addRecentColor(list, '#33669980'); // 50% alpha
    expect(list.length).toBe(2);
    // Re-adding solid should just move it to front
    list = addRecentColor(list, '#336699');
    expect(list.length).toBe(2);
    expect(list[0]).toBe('#336699');
  });

  it('respects size limit', () => {
    let list: string[] = [];
    for (let i=0;i<10;i++) {
      const hex = `#${(i.toString(16).padStart(2,'0')).repeat(3)}`; // #000000, #010101, ...
      list = addRecentColor(list, hex, 5);
    }
    expect(list.length).toBe(5);
  });
});
