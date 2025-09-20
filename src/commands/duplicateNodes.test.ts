import { describe, it, expect } from 'vitest';
import { createDuplicateNodesCommand } from './duplicateNodes';
import type { CommandContext } from './types';
import { cloneSpec } from './types';

function makeSpec() {
  return {
    root: { id: 'root', type: 'frame', children: [
      { id: 'a', type: 'rect', position: { x: 0, y: 0 }, size: { width: 10, height: 10 }, fill: '#fff' },
      { id: 'b', type: 'rect', position: { x: 20, y: 0 }, size: { width: 10, height: 10 }, fill: '#000' },
    ]}
  } as any;
}

function ctx(spec: any): CommandContext { return { spec, selection: [] }; }

describe('DuplicateNodesCommand', () => {
  it('duplicates a node inserting sibling after original', () => {
    const spec = makeSpec();
    const before = cloneSpec(spec);
    const cmd = createDuplicateNodesCommand({ ids: ['a'] });
    const after = cmd.apply(ctx(spec));
    const ids = after.root.children.map((c:any)=>c.id);
    expect(ids[0]).toBe('a');
    expect(ids[1].startsWith('a_copy')).toBe(true);
    const inv = cmd.invert!(before, after)!;
    const reverted = inv.apply(ctx(after));
    const ids2 = reverted.root.children.map((c:any)=>c.id);
    expect(ids2).toEqual(['a','b']);
  });

  it('no-ops for missing id and has null inverse', () => {
    const spec = makeSpec();
    const before = cloneSpec(spec);
    const cmd = createDuplicateNodesCommand({ ids: ['zzz'] });
    const after = cmd.apply(ctx(spec));
    expect(after).toBe(spec);
    expect(cmd.invert!(before, after)).toBeNull();
  });
});
