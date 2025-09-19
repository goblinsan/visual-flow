import { describe, it, expect } from 'vitest';
import { fontSizeForVariant, approxTextHeight, estimateNodeHeight } from './measurement';
import type { LayoutNode, TextNode, StackNode } from '../layout-schema';

function text(id: string, variant?: string, h?: number): TextNode {
  return { id, type: 'text', text: 'X', variant: variant as any, position: { x:0,y:0 }, size: { width: 10, height: h ?? 10 }, color: '#000' } as TextNode;
}

describe('fontSizeForVariant', () => {
  it('maps variants correctly', () => {
    expect(fontSizeForVariant('h1')).toBe(28);
    expect(fontSizeForVariant('h2')).toBe(22);
    expect(fontSizeForVariant('h3')).toBe(18);
    expect(fontSizeForVariant(undefined)).toBe(14);
  });
});

describe('approxTextHeight', () => {
  it('adds padding to font size', () => {
    const t = text('t1','h2');
    expect(approxTextHeight(t)).toBe(22+8);
  });
});

describe('estimateNodeHeight', () => {
  it('uses approx for text', () => {
    const t = text('t2','h1');
    expect(estimateNodeHeight(t)).toBe(28+8);
  });
  it('aggregates stack children with gap', () => {
    const stack: StackNode = { id: 's', type: 'stack', direction: 'column', gap: 4, position: {x:0,y:0}, children: [text('a','h1'), text('b','h3')] } as any;
    const expected = (28+8) + 4 + (18+8) + 4; // note original logic adds gap after each child including last; preserve that
    expect(estimateNodeHeight(stack)).toBe(expected);
  });
  it('returns placeholder for grid and group (non-empty vs empty)', () => {
    const groupNonEmpty: LayoutNode = { id:'g1', type:'group', position:{x:0,y:0}, children:[text('gx')] } as any;
    const groupEmpty: LayoutNode = { id:'g2', type:'group', position:{x:0,y:0}, children:[] } as any;
    expect(estimateNodeHeight(groupNonEmpty)).toBe(200);
    expect(estimateNodeHeight(groupEmpty)).toBe(100);
  });
});
