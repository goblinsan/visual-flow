import { describe, it, expect } from 'vitest';
import { findNode, updateNode, type SpecNode } from './specUtils';

const tree: SpecNode = {
  id: 'root', type: 'frame', children: [
    { id: 'a', type: 'rect', width: 10 },
    { id: 'b', type: 'group', children: [
      { id: 'b1', type: 'rect', width: 20 },
      { id: 'b2', type: 'rect', width: 30 },
    ]},
  ]
};

describe('specUtils.findNode', () => {
  it('finds shallow node', () => {
    expect(findNode(tree, 'a')?.id).toBe('a');
  });
  it('finds deep node', () => {
    expect(findNode(tree, 'b2')?.id).toBe('b2');
  });
  it('returns null for missing', () => {
    expect(findNode(tree, 'zzz')).toBeNull();
  });
});

describe('specUtils.updateNode', () => {
  it('updates targeted node immutably (leaf)', () => {
    const updated = updateNode(tree, 'a', { width: 42 });
    expect(updated).not.toBe(tree);
    const aOld = tree.children![0];
    const aNew = updated.children![0];
    expect(aOld.width).toBe(10);
    expect(aNew.width).toBe(42);
  });
  it('updates deep node without recreating untouched siblings', () => {
    const updated = updateNode(tree, 'b2', { width: 88 });
    const bOld = tree.children![1];
    const bNew = updated.children![1];
    expect(bNew).not.toBe(bOld); // group changed due to child change
    if (!bOld.children || !bNew.children) {
      throw new Error('Group children missing in fixture');
    }
    const b1Old = bOld.children[0];
    const b1New = bNew.children[0];
    expect(b1New).toBe(b1Old); // untouched child reference stable
  });
  it('returns same root reference when id not found', () => {
    const updated = updateNode(tree, 'missing', { foo: 1 });
    expect(updated).toBe(tree);
  });
});
