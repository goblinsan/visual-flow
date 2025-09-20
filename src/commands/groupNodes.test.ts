import { describe, it, expect } from 'vitest';
import { createGroupNodesCommand } from './groupNodes';
import type { CommandContext } from './types';
import { cloneSpec } from './types';

function makeSpec() {
  return {
    root: { id: 'root', type: 'frame', children: [
      { id: 'a', type: 'rect', position: { x:0,y:0}, size:{width:10,height:10}},
      { id: 'b', type: 'rect', position: { x:20,y:0}, size:{width:10,height:10}},
      { id: 'c', type: 'rect', position: { x:40,y:0}, size:{width:10,height:10}},
    ] }
  } as any;
}

function ctx(spec: any): CommandContext { return { spec, selection: [] }; }

describe('GroupNodesCommand', () => {
  it('groups contiguous siblings and inverts to restore originals', () => {
    const spec = makeSpec();
    const before = cloneSpec(spec);
    const cmd = createGroupNodesCommand({ ids: ['a','b'] });
    const after = cmd.apply(ctx(spec));
    const ids = after.root.children.map((c:any)=>c.id);
    expect(ids.length).toBe(2);
    const groupId = ids[0];
    const groupNode = after.root.children[0];
    expect(groupNode.type).toBe('group');
  expect((groupNode as any).children.map((c:any)=>c.id)).toEqual(['a','b']);
    const inv = cmd.invert!(before, after)!;
    const reverted = inv.apply(ctx(after));
    const rIds = reverted.root.children.map((c:any)=>c.id);
    expect(rIds).toEqual(['a','b','c']);
  });

  it('no-ops for invalid (different parent) selection', () => {
    const spec = makeSpec();
    // artificially nest a under group to break parent match
    spec.root.children[0] = { id: 'g', type: 'group', children: [ spec.root.children[0] ] };
    const before = cloneSpec(spec);
    const cmd = createGroupNodesCommand({ ids: ['g','b'] });
    const after = cmd.apply(ctx(spec));
    expect(after).toBe(spec);
    expect(cmd.invert!(before, after)).toBeNull();
  });
});
