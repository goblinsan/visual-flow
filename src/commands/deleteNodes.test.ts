import { describe, it, expect } from 'vitest';
import { createDeleteNodesCommand } from './deleteNodes';
import type { CommandContext } from './types';
import { cloneSpec } from './types';

function makeSpec() {
  return {
    root: {
      id: 'root', type: 'frame', children: [
        { id: 'a', type: 'rect', position: { x: 0, y: 0 }, size: { width: 10, height: 10 } },
        { id: 'b', type: 'rect', position: { x: 10, y: 0 }, size: { width: 10, height: 10 } },
        { id: 'g1', type: 'group', children: [
          { id: 'c', type: 'rect', position: { x: 20, y: 0 }, size: { width: 10, height: 10 } },
          { id: 'd', type: 'rect', position: { x: 30, y: 0 }, size: { width: 10, height: 10 } },
        ] },
      ]
    }
  } as any;
}

function ctx(spec: any): CommandContext { return { spec, selection: [] }; }

describe('DeleteNodesCommand', () => {
  it('deletes top-level nodes and is invertible preserving order', () => {
    const spec = makeSpec();
    const before = cloneSpec(spec);
    const cmd = createDeleteNodesCommand({ ids: ['a','b'] });
    const after = cmd.apply(ctx(spec));
    const childIds = after.root.children.map((c:any)=>c.id);
    expect(childIds).not.toContain('a');
    expect(childIds).not.toContain('b');
    expect(childIds).toEqual(['g1']);
    const inv = cmd.invert!(before, after)!;
    const reverted = inv.apply(ctx(after));
    const rIds = reverted.root.children.map((c:any)=>c.id);
    expect(rIds).toEqual(['a','b','g1']);
  });

  it('deletes nested nodes and restores correctly', () => {
    const spec = makeSpec();
    const before = cloneSpec(spec);
    const cmd = createDeleteNodesCommand({ ids: ['c','d'] });
    const after = cmd.apply(ctx(spec));
  const group = after.root.children.find((c:any)=>c.id==='g1') as any;
  expect(group && group.children.map((c:any)=>c.id)).toEqual([]);
    const inv = cmd.invert!(before, after)!;
    const reverted = inv.apply(ctx(after));
  const group2 = reverted.root.children.find((c:any)=>c.id==='g1') as any;
  expect(group2 && group2.children.map((c:any)=>c.id)).toEqual(['c','d']);
  });

  it('no-ops when ids missing', () => {
    const spec = makeSpec();
    const before = cloneSpec(spec);
    const cmd = createDeleteNodesCommand({ ids: ['zzz'] });
    const after = cmd.apply(ctx(spec));
    expect(after).toBe(spec); // stable reference
    expect(cmd.invert!(before, after)).toBeNull();
  });
});
