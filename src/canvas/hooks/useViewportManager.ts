import { useCallback, useEffect, useRef } from 'react';
import type { LayoutSpec, LayoutNode } from '../../layout-schema';

interface ViewportTransition {
  targetId: string;
  durationMs?: number;
  easing?: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";
  _key?: string;
}

interface Pos {
  x: number;
  y: number;
}

type GetNodeBoundsFn = (node: LayoutNode) => { x: number; y: number; width: number; height: number } | null;

const easingFns = {
  linear: (t: number) => t,
  ease: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'ease-in': (t: number) => t * t,
  'ease-out': (t: number) => t * (2 - t),
  'ease-in-out': (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
};

export function useViewportManager(
  width: number,
  height: number,
  scale: number,
  setScale: (scale: number) => void,
  pos: Pos,
  setPos: (pos: Pos) => void,
  spec: LayoutSpec,
  getNodeBounds: GetNodeBoundsFn,
  viewportTransition?: ViewportTransition | null,
  onViewportChange?: (viewport: { scale: number; x: number; y: number }) => void,
  fitToContentKey?: number
) {
  const posRef = useRef(pos);
  const transitionRafRef = useRef<number | null>(null);

  // Keep posRef in sync
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  // Notify viewport changes
  useEffect(() => {
    onViewportChange?.({ scale, x: pos.x, y: pos.y });
  }, [scale, pos.x, pos.y, onViewportChange]);

  const easingFn = useCallback((type: ViewportTransition['easing']): ((t: number) => number) => {
    return easingFns[type || 'ease-out'];
  }, []);

  const findNodeBoundsById = useCallback((root: LayoutNode, targetId: string): { x: number; y: number; width: number; height: number } | null => {
    if (root.id === targetId) {
      return getNodeBounds(root);
    }
    if ('children' in root && Array.isArray(root.children)) {
      for (const child of root.children) {
        const found = findNodeBoundsById(child, targetId);
        if (found) return found;
      }
    }
    return null;
  }, [getNodeBounds]);

  // Viewport transition effect
  useEffect(() => {
    if (!viewportTransition?.targetId) return;
    const bounds = findNodeBoundsById(spec.root, viewportTransition.targetId);
    if (!bounds) return;
    const duration = Math.max(0, viewportTransition.durationMs ?? 300);
    const ease = easingFn(viewportTransition.easing ?? "ease-out");
    const targetX = width / 2 - (bounds.x + bounds.width / 2) * scale;
    const targetY = height / 2 - (bounds.y + bounds.height / 2) * scale;
    const from = posRef.current;

    if (transitionRafRef.current) {
      cancelAnimationFrame(transitionRafRef.current);
      transitionRafRef.current = null;
    }

    if (duration === 0) {
      setPos({ x: targetX, y: targetY });
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const k = ease(t);
      setPos({
        x: from.x + (targetX - from.x) * k,
        y: from.y + (targetY - from.y) * k,
      });
      if (t < 1) {
        transitionRafRef.current = requestAnimationFrame(tick);
      } else {
        transitionRafRef.current = null;
      }
    };
    transitionRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (transitionRafRef.current) {
        cancelAnimationFrame(transitionRafRef.current);
        transitionRafRef.current = null;
      }
    };
  }, [viewportTransition?._key, viewportTransition?.targetId, viewportTransition?.durationMs, viewportTransition?.easing, width, height, scale, spec.root, findNodeBoundsById, easingFn, setPos]);

  // Fit-to-content effect — only fires when fitToContentKey changes (not on spec changes)
  const lastFitKeyRef = useRef(fitToContentKey ?? 0);
  useEffect(() => {
    if (fitToContentKey === undefined || fitToContentKey === 0) return;
    // Only run when the key actually increments
    if (fitToContentKey === lastFitKeyRef.current) return;
    lastFitKeyRef.current = fitToContentKey;
    
    const rootSize = spec.root.size;
    const children = spec.root.children || [];
    
    let minX = 0, minY = 0, maxX = rootSize?.width || 1600, maxY = rootSize?.height || 1200;
    
    if (children.length > 0) {
      minX = Infinity; minY = Infinity; maxX = -Infinity; maxY = -Infinity;
      for (const child of children) {
        const cx = child.position?.x ?? 0;
        const cy = child.position?.y ?? 0;
        const cw = child.size?.width ?? 100;
        const ch = child.size?.height ?? 100;
        minX = Math.min(minX, cx);
        minY = Math.min(minY, cy);
        maxX = Math.max(maxX, cx + cw);
        maxY = Math.max(maxY, cy + ch);
      }
      const padding = 40;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;
    }
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    const viewportPadding = 60;
    const availableWidth = width - viewportPadding * 2;
    const availableHeight = height - viewportPadding * 2;
    
    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    const newScale = Math.min(scaleX, scaleY, 1);
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const newPosX = width / 2 - centerX * newScale;
    const newPosY = height / 2 - centerY * newScale;
    
    setScale(newScale);
    setPos({ x: newPosX, y: newPosY });
  }, [fitToContentKey, width, height, spec, setScale, setPos]);

  return {
    easingFn,
    findNodeBoundsById,
  };
}
