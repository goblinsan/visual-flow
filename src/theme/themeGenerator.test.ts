import { describe, it, expect } from 'vitest';
import {
  generateThemeFromPalette,
  resolveThemeBindings,
  bindAndApplyTheme,
  createDefaultTheme,
  createNeutralTheme,
  KNOWN_COLOR_BINDINGS,
} from './themeGenerator';
import type { DesignTheme, ColorTokenName } from './types';
import { COLOR_TOKEN_NAMES } from './types';
import type { LayoutSpec, LayoutNode } from '../layout-schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid LayoutSpec for testing */
function makeSpec(children: LayoutNode[] = []): LayoutSpec {
  return {
    root: {
      type: 'frame',
      id: 'root',
      name: 'Root',
      position: { x: 0, y: 0 },
      size: { width: 800, height: 600 },
      children,
    },
  };
}

const SAMPLE_PALETTE = ['#1e293b', '#3b82f6', '#f1f5f9', '#059669', '#ef4444'];
const RAINBOW_PALETTE = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];

// ---------------------------------------------------------------------------
// generateThemeFromPalette
// ---------------------------------------------------------------------------

describe('generateThemeFromPalette', () => {
  it('returns a DesignTheme with all required fields', () => {
    const theme = generateThemeFromPalette(SAMPLE_PALETTE, 'light');
    expect(theme.id).toBeTruthy();
    expect(theme.mode).toBe('light');
    expect(theme.paletteColors).toEqual(SAMPLE_PALETTE);
    expect(theme.colors).toBeDefined();
    expect(theme.typography).toBeDefined();
  });

  it('assigns all 23 colour tokens', () => {
    const theme = generateThemeFromPalette(SAMPLE_PALETTE, 'dark');
    const tokens = Object.keys(theme.colors) as ColorTokenName[];
    expect(tokens).toHaveLength(23);
    expect(tokens).toContain('color.background.primary');
    expect(tokens).toContain('color.text.primary');
    expect(tokens).toContain('color.action.primary');
    expect(tokens).toContain('color.status.success');
    expect(tokens).toContain('color.accent.primary');
    expect(tokens).toContain('color.surface.card');
  });

  it('produces valid hex colours for every token', () => {
    const theme = generateThemeFromPalette(SAMPLE_PALETTE, 'light');
    const hexPattern = /^#[0-9a-f]{6}$/i;
    for (const [token, value] of Object.entries(theme.colors)) {
      expect(value, `${token} should be hex`).toMatch(hexPattern);
    }
  });

  it('uses dark background in dark mode', () => {
    const theme = generateThemeFromPalette(SAMPLE_PALETTE, 'dark');
    // brightness of background.primary should be low
    const bg = theme.colors['color.background.primary'];
    const [r, g, b] = hexToRgbTest(bg);
    const lum = (r * 299 + g * 587 + b * 114) / 1000;
    expect(lum).toBeLessThan(128);
  });

  it('uses light background in light mode', () => {
    const theme = generateThemeFromPalette(SAMPLE_PALETTE, 'light');
    const bg = theme.colors['color.background.primary'];
    const [r, g, b] = hexToRgbTest(bg);
    const lum = (r * 299 + g * 587 + b * 114) / 1000;
    expect(lum).toBeGreaterThan(128);
  });

  it('sets accent from the most saturated palette colour', () => {
    const theme = generateThemeFromPalette(SAMPLE_PALETTE, 'light');
    // Accent should be one of the palette colours (the most saturated one)
    expect(SAMPLE_PALETTE).toContain(theme.colors['color.accent.primary']);
    // Verify it's not a grey — it should have notable saturation
    const [r, g, b] = hexToRgbTest(theme.colors['color.accent.primary']);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    expect(max - min).toBeGreaterThan(50); // not grey
  });

  it('accepts custom typography options', () => {
    const theme = generateThemeFromPalette(SAMPLE_PALETTE, 'light', {
      typography: { headingFont: 'Poppins', bodyFont: 'Roboto' },
    });
    expect(theme.typography.headingFont).toBe('Poppins');
    expect(theme.typography.bodyFont).toBe('Roboto');
  });

  it('uses Inter as default typography', () => {
    const theme = generateThemeFromPalette(SAMPLE_PALETTE, 'light');
    expect(theme.typography.headingFont).toBe('Inter');
    expect(theme.typography.bodyFont).toBe('Inter');
    expect(theme.typography.monoFont).toBe('Fira Code');
  });

  it('stores kulrsPaletteId when provided', () => {
    const theme = generateThemeFromPalette(SAMPLE_PALETTE, 'light', {
      kulrsPaletteId: 'sunset-012',
    });
    expect(theme.kulrsPaletteId).toBe('sunset-012');
  });

  it('handles single-colour palette gracefully', () => {
    const theme = generateThemeFromPalette(['#3b82f6'], 'dark');
    expect(Object.keys(theme.colors)).toHaveLength(23);
    for (const v of Object.values(theme.colors)) {
      expect(v).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('handles greyscale palette (no saturated colours)', () => {
    const greys = ['#111111', '#555555', '#999999', '#cccccc', '#eeeeee'];
    const theme = generateThemeFromPalette(greys, 'light');
    expect(Object.keys(theme.colors)).toHaveLength(23);
  });
});

// ---------------------------------------------------------------------------
// createDefaultTheme
// ---------------------------------------------------------------------------

describe('createDefaultTheme', () => {
  it('returns a valid light theme', () => {
    const theme = createDefaultTheme('light');
    expect(theme.mode).toBe('light');
    expect(theme.name).toContain('Light');
    expect(Object.keys(theme.colors)).toHaveLength(23);
  });

  it('returns a valid dark theme', () => {
    const theme = createDefaultTheme('dark');
    expect(theme.mode).toBe('dark');
    expect(theme.name).toContain('Dark');
  });
});

// ---------------------------------------------------------------------------
// createNeutralTheme
// ---------------------------------------------------------------------------

describe('createNeutralTheme', () => {
  it('returns a greyscale light theme', () => {
    const theme = createNeutralTheme('light');
    expect(theme.mode).toBe('light');
    expect(theme.name).toContain('Neutral');
    // All colours should be grey (r≈g≈b)
    for (const [, hex] of Object.entries(theme.colors)) {
      const [r, g, b] = hexToRgbTest(hex);
      expect(Math.abs(r - g) + Math.abs(g - b), `${hex} should be grey`).toBeLessThan(10);
    }
  });

  it('returns a greyscale dark theme', () => {
    const theme = createNeutralTheme('dark');
    expect(theme.mode).toBe('dark');
    const bg = theme.colors['color.background.primary'];
    const [r] = hexToRgbTest(bg);
    expect(r).toBeLessThan(50); // dark
  });

  it('defaults to light mode', () => {
    const theme = createNeutralTheme();
    expect(theme.mode).toBe('light');
  });
});

// ---------------------------------------------------------------------------
// KNOWN_COLOR_BINDINGS
// ---------------------------------------------------------------------------

describe('KNOWN_COLOR_BINDINGS', () => {
  it('maps well-known hex codes to valid token names', () => {
    const validTokens = new Set<string>(COLOR_TOKEN_NAMES);
    for (const [hex, token] of Object.entries(KNOWN_COLOR_BINDINGS)) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
      expect(validTokens.has(token), `${token} should be a valid colour token`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// resolveThemeBindings
// ---------------------------------------------------------------------------

describe('resolveThemeBindings', () => {
  const theme = createDefaultTheme('light');

  it('applies bound fill colour from theme', () => {
    const node: LayoutNode = {
      type: 'rect',
      id: 'r1',
      name: 'Box',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 50 },
      fill: '#000000',
      themeBindings: { fill: 'color.action.primary' },
    } as LayoutNode;
    const spec = makeSpec([node]);
    const result = resolveThemeBindings(spec, theme);
    const resolved = result.root.children[0] as LayoutNode & { fill: string };
    expect(resolved.fill).toBe(theme.colors['color.action.primary']);
  });

  it('applies bound stroke colour from theme', () => {
    const node: LayoutNode = {
      type: 'rect',
      id: 'r2',
      name: 'Border Box',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 50 },
      stroke: '#000000',
      themeBindings: { stroke: 'color.border.primary' },
    } as LayoutNode;
    const spec = makeSpec([node]);
    const result = resolveThemeBindings(spec, theme);
    const resolved = result.root.children[0] as LayoutNode & { stroke: string };
    expect(resolved.stroke).toBe(theme.colors['color.border.primary']);
  });

  it('applies bound text colour from theme', () => {
    const node: LayoutNode = {
      type: 'text',
      id: 't1',
      name: 'Heading',
      position: { x: 0, y: 0 },
      size: { width: 200, height: 30 },
      text: 'Hello',
      color: '#000000',
      themeBindings: { color: 'color.text.primary' },
    } as LayoutNode;
    const spec = makeSpec([node]);
    const result = resolveThemeBindings(spec, theme);
    const resolved = result.root.children[0] as LayoutNode & { color: string };
    expect(resolved.color).toBe(theme.colors['color.text.primary']);
  });

  it('preserves root background unchanged', () => {
    const spec = makeSpec();
    spec.root.background = '#fff';
    const result = resolveThemeBindings(spec, theme);
    expect(result.root.background).toBe('#fff');
  });

  it('preserves nodes without bindings', () => {
    const node: LayoutNode = {
      type: 'rect',
      id: 'r3',
      name: 'Unbound',
      position: { x: 10, y: 20 },
      size: { width: 50, height: 50 },
      fill: '#ff00ff',
    } as LayoutNode;
    const spec = makeSpec([node]);
    const result = resolveThemeBindings(spec, theme);
    const resolved = result.root.children[0] as LayoutNode & { fill: string };
    expect(resolved.fill).toBe('#ff00ff');
  });

  it('resolves heading text with theme headingFont', () => {
    const node: LayoutNode = {
      type: 'text',
      id: 'h1',
      name: 'H1',
      position: { x: 0, y: 0 },
      size: { width: 300, height: 40 },
      text: 'Title',
      variant: 'h1',
      themeBindings: { color: 'color.text.primary' },
    } as LayoutNode;
    const spec = makeSpec([node]);
    const result = resolveThemeBindings(spec, theme);
    const resolved = result.root.children[0] as LayoutNode & { fontFamily: string };
    expect(resolved.fontFamily).toBe(theme.typography.headingFont);
  });
});

// ---------------------------------------------------------------------------
// bindAndApplyTheme
// ---------------------------------------------------------------------------

describe('bindAndApplyTheme', () => {
  const theme = generateThemeFromPalette(SAMPLE_PALETTE, 'light');

  it('infers fill binding from KNOWN_COLOR_BINDINGS', () => {
    const node: LayoutNode = {
      type: 'rect',
      id: 'r1',
      name: 'Blue Rect',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 50 },
      fill: '#3b82f6', // in KNOWN_COLOR_BINDINGS → color.accent.primary
    } as LayoutNode;
    const spec = makeSpec([node]);
    const result = bindAndApplyTheme(spec, theme);
    const resolved = result.root.children[0] as LayoutNode & { fill: string; themeBindings: Record<string, string> };
    expect(resolved.themeBindings.fill).toBe('color.accent.primary');
    expect(resolved.fill).toBe(theme.colors['color.accent.primary']);
  });

  it('infers stroke binding from KNOWN_COLOR_BINDINGS', () => {
    const node: LayoutNode = {
      type: 'rect',
      id: 'r2',
      name: 'Bordered',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 50 },
      stroke: '#e2e8f0', // → color.border.primary
    } as LayoutNode;
    const spec = makeSpec([node]);
    const result = bindAndApplyTheme(spec, theme);
    const resolved = result.root.children[0] as LayoutNode & { stroke: string; themeBindings: Record<string, string> };
    expect(resolved.themeBindings.stroke).toBe('color.border.primary');
    expect(resolved.stroke).toBe(theme.colors['color.border.primary']);
  });

  it('infers text colour binding', () => {
    const node: LayoutNode = {
      type: 'text',
      id: 't1',
      name: 'Dark Text',
      position: { x: 0, y: 0 },
      size: { width: 200, height: 30 },
      text: 'Content',
      color: '#334155', // → color.text.primary
    } as LayoutNode;
    const spec = makeSpec([node]);
    const result = bindAndApplyTheme(spec, theme);
    const resolved = result.root.children[0] as LayoutNode & { color: string; themeBindings: Record<string, string> };
    expect(resolved.themeBindings.color).toBe('color.text.primary');
    expect(resolved.color).toBe(theme.colors['color.text.primary']);
  });

  it('maps white text to text.inverse (not background.primary)', () => {
    const node: LayoutNode = {
      type: 'text',
      id: 't2',
      name: 'White Text',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 20 },
      text: 'Light',
      color: '#ffffff',
    } as LayoutNode;
    const spec = makeSpec([node]);
    const result = bindAndApplyTheme(spec, theme);
    const resolved = result.root.children[0] as LayoutNode & { themeBindings: Record<string, string> };
    expect(resolved.themeBindings.color).toBe('color.text.inverse');
  });

  it('preserves existing bindings', () => {
    const node: LayoutNode = {
      type: 'rect',
      id: 'r3',
      name: 'Pre-bound',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 50 },
      fill: '#3b82f6',
      themeBindings: { fill: 'color.surface.card' },
    } as LayoutNode;
    const spec = makeSpec([node]);
    const result = bindAndApplyTheme(spec, theme);
    const resolved = result.root.children[0] as LayoutNode & { fill: string; themeBindings: Record<string, string> };
    // Existing binding should be preserved, not overwritten
    expect(resolved.themeBindings.fill).toBe('color.surface.card');
    expect(resolved.fill).toBe(theme.colors['color.surface.card']);
  });

  it('leaves unrecognised colours unbound', () => {
    const node: LayoutNode = {
      type: 'rect',
      id: 'r4',
      name: 'Custom',
      position: { x: 0, y: 0 },
      size: { width: 50, height: 50 },
      fill: '#abcdef', // not in KNOWN_COLOR_BINDINGS
    } as LayoutNode;
    const spec = makeSpec([node]);
    const result = bindAndApplyTheme(spec, theme);
    const resolved = result.root.children[0] as LayoutNode & { fill: string; themeBindings?: Record<string, string> };
    expect(resolved.fill).toBe('#abcdef');
    expect(resolved.themeBindings).toBeUndefined();
  });

  it('recurses into nested children', () => {
    const child: LayoutNode = {
      type: 'text', id: 'tc', name: 'Nested Text',
      position: { x: 0, y: 0 }, size: { width: 80, height: 20 },
      text: 'Deep', color: '#0f172a', // → text.primary
    } as LayoutNode;
    const parent: LayoutNode = {
      type: 'frame', id: 'f1', name: 'Frame',
      position: { x: 0, y: 0 }, size: { width: 200, height: 200 },
      children: [child],
    } as LayoutNode;
    const spec = makeSpec([parent]);
    const result = bindAndApplyTheme(spec, theme);
    const frame = result.root.children[0] as LayoutNode & { children: (LayoutNode & { themeBindings: Record<string, string> })[] };
    expect(frame.children[0].themeBindings.color).toBe('color.text.primary');
  });

  it('does not inject root background', () => {
    const spec = makeSpec();
    const result = bindAndApplyTheme(spec, theme);
    expect(result.root.background).toBeUndefined();
  });

  it('assigns body text nodes to bodyFont', () => {
    const node: LayoutNode = {
      type: 'text', id: 'tb', name: 'Body',
      position: { x: 0, y: 0 }, size: { width: 200, height: 24 },
      text: 'Paragraph', color: '#334155', // triggers binding
    } as LayoutNode;
    const spec = makeSpec([node]);
    const result = bindAndApplyTheme(spec, theme);
    const resolved = result.root.children[0] as LayoutNode & { fontFamily: string };
    expect(resolved.fontFamily).toBe(theme.typography.bodyFont);
  });

  it('assigns heading text nodes to headingFont', () => {
    const node: LayoutNode = {
      type: 'text', id: 'th', name: 'Heading',
      position: { x: 0, y: 0 }, size: { width: 300, height: 40 },
      text: 'Title', color: '#334155', variant: 'h2',
    } as LayoutNode;
    const spec = makeSpec([node]);
    const result = bindAndApplyTheme(spec, theme);
    const resolved = result.root.children[0] as LayoutNode & { fontFamily: string };
    expect(resolved.fontFamily).toBe(theme.typography.headingFont);
  });
});

// ---------------------------------------------------------------------------
// Utility for tests
// ---------------------------------------------------------------------------
function hexToRgbTest(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
