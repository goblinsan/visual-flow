import { describe, it, expect } from 'vitest';
import { createGroupNodesCommand } from './groupNodes';
import type { CommandContext } from './types';
import { cloneSpec } from './types';
import type { LayoutSpec, RectNode, GroupNode } from '../layout-schema';

function makeRect(id: string, offsetX: number): RectNode {
  return {
    id,
    type: 'rect',
    position: { x: offsetX, y: 0 },
    size: { width: 10, height: 10 },
  };
}

function makeSpec(): LayoutSpec {
  return {
    root: {
      id: 'root',
      type: 'frame',
      size: { width: 300, height: 200 },
      children: [
        makeRect('a', 0),
        makeRect('b', 20),
        makeRect('c', 40),
      ],
    },
  };
}

function ctx(spec: LayoutSpec): CommandContext { return { spec, selection: [] }; }

describe('GroupNodesCommand', () => {
  it('groups contiguous siblings and inverts to restore originals', () => {
    const spec = makeSpec();
    const before = cloneSpec(spec);
    const cmd = createGroupNodesCommand({ ids: ['a','b'] });
    const after = cmd.apply(ctx(spec));
    const ids = after.root.children.map((c) => c.id);
    expect(ids.length).toBe(2);
    const groupNode = after.root.children[0] as GroupNode;
    expect(groupNode.type).toBe('group');
    expect(groupNode.children.map((c) => c.id)).toEqual(['a','b']);
    const inv = cmd.invert!(before, after)!;
    const reverted = inv.apply(ctx(after));
    const rIds = reverted.root.children.map((c) => c.id);
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
