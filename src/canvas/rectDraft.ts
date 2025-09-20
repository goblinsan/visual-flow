export interface RectDraftInput {
  start: { x: number; y: number };
  current: { x: number; y: number };
  alt: boolean; // center-out
  shift: boolean; // square constrain
  minSize?: number; // minimum width/height threshold before treating as click
  clickDefault?: { width: number; height: number }; // default size for tiny drags / clicks
}

export interface RectDraftResult {
  position: { x: number; y: number };
  size: { width: number; height: number };
}

/**
 * Compute finalized rectangle geometry based on drag start/end and modifiers.
 * - Alt: center-out creation.
 * - Shift: square constraint (applied after Alt expansion logic).
 * - Negative drags normalized to top-left + positive width/height.
 * - Tiny drags (< minSize) replaced with clickDefault.
 */
export function computeRectDraft(input: RectDraftInput): RectDraftResult {
  const { start, current, alt, shift } = input;
  const minSize = input.minSize ?? 4;
  const clickDefault = input.clickDefault ?? { width: 80, height: 60 };

  let x1 = start.x;
  let y1 = start.y;
  let w = current.x - start.x;
  let h = current.y - start.y;

  if (alt) {
    w = (current.x - start.x) * 2;
    h = (current.y - start.y) * 2;
  }
  if (shift) {
    const m = Math.max(Math.abs(w), Math.abs(h));
    w = Math.sign(w || 1) * m;
    h = Math.sign(h || 1) * m;
  }

  if (alt) {
    // Center-out: adjust origin
    const absW = Math.abs(w);
    const absH = Math.abs(h);
    x1 = start.x - absW / 2;
    y1 = start.y - absH / 2;
    w = absW;
    h = absH;
  } else {
    if (w < 0) { x1 += w; w = Math.abs(w); }
    if (h < 0) { y1 += h; h = Math.abs(h); }
  }

  const isClick = w < minSize && h < minSize;
  if (isClick) {
    return { position: { x: x1, y: y1 }, size: { ...clickDefault } };
  }
  return { position: { x: x1, y: y1 }, size: { width: w, height: h } };
}
