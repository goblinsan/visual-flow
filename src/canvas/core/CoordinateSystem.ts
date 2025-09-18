/**
 * Coordinate System Management
 * 
 * Handles transformation between world coordinates (scene space) and screen coordinates (viewport space).
 * All internal logic operates in world coordinates for consistency.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds extends Point, Size {}

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

export class CoordinateSystem {
  private transform: Transform;

  constructor(initialTransform: Transform = { x: 0, y: 0, scaleX: 1, scaleY: 1 }) {
    this.transform = { ...initialTransform };
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenPoint: Point): Point {
    return {
      x: (screenPoint.x - this.transform.x) / this.transform.scaleX,
      y: (screenPoint.y - this.transform.y) / this.transform.scaleY,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldPoint: Point): Point {
    return {
      x: worldPoint.x * this.transform.scaleX + this.transform.x,
      y: worldPoint.y * this.transform.scaleY + this.transform.y,
    };
  }

  /**
   * Convert world bounds to screen bounds
   */
  worldBoundsToScreen(worldBounds: Bounds): Bounds {
    const topLeft = this.worldToScreen({ x: worldBounds.x, y: worldBounds.y });
    const bottomRight = this.worldToScreen({
      x: worldBounds.x + worldBounds.width,
      y: worldBounds.y + worldBounds.height,
    });

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  /**
   * Convert screen bounds to world bounds
   */
  screenBoundsToWorld(screenBounds: Bounds): Bounds {
    const topLeft = this.screenToWorld({ x: screenBounds.x, y: screenBounds.y });
    const bottomRight = this.screenToWorld({
      x: screenBounds.x + screenBounds.width,
      y: screenBounds.y + screenBounds.height,
    });

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  /**
   * Update the viewport transform
   */
  setTransform(transform: Partial<Transform>): void {
    this.transform = { ...this.transform, ...transform };
  }

  /**
   * Get current transform
   */
  getTransform(): Transform {
    return { ...this.transform };
  }

  /**
   * Apply zoom at a specific point (screen coordinates)
   */
  zoomAt(screenPoint: Point, zoomFactor: number, minZoom = 0.1, maxZoom = 5): void {
    const worldPoint = this.screenToWorld(screenPoint);
    
    const newScale = Math.max(minZoom, Math.min(maxZoom, this.transform.scaleX * zoomFactor));
    
    this.transform.scaleX = newScale;
    this.transform.scaleY = newScale;
    this.transform.x = screenPoint.x - worldPoint.x * newScale;
    this.transform.y = screenPoint.y - worldPoint.y * newScale;
  }

  /**
   * Pan the viewport by screen delta
   */
  pan(screenDelta: Point): void {
    this.transform.x += screenDelta.x;
    this.transform.y += screenDelta.y;
  }

  /**
   * Get the current scale factor
   */
  getScale(): number {
    return this.transform.scaleX;
  }

  /**
   * Fit the given world bounds to the viewport
   */
  fitBounds(worldBounds: Bounds, viewportSize?: Size): void {
    const viewport = viewportSize || { width: window.innerWidth, height: window.innerHeight };
    
    // Calculate scale to fit bounds in viewport
    const scaleX = viewport.width / worldBounds.width;
    const scaleY = viewport.height / worldBounds.height;
    const scale = Math.min(scaleX, scaleY);
    
    // Center the bounds in the viewport
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    const boundsCenter = {
      x: worldBounds.x + worldBounds.width / 2,
      y: worldBounds.y + worldBounds.height / 2,
    };
    
    this.transform = {
      x: centerX - boundsCenter.x * scale,
      y: centerY - boundsCenter.y * scale,
      scaleX: scale,
      scaleY: scale,
    };
  }
}