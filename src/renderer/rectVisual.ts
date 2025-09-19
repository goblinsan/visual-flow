import type { RectNode } from "../layout-schema";

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
  // Allow disabling fill/stroke by setting them explicitly to undefined or empty string.
  const fillVal = (n.fill === undefined || n.fill === '') ? undefined : n.fill;
  const strokeVal = (n.stroke === undefined || n.stroke === '') ? undefined : n.stroke;
  const bothOff = fillVal === undefined && strokeVal === undefined;

  // Fallback decoration when both disabled
  const stroke = bothOff ? '#94a3b8' : strokeVal;
  const strokeEnabled = bothOff ? true : strokeVal !== undefined;
  const strokeWidth = bothOff ? 1 : strokeVal !== undefined ? (n.strokeWidth ?? 1) : 0;
  const opacity = bothOff ? 0.4 : undefined;
  const dash = bothOff ? [3,3] : (strokeVal !== undefined && n.strokeDash && n.strokeDash.length ? n.strokeDash : undefined);

  return {
    width: w,
    height: h,
    fill: fillVal,
    fillEnabled: fillVal !== undefined,
    stroke,
    strokeEnabled,
    strokeWidth,
    opacity,
    dash,
    cornerRadius: n.radius ?? 0,
    bothDisabled: bothOff,
  };
}
