import { describe, it, expect } from 'vitest';
import { computeMarquee } from './marquee';
import type { NodeBounds } from './types';

const nodes: NodeBounds[] = [
  { id: 'a', x: 0, y: 0, width: 10, height: 10 },
  { id: 'b', x: 15, y: 5, width: 10, height: 10 },
  { id: 'c', x: 30, y: 0, width: 5, height: 5 },
];

describe('interaction.marquee', () => {
  it('selects nodes fully contained', () => {
    const r = computeMarquee({ x: 0, y: 0, width: 26, height: 20 }, nodes);
    expect(r.ids.sort()).toEqual(['a','b']);
  });
  it('empty when zero size rect', () => {
    const r = computeMarquee({ x: 0, y: 0, width: 0, height: 15 }, nodes);
    expect(r.ids.length).toBe(0);
  });
  it('excludes partially outside nodes', () => {
    const r = computeMarquee({ x: 0, y: 0, width: 12, height: 10 }, nodes);
    expect(r.ids).toEqual(['a']);
  });
});
