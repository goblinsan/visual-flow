import { describe, it, expect } from 'vitest';
import { buildTopNav, DEFAULT_PALETTE, DEFAULT_LIGHT_THEME } from './kulrsBuilders';

describe('buildTopNav dynamic swatches', () => {
  it('generates a swatch node for every palette color', () => {
    const spec = buildTopNav(DEFAULT_PALETTE, 'Inter', 'Inter', DEFAULT_LIGHT_THEME);
    const root = spec.root as any;
    const swatches = root.children.filter((n: any) => (n.id as string).startsWith('swatch'));
    const card = root.children.find((n: any) => n.id === 'content');

    // 5-color default palette → 5 swatch nodes
    expect(swatches).toHaveLength(DEFAULT_PALETTE.length); // 5

    // card height should match formula: 32+28+20+rowsH+32 = 288 for 5 colors (2 rows)
    const numRows = Math.ceil(DEFAULT_PALETTE.length / 3);
    const rowsH = numRows * 80 + (numRows - 1) * 16;
    const expectedCardH = 32 + 28 + 20 + rowsH + 32;
    expect(card.size.height).toBe(expectedCardH);

    // row-2 swatches (index 3,4) must be INSIDE the card vertically
    const row2Swatches = swatches.filter((_: any, i: number) => i >= 3);
    for (const s of row2Swatches) {
      expect(s.position.y + 80).toBeLessThanOrEqual(card.position.y + card.size.height);
    }

    // canvas height = cardY + cardH + 68
    const cardY = 424;
    expect(root.size.height).toBe(cardY + expectedCardH + 68);
  });
});
