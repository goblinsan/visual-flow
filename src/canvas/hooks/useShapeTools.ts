import { useCallback } from 'react';
import type { LayoutSpec, LayoutNode, EllipseNode, LineNode, CurveNode, PolygonNode } from '../../layout-schema';

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
  startArrow?: boolean;
  endArrow?: boolean;
  arrowSize?: number;
}

interface CurveDefaults {
  stroke?: string;
  strokeWidth: number;
  tension: number;
}

interface PolygonDefaults {
  fill?: string;
  stroke?: string;
  strokeWidth: number;
  opacity: number;
  closed: boolean;
  sides: number; // number of sides for regular polygon
}

// Default styling values for shapes (module-level constants to avoid re-creation)
const DEFAULT_RECT_STYLE: RectDefaults = { fill: '#ffffff', stroke: '#334155', strokeWidth: 1, radius: 0, opacity: 1, strokeDash: undefined };
const DEFAULT_ELLIPSE_STYLE: EllipseDefaults = { fill: '#ffffff', stroke: '#334155', strokeWidth: 1, opacity: 1 };
const DEFAULT_LINE_STYLE: LineDefaults = { stroke: '#334155', strokeWidth: 2 };
const DEFAULT_CURVE_STYLE: CurveDefaults = { stroke: '#334155', strokeWidth: 2, tension: 0.5 };
const DEFAULT_POLYGON_STYLE: PolygonDefaults = { fill: '#ffffff', stroke: '#334155', strokeWidth: 1, opacity: 1, closed: true, sides: 5 };

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
  curveDefaults?: CurveDefaults,
  polygonDefaults?: PolygonDefaults
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
    const defaults = rectDefaults || DEFAULT_RECT_STYLE;
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
    const defaults = ellipseDefaults || DEFAULT_ELLIPSE_STYLE;
    
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
    
    const defaults = lineDefaults || DEFAULT_LINE_STYLE;
    const id = 'line_' + Math.random().toString(36).slice(2, 9);
    const lineNode: LineNode = {
      id,
      type: 'line',
      position: { x: start.x, y: start.y },
      points,
      stroke: defaults.stroke,
      strokeWidth: defaults.strokeWidth,
      startArrow: defaults.startArrow,
      endArrow: defaults.endArrow,
      arrowSize: defaults.arrowSize,
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
    
    const defaults = curveDefaults || DEFAULT_CURVE_STYLE;
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

  const finalizePolygon = useCallback((
    polygonDraft: DraftState | null,
    altPressed: boolean,
    shiftPressed: boolean,
    sides: number = 5
  ) => {
    if (!polygonDraft) return;
    const { start, current } = polygonDraft;
    let x1 = start.x, y1 = start.y;
    const x2 = current.x, y2 = current.y;
    let w = x2 - x1; let h = y2 - y1;
    const alt = altPressed;
    const shift = shiftPressed;
    const defaults = polygonDefaults || DEFAULT_POLYGON_STYLE;
    
    // Handle alt and shift modifiers like rect/ellipse
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
      
      // Generate regular polygon points
      const points = generateRegularPolygonPoints(sizeFinal.width, sizeFinal.height, sides);
      
      const id = 'polygon_' + Math.random().toString(36).slice(2, 9);
      const polygonNode: PolygonNode = {
        id,
        type: 'polygon',
        position: topLeft,
        size: sizeFinal,
        points,
        fill: defaults.fill,
        stroke: defaults.stroke,
        strokeWidth: defaults.strokeWidth,
        opacity: defaults.opacity,
        closed: defaults.closed,
        sides,
      };
      setSpec(prev => appendNodesToRoot(prev, [polygonNode]));
      setSelection([id]);
      onToolChange?.('select');
      return;
    }
    
    // Normal mode (no alt)
    if (shift) {
      const m = Math.max(Math.abs(w), Math.abs(h));
      w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m;
    }
    const widthF = Math.max(4, Math.abs(w));
    const heightF = Math.max(4, Math.abs(h));
    const topLeft = { x: w < 0 ? x1 + w : x1, y: h < 0 ? y1 + h : y1 };
    const isClick = Math.abs(widthF) < 4 && Math.abs(heightF) < 4;
    const sizeFinal = isClick ? { width: 80, height: 80 } : { width: widthF, height: heightF };
    
    // Generate regular polygon points
    const points = generateRegularPolygonPoints(sizeFinal.width, sizeFinal.height, sides);
    
    const id = 'polygon_' + Math.random().toString(36).slice(2, 9);
    const polygonNode: PolygonNode = {
      id,
      type: 'polygon',
      position: topLeft,
      size: sizeFinal,
      points,
      fill: defaults.fill,
      stroke: defaults.stroke,
      strokeWidth: defaults.strokeWidth,
      opacity: defaults.opacity,
      closed: defaults.closed,
      sides,
    };
    setSpec(prev => appendNodesToRoot(prev, [polygonNode]));
    setSelection([id]);
    onToolChange?.('select');
  }, [setSpec, onToolChange, polygonDefaults, setSelection]);

  return {
    finalizeRect,
    finalizeEllipse,
    finalizeLine,
    finalizeCurve,
    finalizePolygon,
  };
}

// Helper function to generate regular polygon points
function generateRegularPolygonPoints(width: number, height: number, sides: number): number[] {
  const points: number[] = [];
  const radiusX = width / 2;
  const radiusY = height / 2;
  const centerX = radiusX;
  const centerY = radiusY;
  
  // Start from top (angle offset to make polygon upright)
  const angleOffset = -Math.PI / 2;
  
  for (let i = 0; i < sides; i++) {
    const angle = angleOffset + (i * 2 * Math.PI) / sides;
    const x = centerX + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle);
    points.push(x, y);
  }
  
  return points;
}
