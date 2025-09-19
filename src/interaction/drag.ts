import type { Point, DragSession, DragUpdate, DragFinalize } from './types';

// Pixel distance required before a drag is considered active.
const DRAG_THRESHOLD = 3;

function distance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function beginDrag(nodeIds: string[], start: Point, originPositions: Record<string, Point>): DragSession {
  return { nodeIds, start, last: start, originPositions, passedThreshold: false };
}

export function updateDrag(session: DragSession, current: Point): DragUpdate {
  const dx = current.x - session.start.x;
  const dy = current.y - session.start.y;
  const passed = session.passedThreshold || distance(session.start, current) >= DRAG_THRESHOLD;
  const moved = passed
    ? session.nodeIds.map(id => {
        const origin = session.originPositions[id] || { x: 0, y: 0 };
        return { id, x: origin.x + dx, y: origin.y + dy };
      })
    : [];
  session.last = current;
  session.passedThreshold = passed;
  return { dx, dy, moved, passedThreshold: passed };
}

export function finalizeDrag(session: DragSession): DragFinalize {
  const totalDx = session.last.x - session.start.x;
  const totalDy = session.last.y - session.start.y;
  const moved = session.passedThreshold
    ? session.nodeIds.map(id => {
        const origin = session.originPositions[id] || { x: 0, y: 0 };
        return { id, from: origin, to: { x: origin.x + totalDx, y: origin.y + totalDy } };
      })
    : [];
  return { totalDx, totalDy, moved };
}

export const __test = { DRAG_THRESHOLD, distance };
