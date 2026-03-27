/**
 * Tests for snapshotToLayoutSpec (Issue #218)
 * Transformation layer: MobileDesignSnapshot → LayoutSpec
 */

import { describe, it, expect } from 'vitest';
import { snapshotToLayoutSpec } from './snapshotToLayoutSpec';
import type { MobileDesignSnapshot } from './types';

const BASE_SNAPSHOT: MobileDesignSnapshot = {
  primaryColor: '#1A1A2E',
  accentColor:  '#E94560',
  headingFont:  'Inter',
  bodyFont:     'Inter',
  mood:         'minimal',
  industry:     'technology',
  tokens: {
    'color-primary': '#1A1A2E',
    'color-accent':  '#E94560',
    'font-heading':  'Inter',
    'font-body':     'Inter',
  },
};

describe('snapshotToLayoutSpec (#218)', () => {
  it('returns a LayoutSpec with version 1.0.0', () => {
    const spec = snapshotToLayoutSpec(BASE_SNAPSHOT);
    expect(spec.version).toBe('1.0.0');
  });

  it('produces a root frame with the correct mobile dimensions', () => {
    const spec = snapshotToLayoutSpec(BASE_SNAPSHOT);
    expect(spec.root.type).toBe('frame');
    expect(spec.root.size.width).toBe(390);
    expect(spec.root.size.height).toBe(844);
  });

  it('uses the primary colour as the root background', () => {
    const spec = snapshotToLayoutSpec(BASE_SNAPSHOT);
    expect(spec.root.background).toBe('#1A1A2E');
  });

  it('includes a navigation bar rect child with the primary colour', () => {
    const spec = snapshotToLayoutSpec(BASE_SNAPSHOT);
    const navBar = spec.root.children.find((n) => n.id === 'mobile-nav');
    expect(navBar).toBeDefined();
    expect(navBar?.type).toBe('rect');
    if (navBar?.type === 'rect') {
      expect(navBar.fill).toBe('#1A1A2E');
    }
  });

  it('includes a heading text node using the heading font', () => {
    const spec = snapshotToLayoutSpec(BASE_SNAPSHOT);
    const heading = spec.root.children.find((n) => n.id === 'mobile-heading');
    expect(heading).toBeDefined();
    expect(heading?.type).toBe('text');
    if (heading?.type === 'text') {
      expect(heading.fontFamily).toBe('Inter');
      expect(heading.variant).toBe('h1');
    }
  });

  it('includes a body text node using the body font', () => {
    const spec = snapshotToLayoutSpec(BASE_SNAPSHOT);
    const body = spec.root.children.find((n) => n.id === 'mobile-body');
    expect(body).toBeDefined();
    expect(body?.type).toBe('text');
    if (body?.type === 'text') {
      expect(body.fontFamily).toBe('Inter');
    }
  });

  it('includes a primary button rect with the accent colour', () => {
    const spec = snapshotToLayoutSpec(BASE_SNAPSHOT);
    const cta = spec.root.children.find((n) => n.id === 'mobile-button');
    expect(cta).toBeDefined();
    expect(cta?.type).toBe('rect');
    if (cta?.type === 'rect') {
      expect(cta.fill).toBe('#E94560');
    }
  });

  it('applies a pill radius when buttonStyle is "pill"', () => {
    const snap: MobileDesignSnapshot = {
      ...BASE_SNAPSHOT,
      components: { buttonStyle: 'pill', cardStyle: 'flat', navStyle: 'bottom-bar' },
    };
    const spec = snapshotToLayoutSpec(snap);
    const cta = spec.root.children.find((n) => n.id === 'mobile-button');
    if (cta?.type === 'rect') {
      expect(cta.radius).toBeGreaterThan(20);
    }
  });

  it('capitalises mood and industry in the root frame name', () => {
    const spec = snapshotToLayoutSpec(BASE_SNAPSHOT);
    expect(spec.root.name).toContain('Minimal');
    expect(spec.root.name).toContain('Technology');
  });

  it('works with different heading and body fonts', () => {
    const snap: MobileDesignSnapshot = {
      ...BASE_SNAPSHOT,
      headingFont: 'Playfair Display',
      bodyFont:    'Source Sans Pro',
    };
    const spec = snapshotToLayoutSpec(snap);
    const heading = spec.root.children.find((n) => n.id === 'mobile-heading');
    const body    = spec.root.children.find((n) => n.id === 'mobile-body');
    if (heading?.type === 'text') expect(heading.fontFamily).toBe('Playfair Display');
    if (body?.type    === 'text') expect(body.fontFamily).toBe('Source Sans Pro');
  });
});
