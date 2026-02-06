import { describe, it, expect } from 'vitest';
import {
  findNode,
  getNodeBounds,
  getNodeWorldPosition,
  collectExistingIds,
  createUniqueIdFactory,
  cloneNode,
  remapIdsAndOffset,
  buildSelectionContext,
  makeId,
  isTextNode,
  isCurveNode,
  isGroupNode,
  type Bounds,
} from './canvasUtils';
import type { LayoutNode, LayoutSpec } from '../../layout-schema';

describe('canvasUtils', () => {
  describe('findNode', () => {
    it('should find a node by id', () => {
      const root: LayoutNode = {
        id: 'root',
        type: 'box',
        children: [
          { id: 'child1', type: 'text', value: 'Hello' },
          { id: 'child2', type: 'text', value: 'World' },
        ],
      };

      const found = findNode(root, 'child1');
      expect(found).toBeDefined();
      expect(found?.id).toBe('child1');
    });

    it('should return null if node not found', () => {
      const root: LayoutNode = {
        id: 'root',
        type: 'box',
        children: [],
      };

      const found = findNode(root, 'nonexistent');
      expect(found).toBeNull();
    });

    it('should find deeply nested nodes', () => {
      const root: LayoutNode = {
        id: 'root',
        type: 'box',
        children: [
          {
            id: 'level1',
            type: 'box',
            children: [
              {
                id: 'level2',
                type: 'box',
                children: [{ id: 'target', type: 'text', value: 'Found' }],
              },
            ],
          },
        ],
      };

      const found = findNode(root, 'target');
      expect(found).toBeDefined();
      expect(found?.id).toBe('target');
    });
  });

  describe('getNodeBounds', () => {
    it('should calculate bounds for a node with size', () => {
      const node: LayoutNode = {
        id: 'node1',
        type: 'box',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 50 },
      };

      const bounds = getNodeBounds(node);
      expect(bounds).toEqual({ x: 10, y: 20, width: 100, height: 50 });
    });

    it('should accumulate position offsets', () => {
      const node: LayoutNode = {
        id: 'node1',
        type: 'box',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 50 },
      };

      const bounds = getNodeBounds(node, 5, 15);
      expect(bounds).toEqual({ x: 15, y: 35, width: 100, height: 50 });
    });

    it('should calculate bounds from children if node has no size', () => {
      const node: LayoutNode = {
        id: 'parent',
        type: 'box',
        position: { x: 0, y: 0 },
        children: [
          {
            id: 'child1',
            type: 'box',
            position: { x: 10, y: 10 },
            size: { width: 50, height: 50 },
          },
          {
            id: 'child2',
            type: 'box',
            position: { x: 100, y: 100 },
            size: { width: 50, height: 50 },
          },
        ],
      };

      const bounds = getNodeBounds(node);
      expect(bounds).toEqual({ x: 10, y: 10, width: 140, height: 140 });
    });

    it('should return null for node without size or children', () => {
      const node: LayoutNode = {
        id: 'node1',
        type: 'text',
        value: 'Hello',
      };

      const bounds = getNodeBounds(node);
      expect(bounds).toBeNull();
    });
  });

  describe('getNodeWorldPosition', () => {
    it('should get world position of a root node', () => {
      const root: LayoutNode = {
        id: 'root',
        type: 'box',
        position: { x: 10, y: 20 },
      };

      const pos = getNodeWorldPosition(root, 'root');
      expect(pos).toEqual({ x: 10, y: 20 });
    });

    it('should accumulate positions for nested nodes', () => {
      const root: LayoutNode = {
        id: 'root',
        type: 'box',
        position: { x: 10, y: 20 },
        children: [
          {
            id: 'child',
            type: 'box',
            position: { x: 5, y: 15 },
          },
        ],
      };

      const pos = getNodeWorldPosition(root, 'child');
      expect(pos).toEqual({ x: 15, y: 35 });
    });

    it('should return null if node not found', () => {
      const root: LayoutNode = {
        id: 'root',
        type: 'box',
      };

      const pos = getNodeWorldPosition(root, 'nonexistent');
      expect(pos).toBeNull();
    });
  });

  describe('collectExistingIds', () => {
    it('should collect all IDs in the tree', () => {
      const root: LayoutNode = {
        id: 'root',
        type: 'box',
        children: [
          { id: 'child1', type: 'text', value: 'A' },
          {
            id: 'child2',
            type: 'box',
            children: [{ id: 'grandchild', type: 'text', value: 'B' }],
          },
        ],
      };

      const ids = collectExistingIds(root);
      expect(ids.size).toBe(4);
      expect(ids.has('root')).toBe(true);
      expect(ids.has('child1')).toBe(true);
      expect(ids.has('child2')).toBe(true);
      expect(ids.has('grandchild')).toBe(true);
    });
  });

  describe('createUniqueIdFactory', () => {
    it('should create unique IDs avoiding collisions', () => {
      const existing = new Set(['node', 'node-copy', 'node-copy-2']);
      const factory = createUniqueIdFactory(existing);

      const id = factory('node');
      expect(id).toBe('node-copy-3');
      expect(existing.has('node-copy-3')).toBe(true);
    });

    it('should create copy suffix for first duplicate', () => {
      const existing = new Set(['node']);
      const factory = createUniqueIdFactory(existing);

      const id = factory('node');
      expect(id).toBe('node-copy');
    });
  });

  describe('cloneNode', () => {
    it('should deep clone a node', () => {
      const node: LayoutNode = {
        id: 'original',
        type: 'box',
        position: { x: 10, y: 20 },
        children: [{ id: 'child', type: 'text', value: 'Hello' }],
      };

      const clone = cloneNode(node);
      expect(clone).toEqual(node);
      expect(clone).not.toBe(node);
      expect(clone.children?.[0]).not.toBe(node.children?.[0]);
    });
  });

  describe('remapIdsAndOffset', () => {
    it('should remap IDs and offset position', () => {
      const node: LayoutNode = {
        id: 'original',
        type: 'box',
        position: { x: 10, y: 20 },
        children: [{ id: 'child', type: 'text', value: 'Hello' }],
      };

      const makeId = (id: string) => `${id}-new`;
      const offset = { x: 5, y: 10 };

      const remapped = remapIdsAndOffset(node, offset, makeId);
      expect(remapped.id).toBe('original-new');
      expect(remapped.position).toEqual({ x: 15, y: 30 });
      expect(remapped.children?.[0].id).toBe('child-new');
      // Child position should not be offset (only root)
      expect(remapped.children?.[0].position).toBeUndefined();
    });
  });

  describe('buildSelectionContext', () => {
    it('should build parent and node lookups', () => {
      const root: LayoutNode = {
        id: 'root',
        type: 'box',
        children: [
          { id: 'child1', type: 'text', value: 'A' },
          {
            id: 'child2',
            type: 'box',
            children: [{ id: 'grandchild', type: 'text', value: 'B' }],
          },
        ],
      };

      const context = buildSelectionContext(root);
      expect(context.parentOf['root']).toBeNull();
      expect(context.parentOf['child1']).toBe('root');
      expect(context.parentOf['child2']).toBe('root');
      expect(context.parentOf['grandchild']).toBe('child2');
      expect(context.nodeById['child1']).toBeDefined();
      expect(context.nodeById['grandchild']).toBeDefined();
    });
  });

  describe('makeId', () => {
    it('should generate random ID with prefix', () => {
      const id = makeId('test');
      expect(id).toMatch(/^test_[a-z0-9]+$/);
    });

    it('should generate different IDs', () => {
      const id1 = makeId('test');
      const id2 = makeId('test');
      expect(id1).not.toBe(id2);
    });
  });

  describe('node type checkers', () => {
    it('should identify text nodes', () => {
      const textNode: LayoutNode = { id: '1', type: 'text', value: 'Hello' };
      const boxNode: LayoutNode = { id: '2', type: 'box' };
      expect(isTextNode(textNode)).toBe(true);
      expect(isTextNode(boxNode)).toBe(false);
    });

    it('should identify curve nodes', () => {
      const curveNode: LayoutNode = { id: '1', type: 'curve', points: [] };
      const boxNode: LayoutNode = { id: '2', type: 'box' };
      expect(isCurveNode(curveNode)).toBe(true);
      expect(isCurveNode(boxNode)).toBe(false);
    });

    it('should identify group nodes', () => {
      const groupNode: LayoutNode = { id: '1', type: 'group', children: [] };
      const boxNode: LayoutNode = { id: '2', type: 'box' };
      expect(isGroupNode(groupNode)).toBe(true);
      expect(isGroupNode(boxNode)).toBe(false);
    });
  });
});
