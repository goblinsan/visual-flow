import type { RectNode } from "../layout-schema";
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
  return {
    width: w,
    height: h,
    fill,
    fillEnabled: fill !== undefined,
    stroke: strokeInfo.stroke,
    strokeEnabled: strokeInfo.strokeEnabled,
    strokeWidth: strokeInfo.strokeWidth,
    opacity: strokeInfo.opacity,
    dash: strokeInfo.dash,
    cornerRadius: n.radius ?? 0,
    bothDisabled: strokeInfo.bothDisabled,
  };
}
