/** Pure interaction helpers extracted from CanvasStage (behavior parity). */

export interface ClickSelectionParams {
  current: string[];          // existing selection
  clickedId: string;          // normalized top-level id clicked
  isMultiModifier: boolean;   // shift or ctrl/meta pressed
}

/** Compute next selection after a click on a node (no drag). */
export function computeClickSelection({ current, clickedId, isMultiModifier }: ClickSelectionParams): string[] {
  if (isMultiModifier) {
    // Toggle semantics
    if (current.includes(clickedId)) {
      return current.filter(id => id !== clickedId); // remove
    }
    return [...current, clickedId]; // add
  }
  // Plain click: if already selected (even in multi-selection) leave as-is.
  if (current.includes(clickedId)) return current;
  return [clickedId];
}

export interface MarqueeSelectionParams {
  base: string[];            // selection at marquee start
  hits: string[];            // ids intersecting marquee
  isToggleModifier: boolean; // shift/ctrl pressed during marquee
}

/** Compute marquee selection result. */
export function computeMarqueeSelection({ base, hits, isToggleModifier }: MarqueeSelectionParams): string[] {
  if (isToggleModifier) {
    const set = new Set(base);
    for (const id of hits) {
      if (set.has(id)) set.delete(id); else set.add(id);
    }
    return Array.from(set);
  }
  return hits;
}
