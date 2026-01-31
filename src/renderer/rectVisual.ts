import type { RectNode, GradientFill } from "../layout-schema";
import { normalizePaint, deriveStrokeVisual } from "../utils/paint";

export interface RectVisualProps {
  width: number;
  height: number;
  fill: string | undefined;
  fillEnabled: boolean;
  stroke: string | undefined;
  strokeEnabled: boolean;
  strokeWidth: number;
  opacity: number | undefined; // only override when fallback case
  dash: number[] | undefined;
  cornerRadius: number;
  // meta: whether both fill+stroke disabled originally (before fallback decoration)
  bothDisabled: boolean;
  // Gradient properties (for Konva)
  fillGradient?: GradientFill;
  fillLinearGradientStartPoint?: { x: number; y: number };
  fillLinearGradientEndPoint?: { x: number; y: number };
  fillLinearGradientColorStops?: (string | number)[];
  fillRadialGradientStartPoint?: { x: number; y: number };
  fillRadialGradientEndPoint?: { x: number; y: number };
  fillRadialGradientStartRadius?: number;
  fillRadialGradientEndRadius?: number;
  fillRadialGradientColorStops?: (string | number)[];
}

/**
 * Convert angle in degrees to start/end points for a linear gradient
 */
function angleToGradientPoints(angle: number, width: number, height: number) {
  // Convert angle to radians (Konva uses a coordinate system where 0 is right, 90 is down)
  const rad = (angle * Math.PI) / 180;
  const centerX = width / 2;
  const centerY = height / 2;
  // Calculate the diagonal length for full coverage
  const len = Math.max(width, height);
  
  return {
    start: {
      x: centerX - Math.cos(rad) * len / 2,
      y: centerY - Math.sin(rad) * len / 2,
    },
    end: {
      x: centerX + Math.cos(rad) * len / 2,
      y: centerY + Math.sin(rad) * len / 2,
    },
  };
}

/**
 * Convert GradientFill colors to Konva color stops format
 * Konva expects: [offset, color, offset, color, ...]
 */
function gradientToColorStops(colors: string[]): (string | number)[] {
  if (colors.length === 0) return [0, '#ffffff', 1, '#000000'];
  if (colors.length === 1) return [0, colors[0], 1, colors[0]];
  
  const stops: (string | number)[] = [];
  colors.forEach((color, index) => {
    const offset = index / (colors.length - 1);
    stops.push(offset, color);
  });
  return stops;
}

/**
 * Derive the visual (pure) rendering props for a Rect node.
 * Mirrors previous inline logic in CanvasRenderer.renderRect with no side-effects.
 */
export function computeRectVisual(n: RectNode): RectVisualProps {
  const w = n.size?.width ?? 80;
  const h = n.size?.height ?? 60;
  const fill = normalizePaint(n.fill);
  const strokeInfo = deriveStrokeVisual(fill, n.stroke, n.strokeWidth, n.strokeDash);
  
  const result: RectVisualProps = {
    width: w,
    height: h,
    fill,
    fillEnabled: fill !== undefined || n.fillGradient !== undefined,
    stroke: strokeInfo.stroke,
    strokeEnabled: strokeInfo.strokeEnabled,
    strokeWidth: strokeInfo.strokeWidth,
    opacity: strokeInfo.opacity,
    dash: strokeInfo.dash,
    cornerRadius: n.radius ?? 0,
    bothDisabled: strokeInfo.bothDisabled && !n.fillGradient,
    fillGradient: n.fillGradient,
  };
  
  // Add gradient properties if gradient is defined
  if (n.fillGradient) {
    const { type, colors, angle = 0 } = n.fillGradient;
    const colorStops = gradientToColorStops(colors);
    
    if (type === 'linear') {
      const points = angleToGradientPoints(angle, w, h);
      result.fillLinearGradientStartPoint = points.start;
      result.fillLinearGradientEndPoint = points.end;
      result.fillLinearGradientColorStops = colorStops;
      result.fill = undefined; // Clear solid fill when gradient is used
    } else if (type === 'radial') {
      result.fillRadialGradientStartPoint = { x: w / 2, y: h / 2 };
      result.fillRadialGradientEndPoint = { x: w / 2, y: h / 2 };
      result.fillRadialGradientStartRadius = 0;
      result.fillRadialGradientEndRadius = Math.max(w, h) / 2;
      result.fillRadialGradientColorStops = colorStops;
      result.fill = undefined; // Clear solid fill when gradient is used
    }
  }
  
  return result;
}
