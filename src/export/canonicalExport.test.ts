/**
 * Tests for JSON Canonical Export
 */

import { describe, it, expect } from 'vitest';
import { exportToJSON, importFromJSON, validateRoundTrip } from './canonicalExport';
import type { LayoutSpec } from '../layout-schema';

describe('canonicalExport', () => {
  describe('exportToJSON', () => {
    it('should export a simple spec', () => {
      const spec: LayoutSpec = {
        version: '1.0.0',
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
      };

      const json = exportToJSON(spec);
      expect(json).toBeTruthy();
      expect(json).toContain('"version": "1.0.0"');
      expect(json).toContain('"type": "frame"');
    });

    it('should include metadata by default', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
      };

      const json = exportToJSON(spec);
      expect(json).toContain('"metadata"');
      expect(json).toContain('"exportedAt"');
      expect(json).toContain('"exportVersion"');
    });

    it('should exclude metadata when specified', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
      };

      const json = exportToJSON(spec, { includeMetadata: false });
      expect(json).not.toContain('"metadata"');
    });

    it('should pretty-print by default', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
      };

      const json = exportToJSON(spec);
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('should minify when pretty is false', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
      };

      const json = exportToJSON(spec, { pretty: false, includeMetadata: false });
      expect(json).not.toContain('\n  ');
    });
  });

  describe('importFromJSON', () => {
    it('should import a wrapped export', () => {
      const original: LayoutSpec = {
        version: '1.0.0',
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
      };

      const json = exportToJSON(original);
      const imported = importFromJSON(json);

      expect(imported).toBeTruthy();
      expect(imported.version).toBe('1.0.0');
      expect(imported.root.type).toBe('frame');
    });

    it('should import a direct spec format', () => {
      const spec: LayoutSpec = {
        version: '1.0.0',
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
      };

      const json = JSON.stringify(spec);
      const imported = importFromJSON(json);

      expect(imported).toBeTruthy();
      expect(imported.version).toBe('1.0.0');
      expect(imported.root.type).toBe('frame');
    });

    it('should throw on invalid JSON', () => {
      expect(() => importFromJSON('invalid json')).toThrow();
    });

    it('should throw on JSON without spec or root', () => {
      expect(() => importFromJSON('{}')).toThrow('Invalid export format');
    });
  });

  describe('validateRoundTrip', () => {
    it('should validate a simple spec round-trip', () => {
      const spec: LayoutSpec = {
        version: '1.0.0',
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
      };

      const result = validateRoundTrip(spec);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a complex spec with nested children', () => {
      const spec: LayoutSpec = {
        version: '1.0.0',
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

      const result = validateRoundTrip(spec);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate spec with all node types', () => {
      const spec: LayoutSpec = {
        version: '1.0.0',
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 1000, height: 800 },
          children: [
            {
              id: 'group1',
              type: 'group',
              children: [
                {
                  id: 'ellipse1',
                  type: 'ellipse',
                  position: { x: 50, y: 50 },
                  size: { width: 80, height: 60 },
                  fill: '#00ff00',
                },
              ],
            },
            {
              id: 'stack1',
              type: 'stack',
              direction: 'column',
              gap: 10,
              children: [],
            },
            {
              id: 'line1',
              type: 'line',
              points: [0, 0, 100, 100],
              stroke: '#0000ff',
              strokeWidth: 2,
            },
          ],
        },
      };

      const result = validateRoundTrip(spec);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle optional fields', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
          padding: 10,
          background: '#ffffff',
        },
      };

      const result = validateRoundTrip(spec);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
