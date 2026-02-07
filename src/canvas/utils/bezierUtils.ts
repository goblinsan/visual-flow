/**
 * Bezier curve utilities for computing control handles and rendering paths.
 *
 * Data model:
 * - `points` (number[]): flat anchor coordinates [x0,y0, x1,y1, ...]
 * - `handles` (number[]): per-segment control handle offsets.
 *   For N anchors there are N-1 segments, each with 4 numbers:
 *     [outDx_i, outDy_i, inDx_{i+1}, inDy_{i+1}]
 *   where "out" is the offset from anchor i and "in" is the offset from anchor i+1.
 *   Total length: (N-1) * 4
 */

export interface Anchor {
  x: number;
  y: number;
}

/**
 * Extract anchor points from a flat coordinate array.
 */
export function getAnchors(points: number[]): Anchor[] {
  const anchors: Anchor[] = [];
  for (let i = 0; i < points.length; i += 2) {
    anchors.push({ x: points[i], y: points[i + 1] });
  }
  return anchors;
}

/**
 * Compute default Bezier control handles from anchor points using
 * Catmull-Rom → cubic Bezier conversion.
 *
 * For each segment between anchors[i] and anchors[i+1]:
 *   cp1 = anchors[i] + (anchors[i+1] - p_prev) * tension / 3
 *   cp2 = anchors[i+1] - (p_next - anchors[i]) * tension / 3
 *
 * Endpoints are reflected: p_prev for first = 2*p0 - p1, p_next for last = 2*pN - p(N-1).
 */
export function computeDefaultHandles(anchors: Anchor[], tension: number = 0.5): number[] {
  const n = anchors.length;
  if (n < 2) return [];

  const handles: number[] = [];
  const t = tension;

  for (let seg = 0; seg < n - 1; seg++) {
    const p0 = seg > 0
      ? anchors[seg - 1]
      : { x: 2 * anchors[0].x - anchors[1].x, y: 2 * anchors[0].y - anchors[1].y };
    const p1 = anchors[seg];
    const p2 = anchors[seg + 1];
    const p3 = seg < n - 2
      ? anchors[seg + 2]
      : { x: 2 * anchors[n - 1].x - anchors[n - 2].x, y: 2 * anchors[n - 1].y - anchors[n - 2].y };

    // Out-handle of p1 (control point 1 of this segment)
    const outDx = (p2.x - p0.x) * t / 3;
    const outDy = (p2.y - p0.y) * t / 3;

    // In-handle of p2 (control point 2 of this segment)
    const inDx = -(p3.x - p1.x) * t / 3;
    const inDy = -(p3.y - p1.y) * t / 3;

    handles.push(outDx, outDy, inDx, inDy);
  }

  return handles;
}

/**
 * Build the flat points array for Konva's `<Line bezier={true}>`.
 *
 * Format: [startX, startY, cp1X, cp1Y, cp2X, cp2Y, endX, endY, cp3X, cp3Y, cp4X, cp4Y, end2X, end2Y, ...]
 * First pair is the start point, then groups of 3 pairs per segment.
 */
export function computeBezierPath(anchors: Anchor[], handles: number[]): number[] {
  if (anchors.length < 2) return anchors.flatMap(a => [a.x, a.y]);

  const result = [anchors[0].x, anchors[0].y];

  for (let seg = 0; seg < anchors.length - 1; seg++) {
    const a1 = anchors[seg];
    const a2 = anchors[seg + 1];
    const outDx = handles[seg * 4] ?? 0;
    const outDy = handles[seg * 4 + 1] ?? 0;
    const inDx = handles[seg * 4 + 2] ?? 0;
    const inDy = handles[seg * 4 + 3] ?? 0;

    result.push(
      a1.x + outDx, a1.y + outDy,   // cp1
      a2.x + inDx, a2.y + inDy,     // cp2
      a2.x, a2.y                      // endpoint
    );
  }

  return result;
}

/**
 * Enforce smooth constraint: when one handle is moved, mirror the opposite handle
 * to maintain collinearity through the anchor point.
 *
 * @param handles  The full handles array (mutated in place)
 * @param anchorIndex  Which anchor's handle was moved (0-based)
 * @param isOutHandle  true if the out-handle was moved, false if in-handle
 * @param numAnchors   Total number of anchors
 */
export function enforceSmooth(
  handles: number[],
  anchorIndex: number,
  isOutHandle: boolean,
  numAnchors: number
): number[] {
  const result = [...handles];
  const numSegments = numAnchors - 1;

  if (isOutHandle) {
    // Out-handle of anchor i lives in segment i: handles[i*4], handles[i*4+1]
    // Mirror to in-handle of anchor i (which lives in segment i-1): handles[(i-1)*4+2], handles[(i-1)*4+3]
    const seg = anchorIndex;
    if (seg >= numSegments) return result;
    const outDx = result[seg * 4];
    const outDy = result[seg * 4 + 1];
    const prevSeg = anchorIndex - 1;
    if (prevSeg >= 0) {
      const dist = Math.sqrt(result[prevSeg * 4 + 2] ** 2 + result[prevSeg * 4 + 3] ** 2);
      const outDist = Math.sqrt(outDx * outDx + outDy * outDy);
      if (outDist > 0.001) {
        result[prevSeg * 4 + 2] = -outDx * dist / outDist;
        result[prevSeg * 4 + 3] = -outDy * dist / outDist;
      }
    }
  } else {
    // In-handle of anchor i lives in segment i-1: handles[(i-1)*4+2], handles[(i-1)*4+3]
    // Mirror to out-handle of anchor i (segment i): handles[i*4], handles[i*4+1]
    const prevSeg = anchorIndex - 1;
    if (prevSeg < 0) return result;
    const inDx = result[prevSeg * 4 + 2];
    const inDy = result[prevSeg * 4 + 3];
    const seg = anchorIndex;
    if (seg < numSegments) {
      const dist = Math.sqrt(result[seg * 4] ** 2 + result[seg * 4 + 1] ** 2);
      const inDist = Math.sqrt(inDx * inDx + inDy * inDy);
      if (inDist > 0.001) {
        result[seg * 4] = -inDx * dist / inDist;
        result[seg * 4 + 1] = -inDy * dist / inDist;
      }
    }
  }

  return result;
}
