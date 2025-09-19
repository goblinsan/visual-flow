import { describe, it, expect } from 'vitest';
// Import individual sample specs from samples index
import { simpleText, stackSample, gridSample, adventureInventory, buildInventoryAdvanced } from './samples';

// Phase 0 invariants: ensure sample specs conform to expected minimal structure.

interface RectLike { id: string; type: string; x: number; y: number; width: number; height: number; }

function isRectLike(obj: any): obj is RectLike {
  return obj && typeof obj.id === 'string' && typeof obj.type === 'string' &&
    typeof obj.x === 'number' && typeof obj.y === 'number' &&
    typeof obj.width === 'number' && obj.width >= 0 &&
    typeof obj.height === 'number' && obj.height >= 0;
}

describe('Spec invariants (Phase 0)', () => {
  it('sample root specs have ids', () => {
    const roots = [simpleText, stackSample, gridSample, adventureInventory, buildInventoryAdvanced({ gold:0, gems:0, level:1, power:0, items: [] })] as Array<{ id: string }>;
    for (const r of roots) {
      expect(typeof r.id).toBe('string');
      expect(r.id).not.toHaveLength(0);
    }
  });
});
