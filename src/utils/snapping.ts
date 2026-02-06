// Snapping utilities for alignment and position

export interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  guides: SnapGuide[];
}

export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  label?: string;
}

export interface SnapTarget {
  x: number;
  y: number;
  width: number;
  height: number;
  id?: string;
}

const SNAP_THRESHOLD = 5; // pixels

/**
 * Snap a position to nearby targets (other elements, canvas edges, etc.)
 * @param x - Current x position
 * @param y - Current y position
 * @param width - Width of the element being snapped
 * @param height - Height of the element being snapped
 * @param targets - Other elements to snap to
 * @param canvasWidth - Canvas width for edge snapping
 * @param canvasHeight - Canvas height for edge snapping
 * @param snapToGrid - Whether to snap to grid
 * @param gridSize - Grid size for snapping (default 10)
 * @returns Snapped position with guides
 */
export function snapPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  targets: SnapTarget[] = [],
  canvasWidth?: number,
  canvasHeight?: number,
  snapToGrid = false,
  gridSize = 10
): SnapResult {
  let snappedX = x;
  let snappedY = y;
  let didSnapX = false;
  let didSnapY = false;
  const guides: SnapGuide[] = [];

  // Calculate key positions for the current element
  const left = x;
  const right = x + width;
  const centerX = x + width / 2;
  const top = y;
  const bottom = y + height;
  const centerY = y + height / 2;

  // Grid snapping (if enabled)
  if (snapToGrid) {
    const gridX = Math.round(x / gridSize) * gridSize;
    const gridY = Math.round(y / gridSize) * gridSize;
    
    if (Math.abs(x - gridX) < SNAP_THRESHOLD) {
      snappedX = gridX;
      didSnapX = true;
    }
    if (Math.abs(y - gridY) < SNAP_THRESHOLD) {
      snappedY = gridY;
      didSnapY = true;
    }
  }

  // Snap to other elements
  for (const target of targets) {
    const targetLeft = target.x;
    const targetRight = target.x + target.width;
    const targetCenterX = target.x + target.width / 2;
    const targetTop = target.y;
    const targetBottom = target.y + target.height;
    const targetCenterY = target.y + target.height / 2;

    // Horizontal snapping
    if (!didSnapX) {
      // Left edge alignment
      if (Math.abs(left - targetLeft) < SNAP_THRESHOLD) {
        snappedX = targetLeft;
        didSnapX = true;
        guides.push({ type: 'vertical', position: targetLeft, label: 'Left' });
      }
      // Right edge alignment
      else if (Math.abs(right - targetRight) < SNAP_THRESHOLD) {
        snappedX = targetRight - width;
        didSnapX = true;
        guides.push({ type: 'vertical', position: targetRight, label: 'Right' });
      }
      // Center alignment
      else if (Math.abs(centerX - targetCenterX) < SNAP_THRESHOLD) {
        snappedX = targetCenterX - width / 2;
        didSnapX = true;
        guides.push({ type: 'vertical', position: targetCenterX, label: 'Center' });
      }
    }

    // Vertical snapping
    if (!didSnapY) {
      // Top edge alignment
      if (Math.abs(top - targetTop) < SNAP_THRESHOLD) {
        snappedY = targetTop;
        didSnapY = true;
        guides.push({ type: 'horizontal', position: targetTop, label: 'Top' });
      }
      // Bottom edge alignment
      else if (Math.abs(bottom - targetBottom) < SNAP_THRESHOLD) {
        snappedY = targetBottom - height;
        didSnapY = true;
        guides.push({ type: 'horizontal', position: targetBottom, label: 'Bottom' });
      }
      // Center alignment
      else if (Math.abs(centerY - targetCenterY) < SNAP_THRESHOLD) {
        snappedY = targetCenterY - height / 2;
        didSnapY = true;
        guides.push({ type: 'horizontal', position: targetCenterY, label: 'Middle' });
      }
    }
  }

  // Snap to canvas edges
  if (canvasWidth !== undefined && !didSnapX) {
    // Left edge
    if (Math.abs(left) < SNAP_THRESHOLD) {
      snappedX = 0;
      didSnapX = true;
      guides.push({ type: 'vertical', position: 0, label: 'Canvas Left' });
    }
    // Right edge
    else if (Math.abs(right - canvasWidth) < SNAP_THRESHOLD) {
      snappedX = canvasWidth - width;
      didSnapX = true;
      guides.push({ type: 'vertical', position: canvasWidth, label: 'Canvas Right' });
    }
    // Center
    else if (Math.abs(centerX - canvasWidth / 2) < SNAP_THRESHOLD) {
      snappedX = canvasWidth / 2 - width / 2;
      didSnapX = true;
      guides.push({ type: 'vertical', position: canvasWidth / 2, label: 'Canvas Center' });
    }
  }

  if (canvasHeight !== undefined && !didSnapY) {
    // Top edge
    if (Math.abs(top) < SNAP_THRESHOLD) {
      snappedY = 0;
      didSnapY = true;
      guides.push({ type: 'horizontal', position: 0, label: 'Canvas Top' });
    }
    // Bottom edge
    else if (Math.abs(bottom - canvasHeight) < SNAP_THRESHOLD) {
      snappedY = canvasHeight - height;
      didSnapY = true;
      guides.push({ type: 'horizontal', position: canvasHeight, label: 'Canvas Bottom' });
    }
    // Center
    else if (Math.abs(centerY - canvasHeight / 2) < SNAP_THRESHOLD) {
      snappedY = canvasHeight / 2 - height / 2;
      didSnapY = true;
      guides.push({ type: 'horizontal', position: canvasHeight / 2, label: 'Canvas Center' });
    }
  }

  return {
    x: snappedX,
    y: snappedY,
    snappedX: didSnapX,
    snappedY: didSnapY,
    guides,
  };
}

/**
 * Snap to a grid
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snap multiple values to nearest increment
 */
export function snapValues(values: number[], increment: number): number[] {
  return values.map(v => Math.round(v / increment) * increment);
}
