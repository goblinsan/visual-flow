import { parseColor, toHex } from './color';

/** Adjusts alpha of a color string (hex or rgba-like) returning new hex (with alpha if needed). */
export function adjustAlpha(color: string, alpha: number): string {
  // If requested alpha is outside valid range, treat as no-op (return original)
  if (alpha < 0 || alpha > 1) return color;
  const p = parseColor(color);
  if (!p) return color;
  p.a = alpha;
  return toHex(p, p.a !== 1);
}

/** Toggle off: returns undefined while remembering previous color in storage map; toggle on: restores from map or fallback. */
export function toggleColor(current: string | undefined, id: string, storage: Record<string,string>, fallback: string): { next: string | undefined; storage: Record<string,string> } {
  if (current !== undefined) {
    // Turning off: store last value
    if (current) storage = { ...storage, [id]: current };
    return { next: undefined, storage };
  } else {
    // Turning on: restore
    const restore = storage[id] || fallback;
    return { next: restore, storage };
  }
}

/** Swap fill and stroke colors (may be undefined). */
export function swapColors(fill: string | undefined, stroke: string | undefined): { fill: string | undefined; stroke: string | undefined } {
  return { fill: stroke, stroke: fill };
}
