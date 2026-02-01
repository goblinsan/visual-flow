import { describe, it, expect } from 'vitest';
import { createDeleteNodesCommand } from './deleteNodes';
import type { CommandContext } from './types';
import { cloneSpec } from './types';
import type { LayoutSpec, RectNode, GroupNode } from '../layout-schema';

function rectNode(id: string, x: number): RectNode {
  return {
    id,
    type: 'rect',
    position: { x, y: 0 },
    size: { width: 10, height: 10 },
  };
}

function groupNode(id: string, children: RectNode[]): GroupNode {
  return { id, type: 'group', children };
}

function makeSpec(): LayoutSpec {
  return {
    root: {
      id: 'root',
      type: 'frame',
      size: { width: 200, height: 100 },
      children: [
        rectNode('a', 0),
        rectNode('b', 10),
        groupNode('g1', [rectNode('c', 20), rectNode('d', 30)]),
      ],
    },
  };
}

function ctx(spec: LayoutSpec): CommandContext {
  return { spec, selection: [] };
}

describe('DeleteNodesCommand', () => {
  it('deletes top-level nodes and is invertible preserving order', () => {
    const spec = makeSpec();
    const before = cloneSpec(spec);
    const cmd = createDeleteNodesCommand({ ids: ['a','b'] });
    const after = cmd.apply(ctx(spec));
    const childIds = after.root.children.map(c => c.id);
    expect(childIds).not.toContain('a');
    expect(childIds).not.toContain('b');
    expect(childIds).toEqual(['g1']);
    const inv = cmd.invert!(before, after)!;
    const reverted = inv.apply(ctx(after));
    const rIds = reverted.root.children.map((c) => c.id);
    expect(rIds).toEqual(['a','b','g1']);
  });

  it('deletes nested nodes and restores correctly', () => {
    const spec = makeSpec();
    const before = cloneSpec(spec);
    const cmd = createDeleteNodesCommand({ ids: ['c','d'] });
    const after = cmd.apply(ctx(spec));
    const group = after.root.children.find(c => c.id === 'g1') as GroupNode | undefined;
    expect(group?.children.map(child => child.id)).toEqual([]);
    const inv = cmd.invert!(before, after)!;
    const reverted = inv.apply(ctx(after));
    const group2 = reverted.root.children.find(c => c.id === 'g1') as GroupNode | undefined;
    expect(group2?.children.map(child => child.id)).toEqual(['c','d']);
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
