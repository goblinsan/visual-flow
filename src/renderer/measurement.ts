import type { LayoutNode, TextNode } from '../layout-schema';

// Mirror existing variant font size logic from CanvasRenderer
export function fontSizeForVariant(variant: string | undefined): number {
  return variant === 'h1' ? 28 : variant === 'h2' ? 22 : variant === 'h3' ? 18 : 14;
}

export function approxTextHeight(n: TextNode): number {
  return fontSizeForVariant(n.variant) + 8; // keep existing +8 padding heuristic
}

export function estimateNodeHeight(n: LayoutNode): number {
  switch (n.type) {
    case 'text': return approxTextHeight(n);
    case 'image': return n.size?.height ?? 100;
    case 'box': return n.size?.height ?? 120;
    case 'frame': return n.size.height;
    case 'stack': {
      const s = n;
      return s.children.reduce((h: number, c: LayoutNode) => h + estimateNodeHeight(c) + (s.gap ?? 0), 0);
    }
    case 'grid': return n.children.length > 0 ? 200 : 100; // preserve existing placeholder heuristic
    case 'group': return n.children.length > 0 ? 200 : 100; // placeholder
    default: return 100;
  }
}
