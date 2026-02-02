/**
 * Tests for Yjs-LayoutSpec conversion layer
 */

import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { layoutSpecToYjs, yjsToLayoutSpec } from './yjsConversion';
import type { LayoutSpec } from '../layout-schema';

describe('yjsConversion', () => {
  it('should convert simple LayoutSpec to Yjs and back', () => {
    const spec: LayoutSpec = {
      version: '1.0.0',
      root: {
        id: 'root',
        type: 'frame',
        size: { width: 800, height: 600 },
        children: [],
      },
    };

    const ydoc = new Y.Doc();
    layoutSpecToYjs(spec, ydoc);

    const result = yjsToLayoutSpec(ydoc);

    expect(result.version).toBe('1.0.0');
    expect(result.root.id).toBe('root');
    expect(result.root.type).toBe('frame');
    expect(result.root.size).toEqual({ width: 800, height: 600 });
    expect(result.root.children).toEqual([]);
  });

  it('should convert LayoutSpec with nested children', () => {
    const spec: LayoutSpec = {
      version: '1.0.0',
      root: {
        id: 'root',
        type: 'frame',
        size: { width: 800, height: 600 },
        children: [
          {
            id: 'rect-1',
            type: 'rect',
            position: { x: 100, y: 100 },
            size: { width: 200, height: 150 },
            fill: '#ff0000',
          },
          {
            id: 'text-1',
            type: 'text',
            position: { x: 50, y: 50 },
            size: { width: 100, height: 30 },
            text: 'Hello World',
          },
        ],
      },
    };

    const ydoc = new Y.Doc();
    layoutSpecToYjs(spec, ydoc);

    const result = yjsToLayoutSpec(ydoc);

    expect(result.root.children).toHaveLength(2);
    expect(result.root.children![0].id).toBe('rect-1');
    expect(result.root.children![0].type).toBe('rect');
    expect((result.root.children![0] as any).fill).toBe('#ff0000');
    expect(result.root.children![1].id).toBe('text-1');
    expect((result.root.children![1] as any).text).toBe('Hello World');
  });

  it('should convert LayoutSpec with deeply nested groups', () => {
    const spec: LayoutSpec = {
      version: '1.0.0',
      root: {
        id: 'root',
        type: 'frame',
        size: { width: 800, height: 600 },
        children: [
          {
            id: 'group-1',
            type: 'group',
            children: [
              {
                id: 'rect-1',
                type: 'rect',
                position: { x: 10, y: 10 },
                size: { width: 50, height: 50 },
                fill: '#00ff00',
              },
              {
                id: 'rect-2',
                type: 'rect',
                position: { x: 70, y: 10 },
                size: { width: 50, height: 50 },
                fill: '#0000ff',
              },
            ],
          },
        ],
      },
    };

    const ydoc = new Y.Doc();
    layoutSpecToYjs(spec, ydoc);

    const result = yjsToLayoutSpec(ydoc);

    expect(result.root.children).toHaveLength(1);
    const group = result.root.children![0];
    expect(group.id).toBe('group-1');
    expect(group.type).toBe('group');
    expect((group as any).children).toHaveLength(2);
    expect((group as any).children[0].id).toBe('rect-1');
    expect((group as any).children[1].id).toBe('rect-2');
  });

  it('should preserve all node properties', () => {
    const spec: LayoutSpec = {
      version: '1.0.0',
      root: {
        id: 'root',
        type: 'frame',
        size: { width: 800, height: 600 },
        background: '#ffffff',
        padding: 20,
        children: [
          {
            id: 'rect-1',
            type: 'rect',
            position: { x: 100, y: 100 },
            size: { width: 200, height: 150 },
            fill: '#ff0000',
            stroke: '#000000',
            strokeWidth: 2,
            radius: 5,
            opacity: 0.8,
            rotation: 45,
            visible: true,
            locked: false,
          },
        ],
      },
    };

    const ydoc = new Y.Doc();
    layoutSpecToYjs(spec, ydoc);

    const result = yjsToLayoutSpec(ydoc);

    const rect = result.root.children![0] as any;
    expect(rect.fill).toBe('#ff0000');
    expect(rect.stroke).toBe('#000000');
    expect(rect.strokeWidth).toBe(2);
    expect(rect.radius).toBe(5);
    expect(rect.opacity).toBe(0.8);
    expect(rect.rotation).toBe(45);
    expect(rect.visible).toBe(true);
    expect(rect.locked).toBe(false);
  });

  it('should handle flows', () => {
    const spec: LayoutSpec = {
      version: '1.0.0',
      root: {
        id: 'root',
        type: 'frame',
        size: { width: 800, height: 600 },
        children: [],
      },
      flows: [
        {
          id: 'flow-1',
          name: 'Main Flow',
          screenIds: ['screen-1', 'screen-2'],
          transitions: [
            {
              id: 'trans-1',
              from: 'screen-1',
              to: 'screen-2',
              trigger: 'click',
              animation: 'fade',
              durationMs: 300,
              easing: 'ease-in-out',
            },
          ],
        },
      ],
    };

    const ydoc = new Y.Doc();
    layoutSpecToYjs(spec, ydoc);

    const result = yjsToLayoutSpec(ydoc);

    expect(result.flows).toHaveLength(1);
    expect(result.flows![0].id).toBe('flow-1');
    expect(result.flows![0].name).toBe('Main Flow');
    expect(result.flows![0].transitions).toHaveLength(1);
  });

  it('should store metadata correctly', () => {
    const spec: LayoutSpec = {
      version: '1.0.0',
      root: {
        id: 'root',
        type: 'frame',
        size: { width: 800, height: 600 },
        children: [],
      },
    };

    const ydoc = new Y.Doc();
    layoutSpecToYjs(spec, ydoc);

    const yMeta = ydoc.getMap('meta');
    expect(yMeta.get('rootId')).toBe('root');
    expect(yMeta.get('version')).toBe('1.0.0');
    expect(yMeta.get('lastModified')).toBeDefined();
  });

  it('should handle children order preservation', () => {
    const spec: LayoutSpec = {
      version: '1.0.0',
      root: {
        id: 'root',
        type: 'frame',
        size: { width: 800, height: 600 },
        children: [
          { id: 'node-1', type: 'rect', position: { x: 0, y: 0 }, size: { width: 10, height: 10 } },
          { id: 'node-2', type: 'rect', position: { x: 0, y: 0 }, size: { width: 10, height: 10 } },
          { id: 'node-3', type: 'rect', position: { x: 0, y: 0 }, size: { width: 10, height: 10 } },
        ],
      },
    };

    const ydoc = new Y.Doc();
    layoutSpecToYjs(spec, ydoc);

    const result = yjsToLayoutSpec(ydoc);

    expect(result.root.children!.map(c => c.id)).toEqual(['node-1', 'node-2', 'node-3']);
  });

  it('should throw error if root is not a frame', () => {
    const ydoc = new Y.Doc();
    const yNodes = ydoc.getMap<Y.Map<any>>('nodes');
    const yMeta = ydoc.getMap<any>('meta');

    yMeta.set('rootId', 'root');
    const rootProps = new Y.Map();
    rootProps.set('id', 'root');
    rootProps.set('type', 'rect'); // Not a frame!
    yNodes.set('root', rootProps);

    expect(() => yjsToLayoutSpec(ydoc)).toThrow('Root node must be a FrameNode');
  });
});
