import { describe, it, expect } from 'vitest';
import { createUngroupNodeCommand } from './ungroupNode';
import type { CommandContext } from './types';
import { cloneSpec } from './types';
import type { FrameNode, GroupNode, LayoutNode, LayoutSpec, RectNode } from '../layout-schema';

function rectNode(id: string, x: number): RectNode {
  return {
    id,
    type: 'rect',
    position: { x, y: 0 },
    size: { width: 10, height: 10 },
  };
}

function groupNode(id: string, children: LayoutNode[]): GroupNode {
  return { id, type: 'group', children };
}

function makeSpec(): LayoutSpec {
  return {
    root: {
      id: 'root',
      type: 'frame',
      size: { width: 400, height: 200 },
      children: [
        groupNode('g1', [rectNode('a', 0), rectNode('b', 10)]),
        rectNode('c', 40),
      ],
    },
  };
}

function ctx(spec: LayoutSpec): CommandContext {
  return { spec, selection: [] };
}

function listChildIds(root: FrameNode): string[] {
  return root.children.map((child) => child.id);
}

function findGroup(root: FrameNode, id: string): GroupNode | undefined {
  return root.children.find((child): child is GroupNode => child.type === 'group' && child.id === id);
}

describe('UngroupNodeCommand', () => {
  it('ungroups a group node and inverts to recreate it', () => {
    const spec = makeSpec();
    const before = cloneSpec(spec);
    const cmd = createUngroupNodeCommand({ id: 'g1' });
    const after = cmd.apply(ctx(spec));
    const ids = listChildIds(after.root);
    expect(ids).toEqual(['a', 'b', 'c']);

    const inv = cmd.invert!(before, after)!;
    const reverted = inv.apply(ctx(after));
    const revertedIds = listChildIds(reverted.root);
    expect(revertedIds[0]).toBe('g1');
    const group = findGroup(reverted.root, 'g1');
    expect(group).toBeDefined();
    expect(group?.children.map((child) => child.id)).toEqual(['a', 'b']);
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
