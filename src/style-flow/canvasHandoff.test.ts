/**
 * Tests for Phase 5 canvas handoff (#192)
 */

import { describe, it, expect } from 'vitest';
import { buildCanvasScene } from './canvasHandoff';
import type { StyleConcept, ButtonStyle, NavigationStyle } from './types';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_CONCEPT: StyleConcept = {
  id: 'concept-minimal-technology-0',
  name: 'Clean Vision',
  tagline: 'A minimal, technology-focused style.',
  recommendation: {
    id: 'rec-minimal-0',
    name: 'Minimal Tech',
    description: 'Clean palette.',
    confidence: 0.95,
    swatches: [
      { role: 'primary', hex: '#1A1A2E' },
      { role: 'secondary', hex: '#16213E' },
      { role: 'accent', hex: '#0F3460' },
      { role: 'highlight', hex: '#E94560' },
      { role: 'surface', hex: '#FFFFFF' },
      { role: 'text', hex: '#111111' },
    ],
    typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSizePx: 16, lineHeight: 1.6 },
    tokens: [
      { name: 'color-primary', value: '#1A1A2E' },
      { name: 'color-surface', value: '#FFFFFF' },
      { name: 'color-text', value: '#111111' },
    ],
  },
  typographyPairingId: 'modern-sans',
  buttonStyleId: 'rounded',
  navigationStyleId: 'top-bar',
};

const MOCK_BUTTON_STYLE: ButtonStyle = {
  id: 'rounded',
  name: 'Rounded',
  description: 'Soft rounded corners.',
  borderRadius: '8px',
  fontWeight: '600',
  paddingX: '1rem',
  outlined: false,
};

const MOCK_NAV_STYLE: NavigationStyle = {
  id: 'top-bar',
  name: 'Top Bar',
  description: 'Classic horizontal navigation bar.',
  variant: 'top-bar',
};

// ── buildCanvasScene ──────────────────────────────────────────────────────────

describe('buildCanvasScene', () => {
  it('returns a LayoutSpec with a root FrameNode', () => {
    const spec = buildCanvasScene(MOCK_CONCEPT);
    expect(spec.root).toBeTruthy();
    expect(spec.root.type).toBe('frame');
  });

  it('sets schema version to "1.0.0"', () => {
    const spec = buildCanvasScene(MOCK_CONCEPT);
    expect(spec.version).toBe('1.0.0');
  });

  it('root frame uses concept secondary as background', () => {
    const spec = buildCanvasScene(MOCK_CONCEPT);
    expect(spec.root.background).toBe('#16213E');
  });

  it('root frame has the default width of 1280 and height of 800', () => {
    const spec = buildCanvasScene(MOCK_CONCEPT);
    expect(spec.root.size.width).toBe(1280);
    expect(spec.root.size.height).toBe(800);
  });

  it('respects custom width and height options', () => {
    const spec = buildCanvasScene(MOCK_CONCEPT, null, null, { width: 1024, height: 768 });
    expect(spec.root.size.width).toBe(1024);
    expect(spec.root.size.height).toBe(768);
  });

  it('root frame name matches the concept name', () => {
    const spec = buildCanvasScene(MOCK_CONCEPT);
    expect(spec.root.name).toBe('Clean Vision');
  });

  it('root frame has children', () => {
    const spec = buildCanvasScene(MOCK_CONCEPT);
    expect(spec.root.children.length).toBeGreaterThan(0);
  });

  it('includes a colour swatch rect for each swatch in the recommendation', () => {
    const spec = buildCanvasScene(MOCK_CONCEPT);
    const swatchRects = spec.root.children.filter(
      (n) => n.type === 'rect' && (n.id as string).includes('swatch') && !(n.id as string).includes('nav'),
    );
    expect(swatchRects.length).toBe(MOCK_CONCEPT.recommendation.swatches.length);
  });

  it('includes text nodes for swatch role labels', () => {
    const spec = buildCanvasScene(MOCK_CONCEPT);
    const roleLabels = spec.root.children.filter(
      (n) => n.type === 'text' && (n.id as string).includes('swatch') && (n.id as string).includes('label'),
    );
    expect(roleLabels.length).toBe(MOCK_CONCEPT.recommendation.swatches.length);
  });

  it('includes text nodes for swatch hex labels', () => {
    const spec = buildCanvasScene(MOCK_CONCEPT);
    const hexLabels = spec.root.children.filter(
      (n) => n.type === 'text' && (n.id as string).includes('swatch') && (n.id as string).includes('hex'),
    );
    expect(hexLabels.length).toBe(MOCK_CONCEPT.recommendation.swatches.length);
  });

  it('includes typography text nodes (heading, subheading, body)', () => {
    const spec = buildCanvasScene(MOCK_CONCEPT);
    const typoNodes = spec.root.children.filter(
      (n) => n.type === 'text' && (n.id as string).includes('typo'),
    );
    expect(typoNodes.length).toBeGreaterThanOrEqual(3);
  });

  it('includes a button preview rect', () => {
    const spec = buildCanvasScene(MOCK_CONCEPT);
    const btnRects = spec.root.children.filter(
      (n) => n.type === 'rect' && (n.id as string).includes('btn'),
    );
    expect(btnRects.length).toBeGreaterThan(0);
  });

  it('includes a navigation bar rect for top-bar variant', () => {
    const spec = buildCanvasScene(MOCK_CONCEPT, null, MOCK_NAV_STYLE);
    const navBar = spec.root.children.find(
      (n) => n.type === 'rect' && (n.id as string).includes('nav-bar'),
    );
    expect(navBar).toBeTruthy();
  });

  it('includes a sidebar rect for sidebar variant', () => {
    const sidebarNav: NavigationStyle = { ...MOCK_NAV_STYLE, id: 'sidebar', variant: 'sidebar' };
    const spec = buildCanvasScene(MOCK_CONCEPT, null, sidebarNav);
    const sidebar = spec.root.children.find(
      (n) => (n.id as string).includes('nav-sidebar'),
    );
    expect(sidebar).toBeTruthy();
  });

  it('all node IDs are unique within the scene', () => {
    const spec = buildCanvasScene(MOCK_CONCEPT);
    const ids = spec.root.children.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('button border-radius reflects the provided button style', () => {
    const spec = buildCanvasScene(MOCK_CONCEPT, MOCK_BUTTON_STYLE, null);
    const primaryBtn = spec.root.children.find(
      (n) => n.id === `${MOCK_CONCEPT.id}-btn-primary`,
    );
    expect(primaryBtn).toBeTruthy();
    // borderRadius is parsed from the borderRadius string
    expect((primaryBtn as import('../layout-schema').RectNode).radius).toBe(8);
  });

  it('works without optional button and nav style arguments', () => {
    expect(() => buildCanvasScene(MOCK_CONCEPT)).not.toThrow();
  });

  it('node IDs are prefixed with the concept id', () => {
    const spec = buildCanvasScene(MOCK_CONCEPT);
    for (const node of spec.root.children) {
      expect((node.id as string).startsWith(MOCK_CONCEPT.id)).toBe(true);
    }
  });
});
