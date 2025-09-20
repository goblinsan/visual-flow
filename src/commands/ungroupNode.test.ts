import { describe, it, expect } from 'vitest';
import { createUngroupNodeCommand } from './ungroupNode';
import type { CommandContext } from './types';
import { cloneSpec } from './types';

function makeSpec() {
  return {
    root: { id: 'root', type: 'frame', children: [
      { id: 'g1', type: 'group', children: [
        { id: 'a', type: 'rect', position:{x:0,y:0}, size:{width:10,height:10}},
        { id: 'b', type: 'rect', position:{x:10,y:0}, size:{width:10,height:10}},
      ]},
      { id: 'c', type: 'rect', position:{x:40,y:0}, size:{width:10,height:10} }
    ] }
  } as any;
}

function ctx(spec: any): CommandContext { return { spec, selection: [] }; }

describe('UngroupNodeCommand', () => {
  it('ungroups a group node and inverts to recreate it', () => {
    const spec = makeSpec();
    const before = cloneSpec(spec);
    const cmd = createUngroupNodeCommand({ id: 'g1' });
    const after = cmd.apply(ctx(spec));
    const ids = after.root.children.map((c:any)=>c.id);
    expect(ids).toEqual(['a','b','c']);
    const inv = cmd.invert!(before, after)!;
    const reverted = inv.apply(ctx(after));
    const rIds = reverted.root.children.map((c:any)=>c.id);
    expect(rIds[0]).toBe('g1');
    const group = reverted.root.children[0] as any;
    expect(group.children.map((c:any)=>c.id)).toEqual(['a','b']);
  });

  it('no-ops if target not group', () => {
    const spec = makeSpec();
    const before = cloneSpec(spec);
    const cmd = createUngroupNodeCommand({ id: 'c' });
    const after = cmd.apply(ctx(spec));
    expect(after).toBe(spec);
    expect(cmd.invert!(before, after)).toBeNull();
  });
});
