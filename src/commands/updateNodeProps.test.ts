import { describe, it, expect } from 'vitest';
import { createUpdateNodePropsCommand } from './updateNodeProps';
import type { CommandContext } from './types';
import { cloneSpec } from './types';
import type { FrameNode, LayoutSpec, RectNode } from '../layout-schema';

function makeRect(id: string, x: number, fill?: string, stroke?: string): RectNode {
  return {
    id,
    type: 'rect',
    position: { x, y: 0 },
    size: { width: 100, height: 80 },
    ...(fill ? { fill } : {}),
    ...(stroke ? { stroke } : {}),
  };
}

function makeSpec(): LayoutSpec {
  return {
    root: {
      id: 'root',
      type: 'frame',
      size: { width: 400, height: 300 },
      children: [
        makeRect('a', 10, '#ffffff'),
        makeRect('b', 50, undefined, '#000000'),
      ],
    },
  };
}

function ctx(spec: LayoutSpec): CommandContext {
  return { spec, selection: [] };
}

function findRect(root: FrameNode, id: string): RectNode | undefined {
  return root.children.find((child): child is RectNode => child.type === 'rect' && child.id === id);
}

describe('UpdateNodePropsCommand', () => {
  it('applies shallow prop updates and produces an invertible command', () => {
    const spec = makeSpec();
    const before = cloneSpec(spec);
    const cmd = createUpdateNodePropsCommand({ id: 'a', props: { fill: '#ff0000', opacity: 0.5 } });
    const after = cmd.apply(ctx(spec));

    const nodeA = findRect(after.root, 'a');
    expect(nodeA).toBeDefined();
    expect(nodeA?.fill).toBe('#ff0000');
    expect(nodeA?.opacity).toBe(0.5);

    const inverse = cmd.invert!(before, after);
    expect(inverse).toBeDefined();
    if (!inverse) return;
    const reverted = inverse.apply({ spec: after, selection: [] });
    const revertedNode = findRect(reverted.root, 'a');
    expect(revertedNode).toBeDefined();
    expect(revertedNode?.fill).toBe('#ffffff');
    expect('opacity' in revertedNode!).toBe(false);
  });

  it('no-ops gracefully when node id missing', () => {
    const spec = makeSpec();
    const before = cloneSpec(spec);
    const cmd = createUpdateNodePropsCommand({ id: 'missing', props: { foo: 1 } });
    const after = cmd.apply(ctx(spec));
    expect(after).toEqual(spec);
    expect(cmd.invert!(before, after)).toBeNull();
  });
});
