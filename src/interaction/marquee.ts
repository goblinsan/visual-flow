import type { MarqueeRect, NodeBounds } from './types';

export interface MarqueeResult { ids: string[] }

function rectContains(r: MarqueeRect, b: NodeBounds): boolean {
  return b.x >= r.x && b.y >= r.y && (b.x + b.width) <= (r.x + r.width) && (b.y + b.height) <= (r.y + r.height);
}

export function computeMarquee(rect: MarqueeRect, nodes: NodeBounds[]): MarqueeResult {
  if (rect.width === 0 || rect.height === 0) return { ids: [] };
  const ids: string[] = [];
  for (const n of nodes) {
    if (rectContains(rect, n)) ids.push(n.id);
  }
  return { ids };
}

export const __test = { rectContains };
