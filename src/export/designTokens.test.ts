/**
 * Tests for Design Tokens Extractor
 */

import { describe, it, expect } from 'vitest';
import { extractDesignTokens, exportToStyleDictionary, exportToCSS } from './designTokens';
import type { LayoutSpec } from '../layout-schema';

describe('designTokens', () => {
  describe('extractDesignTokens', () => {
    it('should extract colors from nodes', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          background: '#ffffff',
          children: [
            {
              id: 'rect1',
              type: 'rect',
              position: { x: 10, y: 10 },
              size: { width: 100, height: 100 },
              fill: '#ff0000',
              stroke: '#000000',
            },
          ],
        },
      };

      const tokens = extractDesignTokens(spec);
      expect(tokens.color).toBeDefined();
      expect(Object.keys(tokens.color || {}).length).toBeGreaterThan(0);
      
      // Check that colors are extracted
      const colorValues = Object.values(tokens.color || {}).map(t => t.value);
      expect(colorValues).toContain('#ff0000');
      expect(colorValues).toContain('#000000');
      expect(colorValues).toContain('#ffffff');
    });

    it('should extract typography from text nodes', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [
            {
              id: 'text1',
              type: 'text',
              text: 'Hello',
              size: { width: 100, height: 30 },
              fontSize: 16,
              fontFamily: 'Arial',
              fontWeight: 'bold',
            },
            {
              id: 'text2',
              type: 'text',
              text: 'World',
              size: { width: 100, height: 30 },
              fontSize: 24,
            },
          ],
        },
      };

      const tokens = extractDesignTokens(spec);
      expect(tokens.typography).toBeDefined();
      
      // Should have font sizes
      const typographyTokens = Object.values(tokens.typography || {});
      const fontSizes = typographyTokens
        .map(t => t.value.fontSize)
        .filter(Boolean);
      
      expect(fontSizes).toContain('16px');
      expect(fontSizes).toContain('24px');
    });

    it('should extract spacing values', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          padding: 20,
          children: [
            {
              id: 'stack1',
              type: 'stack',
              gap: 10,
              children: [],
            },
          ],
        },
      };

      const tokens = extractDesignTokens(spec);
      expect(tokens.spacing).toBeDefined();
      
      const spacingValues = Object.values(tokens.spacing || {}).map(t => t.value);
      expect(spacingValues).toContain('10px');
      expect(spacingValues).toContain('20px');
    });

    it('should extract border radius values', () => {
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
              radius: 8,
            },
            {
              id: 'rect2',
              type: 'rect',
              position: { x: 120, y: 10 },
              size: { width: 100, height: 100 },
              radius: 16,
            },
          ],
        },
      };

      const tokens = extractDesignTokens(spec);
      expect(tokens.borderRadius).toBeDefined();
      
      const radiusValues = Object.values(tokens.borderRadius || {}).map(t => t.value);
      expect(radiusValues).toContain('8px');
      expect(radiusValues).toContain('16px');
    });

    it('should extract opacity values', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          opacity: 1,
          children: [
            {
              id: 'rect1',
              type: 'rect',
              position: { x: 10, y: 10 },
              size: { width: 100, height: 100 },
              opacity: 0.5,
            },
            {
              id: 'rect2',
              type: 'rect',
              position: { x: 120, y: 10 },
              size: { width: 100, height: 100 },
              opacity: 0.8,
            },
          ],
        },
      };

      const tokens = extractDesignTokens(spec);
      expect(tokens.opacity).toBeDefined();
      
      const opacityValues = Object.values(tokens.opacity || {}).map(t => t.value);
      expect(opacityValues).toContain(0.5);
      expect(opacityValues).toContain(0.8);
      expect(opacityValues).toContain(1);
    });

    it('should deduplicate similar values', () => {
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
            },
            {
              id: 'rect2',
              type: 'rect',
              position: { x: 120, y: 10 },
              size: { width: 100, height: 100 },
              fill: '#ff0000', // Same color
            },
          ],
        },
      };

      const tokens = extractDesignTokens(spec, { deduplicate: true });
      expect(tokens.color).toBeDefined();
      
      // Should only have one token for the duplicated color
      const redTokens = Object.values(tokens.color || {})
        .filter(t => t.value === '#ff0000');
      
      expect(redTokens.length).toBe(1);
    });

    it('should generate semantic names when enabled', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [
            {
              id: 'text1',
              type: 'text',
              text: 'Title',
              size: { width: 100, height: 30 },
              fontSize: 24,
            },
          ],
        },
      };

      const tokens = extractDesignTokens(spec, { semantic: true });
      expect(tokens.typography).toBeDefined();
      
      // Should use semantic names like text-2xl for 24px
      const tokenNames = Object.keys(tokens.typography || {});
      expect(tokenNames.some(name => name.includes('text-'))).toBe(true);
    });

    it('should handle empty specs', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
      };

      const tokens = extractDesignTokens(spec);
      
      // Should return an object but may be empty
      expect(tokens).toBeDefined();
      expect(typeof tokens).toBe('object');
    });
  });

  describe('exportToStyleDictionary', () => {
    it('should export tokens to style-dictionary format', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          background: '#ffffff',
          children: [],
        },
      };

      const tokens = extractDesignTokens(spec);
      const json = exportToStyleDictionary(tokens);
      
      expect(json).toBeTruthy();
      expect(() => JSON.parse(json)).not.toThrow();
      
      const parsed = JSON.parse(json);
      expect(typeof parsed).toBe('object');
    });

    it('should produce valid JSON', () => {
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
            },
          ],
        },
      };

      const tokens = extractDesignTokens(spec);
      const json = exportToStyleDictionary(tokens);
      
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe('exportToCSS', () => {
    it('should export tokens to CSS custom properties', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          background: '#ffffff',
          children: [],
        },
      };

      const tokens = extractDesignTokens(spec);
      const css = exportToCSS(tokens);
      
      expect(css).toContain(':root {');
      expect(css).toContain('}');
      expect(css).toContain('--');
    });

    it('should include color variables', () => {
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
            },
          ],
        },
      };

      const tokens = extractDesignTokens(spec);
      const css = exportToCSS(tokens);
      
      expect(css).toContain('#ff0000');
    });

    it('should include spacing variables', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          padding: 16,
          children: [],
        },
      };

      const tokens = extractDesignTokens(spec);
      const css = exportToCSS(tokens);
      
      expect(css).toContain('16px');
    });

    it('should format CSS properties correctly', () => {
      const spec: LayoutSpec = {
        root: {
          id: 'root',
          type: 'frame',
          size: { width: 800, height: 600 },
          background: '#ffffff',
          children: [],
        },
      };

      const tokens = extractDesignTokens(spec);
      const css = exportToCSS(tokens);
      
      // Check CSS syntax
      const lines = css.split('\n');
      expect(lines[0]).toBe(':root {');
      expect(lines[lines.length - 1]).toBe('}');
      
      // Check that property lines have correct format
      const propertyLines = lines.slice(1, -1).filter(l => l.trim());
      propertyLines.forEach(line => {
        if (line.trim()) {
          expect(line).toMatch(/^\s+--[\w-]+:\s+.+;$/);
        }
      });
    });
  });
});
