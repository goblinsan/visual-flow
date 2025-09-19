import type { MarqueeRect, NodeBounds, Point } from './types';

// Existing containment-based marquee result (full containment selection semantics)
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

// Session-oriented pure marquee API (Milestone 1 extraction step)
export interface MarqueeSession {
  start: Point;
  last: Point;
  baseSelection: string[];
  isToggle: boolean; // shift/ctrl semantics
}

export interface MarqueeUpdate { rect: MarqueeRect }
export interface MarqueeFinalize { rect: MarqueeRect; hits: string[] }

export function beginMarquee(start: Point, baseSelection: string[], isToggle: boolean): MarqueeSession {
  return { start, last: start, baseSelection: baseSelection.slice(), isToggle };
}

export function updateMarquee(session: MarqueeSession, current: Point): MarqueeUpdate {
  session.last = current;
  const x1 = Math.min(session.start.x, current.x);
  const y1 = Math.min(session.start.y, current.y);
  const x2 = Math.max(session.start.x, current.x);
  const y2 = Math.max(session.start.y, current.y);
  return { rect: { x: x1, y: y1, width: x2 - x1, height: y2 - y1 } };
}

function intersects(a: MarqueeRect, b: NodeBounds): boolean {
  return !(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y);
}

export function finalizeMarquee(session: MarqueeSession, nodes: NodeBounds[]): MarqueeFinalize {
  const { rect } = updateMarquee(session, session.last);
  if (rect.width < 5 && rect.height < 5) return { rect, hits: [] }; // treat tiny as click
  const hits: string[] = [];
  for (const n of nodes) {
    if (intersects(rect, n) && !hits.includes(n.id)) hits.push(n.id);
  }
  return { rect, hits };
}

export const __test = { rectContains, intersects };
