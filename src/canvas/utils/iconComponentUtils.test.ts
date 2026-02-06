import { describe, it, expect } from 'vitest';
import {
  updateRootChildren,
  appendNodesToRoot,
  createIcon,
  createComponent,
  createImageNode,
} from './iconComponentUtils';
import type { LayoutNode, LayoutSpec } from '../../layout-schema';

describe('iconComponentUtils', () => {
  const createMockSpec = (): LayoutSpec => ({
    root: {
      id: 'root',
      type: 'box',
      children: [],
    },
    version: '1.0',
  });

  describe('updateRootChildren', () => {
    it('should update root children using updater function', () => {
      const spec = createMockSpec();
      const child: LayoutNode = { id: 'child1', type: 'text', value: 'Hello' };

      const updated = updateRootChildren(spec, (children) => [...children, child]);

      expect(updated.root.children).toHaveLength(1);
      expect(updated.root.children[0].id).toBe('child1');
      expect(updated).not.toBe(spec);
      expect(updated.root).not.toBe(spec.root);
    });

    it('should preserve other spec properties', () => {
      const spec = createMockSpec();
      const updated = updateRootChildren(spec, (children) => children);

      expect(updated.version).toBe(spec.version);
    });
  });

  describe('appendNodesToRoot', () => {
    it('should append nodes to root', () => {
      const spec = createMockSpec();
      const nodes: LayoutNode[] = [
        { id: 'node1', type: 'text', value: 'A' },
        { id: 'node2', type: 'text', value: 'B' },
      ];

      const updated = appendNodesToRoot(spec, nodes);

      expect(updated.root.children).toHaveLength(2);
      expect(updated.root.children[0].id).toBe('node1');
      expect(updated.root.children[1].id).toBe('node2');
    });

    it('should return same spec if nodes array is empty', () => {
      const spec = createMockSpec();
      const updated = appendNodesToRoot(spec, []);

      expect(updated).toBe(spec);
    });

    it('should preserve existing children', () => {
      const spec = createMockSpec();
      spec.root.children = [{ id: 'existing', type: 'text', value: 'Existing' }];

      const nodes: LayoutNode[] = [{ id: 'new', type: 'text', value: 'New' }];
      const updated = appendNodesToRoot(spec, nodes);

      expect(updated.root.children).toHaveLength(2);
      expect(updated.root.children[0].id).toBe('existing');
      expect(updated.root.children[1].id).toBe('new');
    });
  });

  describe('createIcon', () => {
    it('should create an icon node with default icon if no ID provided', () => {
      const worldPos = { x: 100, y: 200 };
      const iconNode = createIcon(worldPos);

      expect(iconNode).toBeDefined();
      expect(iconNode?.type).toBe('image');
      expect(iconNode?.position).toEqual(worldPos);
      expect(iconNode?.size).toEqual({ width: 32, height: 32 });
      expect(iconNode?.objectFit).toBe('contain');
      expect(iconNode?.src).toContain('data:image/svg+xml');
    });

    it('should create an icon with random ID', () => {
      const worldPos = { x: 0, y: 0 };
      const icon1 = createIcon(worldPos);
      const icon2 = createIcon(worldPos);

      expect(icon1?.id).toBeDefined();
      expect(icon2?.id).toBeDefined();
      expect(icon1?.id).not.toBe(icon2?.id);
    });

    it('should use selected icon ID if provided', () => {
      const worldPos = { x: 50, y: 50 };
      const iconNode = createIcon(worldPos, 'fa-home');

      expect(iconNode).toBeDefined();
      expect(iconNode?.type).toBe('image');
    });

    it('should encode SVG properly', () => {
      const worldPos = { x: 0, y: 0 };
      const iconNode = createIcon(worldPos);

      expect(iconNode?.src).toMatch(/^data:image\/svg\+xml;utf8,/);
      // SVG is URL-encoded, so check for encoded characters
      expect(iconNode?.src).toContain('%3Csvg');
      expect(iconNode?.src).toContain('%3C%2Fsvg%3E');
    });
  });

  describe('createComponent', () => {
    it('should create a component from template', () => {
      const worldPos = { x: 100, y: 200 };
      const rootNode: LayoutNode = {
        id: 'root',
        type: 'box',
        children: [],
      };

      const component = createComponent(worldPos, rootNode);

      expect(component).toBeDefined();
      expect(component?.type).toBe('group');
      expect(component?.name).toBeDefined();
    });

    it('should generate unique component names', () => {
      const worldPos = { x: 0, y: 0 };
      const rootNode: LayoutNode = {
        id: 'root',
        type: 'box',
        children: [],
      };

      const comp1 = createComponent(worldPos, rootNode);
      if (comp1) {
        rootNode.children = [comp1];
      }
      const comp2 = createComponent(worldPos, rootNode);

      expect(comp1?.name).toBeDefined();
      expect(comp2?.name).toBeDefined();
      expect(comp1?.name).not.toBe(comp2?.name);
    });

    it('should handle existing component names with counter', () => {
      const worldPos = { x: 0, y: 0 };
      const rootNode: LayoutNode = {
        id: 'root',
        type: 'box',
        children: [],
      };

      const comp1 = createComponent(worldPos, rootNode);
      const baseName = comp1?.name as string;

      rootNode.children = [comp1 as LayoutNode];
      const comp2 = createComponent(worldPos, rootNode);

      expect(comp2?.name).toMatch(/\d{2}$/); // Should end with 2-digit counter
    });
  });

  describe('createImageNode', () => {
    it('should create an image node with provided parameters', () => {
      const worldPos = { x: 150, y: 250 };
      const src = 'https://example.com/image.png';
      const width = 200;
      const height = 150;

      const imageNode = createImageNode(worldPos, src, width, height);

      expect(imageNode.type).toBe('image');
      expect(imageNode.position).toEqual(worldPos);
      expect(imageNode.size).toEqual({ width, height });
      expect(imageNode.src).toBe(src);
      expect(imageNode.alt).toBe('Image');
      expect(imageNode.objectFit).toBe('contain');
    });

    it('should generate unique IDs for images', () => {
      const worldPos = { x: 0, y: 0 };
      const image1 = createImageNode(worldPos, 'img1.png', 100, 100);
      const image2 = createImageNode(worldPos, 'img2.png', 100, 100);

      expect(image1.id).toBeDefined();
      expect(image2.id).toBeDefined();
      expect(image1.id).not.toBe(image2.id);
    });
  });
});
