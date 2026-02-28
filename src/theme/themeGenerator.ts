/**
 * Palette → Theme Mapping
 * 
 * Converts a Kulrs palette (array of hex colors) into a full DesignTheme
 * by algorithmically assigning palette colors to semantic tokens based
 * on brightness, contrast, and the chosen mode (light/dark).
 */

import type { DesignTheme, ColorTokenName, ThemeTypography } from './types';

// ---------------------------------------------------------------------------
// Color math helpers
// ---------------------------------------------------------------------------

/** Parse hex (#rrggbb or #rgb) → [r,g,b] */
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')}`;
}

/** Perceived brightness 0–255 */
function brightness(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/** Lighten a hex colour by an amount (0–1) */
function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  );
}

/** Darken a hex colour by an amount (0–1) */
function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/** Mix two colours by ratio (0 = a, 1 = b) */
function mix(a: string, b: string, ratio: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(
    r1 + (r2 - r1) * ratio,
    g1 + (g2 - g1) * ratio,
    b1 + (b2 - b1) * ratio,
  );
}

/** Sort palette colors by brightness (dark → light) */
function sortByBrightness(colors: string[]): string[] {
  return [...colors].sort((a, b) => brightness(a) - brightness(b));
}

/** Pick the color with the highest saturation as the "accent" */
function saturation(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

// ---------------------------------------------------------------------------
// Theme generation from palette
// ---------------------------------------------------------------------------

/**
 * Generate a full DesignTheme from a palette of hex colors.
 * 
 * Strategy:
 * - Sort colors by brightness
 * - In dark mode: darkest → backgrounds, lightest → text
 * - In light mode: lightest → backgrounds, darkest → text  
 * - Most saturated → action/accent
 * - Derive status colors (success, warning, error, info) from palette with hue-shifting
 */
export function generateThemeFromPalette(
  paletteColors: string[],
  mode: 'light' | 'dark',
  options?: {
    name?: string;
    kulrsPaletteId?: string;
    typography?: Partial<ThemeTypography>;
  },
): DesignTheme {
  const sorted = sortByBrightness(paletteColors);
  const isDark = mode === 'dark';

  // Pick roles from brightness-sorted array
  const darkest = sorted[0];
  const lightest = sorted[sorted.length - 1];

  // Find the most saturated color for accent/action
  const bySat = [...paletteColors].sort((a, b) => saturation(b) - saturation(a));
  const accent1 = bySat[0] ?? (isDark ? '#60a5fa' : '#2563eb');
  const accent2 = bySat[1] ?? bySat[0] ?? (isDark ? '#34d399' : '#059669');

  // Background tones
  const bgPrimary = isDark ? darkest : lightest;
  const bgSecondary = isDark ? lighten(darkest, 0.06) : darken(lightest, 0.03);
  const bgTertiary = isDark ? lighten(darkest, 0.12) : darken(lightest, 0.06);
  const bgInverse = isDark ? lightest : darkest;

  // Text tones
  const textPrimary = isDark ? lightest : darkest;
  const textSecondary = isDark ? darken(lightest, 0.35) : lighten(darkest, 0.35);
  const textInverse = isDark ? darkest : lightest;

  // Border tones
  const borderPrimary = isDark ? lighten(darkest, 0.2) : darken(lightest, 0.15);
  const borderSecondary = isDark ? lighten(darkest, 0.1) : darken(lightest, 0.08);

  // Action colors from accents
  const actionPrimary = accent1;
  const actionPrimaryHover = isDark ? lighten(accent1, 0.12) : darken(accent1, 0.12);
  const actionSecondary = accent2;
  const actionSecondaryHover = isDark ? lighten(accent2, 0.12) : darken(accent2, 0.12);

  // Status colors — derive from palette or use sensible defaults
  const statusSuccess = findClosestHue(paletteColors, 140) ?? '#22c55e';
  const statusWarning = findClosestHue(paletteColors, 40) ?? '#eab308';
  const statusError = findClosestHue(paletteColors, 0) ?? '#ef4444';
  const statusInfo = findClosestHue(paletteColors, 210) ?? '#3b82f6';

  // Surface
  const cardSurface = isDark ? lighten(darkest, 0.08) : '#ffffff';
  const overlaySurface = isDark
    ? `${darken(darkest, 0.3)}`
    : mix(darkest, lightest, 0.15);

  const colors: Record<ColorTokenName, string> = {
    'color.background.primary': bgPrimary,
    'color.background.secondary': bgSecondary,
    'color.background.tertiary': bgTertiary,
    'color.background.inverse': bgInverse,
    'color.text.primary': textPrimary,
    'color.text.secondary': textSecondary,
    'color.text.inverse': textInverse,
    'color.text.link': accent1,
    'color.border.primary': borderPrimary,
    'color.border.secondary': borderSecondary,
    'color.border.focus': accent1,
    'color.action.primary': actionPrimary,
    'color.action.primaryHover': actionPrimaryHover,
    'color.action.secondary': actionSecondary,
    'color.action.secondaryHover': actionSecondaryHover,
    'color.status.success': statusSuccess,
    'color.status.warning': statusWarning,
    'color.status.error': statusError,
    'color.status.info': statusInfo,
    'color.surface.card': cardSurface,
    'color.surface.overlay': overlaySurface,
    'color.accent.primary': accent1,
    'color.accent.secondary': accent2,
  };

  const id = `theme_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  return {
    id,
    name: options?.name ?? `${mode === 'dark' ? 'Dark' : 'Light'} Theme`,
    kulrsPaletteId: options?.kulrsPaletteId,
    paletteColors,
    mode,
    colors,
    typography: {
      headingFont: options?.typography?.headingFont ?? 'Inter',
      bodyFont: options?.typography?.bodyFont ?? 'Inter',
      monoFont: options?.typography?.monoFont ?? 'Fira Code',
    },
  };
}

// ---------------------------------------------------------------------------
// Hue matching for status colors
// ---------------------------------------------------------------------------

function hexToHue(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(c => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  return h < 0 ? h + 360 : h;
}

/**
 * Find the palette color closest to a target hue (0–360).
 * Only returns if within 60° and has meaningful saturation.
 */
function findClosestHue(colors: string[], targetHue: number): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const c of colors) {
    if (saturation(c) < 0.15) continue; // skip near-grays
    const hue = hexToHue(c);
    const dist = Math.min(Math.abs(hue - targetHue), 360 - Math.abs(hue - targetHue));
    if (dist < bestDist && dist < 60) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Apply theme to spec tree (theme-aware version)
// ---------------------------------------------------------------------------

import type { LayoutSpec, LayoutNode } from '../layout-schema';
import type { ThemeBindings } from './types';

// ---------------------------------------------------------------------------
// Known default-color → semantic-token mapping
// Used to auto-bind existing elements to theme tokens so that
// subsequent palette / mode / token changes propagate.
// ---------------------------------------------------------------------------

export const KNOWN_COLOR_BINDINGS: Record<string, ColorTokenName> = {
  // Primary action fills → accent primary
  '#3b82f6': 'color.accent.primary',
  '#7c3aed': 'color.accent.primary',
  '#2563eb': 'color.accent.primary',
  '#1d4ed8': 'color.accent.primary',
  '#1877f2': 'color.accent.primary',    // facebook blue
  '#4285f4': 'color.accent.primary',    // google blue
  // Secondary fills → accent secondary
  '#06b6d4': 'color.accent.secondary',
  '#059669': 'color.accent.secondary',
  '#10b981': 'color.accent.secondary',
  // Light backgrounds
  '#dbeafe': 'color.background.secondary',
  '#e0f2fe': 'color.background.secondary',
  '#e2e8f0': 'color.border.primary',
  '#f1f5f9': 'color.background.secondary',
  '#f3f4f6': 'color.background.secondary',
  '#f8fafc': 'color.background.secondary',
  '#f9fafb': 'color.background.secondary',
  '#e5e7eb': 'color.border.primary',
  // White → background primary (for fill/stroke; text-color uses text.inverse)
  '#ffffff': 'color.background.primary',
  // Dark backgrounds → background inverse
  '#000000': 'color.background.inverse',
  '#111827': 'color.text.primary',
  '#1a202c': 'color.background.inverse',
  '#1e1b2e': 'color.background.inverse',
  '#1e293b': 'color.background.inverse',
  '#24292e': 'color.background.inverse',
  '#2d3748': 'color.background.inverse',
  '#2a2640': 'color.surface.overlay',
  // Dark text colours
  '#0f172a': 'color.text.primary',
  '#0c4a6e': 'color.text.primary',
  '#1f2937': 'color.text.primary',
  '#334155': 'color.text.primary',
  '#374151': 'color.text.secondary',
  // Secondary text
  '#0369a1': 'color.text.link',
  '#64748b': 'color.text.secondary',
  '#6b7280': 'color.text.secondary',
  '#94a3b8': 'color.text.secondary',
  '#9ca3af': 'color.text.secondary',
  '#a0aec0': 'color.text.secondary',
  '#d1d5db': 'color.border.primary',
  // Borders
  '#cbd5f5': 'color.border.primary',
  '#4b5563': 'color.border.secondary',
  // Card surfaces
  '#4a4563': 'color.surface.card',
  // Status
  '#ef4444': 'color.status.error',
  '#22c55e': 'color.status.success',
  '#eab308': 'color.status.warning',
  '#fbbf24': 'color.status.warning',
  '#f8d97a': 'color.status.warning',
  // Info / link
  '#0ea5e9': 'color.status.info',
};

/**
 * Walk the spec tree and resolve any theme-bound colors.
 * Nodes with `themeBindings` get their fill/stroke/color/background
 * replaced with the actual hex value from the active theme.
 */
export function resolveThemeBindings(spec: LayoutSpec, theme: DesignTheme): LayoutSpec {
  function resolveNode(node: LayoutNode): LayoutNode {
    const bindings = (node as LayoutNode & { themeBindings?: ThemeBindings }).themeBindings;
    const patched: Record<string, unknown> = {};

    if (bindings) {
      if (bindings.fill && theme.colors[bindings.fill]) {
        patched.fill = theme.colors[bindings.fill];
      }
      if (bindings.stroke && theme.colors[bindings.stroke]) {
        patched.stroke = theme.colors[bindings.stroke];
      }
      if (bindings.color && theme.colors[bindings.color]) {
        patched.color = theme.colors[bindings.color];
      }
      if (bindings.background && theme.colors[bindings.background]) {
        patched.background = theme.colors[bindings.background];
      }
    }

    // Resolve typography if node is text and theme has fonts
    if (node.type === 'text' && theme.typography && bindings) {
      const variant = (node as { variant?: string }).variant;
      if (variant === 'h1' || variant === 'h2' || variant === 'h3') {
        patched.fontFamily = theme.typography.headingFont;
      } else if (bindings.color) {
        // Body text nodes that are theme-bound
        patched.fontFamily = theme.typography.bodyFont;
      }
    }

    // Icon images: regenerate SVG src when fill colour changes
    if (node.type === 'image' && 'iconId' in node && (node as { iconId?: string }).iconId && patched.fill) {
      const imgNode = node as { src: string };
      try {
        const decoded = decodeURIComponent(imgNode.src.replace('data:image/svg+xml;utf8,', ''));
        const updated = decoded.replace(/fill="[^"]*"/, `fill="${patched.fill as string}"`);
        patched.src = `data:image/svg+xml;utf8,${encodeURIComponent(updated)}`;
      } catch {
        // If decoding fails, leave src unchanged
      }
    }

    const hasChildren = 'children' in node && Array.isArray((node as { children?: LayoutNode[] }).children);
    const children = hasChildren
      ? (node as { children: LayoutNode[] }).children.map(resolveNode)
      : undefined;

    if (Object.keys(patched).length === 0 && !hasChildren) return node;
    return { ...node, ...patched, ...(children ? { children } : {}) } as LayoutNode;
  }

  return {
    ...spec,
    root: {
      ...spec.root,
      children: spec.root.children.map(resolveNode),
    },
  };
}

/**
 * Apply a new theme to the spec:
 * - Walks the tree and sets actual hex values for all theme-bound elements
 * - Updates root background based on theme
 */
export function applyThemeToSpec(spec: LayoutSpec, theme: DesignTheme): LayoutSpec {
  return resolveThemeBindings(spec, theme);
}

/**
 * Infer theme-bindings for nodes whose fill/stroke/color match well-known
 * default colours, then resolve every binding in the tree.
 *
 * Safe to call repeatedly — nodes that already own bindings keep them,
 * and nodes whose colours no longer match any known default are left alone.
 */
export function bindAndApplyTheme(spec: LayoutSpec, theme: DesignTheme): LayoutSpec {
  function processNode(node: LayoutNode): LayoutNode {
    const existing = (node as LayoutNode & { themeBindings?: ThemeBindings }).themeBindings;
    const inferred: ThemeBindings = { ...(existing ?? {}) };
    const patched: Record<string, unknown> = {};
    let changed = false;

    // ── Infer bindings for props that don't already have one ──────────
    const norm = (h: string) => h.toLowerCase();

    // Dark fills used as backgrounds should map to background.inverse, not text.primary
    // Exception: icon images use dark fill as the icon colour → text.primary
    const isIconImage = node.type === 'image' && 'iconId' in node && !!(node as { iconId?: string }).iconId;
    const FILL_OVERRIDES: Record<string, ColorTokenName> = isIconImage ? {} : {
      '#111827': 'color.background.inverse',
      '#0f172a': 'color.background.inverse',
      '#1f2937': 'color.background.inverse',
      '#334155': 'color.surface.overlay',
    };

    if (!inferred.fill && 'fill' in node) {
      const v = (node as { fill?: string }).fill;
      if (typeof v === 'string') {
        const n = norm(v);
        const token = FILL_OVERRIDES[n] ?? KNOWN_COLOR_BINDINGS[n];
        if (token) { inferred.fill = token; changed = true; }
      }
    }
    if (!inferred.stroke && 'stroke' in node) {
      const v = (node as { stroke?: string }).stroke;
      if (typeof v === 'string') {
        const token = KNOWN_COLOR_BINDINGS[norm(v)];
        if (token) { inferred.stroke = token; changed = true; }
      }
    }
    if (!inferred.color && 'color' in node) {
      const v = (node as { color?: string }).color;
      if (typeof v === 'string') {
        const lo = norm(v);
        // White text should bind to text.inverse, not background.primary
        const token = lo === '#ffffff'
          ? 'color.text.inverse' as ColorTokenName
          : KNOWN_COLOR_BINDINGS[lo];
        if (token) { inferred.color = token; changed = true; }
      }
    }

    // ── Resolve bindings → actual hex values ─────────────────────────
    if (inferred.fill && theme.colors[inferred.fill]) {
      patched.fill = theme.colors[inferred.fill];
    }
    if (inferred.stroke && theme.colors[inferred.stroke]) {
      patched.stroke = theme.colors[inferred.stroke];
    }
    if (inferred.color && theme.colors[inferred.color]) {
      patched.color = theme.colors[inferred.color];
    }
    if (inferred.background && theme.colors[inferred.background]) {
      patched.background = theme.colors[inferred.background];
    }

    // Typography: heading text → headingFont, all other theme-bound text → bodyFont
    if (node.type === 'text' && theme.typography && (inferred.color || inferred.fill)) {
      const variant = (node as { variant?: string }).variant;
      if (variant === 'h1' || variant === 'h2' || variant === 'h3') {
        patched.fontFamily = theme.typography.headingFont;
      } else {
        patched.fontFamily = theme.typography.bodyFont;
      }
    }

    // Icon images: regenerate SVG src when fill colour changes
    if (node.type === 'image' && 'iconId' in node && (node as { iconId?: string }).iconId) {
      const newFill = patched.fill as string | undefined;
      if (newFill) {
        // Decode the existing SVG data-URL, replace the fill colour, encode back
        const imgNode = node as { src: string; fill?: string };
        try {
          const decoded = decodeURIComponent(imgNode.src.replace('data:image/svg+xml;utf8,', ''));
          const updated = decoded.replace(/fill="[^"]*"/, `fill="${newFill}"`);
          patched.src = `data:image/svg+xml;utf8,${encodeURIComponent(updated)}`;
        } catch {
          // If decoding fails, leave src unchanged
        }
      }
    }

    // Persist bindings when we inferred new ones
    if (changed) {
      patched.themeBindings = inferred;
    }

    // Recurse children
    const hasChildren = 'children' in node && Array.isArray((node as { children?: LayoutNode[] }).children);
    const children = hasChildren
      ? (node as { children: LayoutNode[] }).children.map(processNode)
      : undefined;

    if (Object.keys(patched).length === 0 && !hasChildren) return node;
    return { ...node, ...patched, ...(children ? { children } : {}) } as LayoutNode;
  }

  return {
    ...spec,
    root: {
      ...spec.root,
      children: spec.root.children.map(processNode),
    },
  };
}

/**
 * Create a default light/dark theme without a palette.
 */
export function createDefaultTheme(mode: 'light' | 'dark'): DesignTheme {
  const defaultPalette = mode === 'dark'
    ? ['#0f172a', '#1e293b', '#60a5fa', '#34d399', '#f1f5f9']
    : ['#f9fafb', '#ffffff', '#2563eb', '#059669', '#0f172a'];
  return generateThemeFromPalette(defaultPalette, mode, { name: `Default ${mode === 'dark' ? 'Dark' : 'Light'}` });
}

/**
 * Create a monotone greyscale theme with all tokens defined.
 * Used when the user removes/clears their palette — elements stay themed
 * but with neutral grey tones instead of colourful palette values.
 */
export function createNeutralTheme(mode: 'light' | 'dark' = 'light'): DesignTheme {
  const isDark = mode === 'dark';
  const palette = isDark
    ? ['#111111', '#333333', '#666666', '#999999', '#e5e5e5']
    : ['#ffffff', '#f5f5f5', '#d4d4d4', '#737373', '#171717'];

  const colors: Record<ColorTokenName, string> = {
    // Backgrounds
    'color.background.primary':   isDark ? '#111111' : '#ffffff',
    'color.background.secondary': isDark ? '#1a1a1a' : '#f5f5f5',
    'color.background.tertiary':  isDark ? '#262626' : '#e5e5e5',
    'color.background.inverse':   isDark ? '#e5e5e5' : '#171717',
    // Text
    'color.text.primary':   isDark ? '#e5e5e5' : '#171717',
    'color.text.secondary': isDark ? '#a3a3a3' : '#525252',
    'color.text.inverse':   isDark ? '#171717' : '#e5e5e5',
    'color.text.link':      isDark ? '#a3a3a3' : '#404040',
    // Borders
    'color.border.primary':   isDark ? '#404040' : '#d4d4d4',
    'color.border.secondary': isDark ? '#333333' : '#e5e5e5',
    'color.border.focus':     isDark ? '#737373' : '#525252',
    // Actions
    'color.action.primary':        isDark ? '#737373' : '#404040',
    'color.action.primaryHover':   isDark ? '#8a8a8a' : '#333333',
    'color.action.secondary':      isDark ? '#525252' : '#737373',
    'color.action.secondaryHover': isDark ? '#666666' : '#666666',
    // Status — subtle greyscale versions
    'color.status.success': isDark ? '#aaaaaa' : '#555555',
    'color.status.warning': isDark ? '#999999' : '#666666',
    'color.status.error':   isDark ? '#888888' : '#444444',
    'color.status.info':    isDark ? '#aaaaaa' : '#555555',
    // Surface
    'color.surface.card':    isDark ? '#1a1a1a' : '#ffffff',
    'color.surface.overlay': isDark ? '#0a0a0a' : '#f0f0f0',
    'color.accent.primary':   isDark ? '#999999' : '#333333',
    'color.accent.secondary': isDark ? '#737373' : '#525252',
  };

  return {
    id: `neutral_${mode}_${Date.now().toString(36)}`,
    name: `Neutral ${isDark ? 'Dark' : 'Light'}`,
    paletteColors: palette,
    mode,
    colors,
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      monoFont: 'Fira Code',
    },
  };
}
