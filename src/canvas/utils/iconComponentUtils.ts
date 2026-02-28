import type { LayoutNode, ImageNode, LayoutSpec, ThemeBindings } from "../../layout-schema";
import { ICON_LIBRARY, COMPONENT_LIBRARY } from "../../library";
import { makeId } from "./canvasUtils";
import type { DesignTheme, ColorTokenName } from "../../theme/types";
import { KNOWN_COLOR_BINDINGS } from "../../theme/themeGenerator";

// ─── Component-color-to-theme color mapping ────────────────────────────────
// Maps common hardcoded component colors to semantic theme tokens so that
// freshly placed components adopt the active palette.
const COMPONENT_COLOR_MAP: Record<string, (t: DesignTheme) => string> = {
  // Primary action fills → accent primary
  '#3b82f6': (t) => t.colors['color.accent.primary'],
  '#7c3aed': (t) => t.colors['color.accent.primary'],
  '#2563eb': (t) => t.colors['color.accent.primary'],
  '#1d4ed8': (t) => t.colors['color.accent.primary'],
  // Secondary fills → accent secondary
  '#06b6d4': (t) => t.colors['color.accent.secondary'],
  '#059669': (t) => t.colors['color.accent.secondary'],
  // Light backgrounds → bg secondary
  '#dbeafe': (t) => t.colors['color.background.secondary'],
  '#e2e8f0': (t) => t.colors['color.border.primary'],
  '#f1f5f9': (t) => t.colors['color.background.secondary'],
  '#f3f4f6': (t) => t.colors['color.background.secondary'],
  '#f9fafb': (t) => t.colors['color.background.secondary'],
  // Card/white backgrounds → bg primary
  '#ffffff': (t) => t.colors['color.background.primary'],
  // Text on dark → text on accent
  // Text primary/dark colors → text primary
  '#111827': (t) => t.colors['color.text.primary'],
  '#0f172a': (t) => t.colors['color.text.primary'],
  '#1f2937': (t) => t.colors['color.text.primary'],
  '#334155': (t) => t.colors['color.text.primary'],
  '#374151': (t) => t.colors['color.text.secondary'],
  // Text secondary → text secondary
  '#64748b': (t) => t.colors['color.text.secondary'],
  '#6b7280': (t) => t.colors['color.text.secondary'],
  '#94a3b8': (t) => t.colors['color.text.secondary'],
  '#9ca3af': (t) => t.colors['color.text.secondary'],
  // Border colors → border
  '#cbd5f5': (t) => t.colors['color.border.primary'],
  '#d1d5db': (t) => t.colors['color.border.primary'],
  '#e5e7eb': (t) => t.colors['color.border.primary'],
  // Status colors
  '#ef4444': (t) => t.colors['color.status.error'],
  '#22c55e': (t) => t.colors['color.status.success'],
  '#eab308': (t) => t.colors['color.status.warning'],
};

function applyThemeToComponentNode(node: LayoutNode, theme: DesignTheme): LayoutNode {
  const patched: Record<string, unknown> = {};
  const bindings: ThemeBindings = {};
  const n = (hex: string) => hex.toLowerCase();

  if ('fill' in node && typeof (node as { fill?: string }).fill === 'string') {
    const orig = n((node as { fill: string }).fill);
    const mapper = COMPONENT_COLOR_MAP[orig];
    if (mapper) {
      patched.fill = mapper(theme);
      const token = KNOWN_COLOR_BINDINGS[orig];
      if (token) bindings.fill = token;
    }
  }
  if ('stroke' in node && typeof (node as { stroke?: string }).stroke === 'string') {
    const orig = n((node as { stroke: string }).stroke);
    const mapper = COMPONENT_COLOR_MAP[orig];
    if (mapper) {
      patched.stroke = mapper(theme);
      const token = KNOWN_COLOR_BINDINGS[orig];
      if (token) bindings.stroke = token;
    }
  }
  if ('color' in node && typeof (node as { color?: string }).color === 'string') {
    const orig = n((node as { color: string }).color);
    // White text on accent → inverse text color
    if (orig === '#ffffff') {
      patched.color = theme.colors['color.text.inverse'];
      bindings.color = 'color.text.inverse' as ColorTokenName;
    } else {
      const mapper = COMPONENT_COLOR_MAP[orig];
      if (mapper) {
        patched.color = mapper(theme);
        const token = KNOWN_COLOR_BINDINGS[orig];
        if (token) bindings.color = token;
      }
    }
  }

  // Apply theme fonts to text nodes within components
  if (node.type === 'text' && theme.typography) {
    const variant = (node as { variant?: string }).variant;
    if (variant === 'h1' || variant === 'h2' || variant === 'h3') {
      patched.fontFamily = theme.typography.headingFont;
    } else {
      patched.fontFamily = theme.typography.bodyFont;
    }
  }

  // Persist theme bindings so future theme changes propagate
  if (Object.keys(bindings).length > 0) {
    patched.themeBindings = bindings;
  }

  const hasChildren = 'children' in node && Array.isArray((node as { children?: LayoutNode[] }).children);
  const children = hasChildren
    ? (node as { children: LayoutNode[] }).children.map((c) => applyThemeToComponentNode(c, theme))
    : undefined;

  if (Object.keys(patched).length === 0 && !hasChildren) return node;
  return { ...node, ...patched, ...(children ? { children } : {}) } as LayoutNode;
}

