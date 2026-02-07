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
  /** Guide lines to render (alignment) */
  guides: SnapGuideLine[];
  /** Spacing guides to render (equal distance) */
  spacingGuides?: SpacingGuide[];
}

/** Which anchors on the dragged object to consider when snapping */
export type SnapAnchor = 'center' | 'border' | 'both';

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
 * snap to grid considering anchors (borders + center) with bottom/right priority.
 *
 * When `draggedBounds` is provided, all relevant edges/center are tested against
 * the grid and the closest snap wins.  Priority order for equal distances:
 * Y: bottom > center > top   X: right > center > left
 */
export function computeGridSnap(
  dx: number,
  dy: number,
  originPositions: Record<string, { x: number; y: number }>,
  nodeIds: string[],
  gridSize: number,
  draggedBounds?: SnapBounds[],
  snapAnchor: SnapAnchor = 'both'
): { dx: number; dy: number } {
  if (nodeIds.length === 0) return { dx, dy };
  const firstId = nodeIds[0];
  const origin = originPositions[firstId];
  if (!origin) return { dx, dy };

  // If bounds are available, use edge-aware snapping
  if (draggedBounds && draggedBounds.length > 0) {
    // Union bounding box at tentative position
    const uLeft = Math.min(...draggedBounds.map(b => b.x + dx));
    const uTop = Math.min(...draggedBounds.map(b => b.y + dy));
    const uRight = Math.max(...draggedBounds.map(b => b.x + dx + b.width));
    const uBottom = Math.max(...draggedBounds.map(b => b.y + dy + b.height));
    const uCenterX = (uLeft + uRight) / 2;
    const uCenterY = (uTop + uBottom) / 2;

    // Build anchor lists based on snap mode (ordered by priority: border-bottom/right first)
    let anchorsX: number[];
    let anchorsY: number[];
    if (snapAnchor === 'center') {
      anchorsX = [uCenterX];
      anchorsY = [uCenterY];
    } else if (snapAnchor === 'border') {
      // Priority: right > left for X, bottom > top for Y
      anchorsX = [uRight, uLeft];
      anchorsY = [uBottom, uTop];
    } else {
      // 'both' – priority: right > center > left for X, bottom > center > top for Y
      anchorsX = [uRight, uCenterX, uLeft];
      anchorsY = [uBottom, uCenterY, uTop];
    }

    // Find best X snap (prefer earlier entries in priority order on tie)
    let bestXAdj = 0;
    let bestXDist = Infinity;
    for (const ax of anchorsX) {
      const snapped = snapToGridValue(ax, gridSize);
      const dist = Math.abs(ax - snapped);
      if (dist < bestXDist) {
        bestXDist = dist;
        bestXAdj = snapped - ax;
      }
    }

    // Find best Y snap
    let bestYAdj = 0;
    let bestYDist = Infinity;
    for (const ay of anchorsY) {
      const snapped = snapToGridValue(ay, gridSize);
      const dist = Math.abs(ay - snapped);
      if (dist < bestYDist) {
        bestYDist = dist;
        bestYAdj = snapped - ay;
      }
    }

    return { dx: dx + bestXAdj, dy: dy + bestYAdj };
  }

  // Fallback: simple top-left snap (no bounds available)
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
  otherBounds: SnapBounds[],
  snapAnchor: SnapAnchor = 'both'
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

  // Edges of the dragged union (filtered by snap anchor mode)
  let dragEdgesX: number[];
  let dragEdgesY: number[];
  if (snapAnchor === 'center') {
    dragEdgesX = [unionCenterX];
    dragEdgesY = [unionCenterY];
  } else if (snapAnchor === 'border') {
    dragEdgesX = [unionLeft, unionRight];
    dragEdgesY = [unionTop, unionBottom];
  } else {
    // 'both' – all edges, bottom/right first for priority
    dragEdgesX = [unionRight, unionCenterX, unionLeft];
    dragEdgesY = [unionBottom, unionCenterY, unionTop];
  }

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

// ─── Equal-Distance (Spacing) Snapping ───────────────────────────────

/** A spacing guide shows measured distance between objects */
export interface SpacingGuide {
  orientation: 'horizontal' | 'vertical';
  /** The gap value being matched */
  gap: number;
  /** Start and end positions of the spacing indicator (world coords) */
  from: number;
  to: number;
  /** Cross-axis center position for drawing the indicator */
  crossPosition: number;
}

/**
 * Compute spacing snaps: when dragging a node between two or more aligned objects,
 * snap to make the gaps equal to an existing gap in the scene.
 *
 * Algorithm:
 * 1. Collect all pairwise gaps between non-dragged objects along each axis
 * 2. For the dragged object, compute its tentative gaps to neighbors on each side
 * 3. If a tentative gap is close to an existing gap, snap to match it
 */
export function computeSpacingSnap(
  dx: number,
  dy: number,
  draggedBounds: SnapBounds[],
  otherBounds: SnapBounds[]
): { dx: number; dy: number; spacingGuides: SpacingGuide[] } {
  if (draggedBounds.length === 0 || otherBounds.length < 2) {
    return { dx, dy, spacingGuides: [] };
  }

  // Union bounding box of dragged nodes at tentative position
  const uLeft = Math.min(...draggedBounds.map(b => b.x + dx));
  const uTop = Math.min(...draggedBounds.map(b => b.y + dy));
  const uRight = Math.max(...draggedBounds.map(b => b.x + dx + b.width));
  const uBottom = Math.max(...draggedBounds.map(b => b.y + dy + b.height));

  const spacingGuides: SpacingGuide[] = [];
  let adjDx = 0;
  let adjDy = 0;
  let foundX = false;
  let foundY = false;

  // ─── Horizontal spacing (gaps along X axis) ───
  {
    // Sort other objects by their left edge
    const sorted = [...otherBounds].sort((a, b) => a.x - b.x);

    // Collect pairwise horizontal gaps between consecutive objects (non-overlapping)
    const existingGaps: { gap: number; leftObj: SnapBounds; rightObj: SnapBounds }[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].x - (sorted[i].x + sorted[i].width);
      if (gap > 0) {
        existingGaps.push({ gap, leftObj: sorted[i], rightObj: sorted[i + 1] });
      }
    }

    if (existingGaps.length > 0) {
      // Find closest object to the left and right of the dragged union
      let closestLeft: SnapBounds | null = null;
      let closestLeftDist = Infinity;
      let closestRight: SnapBounds | null = null;
      let closestRightDist = Infinity;

      for (const ob of otherBounds) {
        const rightEdge = ob.x + ob.width;
        if (rightEdge <= uLeft) {
          const dist = uLeft - rightEdge;
          if (dist < closestLeftDist) { closestLeftDist = dist; closestLeft = ob; }
        }
        if (ob.x >= uRight) {
          const dist = ob.x - uRight;
          if (dist < closestRightDist) { closestRightDist = dist; closestRight = ob; }
        }
      }

      // Try to match left or right gap to an existing gap
      let matchedGap: number | null = null;
      for (const eg of existingGaps) {
        if (closestLeft && !foundX) {
          const tentativeGap = uLeft - (closestLeft.x + closestLeft.width);
          const diff = eg.gap - tentativeGap;
          if (Math.abs(diff) <= OBJECT_SNAP_THRESHOLD) {
            adjDx = diff;
            foundX = true;
            matchedGap = eg.gap;
          }
        }
        if (closestRight && !foundX) {
          const tentativeGap = closestRight.x - uRight;
          const diff = eg.gap - tentativeGap;
          if (Math.abs(diff) <= OBJECT_SNAP_THRESHOLD) {
            adjDx = -diff;
            foundX = true;
            matchedGap = eg.gap;
          }
        }
        if (foundX) break;
      }

      // If we found a snap, show guides for ALL gaps that match this spacing
      if (foundX && matchedGap !== null) {
        const tolerance = 1; // Allow 1px tolerance for matching gaps
        const snappedLeft = uLeft + adjDx;
        const snappedRight = uRight + adjDx;
        const crossY = (uTop + uBottom) / 2;

        // Guide for the dragged object's left gap (if neighbor exists)
        if (closestLeft) {
          const leftGap = snappedLeft - (closestLeft.x + closestLeft.width);
          if (Math.abs(leftGap - matchedGap) < tolerance) {
            spacingGuides.push({
              orientation: 'horizontal',
              gap: matchedGap,
              from: closestLeft.x + closestLeft.width,
              to: snappedLeft,
              crossPosition: crossY,
            });
          }
        }

        // Guide for the dragged object's right gap (if neighbor exists)
        if (closestRight) {
          const rightGap = closestRight.x - snappedRight;
          if (Math.abs(rightGap - matchedGap) < tolerance) {
            spacingGuides.push({
              orientation: 'horizontal',
              gap: matchedGap,
              from: snappedRight,
              to: closestRight.x,
              crossPosition: crossY,
            });
          }
        }

        // Guides for ALL existing gaps between other objects that match this spacing
        for (const eg of existingGaps) {
          if (Math.abs(eg.gap - matchedGap) < tolerance) {
            spacingGuides.push({
              orientation: 'horizontal',
              gap: matchedGap,
              from: eg.leftObj.x + eg.leftObj.width,
              to: eg.rightObj.x,
              crossPosition: (eg.leftObj.y + eg.leftObj.height / 2 + eg.rightObj.y + eg.rightObj.height / 2) / 2,
            });
          }
        }
      }
    }
  }

  // ─── Vertical spacing (gaps along Y axis) ───
  {
    const sorted = [...otherBounds].sort((a, b) => a.y - b.y);

    const existingGaps: { gap: number; topObj: SnapBounds; bottomObj: SnapBounds }[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].y - (sorted[i].y + sorted[i].height);
      if (gap > 0) {
        existingGaps.push({ gap, topObj: sorted[i], bottomObj: sorted[i + 1] });
      }
    }

    if (existingGaps.length > 0) {
      let closestAbove: SnapBounds | null = null;
      let closestAboveDist = Infinity;
      let closestBelow: SnapBounds | null = null;
      let closestBelowDist = Infinity;

      for (const ob of otherBounds) {
        const bottomEdge = ob.y + ob.height;
        if (bottomEdge <= uTop) {
          const dist = uTop - bottomEdge;
          if (dist < closestAboveDist) { closestAboveDist = dist; closestAbove = ob; }
        }
        if (ob.y >= uBottom) {
          const dist = ob.y - uBottom;
          if (dist < closestBelowDist) { closestBelowDist = dist; closestBelow = ob; }
        }
      }

      let matchedGap: number | null = null;
      for (const eg of existingGaps) {
        if (closestAbove && !foundY) {
          const tentativeGap = uTop - (closestAbove.y + closestAbove.height);
          const diff = eg.gap - tentativeGap;
          if (Math.abs(diff) <= OBJECT_SNAP_THRESHOLD) {
            adjDy = diff;
            foundY = true;
            matchedGap = eg.gap;
          }
        }
        if (closestBelow && !foundY) {
          const tentativeGap = closestBelow.y - uBottom;
          const diff = eg.gap - tentativeGap;
          if (Math.abs(diff) <= OBJECT_SNAP_THRESHOLD) {
            adjDy = -diff;
            foundY = true;
            matchedGap = eg.gap;
          }
        }
        if (foundY) break;
      }

      // If we found a snap, show guides for ALL gaps that match this spacing
      if (foundY && matchedGap !== null) {
        const tolerance = 1;
        const snappedTop = uTop + adjDy;
        const snappedBottom = uBottom + adjDy;
        const crossX = (uLeft + uRight) / 2;

        // Guide for the dragged object's above gap
        if (closestAbove) {
          const aboveGap = snappedTop - (closestAbove.y + closestAbove.height);
          if (Math.abs(aboveGap - matchedGap) < tolerance) {
            spacingGuides.push({
              orientation: 'vertical',
              gap: matchedGap,
              from: closestAbove.y + closestAbove.height,
              to: snappedTop,
              crossPosition: crossX,
            });
          }
        }

        // Guide for the dragged object's below gap
        if (closestBelow) {
          const belowGap = closestBelow.y - snappedBottom;
          if (Math.abs(belowGap - matchedGap) < tolerance) {
            spacingGuides.push({
              orientation: 'vertical',
              gap: matchedGap,
              from: snappedBottom,
              to: closestBelow.y,
              crossPosition: crossX,
            });
          }
        }

        // Guides for ALL existing gaps between other objects that match
        for (const eg of existingGaps) {
          if (Math.abs(eg.gap - matchedGap) < tolerance) {
            spacingGuides.push({
              orientation: 'vertical',
              gap: matchedGap,
              from: eg.topObj.y + eg.topObj.height,
              to: eg.bottomObj.y,
              crossPosition: (eg.topObj.x + eg.topObj.width / 2 + eg.bottomObj.x + eg.bottomObj.width / 2) / 2,
            });
          }
        }
      }
    }
  }

  return { dx: dx + adjDx, dy: dy + adjDy, spacingGuides };
}

