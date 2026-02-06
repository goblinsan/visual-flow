import { useCallback } from 'react';
import type { LayoutSpec, LayoutNode, EllipseNode, LineNode, CurveNode, Size } from '../../layout-schema';

interface DraftState {
  start: { x: number; y: number };
  current: { x: number; y: number };
}

interface CurveDraftState {
  points: { x: number; y: number }[];
  current: { x: number; y: number };
}

interface RectDefaults {
  fill?: string;
  stroke?: string;
  strokeWidth: number;
  radius: number;
  opacity: number;
  strokeDash?: number[];
}

interface EllipseDefaults {
  fill?: string;
  stroke?: string;
  strokeWidth: number;
  opacity: number;
}

interface LineDefaults {
  stroke?: string;
  strokeWidth: number;
}

interface CurveDefaults {
  stroke?: string;
  strokeWidth: number;
  tension: number;
}

const updateRootChildren = (spec: LayoutSpec, updater: (children: LayoutNode[]) => LayoutNode[]): LayoutSpec => {
  const root = spec.root;
  return {
    ...spec,
    root: {
      ...root,
      children: updater(root.children),
    },
  };
};

const appendNodesToRoot = (spec: LayoutSpec, nodes: LayoutNode[]): LayoutSpec => {
  if (!nodes.length) return spec;
  return updateRootChildren(spec, (children) => [...children, ...nodes]);
};