/**
 * Update root children with a function
 */
export function updateRootChildren(
  spec: LayoutSpec,
  updater: (children: LayoutNode[]) => LayoutNode[]
): LayoutSpec {
  const root = spec.root;
  return {
    ...spec,
    root: {
      ...root,
      children: updater(root.children),
    },
  };
}

/**
 * Append nodes to the root of a spec
 */
export function appendNodesToRoot(spec: LayoutSpec, nodes: LayoutNode[]): LayoutSpec {
  if (!nodes.length) return spec;
  return updateRootChildren(spec, (children) => [...children, ...nodes]);
}

/**
 * Build an SVG data-URL for an icon with a given fill colour.
 * Exported so bindAndApplyTheme can regenerate icon srcs when colours change.
 */
export function buildIconSvgSrc(iconId: string, fill: string): string | null {
  const icon = ICON_LIBRARY.find(i => i.id === iconId);
  if (!icon) return null;
  const [w, h, , , d] = icon.icon.icon;
  const path = Array.isArray(d) ? d.join(' ') : d;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" fill="${fill}"><path d="${path}"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Create an icon node at the specified world position.
 * When an activeTheme is provided the icon colour and font are derived from
 * the theme and themeBindings are persisted so future theme switches update it.
 */
export function createIcon(
  worldPos: { x: number; y: number },
  selectedIconId?: string,
  activeTheme?: DesignTheme | null,
): ImageNode | null {
  const icon = ICON_LIBRARY.find(i => i.id === selectedIconId) ?? ICON_LIBRARY[0];
  if (!icon) return null;

  const id = makeId('icon');
  const fillColor = activeTheme
    ? activeTheme.colors['color.text.primary']
    : '#111827';
  const src = buildIconSvgSrc(icon.id, fillColor)!;

  const iconNode: ImageNode = {
    id,
    type: 'image',
    position: worldPos,
    size: { width: 32, height: 32 },
    src,
    alt: icon.label,
    objectFit: 'contain',
    iconId: icon.id,
    fill: fillColor,
    ...(activeTheme ? { themeBindings: { fill: 'color.text.primary' as ColorTokenName } } : {}),
  };

  return iconNode;
}

/**
 * Create a component at the specified world position
 */
export function createComponent(
  worldPos: { x: number; y: number },
  rootNode: LayoutNode,
  selectedComponentId?: string,
  activeTheme?: DesignTheme | null,
): LayoutNode | null {
  const template = COMPONENT_LIBRARY.find(c => c.id === selectedComponentId) ?? COMPONENT_LIBRARY[0];
  if (!template) return null;
  
  let groupNode = template.build(worldPos, makeId);

  // Apply active theme colors to the component
  if (activeTheme) {
    groupNode = applyThemeToComponentNode(groupNode, activeTheme);
  }
  
  // Generate unique name for the component
  const baseName = template.name;
  const existingNames = new Set<string>();
  const collectNames = (node: LayoutNode) => {
    if (node.name) existingNames.add(node.name as string);
    if ('children' in node && Array.isArray(node.children)) {
      node.children.forEach(collectNames);
    }
  };
  collectNames(rootNode);
  
  let finalName = baseName;
  let counter = 2;
  while (existingNames.has(finalName)) {
    finalName = `${baseName} ${String(counter).padStart(2, '0')}`;
    counter++;
  }
  
  groupNode.name = finalName;
  return groupNode;
}

/**
 * Create an image node at the specified world position
 */
export function createImageNode(
  worldPos: { x: number; y: number },
  src: string,
  width: number,
  height: number
): ImageNode {
  const id = makeId('image');
  const imageNode: ImageNode = {
    id,
    type: 'image',
    position: worldPos,
    size: { width, height },
    src,
    alt: 'Image',
    objectFit: 'contain',
  };
  return imageNode;
}
