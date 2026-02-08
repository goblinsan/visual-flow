/**
 * Tests for React + Tailwind Exporter
 */

import { describe, it, expect } from 'vitest';
import { exportToReact } from './reactExporter';
import type { LayoutSpec } from '../layout-schema';

describe('reactExporter', () => {
  describe('exportToReact', () => {
    it('should export a simple frame', () => {
      const spec: LayoutSpec = {
        version: '1.0.0',
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
      };

      const code = exportToReact(spec);
      expect(code).toContain('import React');
      expect(code).toContain('export const DesignComponent');
      expect(code).toContain('return');
      expect(code).toContain('<div');
    });

    it('should export with custom component name', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
      };

      const code = exportToReact(spec, { componentName: 'MyComponent' });
      expect(code).toContain('export const MyComponent');
      expect(code).not.toContain('DesignComponent');
    });

    it('should include TypeScript types by default', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
      };

      const code = exportToReact(spec);
      expect(code).toContain('import React, type FC from');
      expect(code).toContain(': FC');
    });

    it('should exclude TypeScript types when disabled', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
      };

      const code = exportToReact(spec, { typescript: false });
      expect(code).not.toContain('type FC');
      expect(code).not.toContain(': FC');
    });

    it('should export a rect node', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [
            {
              id: 'rect1',
              type: 'rect',
              position: { x: 10, y: 10 },
              size: { width: 100, height: 100 },
              fill: '#ff0000',
              stroke: '#000000',
              strokeWidth: 2,
              radius: 5,
            },
          ],
        },
      };

      const code = exportToReact(spec);
      expect(code).toContain('backgroundColor');
      expect(code).toContain('#ff0000');
      expect(code).toContain('border');
      expect(code).toContain('borderRadius');
    });

    it('should export a text node', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [
            {
              id: 'text1',
              type: 'text',
              text: 'Hello World',
              position: { x: 20, y: 20 },
              size: { width: 200, height: 50 },
              color: '#000000',
              fontSize: 16,
              fontWeight: 'bold',
            },
          ],
        },
      };

      const code = exportToReact(spec);
      expect(code).toContain('Hello World');
      expect(code).toContain('font-bold');
      expect(code).toContain('fontSize');
    });

    it('should export a stack layout', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [
            {
              id: 'stack1',
              type: 'stack',
              direction: 'column',
              gap: 10,
              children: [
                {
                  id: 'text1',
                  type: 'text',
                  text: 'Item 1',
                  size: { width: 100, height: 30 },
                },
                {
                  id: 'text2',
                  type: 'text',
                  text: 'Item 2',
                  size: { width: 100, height: 30 },
                },
              ],
            },
          ],
        },
      };

      const code = exportToReact(spec);
      expect(code).toContain('flex');
      expect(code).toContain('flex-col');
      expect(code).toContain('gap');
      expect(code).toContain('Item 1');
      expect(code).toContain('Item 2');
    });

    it('should export with comments when enabled', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          name: 'Main Frame',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
      };

      const code = exportToReact(spec, { comments: true });
      expect(code).toContain('/* Frame: Main Frame */');
    });

    it('should export without comments when disabled', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          name: 'Main Frame',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
      };

      const code = exportToReact(spec, { comments: false });
      expect(code).not.toContain('/*');
    });

    it('should export an image node', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [
            {
              id: 'img1',
              type: 'image',
              src: 'https://example.com/image.png',
              alt: 'Example image',
              position: { x: 10, y: 10 },
              size: { width: 200, height: 150 },
            },
          ],
        },
      };

      const code = exportToReact(spec);
      expect(code).toContain('<img');
      expect(code).toContain('src="https://example.com/image.png"');
      expect(code).toContain('alt="Example image"');
    });

    it('should export nested groups', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [
            {
              id: 'group1',
              type: 'group',
              children: [
                {
                  id: 'rect1',
                  type: 'rect',
                  position: { x: 10, y: 10 },
                  size: { width: 50, height: 50 },
                  fill: '#00ff00',
                },
              ],
            },
          ],
        },
      };

      const code = exportToReact(spec);
      expect(code).toContain('relative');
      expect(code).toContain('#00ff00');
    });

    it('should handle ellipse nodes', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [
            {
              id: 'ellipse1',
              type: 'ellipse',
              position: { x: 50, y: 50 },
              size: { width: 80, height: 60 },
              fill: '#0000ff',
            },
          ],
        },
      };

      const code = exportToReact(spec);
      expect(code).toContain('rounded-full');
      expect(code).toContain('#0000ff');
    });
  });
});
