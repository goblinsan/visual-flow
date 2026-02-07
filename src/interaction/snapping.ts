/**
 * Snapping utilities — pure functions for grid and object alignment snapping.
 *
 * Grid snapping rounds to the nearest grid interval.
 * Object snapping computes alignment guide lines between the dragged node(s)
 * and all other visible nodes (edges & centers).
 */

export interface SnapBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapGuideLine {
  orientation: 'horizontal' | 'vertical';
  /** World coordinate of the guide (y for horizontal, x for vertical) */
  position: number;
}

export interface SnapResult {
  /** Adjusted dx after snapping */
  dx: number;
  /** Adjusted dy after snapping */
  dy: number;
  /** Guide lines to render */
  guides: SnapGuideLine[];
}

/** Snap threshold in world-space pixels */
const OBJECT_SNAP_THRESHOLD = 6;

// ─── Grid Snapping ───────────────────────────────────────────────────

/**
 * Snap a position to the nearest grid interval.
 * Returns the snapped position value.
 */
export function snapToGridValue(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Given a drag delta (dx, dy) and the original positions of dragged nodes,
 * snap to grid by rounding the tentative top-left of the *first* dragged node.
 */
export function computeGridSnap(
  dx: number,
  dy: number,
  originPositions: Record<string, { x: number; y: number }>,
  nodeIds: string[],
  gridSize: number
): { dx: number; dy: number } {
  if (nodeIds.length === 0) return { dx, dy };
  const firstId = nodeIds[0];
  const origin = originPositions[firstId];
  if (!origin) return { dx, dy };

  const tentativeX = origin.x + dx;
  const tentativeY = origin.y + dy;

  const snappedX = snapToGridValue(tentativeX, gridSize);
  const snappedY = snapToGridValue(tentativeY, gridSize);

  return {
    dx: dx + (snappedX - tentativeX),
    dy: dy + (snappedY - tentativeY),
  };
}

// ─── Object Alignment Snapping ───────────────────────────────────────

/**
 * For each dragged node, compute its tentative bounding box (original + delta).
 * Then compare edges & centers against all other (non-dragged) nodes.
 * Returns the adjusted delta and any guide lines that should be drawn.
 */
export function computeObjectSnap(
  dx: number,
  dy: number,
  draggedBounds: SnapBounds[],
  otherBounds: SnapBounds[]
): SnapResult {
  if (draggedBounds.length === 0 || otherBounds.length === 0) {
    return { dx, dy, guides: [] };
  }

  // Compute the union bounding box of all dragged nodes (at tentative position)
  const unionLeft = Math.min(...draggedBounds.map(b => b.x + dx));
  const unionTop = Math.min(...draggedBounds.map(b => b.y + dy));
  const unionRight = Math.max(...draggedBounds.map(b => b.x + dx + b.width));
  const unionBottom = Math.max(...draggedBounds.map(b => b.y + dy + b.height));
  const unionCenterX = (unionLeft + unionRight) / 2;
  const unionCenterY = (unionTop + unionBottom) / 2;

  // Edges of the dragged union
  const dragEdgesX = [unionLeft, unionCenterX, unionRight]; // left, center, right
  const dragEdgesY = [unionTop, unionCenterY, unionBottom]; // top, center, bottom

  // Collect all snap-worthy values from other nodes
  const otherEdgesX: number[] = [];
  const otherEdgesY: number[] = [];
  for (const ob of otherBounds) {
    otherEdgesX.push(ob.x, ob.x + ob.width / 2, ob.x + ob.width);
    otherEdgesY.push(ob.y, ob.y + ob.height / 2, ob.y + ob.height);
  }

  // Find closest X snap
  let bestDxAdj = 0;
  let bestXDist = OBJECT_SNAP_THRESHOLD + 1;
  for (const de of dragEdgesX) {
    for (const oe of otherEdgesX) {
      const dist = Math.abs(de - oe);
      if (dist < bestXDist) {
        bestXDist = dist;
        bestDxAdj = oe - de;
      }
    }
  }

  // Find closest Y snap
  let bestDyAdj = 0;
  let bestYDist = OBJECT_SNAP_THRESHOLD + 1;
  for (const de of dragEdgesY) {
    for (const oe of otherEdgesY) {
      const dist = Math.abs(de - oe);
      if (dist < bestYDist) {
        bestYDist = dist;
        bestDyAdj = oe - de;
      }
    }
  }

  // Build adjusted deltas
  const adjDx = bestXDist <= OBJECT_SNAP_THRESHOLD ? dx + bestDxAdj : dx;
  const adjDy = bestYDist <= OBJECT_SNAP_THRESHOLD ? dy + bestDyAdj : dy;

  // Build guide lines for active snaps
  const guides: SnapGuideLine[] = [];
  if (bestXDist <= OBJECT_SNAP_THRESHOLD) {
    // Find the X coordinate we snapped to
    const snappedX = (unionLeft + bestDxAdj) + (bestDxAdj !== 0 ? 0 : 0);
    // Recalculate which edge matched
    const adjLeft = unionLeft + bestDxAdj;
    const adjCenter = unionCenterX + bestDxAdj;
    const adjRight = unionRight + bestDxAdj;
    for (const oe of otherEdgesX) {
      if (Math.abs(adjLeft - oe) < 0.5 || Math.abs(adjCenter - oe) < 0.5 || Math.abs(adjRight - oe) < 0.5) {
        if (!guides.some(g => g.orientation === 'vertical' && Math.abs(g.position - oe) < 0.5)) {
          guides.push({ orientation: 'vertical', position: oe });
        }
      }
    }
    void snappedX; // used implicitly above
  }
  if (bestYDist <= OBJECT_SNAP_THRESHOLD) {
    const adjTop = unionTop + bestDyAdj;
    const adjCenterY2 = unionCenterY + bestDyAdj;
    const adjBottom = unionBottom + bestDyAdj;
    for (const oe of otherEdgesY) {
      if (Math.abs(adjTop - oe) < 0.5 || Math.abs(adjCenterY2 - oe) < 0.5 || Math.abs(adjBottom - oe) < 0.5) {
        if (!guides.some(g => g.orientation === 'horizontal' && Math.abs(g.position - oe) < 0.5)) {
          guides.push({ orientation: 'horizontal', position: oe });
        }
      }
    }
  }

  return { dx: adjDx, dy: adjDy, guides };
}

/**
 * Combined snapping: applies grid snap first, then object snap on top.
 * Returns the final adjusted delta and guide lines.
 */
export function computeSnap(
  rawDx: number,
  rawDy: number,
  originPositions: Record<string, { x: number; y: number }>,
  nodeIds: string[],
  draggedBounds: SnapBounds[],
  otherBounds: SnapBounds[],
  options: { snapToGrid: boolean; snapToObjects: boolean; gridSize: number }
): SnapResult {
  let dx = rawDx;
  let dy = rawDy;
  let guides: SnapGuideLine[] = [];

  if (options.snapToGrid) {
    const gridResult = computeGridSnap(dx, dy, originPositions, nodeIds, options.gridSize);
    dx = gridResult.dx;
    dy = gridResult.dy;
  }

  if (options.snapToObjects && otherBounds.length > 0) {
    const objResult = computeObjectSnap(dx, dy, draggedBounds, otherBounds);
    dx = objResult.dx;
    dy = objResult.dy;
    guides = objResult.guides;
  }

  return { dx, dy, guides };
}
