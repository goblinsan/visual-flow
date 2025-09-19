import { describe, it, expect } from 'vitest';
import { createUpdateNodePropsCommand } from './updateNodeProps';
import type { CommandContext } from './types';
import { cloneSpec } from './types';

const baseSpec = {
  root: {
    id: 'root',
    type: 'root',
    children: [
      { id: 'a', type: 'rect', position: { x: 10, y: 20 }, size: { width: 100, height: 80 }, fill: '#ffffff' },
      { id: 'b', type: 'rect', position: { x: 50, y: 60 }, size: { width: 120, height: 90 }, stroke: '#000000' }
    ]
  }
} as any;

function makeCtx(spec = baseSpec): CommandContext {
  return { spec, selection: [] };
}

describe('UpdateNodePropsCommand', () => {
  it('applies shallow prop updates and produces an invertible command', () => {
    const specClone = cloneSpec(baseSpec);
    const cmd = createUpdateNodePropsCommand({ id: 'a', props: { fill: '#ff0000', opacity: 0.5 } });
    const before = specClone;
    const after = cmd.apply(makeCtx(specClone));
  const nodeA = after.root.children.find((c: any) => c.id === 'a') as any;
  expect(nodeA).toBeTruthy();
  expect(nodeA.fill).toBe('#ff0000');
  expect(nodeA.opacity).toBe(0.5);

  const inverse = cmd.invert!(before, after);
    expect(inverse).toBeTruthy();
    if (!inverse) return;
    const reverted = inverse.apply({ spec: after, selection: [] });
  const revertedNodeA = reverted.root.children.find((c: any) => c.id === 'a') as any;
  expect(revertedNodeA).toBeTruthy();
  // original had fill #ffffff and no opacity key
  expect(revertedNodeA.fill).toBe('#ffffff');
  expect('opacity' in revertedNodeA).toBe(false);
  });

  it('no-ops gracefully when node id missing', () => {
    const specClone = cloneSpec(baseSpec);
    const cmd = createUpdateNodePropsCommand({ id: 'missing', props: { foo: 1 } });
    const after = cmd.apply(makeCtx(specClone));
    expect(after).toEqual(specClone);
  });
});
