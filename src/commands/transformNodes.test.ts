import { describe, it, expect } from 'vitest';
import { createTransformNodesCommand } from './transformNodes';
import type { CommandContext } from './types';
import { cloneSpec } from './types';
import type { FrameNode, LayoutSpec, RectNode, TextNode } from '../layout-schema';

function makeSpec(): LayoutSpec {
  return {
    root: {
      id: 'root',
      type: 'frame',
      size: { width: 400, height: 300 },
      children: [
        {
          id: 'a',
          type: 'rect',
          position: { x: 0, y: 0 },
          size: { width: 50, height: 40 },
          rotation: 0,
        } as RectNode,
        {
          id: 'b',
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 80, height: 30 },
          rotation: 0,
          textScaleX: 1,
          textScaleY: 1,
        } as TextNode,
      ],
    },
  };
}

function ctx(spec: LayoutSpec): CommandContext {
  return { spec, selection: [] };
}

function findRectById(root: FrameNode, id: string): RectNode | undefined {
  return root.children.find((child): child is RectNode => child.type === 'rect' && child.id === id);
}

function findTextById(root: FrameNode, id: string): TextNode | undefined {
  return root.children.find((child): child is TextNode => child.type === 'text' && child.id === id);
}

describe('TransformNodesCommand', () => {
  it('applies position/size/rotation and inverts', () => {
    const spec = makeSpec();
    const before = cloneSpec(spec);
    const cmd = createTransformNodesCommand({
      updates: [
        { id: 'a', position: { x: 10, y: 5 }, size: { width: 60, height: 55 }, rotation: 45 },
        { id: 'b', position: { x: 120, y: 110 }, textScaleX: 1.2, textScaleY: 0.9 },
      ],
    });
    const after = cmd.apply(ctx(spec));

    const a = findRectById(after.root, 'a');
    expect(a).toBeDefined();
    expect(a?.position).toEqual({ x: 10, y: 5 });
    expect(a?.size).toEqual({ width: 60, height: 55 });
    expect(a?.rotation).toBe(45);

    const b = findTextById(after.root, 'b');
    expect(b).toBeDefined();
    expect(b?.position).toEqual({ x: 120, y: 110 });
    expect(b?.textScaleX).toBe(1.2);
    expect(b?.textScaleY).toBe(0.9);

    const inv = cmd.invert!(before, after)!;
    const reverted = inv.apply(ctx(after));

    const ar = findRectById(reverted.root, 'a');
    expect(ar).toBeDefined();
    expect(ar?.position).toEqual({ x: 0, y: 0 });
    expect(ar?.size).toEqual({ width: 50, height: 40 });
    expect(ar?.rotation).toBe(0);

    const br = findTextById(reverted.root, 'b');
    expect(br).toBeDefined();
    expect(br?.position).toEqual({ x: 100, y: 100 });
    expect(br?.textScaleX).toBe(1);
    expect(br?.textScaleY).toBe(1);
  });

  it('no-ops when updates empty', () => {
    const spec = makeSpec();
    const before = cloneSpec(spec);
    const cmd = createTransformNodesCommand({ updates: [] });
    const after = cmd.apply(ctx(spec));
    expect(after).toBe(spec);
    expect(cmd.invert!(before, after)).toBeNull();
  });
});