/**
 * Combined snapping: applies grid snap first, then object snap, then spacing snap.
 * Returns the final adjusted delta and guide lines.
 */
export function computeSnap(
  rawDx: number,
  rawDy: number,
  originPositions: Record<string, { x: number; y: number }>,
  nodeIds: string[],
  draggedBounds: SnapBounds[],
  otherBounds: SnapBounds[],
  options: { snapToGrid: boolean; snapToObjects: boolean; snapToSpacing: boolean; gridSize: number; snapAnchor?: SnapAnchor }
): SnapResult {
  let dx = rawDx;
  let dy = rawDy;
  let guides: SnapGuideLine[] = [];
  let spacingGuides: SpacingGuide[] = [];
  const anchor = options.snapAnchor ?? 'both';

  if (options.snapToGrid) {
    const gridResult = computeGridSnap(dx, dy, originPositions, nodeIds, options.gridSize, draggedBounds, anchor);
    dx = gridResult.dx;
    dy = gridResult.dy;
  }

  if (options.snapToObjects && otherBounds.length > 0) {
    const objResult = computeObjectSnap(dx, dy, draggedBounds, otherBounds, anchor);
    dx = objResult.dx;
    dy = objResult.dy;
    guides = objResult.guides;
  }

  if (options.snapToSpacing && otherBounds.length >= 2) {
    const spacingResult = computeSpacingSnap(dx, dy, draggedBounds, otherBounds);
    dx = spacingResult.dx;
    dy = spacingResult.dy;
    spacingGuides = spacingResult.spacingGuides;
  }

  return { dx, dy, guides, spacingGuides };
}