export function useShapeTools(
  setSpec: (spec: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void,
  setSelection: (ids: string[]) => void,
  onToolChange?: (tool: string) => void,
  rectDefaults?: RectDefaults,
  ellipseDefaults?: EllipseDefaults,
  lineDefaults?: LineDefaults,
  curveDefaults?: CurveDefaults
) {
  const finalizeRect = useCallback((
    rectDraft: DraftState | null,
    altPressed: boolean,
    shiftPressed: boolean
  ) => {
    if (!rectDraft) return;
    const { start, current } = rectDraft;
    let x1 = start.x, y1 = start.y;
    const x2 = current.x, y2 = current.y;
    let w = x2 - x1; let h = y2 - y1;
    const alt = altPressed;
    const shift = shiftPressed;
    const defaults = rectDefaults || { fill: '#ffffff', stroke: '#334155', strokeWidth: 1, radius: 0, opacity: 1, strokeDash: undefined };
    if (alt) {
      w = (current.x - start.x) * 2;
      h = (current.y - start.y) * 2;
      if (shift) {
        const m = Math.max(Math.abs(w), Math.abs(h));
        w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m;
      }
      const widthF = Math.max(4, Math.abs(w));
      const heightF = Math.max(4, Math.abs(h));
      const topLeft = { x: start.x - widthF / 2, y: start.y - heightF / 2 };
      const isClick = Math.abs(widthF) < 4 && Math.abs(heightF) < 4;
      const sizeFinal = isClick ? { width: 80, height: 60 } : { width: widthF, height: heightF };
      const id = 'rect_' + Math.random().toString(36).slice(2, 9);
      setSpec(prev => appendNodesToRoot(prev, [{
        id,
        type: 'rect',
        position: topLeft,
        size: sizeFinal,
        fill: defaults.fill,
        stroke: defaults.stroke,
        strokeWidth: defaults.strokeWidth,
        radius: defaults.radius,
        opacity: defaults.opacity,
        strokeDash: defaults.strokeDash,
      }]));
      setSelection([id]);
      return;
    }
    if (shift) {
      const m = Math.max(Math.abs(w), Math.abs(h));
      w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m;
    }
    if (w < 0) { x1 = x1 + w; w = Math.abs(w); }
    if (h < 0) { y1 = y1 + h; h = Math.abs(h); }
    const widthF = Math.max(4, w); const heightF = Math.max(4, h);
    const isClick = Math.abs(widthF) < 4 && Math.abs(heightF) < 4;
    const finalSize = isClick ? { width: 80, height: 60 } : { width: widthF, height: heightF };
    const id = 'rect_' + Math.random().toString(36).slice(2, 9);
    setSpec(prev => appendNodesToRoot(prev, [{
      id,
      type: 'rect',
      position: { x: x1, y: y1 },
      size: finalSize,
      fill: defaults.fill,
      stroke: defaults.stroke,
      strokeWidth: defaults.strokeWidth,
      radius: defaults.radius,
      opacity: defaults.opacity,
      strokeDash: defaults.strokeDash,
    }]));
    setSelection([id]);
    onToolChange?.('select');
  }, [setSpec, onToolChange, rectDefaults, setSelection]);

  const finalizeEllipse = useCallback((
    ellipseDraft: DraftState | null,
    altPressed: boolean,
    shiftPressed: boolean
  ) => {
    if (!ellipseDraft) return;
    const { start, current } = ellipseDraft;
    let x1 = start.x, y1 = start.y;
    const x2 = current.x, y2 = current.y;
    let w = x2 - x1; let h = y2 - y1;
    const alt = altPressed;
    const shift = shiftPressed;
    const defaults = ellipseDefaults || { fill: '#ffffff', stroke: '#334155', strokeWidth: 1, opacity: 1 };
    
    if (alt) {
      w = (current.x - start.x) * 2;
      h = (current.y - start.y) * 2;
      if (shift) {
        const m = Math.max(Math.abs(w), Math.abs(h));
        w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m;
      }
      const widthF = Math.max(4, Math.abs(w));
      const heightF = Math.max(4, Math.abs(h));
      const topLeft = { x: start.x - widthF / 2, y: start.y - heightF / 2 };
      const isClick = Math.abs(widthF) < 4 && Math.abs(heightF) < 4;
      const sizeFinal = isClick ? { width: 80, height: 80 } : { width: widthF, height: heightF };
      const id = 'ellipse_' + Math.random().toString(36).slice(2, 9);
      const ellipseNode: EllipseNode = {
        id,
        type: 'ellipse',
        position: topLeft,
        size: sizeFinal,
        fill: defaults.fill,
        stroke: defaults.stroke,
        strokeWidth: defaults.strokeWidth,
        opacity: defaults.opacity,
      };
      setSpec(prev => appendNodesToRoot(prev, [ellipseNode]));
      onToolChange?.('select');
      return;
    }
    if (shift) {
      const m = Math.max(Math.abs(w), Math.abs(h));
      w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m;
    }
    if (w < 0) { x1 = x1 + w; w = Math.abs(w); }
    if (h < 0) { y1 = y1 + h; h = Math.abs(h); }
    const widthF = Math.max(4, w); const heightF = Math.max(4, h);
    const isClick = Math.abs(widthF) < 4 && Math.abs(heightF) < 4;
    const finalSize = isClick ? { width: 80, height: 80 } : { width: widthF, height: heightF };
    const id = 'ellipse_' + Math.random().toString(36).slice(2, 9);
    const ellipseNode: EllipseNode = {
      id,
      type: 'ellipse',
      position: { x: x1, y: y1 },
      size: finalSize,
      fill: defaults.fill,
      stroke: defaults.stroke,
      strokeWidth: defaults.strokeWidth,
      opacity: defaults.opacity,
    };
    setSpec(prev => appendNodesToRoot(prev, [ellipseNode]));
    setSelection([id]);
    onToolChange?.('select');
  }, [setSpec, onToolChange, ellipseDefaults, setSelection]);

  const finalizeLine = useCallback((lineDraft: DraftState | null) => {
    if (!lineDraft) return;
    const { start, current } = lineDraft;
    const dx = current.x - start.x;
    const dy = current.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const isClick = len < 4;
    
    const points: [number, number, number, number] = isClick 
      ? [0, 0, 100, 0]
      : [0, 0, dx, dy];
    
    const defaults = lineDefaults || { stroke: '#334155', strokeWidth: 2 };
    const id = 'line_' + Math.random().toString(36).slice(2, 9);
    const lineNode: LineNode = {
      id,
      type: 'line',
      position: { x: start.x, y: start.y },
      points,
      stroke: defaults.stroke,
      strokeWidth: defaults.strokeWidth,
    };
    setSpec(prev => appendNodesToRoot(prev, [lineNode]));
    setSelection([id]);
    onToolChange?.('select');
  }, [setSpec, onToolChange, lineDefaults, setSelection]);

  const finalizeCurve = useCallback((curveDraft: CurveDraftState | null) => {
    if (!curveDraft) return;
    const { points, current } = curveDraft;
    if (points.length < 1) {
      return;
    }
    
    const origin = points[0];
    const allPoints = [...points, current];
    const relativePoints: number[] = [];
    for (const p of allPoints) {
      relativePoints.push(p.x - origin.x, p.y - origin.y);
    }
    
    if (relativePoints.length === 4) {
      const midX = relativePoints[2] / 2;
      const midY = relativePoints[3] / 2 - 20;
      relativePoints.splice(2, 0, midX, midY);
    }
    
    const defaults = curveDefaults || { stroke: '#334155', strokeWidth: 2, tension: 0.5 };
    const id = 'curve_' + Math.random().toString(36).slice(2, 9);
    const curveNode: CurveNode = {
      id,
      type: 'curve',
      position: { x: origin.x, y: origin.y },
      points: relativePoints,
      stroke: defaults.stroke,
      strokeWidth: defaults.strokeWidth,
      tension: defaults.tension,
    };
    setSpec(prev => appendNodesToRoot(prev, [curveNode]));
    setSelection([id]);
    onToolChange?.('select');
  }, [setSpec, onToolChange, curveDefaults, setSelection]);

  return {
    finalizeRect,
    finalizeEllipse,
    finalizeLine,
    finalizeCurve,
  };
}
