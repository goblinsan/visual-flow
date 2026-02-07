/**
 * Shared utility for generating regular polygon points.
 *
 * Points are normalized so they span the full bounding box [0, width] × [0, height],
 * ensuring `node.size` accurately describes the polygon's visual bounds.
 */
export function generateRegularPolygonPoints(width: number, height: number, sides: number): number[] {
  const radiusX = width / 2;
  const radiusY = height / 2;
  const centerX = radiusX;
  const centerY = radiusY;

  // Start from top (angle offset to make polygon upright)
  const angleOffset = -Math.PI / 2;

  // Generate raw points inscribed in the ellipse
  const rawXs: number[] = [];
  const rawYs: number[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = angleOffset + (i * 2 * Math.PI) / sides;
    rawXs.push(centerX + radiusX * Math.cos(angle));
    rawYs.push(centerY + radiusY * Math.sin(angle));
  }

  // Compute actual bounding box of the raw points
  const minX = Math.min(...rawXs);
  const maxX = Math.max(...rawXs);
  const minY = Math.min(...rawYs);
  const maxY = Math.max(...rawYs);

  const rawW = maxX - minX || 1;
  const rawH = maxY - minY || 1;

  // Normalize points to fill [0, width] × [0, height]
  const points: number[] = [];
  for (let i = 0; i < sides; i++) {
    points.push(
      ((rawXs[i] - minX) / rawW) * width,
      ((rawYs[i] - minY) / rawH) * height,
    );
  }

  return points;
}
