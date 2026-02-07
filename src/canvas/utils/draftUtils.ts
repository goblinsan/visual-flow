import type Konva from "konva";
import type { RefObject } from "react";

export interface DraftState {
  start: { x: number; y: number };
  current: { x: number; y: number };
}

/**
 * Setup global mouse listeners for draft mode (rect/ellipse/line)
 * Handles mouseup events outside the Konva stage bounds.
 * When mouseup occurs inside the stage, Konva's own handler fires,
 * so we skip to prevent double-finalization.
 * Returns cleanup function
 */
export function setupGlobalDraftListeners<T extends DraftState>(
  stageRef: RefObject<Konva.Stage | null>,
  setDraft: (updater: (prev: T | null) => T | null) => void,
  finalize: () => void
): () => void {
  const stage = stageRef.current;
  if (!stage) return () => {};

  const container = stage.container();

  const onMove = (ev: MouseEvent) => {
    const rect = container.getBoundingClientRect();
    const clientX = ev.clientX - rect.left;
    const clientY = ev.clientY - rect.top;
    const world = {
      x: (clientX - stage.x()) / stage.scaleX(),
      y: (clientY - stage.y()) / stage.scaleY()
    };
    setDraft(prev => prev ? { ...prev, current: world } as T : prev);
  };

  const onUp = (ev: MouseEvent) => {
    // Only finalize for mouseup events OUTSIDE the stage container.
    // Konva handles in-stage mouseup via its own event system.
    if (container.contains(ev.target as Node)) return;
    finalize();
  };

  window.addEventListener('mousemove', onMove, true);
  window.addEventListener('mouseup', onUp, true);

  return () => {
    window.removeEventListener('mousemove', onMove, true);
    window.removeEventListener('mouseup', onUp, true);
  };
}

/**
 * Setup escape key listener to cancel draft mode
 * Returns cleanup function
 */
export function setupEscapeCancelListener<T>(
  setDraft: (draft: T | null) => void,
  captureOptions?: AddEventListenerOptions
): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setDraft(null);
    }
  };

  window.addEventListener('keydown', onKey, captureOptions);

  return () => {
    window.removeEventListener('keydown', onKey, captureOptions);
  };
}
