import { Stage, Layer, Transformer, Rect, Group, Ellipse, Line, Circle } from "react-konva";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import type Konva from "konva";
import type { LayoutNode, LayoutSpec, TextNode, TextSpan, Pos, EllipseNode, LineNode, CurveNode, ImageNode, FrameNode, Size } from "../layout-schema.ts";
import { renderNode, useFontLoading } from "./CanvasRenderer.tsx";
import { computeClickSelection, computeMarqueeSelection } from "../renderer/interaction";
import { beginDrag, updateDrag, finalizeDrag } from "../interaction/drag";
import type { DragSession } from "../interaction/types";
import { beginMarquee, updateMarquee, finalizeMarquee, type MarqueeSession } from "../interaction/marquee";
import { deleteNodes, duplicateNodes, nudgeNodes } from "./editing";
import { applyPosition, applyPositionAndSize, groupNodes, ungroupNodes } from "./stage-internal";
import { mapNode, nodeHasChildren } from "../commands/types";
import { RichTextEditor, type RichTextEditorHandle } from "../components/RichTextEditor";
import { TextEditToolbar } from "../components/TextEditToolbar";
import { ImagePickerModal } from "../components/ImagePickerModal";
import { COMPONENT_LIBRARY, ICON_LIBRARY } from "../library";

// Grid configuration
const GRID_SPACING = 20; // Space between dots
const DOT_RADIUS = 1.5; // Radius of each dot
const DOT_COLOR = 'rgba(255, 255, 255, 0.5)'; // Whitish dots
const GRID_BG_COLOR = '#e5e7eb'; // Light gray background (Tailwind gray-200)
const CAPTURE_OPTIONS: AddEventListenerOptions = { capture: true };

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

const nodeHasSize = (node: LayoutNode): node is LayoutNode & { size: Size } =>
  'size' in node && Boolean((node as { size?: Size }).size);

// Props
interface CanvasStageProps {
  spec: LayoutSpec;
  setSpec: (spec: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void;
  width?: number;
  height?: number;
  tool?: string;
  onToolChange?: (tool: string) => void; // allow CanvasStage to request tool mode changes (e.g., after shape creation)
  selectedIconId?: string;
  selectedComponentId?: string;
  onUndo?: () => void;
  onRedo?: () => void;
  focusNodeId?: string | null;
  onUngroup?: (ids: string[]) => void;
  rectDefaults?: { fill?: string; stroke?: string; strokeWidth: number; radius: number; opacity: number; strokeDash?: number[] };
  selection: string[];
  setSelection: (ids: string[]) => void;
  fitToContentKey?: number; // Increment to trigger fit-to-content
  viewportTransition?: {
    targetId: string;
    durationMs?: number;
    easing?: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";
    _key?: string;
  } | null;
}

// Infinite dot grid component
interface InfiniteGridProps {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

function InfiniteGrid({ width, height, scale, offsetX, offsetY }: InfiniteGridProps) {
  if (scale <= 0.5) return null;
  // Calculate visible area in world coordinates
  const worldLeft = -offsetX / scale;
  const worldTop = -offsetY / scale;
  const worldRight = worldLeft + width / scale;
  const worldBottom = worldTop + height / scale;

  const decimation = scale >= 0.75 ? 1
    : scale >= 0.5 ? 2
    : scale >= 0.35 ? 3
    : scale >= 0.25 ? 4
    : scale >= 0.18 ? 5
    : 6;
  const spacing = GRID_SPACING * decimation;
  
  // Snap to grid boundaries with padding
  const startX = Math.floor(worldLeft / spacing) * spacing - spacing;
  const startY = Math.floor(worldTop / spacing) * spacing - spacing;
  const endX = Math.ceil(worldRight / spacing) * spacing + spacing;
  const endY = Math.ceil(worldBottom / spacing) * spacing + spacing;
  
  // Generate dots
  const dots: JSX.Element[] = [];
  for (let x = startX; x <= endX; x += spacing) {
    for (let y = startY; y <= endY; y += spacing) {
      dots.push(
        <Circle
          key={`${x}-${y}`}
          x={x}
          y={y}
          radius={DOT_RADIUS / scale} // Keep dot size consistent regardless of zoom
          fill={DOT_COLOR}
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    }
  }
  
  return <>{dots}</>;
}

function CanvasStage({ spec, setSpec, width = 800, height = 600, tool = "select", onToolChange, selectedIconId, selectedComponentId, onUndo, onRedo, focusNodeId, onUngroup, rectDefaults, selection, setSelection, fitToContentKey, viewportTransition }: CanvasStageProps) {
  // View / interaction state
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const panLastPosRef = useRef<{ x: number; y: number } | null>(null);
  const posRef = useRef(pos);
  const transitionRafRef = useRef<number | null>(null);
  const selected = selection;
  const [menu, setMenu] = useState<null | { x: number; y: number }>(null);
  
  // Font loading - triggers re-render when fonts finish loading
  useFontLoading();
  
  // Interaction state
  // Drag interaction session (Milestone 1 pure helper integration)
  const [dragSession, setDragSession] = useState<DragSession | null>(null);

  // Marquee session (pure helper based)
  const [marqueeSession, setMarqueeSession] = useState<MarqueeSession | null>(null);

  // Inline text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const justStartedTextEditRef = useRef(false);
  const clipboardRef = useRef<LayoutNode[] | null>(null);
  const pasteOffsetRef = useRef(0);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  const easingFn = useCallback((name: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out") => {
    switch (name) {
      case "linear":
        return (t: number) => t;
      case "ease-in":
        return (t: number) => t * t;
      case "ease-out":
        return (t: number) => 1 - Math.pow(1 - t, 2);
      case "ease-in-out":
        return (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      default:
        return (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    }
  }, []);

  type Bounds = { x: number; y: number; width: number; height: number };
  const getNodeBounds = useCallback((node: LayoutNode, accX: number, accY: number): Bounds | null => {
    const pos = (node as { position?: Pos }).position ?? { x: 0, y: 0 };
    const baseX = accX + (pos.x ?? 0);
    const baseY = accY + (pos.y ?? 0);
    const size = node.size;
    const hasSize = size && typeof size.width === "number" && typeof size.height === "number";
    let bounds = hasSize ? { x: baseX, y: baseY, width: size.width, height: size.height } : null;
    if (Array.isArray(node.children) && node.children.length > 0) {
      const childBounds = node.children
        .map((child) => getNodeBounds(child, baseX, baseY))
        .filter(Boolean) as Array<{ x: number; y: number; width: number; height: number }>;
      if (childBounds.length > 0 && !bounds) {
        const minX = Math.min(...childBounds.map(b => b.x));
        const minY = Math.min(...childBounds.map(b => b.y));
        const maxX = Math.max(...childBounds.map(b => b.x + b.width));
        const maxY = Math.max(...childBounds.map(b => b.y + b.height));
        bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      }
    }
    return bounds;
  }, []);

  const findNodeBoundsById = useCallback((node: LayoutNode, id: string, accX = 0, accY = 0): Bounds | null => {
    const pos = (node as { position?: Pos }).position ?? { x: 0, y: 0 };
    const nextX = accX + (pos.x ?? 0);
    const nextY = accY + (pos.y ?? 0);
    if (node.id === id) {
      return getNodeBounds(node, accX, accY);
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        const found = findNodeBoundsById(child, id, nextX, nextY);
        if (found) return found;
      }
    }
    return null;
  }, [getNodeBounds]);

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
  }, [viewportTransition?._key, viewportTransition?.targetId, viewportTransition?.durationMs, viewportTransition?.easing, width, height, scale, spec.root, findNodeBoundsById, easingFn]);
    const getNodeWorldPosition = useCallback((nodeId: string): { x: number; y: number } | null => {
      let result: { x: number; y: number } | null = null;
      const walk = (node: LayoutNode, accX: number, accY: number) => {
        const pos = (node as { position?: Pos }).position ?? { x: 0, y: 0 };
        const nextX = accX + (pos.x ?? 0);
        const nextY = accY + (pos.y ?? 0);
        if (node.id === nodeId) {
          result = { x: nextX, y: nextY };
          return;
        }
        if (Array.isArray(node.children)) {
          for (const child of node.children) {
            if (result) return;
            walk(child, nextX, nextY);
          }
        }
      };
      walk(spec.root, 0, 0);
      return result;
    }, [spec.root]);

    const collectExistingIds = useCallback((root: LayoutNode): Set<string> => {
      const ids = new Set<string>();
      const walk = (node: LayoutNode) => {
        ids.add(node.id);
        if (nodeHasChildren(node)) {
          node.children.forEach(walk);
        }
      };
      walk(root);
      return ids;
    }, []);

    const cloneNode = useCallback(<T extends LayoutNode>(node: T): T => {
      return JSON.parse(JSON.stringify(node)) as T;
    }, []);

    const createUniqueIdFactory = useCallback((existing: Set<string>) => {
      return (base: string) => {
        let candidate = `${base}-copy`;
        let i = 2;
        while (existing.has(candidate)) {
          candidate = `${base}-copy-${i++}`;
        }
        existing.add(candidate);
        return candidate;
      };
    }, []);

    const remapIdsAndOffset = useCallback((node: LayoutNode, offset: { x: number; y: number }, makeId: (base: string) => string): LayoutNode => {
      const walk = (n: LayoutNode, isRoot: boolean): LayoutNode => {
        const next = cloneNode(n);
        next.id = makeId(next.id);
        if (isRoot) {
          const posX = next.position?.x ?? 0;
          const posY = next.position?.y ?? 0;
          next.position = { x: posX + offset.x, y: posY + offset.y };
        }
        if (nodeHasChildren(next)) {
          next.children = next.children.map((c) => walk(c, false));
        }
        return next;
      };
      return walk(node, true);
    }, [cloneNode]);

    const findNode = useCallback(function findNodeImpl(node: LayoutNode, targetId: string): LayoutNode | null {
      if (node.id === targetId) return node;
      if (nodeHasChildren(node)) {
        for (const child of node.children) {
          const found = findNodeImpl(child, targetId);
          if (found) return found;
        }
      }
      return null;
    }, []);

  const [editingTextValue, setEditingTextValue] = useState<string>('');
  const [editingTextSpans, setEditingTextSpans] = useState<TextSpan[]>([]);
  const richTextEditorRef = useRef<RichTextEditorHandle>(null);
  const [textSelection, setTextSelection] = useState<{ start: number; end: number } | null>(null);

  // Image picker state
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [pendingImagePosition, setPendingImagePosition] = useState<{ x: number; y: number } | null>(null);

  const isSelectMode = tool === "select";
  const isRectMode = tool === 'rect';
  const isPanMode = tool === 'pan';
  const isZoomMode = tool === 'zoom';
  const isEllipseMode = tool === 'ellipse';
  const isLineMode = tool === 'line';
  const isCurveMode = tool === 'curve';
  const isTextMode = tool === 'text';
  const isImageMode = tool === 'image';
  const isIconMode = tool === 'icon';
  const isComponentMode = tool === 'component';
  const [spacePan, setSpacePan] = useState(false);
  // Track shift key globally for aspect-ratio constrained resize
  const [shiftPressed, setShiftPressed] = useState(false);
  // Track Alt/Option for centered scaling
  const [altPressed, setAltPressed] = useState(false);

  // Konva refs
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const marqueeRectRef = useRef<Konva.Rect>(null);

  // Transform session snapshot (captured at first transform frame)
  const [transformSession, setTransformSession] = useState<null | {
    nodes: Record<string, {
      topLeft: { x: number; y: number };
      size: { width: number; height: number };
      center: { x: number; y: number };
    }>;
    selectionBox?: { x: number; y: number; width: number; height: number; center: { x: number; y: number } };
  }>(null);

  // Fit-to-content: calculate scale and position to fit the spec.root content in the viewport
  useEffect(() => {
    if (fitToContentKey === undefined || fitToContentKey === 0) return;
    
    // Get bounds of all children or use root size
    const rootSize = spec.root.size;
    const children = spec.root.children || [];
    
    let minX = 0, minY = 0, maxX = rootSize?.width || 1600, maxY = rootSize?.height || 1200;
    
    if (children.length > 0) {
      // Calculate bounding box of all children
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
      // Add padding
      const padding = 40;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;
    }
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // Calculate scale to fit content in viewport with some padding
    const viewportPadding = 60;
    const availableWidth = width - viewportPadding * 2;
    const availableHeight = height - viewportPadding * 2;
    
    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    const newScale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
    
    // Center the content
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const newPosX = width / 2 - centerX * newScale;
    const newPosY = height / 2 - centerY * newScale;
    
    setScale(newScale);
    setPos({ x: newPosX, y: newPosY });
  }, [fitToContentKey, width, height, spec]);

  useEffect(() => {
    if (!focusNodeId) return;
    const node = findNode(spec.root, focusNodeId);
    if (!node) return;
    const pos = node.position ?? { x: 0, y: 0 };
    const size = node.size ?? { width: 300, height: 200 };
    const padding = 60;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;
    const scaleX = availableWidth / (size.width || 1);
    const scaleY = availableHeight / (size.height || 1);
    const newScale = Math.min(scaleX, scaleY, 1);
    const centerX = (pos.x ?? 0) + (size.width ?? 0) / 2;
    const centerY = (pos.y ?? 0) + (size.height ?? 0) / 2;
    setScale(newScale);
    setPos({ x: width / 2 - centerX * newScale, y: height / 2 - centerY * newScale });
  }, [focusNodeId, spec.root, width, height, findNode]);

  // Utility: world coordinate conversion
  const toWorld = useCallback((stage: Konva.Stage, p: { x: number; y: number }) => ({
    x: (p.x - stage.x()) / stage.scaleX(),
    y: (p.y - stage.y()) / stage.scaleY(),
  }), []);

  // Build selection context
  const selectionContext = useMemo(() => {
    const parentOf: Record<string, string | null> = {};
    const nodeById: Record<string, LayoutNode> = {};
    const walk = (node: LayoutNode, parent: string | null) => {
      nodeById[node.id] = node;
      parentOf[node.id] = parent;
      if (nodeHasChildren(node)) node.children.forEach(child => walk(child, node.id));
    };
    walk(spec.root, null);
    return { parentOf, nodeById };
  }, [spec]);

  // Get top container ancestor for selection promotion
  const getTopContainerAncestor = useCallback((stage: Konva.Stage, id: string) => {
    const node = stage.findOne(`#${CSS.escape(id)}`);
    if (!node) return id;
    const tokens = ["group", "box", "stack", "grid"];
    let cur: Konva.Node | null = node;
    let top = id;
    while (cur) {
      const nm = cur.name() ?? "";
      if (cur.id() && cur.id() !== spec.root.id && tokens.some(t => nm.includes(t))) {
        top = cur.id();
      }
      const p = cur.getParent();
      if (!p || p === stage) break;
      cur = p;
    }
    return top;
  }, [spec.root.id]);

  const normalizeSelection = useCallback((ids: string[]) => {
    const stage = stageRef.current;
    if (!stage) return ids;
    const promoted = ids.map(id => getTopContainerAncestor(stage, id));
    const out: string[] = [];
    const seen = new Set<string>();
    for (const id of promoted) {
      if (id === spec.root.id) continue;
      if (!seen.has(id)) { seen.add(id); out.push(id); }
    }
    return out;
  }, [getTopContainerAncestor, spec.root.id]);

  // Helper to check if target is transformer-related
  const isTransformerTarget = useCallback((target: Konva.Node | null): boolean => {
    if (!target) return false;
    
    // Direct transformer check
    if (target.getClassName && target.getClassName() === 'Transformer') {
      return true;
    }
    
    // Check ancestors
    let current = target;
    while (current && current.getStage) {
      if (current.getClassName && current.getClassName() === 'Transformer') {
        return true;
      }
      const parent = current.getParent();
      if (!parent || parent === current.getStage()) break;
      current = parent;
    }
    
    return false;
  }, []);

  // Enhanced mouse handlers with proper interaction detection
  // Rectangle draft state
  const [rectDraft, setRectDraft] = useState<null | {
    start: { x: number; y: number };
    current: { x: number; y: number };
  }>(null);

  // Ellipse draft state
  const [ellipseDraft, setEllipseDraft] = useState<null | {
    start: { x: number; y: number };
    current: { x: number; y: number };
  }>(null);

  // Line draft state
  const [lineDraft, setLineDraft] = useState<null | {
    start: { x: number; y: number };
    current: { x: number; y: number };
  }>(null);

  // Curve draft state (collect multiple points for bezier)
  const [curveDraft, setCurveDraft] = useState<null | {
    points: { x: number; y: number }[];
    current: { x: number; y: number };
  }>(null);

  // Helper: finalize rectangle (called on mouseup or via global listener)
  const finalizeRect = useCallback(() => {
    if (!isRectMode || !rectDraft) return;
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
      // Stay in text mode while editing; switch to select on commit.
      setRectDraft(null);
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
    setRectDraft(null);
  }, [isRectMode, rectDraft, altPressed, shiftPressed, setSpec, onToolChange, rectDefaults, setSelection]);

  // Helper: finalize ellipse
  const finalizeEllipse = useCallback(() => {
    if (!isEllipseMode || !ellipseDraft) return;
    const { start, current } = ellipseDraft;
    let x1 = start.x, y1 = start.y;
    const x2 = current.x, y2 = current.y;
    let w = x2 - x1; let h = y2 - y1;
    const alt = altPressed;
    const shift = shiftPressed;
    const defaults = { fill: '#ffffff', stroke: '#334155', strokeWidth: 1, opacity: 1 };
    
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
      setEllipseDraft(null);
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
    setEllipseDraft(null);
  }, [isEllipseMode, ellipseDraft, altPressed, shiftPressed, setSpec, onToolChange, setSelection]);

  // Helper: finalize line
  const finalizeLine = useCallback(() => {
    if (!isLineMode || !lineDraft) return;
    const { start, current } = lineDraft;
    // Calculate line length to check if it's a click vs drag
    const dx = current.x - start.x;
    const dy = current.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const isClick = len < 4;
    
    // For lines, store points relative to position (start point)
    const points: [number, number, number, number] = isClick 
      ? [0, 0, 100, 0] // default horizontal line
      : [0, 0, dx, dy];
    
    const id = 'line_' + Math.random().toString(36).slice(2, 9);
    const lineNode: LineNode = {
      id,
      type: 'line',
      position: { x: start.x, y: start.y },
      points,
      stroke: '#334155',
      strokeWidth: 2,
    };
    setSpec(prev => appendNodesToRoot(prev, [lineNode]));
    setSelection([id]);
    onToolChange?.('select');
    setLineDraft(null);
  }, [isLineMode, lineDraft, setSpec, onToolChange, setSelection]);

  // Helper: finalize curve
  const finalizeCurve = useCallback(() => {
    if (!isCurveMode || !curveDraft) return;
    const { points, current } = curveDraft;
    // Need at least start and end points
    if (points.length < 1) {
      setCurveDraft(null);
      return;
    }
    
    // Calculate all points relative to the first point
    const origin = points[0];
    const allPoints = [...points, current];
    const relativePoints: number[] = [];
    for (const p of allPoints) {
      relativePoints.push(p.x - origin.x, p.y - origin.y);
    }
    
    // If only 2 points (start + end), create a simple curve with midpoint as control
    if (relativePoints.length === 4) {
      // Just a straight line, make it slightly curved
      const midX = relativePoints[2] / 2;
      const midY = relativePoints[3] / 2 - 20; // offset for curve effect
      relativePoints.splice(2, 0, midX, midY);
    }
    
    const id = 'curve_' + Math.random().toString(36).slice(2, 9);
    const curveNode: CurveNode = {
      id,
      type: 'curve',
      position: { x: origin.x, y: origin.y },
      points: relativePoints,
      stroke: '#334155',
      strokeWidth: 2,
      tension: 0.5,
    };
    setSpec(prev => appendNodesToRoot(prev, [curveNode]));
    setSelection([id]);
    onToolChange?.('select');
    setCurveDraft(null);
  }, [isCurveMode, curveDraft, setSpec, onToolChange, setSelection]);

  // Helper: create text at click position
  // Helper: open image picker at click position
  const createImage = useCallback((worldPos: { x: number; y: number }) => {
    setPendingImagePosition(worldPos);
    setImagePickerOpen(true);
  }, []);

  const makeId = useCallback((prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`, []);

  const createIcon = useCallback((worldPos: { x: number; y: number }) => {
    const icon = ICON_LIBRARY.find(i => i.id === selectedIconId) ?? ICON_LIBRARY[0];
    if (!icon) return;
    const id = makeId('icon');
    const [w, h, , , d] = icon.icon.icon;
    const path = Array.isArray(d) ? d.join(' ') : d;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" fill="#111827"><path d="${path}"/></svg>`;
    const src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    const iconNode: ImageNode = {
      id,
      type: 'image',
      position: worldPos,
      size: { width: 32, height: 32 },
      src,
      alt: icon.label,
      objectFit: 'contain',
    };
    setSpec(prev => appendNodesToRoot(prev, [iconNode]));
    setSelection([id]);
    onToolChange?.('select');
  }, [makeId, onToolChange, selectedIconId, setSelection, setSpec]);

  const createComponent = useCallback((worldPos: { x: number; y: number }) => {
    const template = COMPONENT_LIBRARY.find(c => c.id === selectedComponentId) ?? COMPONENT_LIBRARY[0];
    if (!template) return;
    const groupNode = template.build(worldPos, makeId);
    setSpec(prev => appendNodesToRoot(prev, [groupNode]));
    setSelection([groupNode.id]);
    onToolChange?.('select');
  }, [makeId, onToolChange, selectedComponentId, setSelection, setSpec]);

  // Actually insert the image after picker selection
  const handleImageSelected = useCallback((src: string, width: number, height: number) => {
    if (!pendingImagePosition) return;
    const id = 'image_' + Math.random().toString(36).slice(2, 9);
    const imageNode: ImageNode = {
      id,
      type: 'image',
      position: pendingImagePosition,
      size: { width, height },
      src,
      alt: 'Image',
      objectFit: 'contain',
    };
    setSpec(prev => appendNodesToRoot(prev, [imageNode]));
    setSelection([id]);
    onToolChange?.('select');
    setImagePickerOpen(false);
    setPendingImagePosition(null);
  }, [pendingImagePosition, setSpec, onToolChange, setSelection]);

  const handleImagePickerClose = useCallback(() => {
    setImagePickerOpen(false);
    setPendingImagePosition(null);
    onToolChange?.('select');
  }, [onToolChange]);

  const onMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Rectangle tool creation pathway
    if (isRectMode) {
      if (e.evt.button !== 0) return; // left only
      const stage = e.target.getStage(); if (!stage) return;
      // Allow starting a rectangle even if over an existing shape (common UX in design tools)
      const pointer = stage.getPointerPosition(); if (!pointer) return;
      const world = toWorld(stage, pointer);
      setRectDraft({ start: world, current: world });
      return;
    }
    
    // Ellipse tool creation pathway
    if (isEllipseMode) {
      if (e.evt.button !== 0) return;
      const stage = e.target.getStage(); if (!stage) return;
      const pointer = stage.getPointerPosition(); if (!pointer) return;
      const world = toWorld(stage, pointer);
      setEllipseDraft({ start: world, current: world });
      return;
    }
    
    // Line tool creation pathway
    if (isLineMode) {
      if (e.evt.button !== 0) return;
      const stage = e.target.getStage(); if (!stage) return;
      const pointer = stage.getPointerPosition(); if (!pointer) return;
      const world = toWorld(stage, pointer);
      setLineDraft({ start: world, current: world });
      return;
    }
    
    // Curve tool creation pathway - click to add points, double-click or Enter to finish
    if (isCurveMode) {
      if (e.evt.button !== 0) return;
      const stage = e.target.getStage(); if (!stage) return;
      const pointer = stage.getPointerPosition(); if (!pointer) return;
      const world = toWorld(stage, pointer);
      if (!curveDraft) {
        // Start new curve
        setCurveDraft({ points: [world], current: world });
      } else {
        // Add point to curve
        setCurveDraft(prev => prev ? { ...prev, points: [...prev.points, world] } : prev);
      }
      return;
    }
    
    // Text tool - single click creates text (creates empty text and immediately edits)
    if (isTextMode) {
      if (e.evt.button !== 0) return;
      const stage = e.target.getStage(); if (!stage) return;
      const pointer = stage.getPointerPosition(); if (!pointer) return;
      const world = toWorld(stage, pointer);
      
      const id = 'text_' + Math.random().toString(36).slice(2, 9);
      const placeholderText: TextNode = {
        id,
        type: 'text',
        position: world,
        size: { width: 200, height: 24 },
        text: ' ',
        fontSize: 14,
        fontFamily: 'Arial',
        color: '#000000',
        spans: [],
      };
      setSpec(prev => appendNodesToRoot(prev, [placeholderText]));
      setSelection([id]);
      onToolChange?.('select');
      
      // Immediately start editing
      // We do NOT clear selection here because we just set it.
      // But we must ensure onToolChange doesn't cause a remount or state reset.
      justStartedTextEditRef.current = true;
      setEditingTextId(id);
      setEditingTextValue(' ');
      setEditingTextSpans([]);

      e.cancelBubble = true;
      e.evt.preventDefault();
      
      return;
    }
    
    // Image tool - single click creates image placeholder
    if (isImageMode) {
      if (e.evt.button !== 0) return;
      const stage = e.target.getStage(); if (!stage) return;
      const pointer = stage.getPointerPosition(); if (!pointer) return;
      const world = toWorld(stage, pointer);
      createImage(world);
      return;
    }

    // Zoom tool - click to zoom in (Alt/right-click to zoom out)
    if (isZoomMode) {
      const stage = e.target.getStage(); if (!stage) return;
      const pointer = stage.getPointerPosition(); if (!pointer) return;
      const worldPos = toWorld(stage, pointer);
      const zoomFactor = (e.evt.altKey || e.evt.button === 2) ? 1 / 1.15 : 1.15;
      const nextScale = Math.min(5, Math.max(0.05, scale * zoomFactor));
      const newPos = {
        x: pointer.x - worldPos.x * nextScale,
        y: pointer.y - worldPos.y * nextScale,
      };
      setScale(nextScale);
      setPos(newPos);
      return;
    }

    // Pan tool - drag to pan
    if (isPanMode) {
      if (e.evt.button !== 0) return;
      const stage = e.target.getStage(); if (!stage) return;
      const pointer = stage.getPointerPosition(); if (!pointer) return;
      panLastPosRef.current = pointer;
      setPanning(true);
      return;
    }

    // Icon tool - single click places selected icon
    if (isIconMode) {
      if (e.evt.button !== 0) return;
      const stage = e.target.getStage(); if (!stage) return;
      const pointer = stage.getPointerPosition(); if (!pointer) return;
      const world = toWorld(stage, pointer);
      createIcon(world);
      return;
    }

    // Component tool - single click places selected component
    if (isComponentMode) {
      if (e.evt.button !== 0) return;
      const stage = e.target.getStage(); if (!stage) return;
      const pointer = stage.getPointerPosition(); if (!pointer) return;
      const world = toWorld(stage, pointer);
      createComponent(world);
      return;
    }
    
    if (!isSelectMode && !isPanMode) return;
    const stage = e.target.getStage();
    if (!stage) return;

    // Don't process selection if clicking on transformer handles
    if (isTransformerTarget(e.target)) {
  // transformer interaction: ignore selection logic
      return;
    }

    // Handle panning
    if (e.evt.button === 1 || (e.evt.button === 0 && (e.evt.altKey || spacePan))) {
      const pointer = stage.getPointerPosition();
      if (pointer) panLastPosRef.current = pointer;
      setPanning(true);
      return;
    }

    if (e.evt.button !== 0) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const worldPos = toWorld(stage, pointer);
    const shape = stage.getIntersection(pointer);
    
    if (shape) {
      // Clicked on a node
      const top = shape.findAncestor((n: Konva.Node) => Boolean(n.id()), true);
      const rawId = top?.id();
      
      if (rawId && rawId !== spec.root.id) {
        const nodeId = getTopContainerAncestor(stage, rawId);
        const isShiftClick = e.evt.shiftKey || e.evt.ctrlKey;
        
        const newSelection = computeClickSelection({ current: selected, clickedId: nodeId, isMultiModifier: isShiftClick });
        setSelection(normalizeSelection(newSelection));
        
        // Check if any of the nodes to drag are locked - use fresh spec lookup
        const nodesToDrag = newSelection.includes(nodeId) ? newSelection : [nodeId];
        
        // Build a fresh node lookup from spec to get current locked state
        const freshNodeById: Record<string, LayoutNode> = {};
        function walkFresh(node: LayoutNode) {
          freshNodeById[node.id] = node;
          if (nodeHasChildren(node)) node.children.forEach(walkFresh);
        }
        walkFresh(spec.root);
        
        const anyLocked = nodesToDrag.some(id => freshNodeById[id]?.locked === true);
        
        // Only allow dragging if no locked elements are being dragged
        if (!anyLocked) {
          const initialPositions: Record<string, { x: number; y: number }> = {};
          
          for (const id of nodesToDrag) {
            const node = stage.findOne(`#${CSS.escape(id)}`);
            if (node) {
              initialPositions[id] = { x: node.x(), y: node.y() };
            }
          }
          
          setDragSession(beginDrag(nodesToDrag, worldPos, initialPositions));
        }
        
        setMenu(null);
        return;
      }
    }
    
    // Clicked on empty space - start marquee session
    setMarqueeSession(beginMarquee(worldPos, selected, e.evt.shiftKey || e.evt.ctrlKey));
    if (!e.evt.shiftKey && !e.evt.ctrlKey) { setSelection([]); }
    
    setMenu(null);
  }, [
    isSelectMode,
    isRectMode,
    isPanMode,
    isZoomMode,
    scale,
    spacePan,
    spec.root,
    toWorld,
    selected,
    getTopContainerAncestor,
    normalizeSelection,
    isTransformerTarget,
    isEllipseMode,
    isLineMode,
    isCurveMode,
    isTextMode,
    isImageMode,
    isIconMode,
    isComponentMode,
    curveDraft,
    createImage,
    createIcon,
    createComponent,
    setSelection,
    setSpec,
    onToolChange,
  ]);

  const onMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    // Handle shape creation tool drafts
    if (isRectMode) {
      if (!rectDraft) return;
      const pointer = stage.getPointerPosition(); if (!pointer) return;
      const worldPos = toWorld(stage, pointer);
      setRectDraft(prev => prev ? { ...prev, current: worldPos } : prev);
      return;
    }
    
    if (isEllipseMode) {
      if (!ellipseDraft) return;
      const pointer = stage.getPointerPosition(); if (!pointer) return;
      const worldPos = toWorld(stage, pointer);
      setEllipseDraft(prev => prev ? { ...prev, current: worldPos } : prev);
      return;
    }
    
    if (isLineMode) {
      if (!lineDraft) return;
      const pointer = stage.getPointerPosition(); if (!pointer) return;
      const worldPos = toWorld(stage, pointer);
      setLineDraft(prev => prev ? { ...prev, current: worldPos } : prev);
      return;
    }
    
    if (isCurveMode) {
      if (!curveDraft) return;
      const pointer = stage.getPointerPosition(); if (!pointer) return;
      const worldPos = toWorld(stage, pointer);
      setCurveDraft(prev => prev ? { ...prev, current: worldPos } : prev);
      return;
    }
    
    if (!isSelectMode && !isPanMode) return;

    if (panning) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const last = panLastPosRef.current;
      if (!last) {
        panLastPosRef.current = pointer;
        return;
      }
      const dx = pointer.x - last.x;
      const dy = pointer.y - last.y;
      panLastPosRef.current = pointer;
      setPos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      return;
    }

    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const worldPos = toWorld(stage, pointer);

    // Handle drag movement via pure helper
    if (dragSession) {
      const session = dragSession; // mutate in place via helper
      const update = updateDrag(session, worldPos);
      if (update.passedThreshold) {
        for (const movedNode of update.moved) {
          const node = stage.findOne(`#${CSS.escape(movedNode.id)}`);
            if (node) {
              node.position({ x: movedNode.x, y: movedNode.y });
            }
        }
        trRef.current?.forceUpdate();
      }
      // Force state update so dependent callbacks (e.g. click clearing) see threshold transition
      setDragSession({ ...session });
      return;
    }

    // Handle marquee movement via helper
    if (marqueeSession) {
      const upd = updateMarquee(marqueeSession, worldPos);
      const rect = marqueeRectRef.current;
      if (rect) {
        rect.position({ x: upd.rect.x, y: upd.rect.y });
        rect.size({ width: upd.rect.width, height: upd.rect.height });
        rect.visible(upd.rect.width > 5 || upd.rect.height > 5);
        rect.getLayer()?.batchDraw();
      }
      setMarqueeSession({ ...marqueeSession });
    }
  }, [isSelectMode, isPanMode, panning, toWorld, dragSession, marqueeSession, isRectMode, rectDraft, isEllipseMode, ellipseDraft, isLineMode, lineDraft, isCurveMode, curveDraft]);

  const onMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    // Finalize rectangle creation
    if (isRectMode && rectDraft) { finalizeRect(); return; }
    
    // Finalize ellipse creation
    if (isEllipseMode && ellipseDraft) { finalizeEllipse(); return; }
    
    // Finalize line creation
    if (isLineMode && lineDraft) { finalizeLine(); return; }
    
    // Note: Curve finalization happens on double-click or Enter, not mouseup

    if (panning) {
      setPanning(false);
      panLastPosRef.current = null;
      return;
    }

    // Handle drag completion via pure helper
    if (dragSession) {
      const summary = finalizeDrag(dragSession);
      if (summary.moved.length > 0) {
        setSpec(prev => {
          let next = prev;
          for (const mv of summary.moved) {
            next = applyPosition(next, mv.id, { x: mv.to.x, y: mv.to.y });
          }
          return next;
        });
      }
      setDragSession(null);
    }

    // Handle marquee completion via helper
    if (marqueeSession) {
      const stageNodes = stage.find((n: Konva.Node) => Boolean(n.id()) && n.id() !== spec.root.id);
      const nodeBounds = stageNodes.map(n => {
        try {
          const bb = n.getClientRect({ relativeTo: stage });
          return { id: getTopContainerAncestor(stage, n.id()), x: bb.x, y: bb.y, width: bb.width, height: bb.height };
        } catch { return null; }
      }).filter(Boolean) as { id:string; x:number; y:number; width:number; height:number }[];
      const summary = finalizeMarquee(marqueeSession, nodeBounds);
      if (summary.hits.length) {
        const newSelection = computeMarqueeSelection({ base: marqueeSession.baseSelection, hits: summary.hits, isToggleModifier: marqueeSession.isToggle });
        setSelection(normalizeSelection(newSelection));
      }
      const rect = marqueeRectRef.current;
      if (rect) { rect.visible(false); rect.getLayer()?.batchDraw(); }
      setMarqueeSession(null);
    }
  }, [
    panning,
    dragSession,
    marqueeSession,
    spec.root.id,
    getTopContainerAncestor,
    normalizeSelection,
    setSpec,
    isRectMode,
    rectDraft,
    finalizeRect,
    isEllipseMode,
    ellipseDraft,
    finalizeEllipse,
    isLineMode,
    lineDraft,
    finalizeLine,
    setSelection,
  ]);

  // Global listeners for rectangle draft (supports dragging outside stage bounds)
  useEffect(() => {
    if (!isRectMode || !rectDraft) return;
    const stage = stageRef.current; if (!stage) return;
    const onMove = (ev: MouseEvent) => {
      // Use raw client coords relative to stage container
      const rect = stage.container().getBoundingClientRect();
      const px = ev.clientX - rect.left;
      const py = ev.clientY - rect.top;
      // Ignore if outside container (optional: still extend)
      const world = { x: (px - stage.x()) / stage.scaleX(), y: (py - stage.y()) / stage.scaleY() };
      setRectDraft(prev => prev ? { ...prev, current: world } : prev);
    };
    const onUp = () => { finalizeRect(); };
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mouseup', onUp, true);
    return () => {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('mouseup', onUp, true);
    };
  }, [isRectMode, rectDraft, finalizeRect]);

  // Cancel rectangle draft with Escape
  useEffect(() => {
    if (!isRectMode || !rectDraft) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setRectDraft(null); }
    };
    window.addEventListener('keydown', onKey, CAPTURE_OPTIONS);
    return () => window.removeEventListener('keydown', onKey, CAPTURE_OPTIONS);
  }, [isRectMode, rectDraft]);

  // Global listeners for ellipse draft
  useEffect(() => {
    if (!isEllipseMode || !ellipseDraft) return;
    const stage = stageRef.current; if (!stage) return;
    const onMove = (ev: MouseEvent) => {
      const rect = stage.container().getBoundingClientRect();
      const px = ev.clientX - rect.left;
      const py = ev.clientY - rect.top;
      const world = { x: (px - stage.x()) / stage.scaleX(), y: (py - stage.y()) / stage.scaleY() };
      setEllipseDraft(prev => prev ? { ...prev, current: world } : prev);
    };
    const onUp = () => { finalizeEllipse(); };
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mouseup', onUp, true);
    return () => {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('mouseup', onUp, true);
    };
  }, [isEllipseMode, ellipseDraft, finalizeEllipse]);

  // Cancel ellipse draft with Escape
  useEffect(() => {
    if (!isEllipseMode || !ellipseDraft) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setEllipseDraft(null); }
    };
    window.addEventListener('keydown', onKey, CAPTURE_OPTIONS);
    return () => window.removeEventListener('keydown', onKey, CAPTURE_OPTIONS);
  }, [isEllipseMode, ellipseDraft]);

  // Global listeners for line draft
  useEffect(() => {
    if (!isLineMode || !lineDraft) return;
    const stage = stageRef.current; if (!stage) return;
    const onMove = (ev: MouseEvent) => {
      const rect = stage.container().getBoundingClientRect();
      const px = ev.clientX - rect.left;
      const py = ev.clientY - rect.top;
      const world = { x: (px - stage.x()) / stage.scaleX(), y: (py - stage.y()) / stage.scaleY() };
      setLineDraft(prev => prev ? { ...prev, current: world } : prev);
    };
    const onUp = () => { finalizeLine(); };
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mouseup', onUp, true);
    return () => {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('mouseup', onUp, true);
    };
  }, [isLineMode, lineDraft, finalizeLine]);

  // Cancel line draft with Escape
  useEffect(() => {
    if (!isLineMode || !lineDraft) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLineDraft(null); }
    };
    window.addEventListener('keydown', onKey, CAPTURE_OPTIONS);
    return () => window.removeEventListener('keydown', onKey, CAPTURE_OPTIONS);
  }, [isLineMode, lineDraft]);

  // Curve: finalize on Enter, cancel on Escape
  useEffect(() => {
    if (!isCurveMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setCurveDraft(null); }
      if (e.key === 'Enter' && curveDraft && curveDraft.points.length >= 1) { finalizeCurve(); }
    };
    window.addEventListener('keydown', onKey, CAPTURE_OPTIONS);
    return () => window.removeEventListener('keydown', onKey, CAPTURE_OPTIONS);
  }, [isCurveMode, curveDraft, finalizeCurve]);

  // Double-click: finalize curve OR enter text editing mode
  const onDblClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Curve finalization
    if (isCurveMode && curveDraft && curveDraft.points.length >= 1) {
      finalizeCurve();
      return;
    }
    
    // Text editing - check if double-clicked on a text node
    if (isSelectMode) {
      const target = e.target;
      const name = target.name?.() || '';
      let isTextNode = name.includes('text');
      let nodeId = target.id();
      
      // If we clicked on a child element (like a Text inside a Group for rich text),
      // check the parent for the text node name
      if (!isTextNode && target.parent) {
        const parentName = target.parent.name?.() || '';
        if (parentName.includes('text')) {
          isTextNode = true;
          nodeId = target.parent.id();
        }
      }
      
      if (isTextNode && nodeId) {
        const textNode = findNode(spec.root, nodeId) as TextNode | null;
        
        if (textNode && textNode.type === 'text') {
          justStartedTextEditRef.current = true;
          setEditingTextId(nodeId);
          setEditingTextValue(textNode.text || '');
          // Initialize spans - either from existing spans or create one from plain text
          if (textNode.spans && textNode.spans.length > 0) {
            setEditingTextSpans(textNode.spans);
          } else {
            setEditingTextSpans([{ text: textNode.text || '' }]);
          }
          // Focus the editor on next tick
          setTimeout(() => {
            richTextEditorRef.current?.focus();
            richTextEditorRef.current?.selectAll();
          }, 0);
        }
      }
    }
  }, [isCurveMode, curveDraft, finalizeCurve, isSelectMode, spec.root, findNode]);

  // Commit text edit and close editor
  const commitTextEdit = useCallback(() => {
    if (!editingTextId) return;
    
    const newRoot = mapNode<FrameNode>(spec.root, editingTextId, (n) => ({
      ...n,
      text: editingTextValue,
      spans: editingTextSpans.length > 0 ? editingTextSpans : undefined,
    }));
    
    setSpec({ ...spec, root: newRoot });
    onToolChange?.('select');
    setSelection([editingTextId]);
    setEditingTextId(null);
    setEditingTextValue('');
    setEditingTextSpans([]);
    setTextSelection(null);
  }, [editingTextId, editingTextValue, editingTextSpans, spec, setSpec, onToolChange, setSelection]);

  // Cancel text edit without saving
    const cancelTextEdit = useCallback(() => {
      setEditingTextId(null);
      setEditingTextValue('');
      setEditingTextSpans([]);
      setTextSelection(null);
      onToolChange?.('select');
    }, [onToolChange]);

  // Handle text/spans change from rich text editor
  const handleTextChange = useCallback((text: string, spans: TextSpan[]) => {
    setEditingTextValue(text);
    setEditingTextSpans(spans);
  }, []);

  // Apply formatting to selected text
  const applyFormat = useCallback((format: Partial<TextSpan>) => {
    if (!richTextEditorRef.current) return;
    richTextEditorRef.current.applyFormatToSelection(format);
  }, []);

  // Hide Konva text node while editing (so textarea appears to replace it)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !editingTextId) return;
    
    const konvaNode = stage.findOne(`#${CSS.escape(editingTextId)}`);
    if (konvaNode) {
      konvaNode.visible(false);
      stage.batchDraw();
    }
    
    return () => {
      if (konvaNode) {
        konvaNode.visible(true);
        stage.batchDraw();
      }
    };
  }, [editingTextId]);

  // Calculate textarea position and style based on the text node's position on canvas
  const getTextEditStyle = useCallback((): React.CSSProperties | null => {
    if (!editingTextId || !stageRef.current) return null;
    
    const textNode = findNode(spec.root, editingTextId) as TextNode | null;
    if (!textNode) return null;
    
    const worldPos = getNodeWorldPosition(editingTextId) ?? { x: 0, y: 0 };
    const x = worldPos.x;
    const y = worldPos.y;
    
    // Convert world coordinates to screen coordinates
    const stageX = x * scale + pos.x;
    const stageY = y * scale + pos.y;
    
    // Get the wrapper's position
    const wrapper = wrapperRef.current;
    if (!wrapper) return null;
    
    // Get font properties
    const fontSize = textNode.fontSize ?? 14;
    const fontFamily = textNode.fontFamily || 'Arial';
    const fontWeight = textNode.fontWeight || '400';
    
    // Calculate text alignment offset if needed
    const align = textNode.align ?? 'left';

    const PADDING = 6;
    const MIN_WIDTH = 15;
    const MIN_HEIGHT = 30;
    
    return {
      position: 'absolute',
      left: stageX - PADDING,
      top: stageY - PADDING,
      fontSize: fontSize * scale,
      fontFamily,
      fontWeight: fontWeight === 'bold' ? 700 : (fontWeight === 'normal' ? 400 : Number(fontWeight)),
      fontStyle: textNode.fontStyle === 'italic' ? 'italic' : 'normal',
      color: textNode.color ?? '#0f172a',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      padding: `${PADDING}px`,
      margin: 0,
      display: 'inline-block',
      width: 'auto',
      minWidth: `${MIN_WIDTH}px`,
      minHeight: `${MIN_HEIGHT}px`,
      resize: 'none',
      overflow: 'visible',
      transformOrigin: 'top left',
      transform: `rotate(${textNode.rotation ?? 0}deg) scale(${textNode.textScaleX ?? 1}, ${textNode.textScaleY ?? 1})`,
      zIndex: 1000,
      lineHeight: 1.2,
      textAlign: align,
      caretColor: '#3b82f6',
      whiteSpace: 'pre',
    };
  }, [editingTextId, spec.root, scale, pos, getNodeWorldPosition, findNode]);

  // Single click handler for empty canvas
  const onClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // If we are editing, clicking the background commits (except immediately after start).
    if (editingTextId) {
      if (justStartedTextEditRef.current) {
        justStartedTextEditRef.current = false;
        return;
      }
      if (e.target === e.target.getStage()) {
        commitTextEdit();
        setSelection([]);
      }
      return;
    }

    if (!isSelectMode) return;
    if (e.evt.button !== 0) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    // Don't clear selection if clicking on transformer handles
    if (isTransformerTarget(e.target)) {
  // clicking transformer: keep selection
      return;
    }
    
  if (e.target === stage && !(dragSession?.passedThreshold) && !marqueeSession) {
  // empty stage click: clear selection
  setSelection([]);
      setMenu(null);
    }
  }, [isSelectMode, dragSession, marqueeSession, isTransformerTarget, editingTextId, commitTextEdit, setSelection]);

  // Wheel zoom
  const onWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const scaleBy = 1.05;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const worldPos = toWorld(stage, pointer);
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = Math.min(5, Math.max(0.05, newScale));
    const newPos = {
      x: pointer.x - worldPos.x * newScale,
      y: pointer.y - worldPos.y * newScale,
    };
    setScale(newScale);
    setPos(newPos);
  }, [toWorld]);

  // Track spacebar for panning mode
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      if (e.code === 'Space') { setSpacePan(true); e.preventDefault(); }
      if (e.key === 'Shift') setShiftPressed(true);
      if (e.key === 'Alt') setAltPressed(true);
    };
    const up = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      if (e.code === 'Space') { setSpacePan(false); }
      if (e.key === 'Shift') setShiftPressed(false);
      if (e.key === 'Alt') setAltPressed(false);
    };
    window.addEventListener('keydown', down, CAPTURE_OPTIONS);
    window.addEventListener('keyup', up, CAPTURE_OPTIONS);
    return () => {
      window.removeEventListener('keydown', down, CAPTURE_OPTIONS);
      window.removeEventListener('keyup', up, CAPTURE_OPTIONS);
    };
  }, []);

  // Reflect altPressed to transformer centeredScaling dynamically
  useEffect(() => {
    const tr = trRef.current; if (!tr) return;
    tr.centeredScaling(altPressed);
    tr.forceUpdate();
    tr.getLayer()?.batchDraw();
  }, [altPressed]);

  // Context menu (right click)
  const onWrapperContextMenu = useCallback((e: React.MouseEvent) => {
    if (!isSelectMode) return;
    e.preventDefault();
    const stage = stageRef.current;
    const wrap = wrapperRef.current;
    if (!stage || !wrap) return;
    
    try {
      const stageWithPointerSupport = stage as Konva.Stage & { setPointersPositions?: (evt: Event) => void };
      stageWithPointerSupport.setPointersPositions?.(e.nativeEvent as Event);
    } catch { /* ignore */ }
    const pointer = stage.getPointerPosition();
    const shape = pointer ? stage.getIntersection(pointer) : null;
    
    if (shape) {
      const top = shape.findAncestor((n: Konva.Node) => Boolean(n.id()), true);
      const rawId = top?.id();
      if (rawId && rawId !== spec.root.id) {
        const id = getTopContainerAncestor(stage, rawId);
        // Only change selection if right-clicking on an unselected item
        if (!selected.includes(id)) {
          setSelection(normalizeSelection([id]));
        }
      }
    }
    
    // Position menu at raw client coords relative to wrapper
    const rect = wrap.getBoundingClientRect();
    setMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [isSelectMode, spec.root.id, selected, getTopContainerAncestor, normalizeSelection, setSelection]);

  // Close menu on outside clicks
  useEffect(() => {
    if (!menu) return;
    const handleDocMouseDown = (ev: MouseEvent) => {
      const wrap = wrapperRef.current;
      if (!wrap) return;
      if (wrap.contains(ev.target as Node)) {
        const menuEl = wrap.querySelector('.z-50');
        if (menuEl && menuEl.contains(ev.target as Node)) return;
      }
      setMenu(null);
    };
    const handleDocContext = () => { setMenu(null); };
    window.addEventListener('mousedown', handleDocMouseDown, true);
    window.addEventListener('contextmenu', handleDocContext, true);
    return () => {
      window.removeEventListener('mousedown', handleDocMouseDown, true);
      window.removeEventListener('contextmenu', handleDocContext, true);
    };
  }, [menu]);

  // Group / Ungroup logic
  const canUngroup = useMemo(() => 
    selected.length === 1 && selectionContext.nodeById[selected[0]]?.type === "group", 
    [selected, selectionContext]
  );
  
  const canGroup = useMemo(() => {
    if (selected.length < 2) return false;
    const selSet = new Set(selected);
    const parent = selectionContext.parentOf[selected[0]];
    if (!parent) return false;
    for (let i = 1; i < selected.length; i++) {
      if (selectionContext.parentOf[selected[i]] !== parent) return false;
    }
    for (const id of selected) {
      let p = selectionContext.parentOf[id];
      while (p) { if (selSet.has(p)) return false; p = selectionContext.parentOf[p]; }
    }
    if (selSet.has(parent)) return false;
    return true;
  }, [selected, selectionContext]);

  const performGroup = useCallback(() => {
  if (!canGroup) { setMenu(null); return; }
    setMenu(null);
    const before = new Set(selected);
    const next = groupNodes(spec, before);
    let newGroup: string | null = null;
    (function scan(n: LayoutNode) {
      if (newGroup) return;
      if (nodeHasChildren(n)) {
        if (n.type === 'group') {
          const childIds = n.children.map((c) => c.id);
          const matches = [...before].every(id => childIds.includes(id)) && !before.has(n.id);
          if (matches) newGroup = n.id;
        }
        n.children.forEach(scan);
      }
    })(next.root);
    setSpec(next);
  if (newGroup) setSelection([newGroup]);
  }, [canGroup, selected, spec, setSpec, setSelection]);

  const performUngroup = useCallback(() => {
    if (!canUngroup) { setMenu(null); return; }
    setMenu(null);
    const stage = stageRef.current;
    if (!stage) return;
    const gId = selected[0];
    const gNode = stage.findOne(`#${CSS.escape(gId)}`) as Konva.Group | null;
    const childAbs: { id: string; abs: { x: number; y: number } }[] = [];
    if (gNode) {
      const gPos = gNode.position();
      gNode.getChildren((n: Konva.Node) => Boolean(n.id())).forEach((c: Konva.Node) => {
        const cp = c.position ? c.position() : { x: c.x?.() ?? 0, y: c.y?.() ?? 0 };
        childAbs.push({ id: c.id(), abs: { x: gPos.x + cp.x, y: gPos.y + cp.y } });
      });
    }
    let next = ungroupNodes(spec, new Set([gId]));
    childAbs.forEach(cr => { next = applyPosition(next, cr.id, cr.abs); });
    setSpec(next);
    setSelection(childAbs.map(c => c.id));
    onUngroup?.([gId]);
  }, [canUngroup, selected, spec, setSpec, onUngroup, setSelection]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (editingTextId) return;
      if (target?.isContentEditable || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') {
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo?.();
        } else {
          onUndo?.();
        }
        return;
      }

      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selected.length === 0) return;
        e.preventDefault();
        const nodes = selected.map(id => findNode(spec.root, id)).filter(Boolean) as LayoutNode[];
        if (nodes.length > 0) {
          clipboardRef.current = nodes.map(n => cloneNode(n));
          pasteOffsetRef.current = 0;
        }
        return;
      }

      // Paste
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (!clipboardRef.current || clipboardRef.current.length === 0) return;
        e.preventDefault();
        const offset = 16 * (pasteOffsetRef.current + 1);
        const existing = collectExistingIds(spec.root as LayoutNode);
        const makeId = createUniqueIdFactory(existing);
        const clones = clipboardRef.current.map(n => remapIdsAndOffset(cloneNode(n), { x: offset, y: offset }, makeId));
        setSpec(prev => appendNodesToRoot(prev, clones));
        setSelection(clones.map(n => n.id));
        pasteOffsetRef.current += 1;
        return;
      }
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      if (!isSelectMode) return;
      
      // Group / Ungroup
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        if (e.shiftKey) { 
          if (canUngroup) { e.preventDefault(); performUngroup(); } 
        } else { 
          if (canGroup) { e.preventDefault(); performGroup(); } 
        }
        return;
      }
      
      if (selected.length === 0) return;
      
      // Check if any selected elements are locked (prevent delete/nudge for locked elements)
      const anyLocked = selected.some(id => selectionContext.nodeById[id]?.locked === true);
      
      // Delete (only unlocked elements)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const unlocked = selected.filter(id => selectionContext.nodeById[id]?.locked !== true);
        if (unlocked.length > 0) {
          setSpec(prev => deleteNodes(prev, new Set(unlocked)));
          setSelection(selected.filter(id => !unlocked.includes(id)));
        }
        return;
      }
      
      // Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const unlocked = selected.filter(id => selectionContext.nodeById[id]?.locked !== true);
        if (unlocked.length > 0) {
          setSpec(prev => duplicateNodes(prev, new Set(unlocked)));
        }
        return;
      }
      
      // Arrow nudge (only if no locked elements)
      if (anyLocked) return;
      const step = e.shiftKey ? 10 : 1;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      
      if (dx || dy) {
        e.preventDefault();
        setSpec(prev => nudgeNodes(prev, new Set(selected), dx, dy));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    isSelectMode,
    canGroup,
    canUngroup,
    selected,
    performGroup,
    performUngroup,
    setSpec,
    setSelection,
    editingTextId,
    spec.root,
    collectExistingIds,
    createUniqueIdFactory,
    remapIdsAndOffset,
    cloneNode,
    onUndo,
    onRedo,
    findNode,
    selectionContext.nodeById,
  ]);

  // Normalize selection on changes
  useEffect(() => {
    if (selected.length === 0) {
      // parent controls selection; nothing to do if empty
      return;
    }
    const norm = normalizeSelection(selected);
    if (norm.length !== selected.length || norm.some((id, i) => id !== selected[i])) {
      setSelection(norm);
    }
  }, [selected, normalizeSelection, setSelection]);

  // Transformer target attachment
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const stage = tr.getStage();
    if (!stage) return;
    // Exclude locked elements from transformer
    const targets = selected
      .filter(id => selectionContext.nodeById[id]?.locked !== true)
      .map(id => stage.findOne(`#${CSS.escape(id)}`))
      .filter(Boolean) as Konva.Node[];
  // attach transformer to current selection
    tr.nodes(targets);
    tr.getLayer()?.batchDraw();
  }, [selected, selectionContext.nodeById]);

  // Handle ongoing transform (during drag/resize)
  const onTransform = useCallback(() => {
    // Initialize transform session snapshot once per gesture.
    if (transformSession) return; // already captured
    const tr = trRef.current; if (!tr) return;
    const stage = tr.getStage(); if (!stage) return;
    const nodes = tr.nodes(); if (!nodes.length) return;

    const snapshot: {
      nodes: Record<string, { topLeft: {x:number;y:number}; size:{width:number;height:number}; center:{x:number;y:number} }>;
      selectionBox?: { x:number; y:number; width:number; height:number; center:{x:number;y:number} };
    } = { nodes: {} };

    let minX = Number.POSITIVE_INFINITY, minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY, maxY = Number.NEGATIVE_INFINITY;

    nodes.forEach(n => {
      const id = n.id(); if (!id) return;
      // Derive untransformed size from spec (source of truth)
      const specNode = findNode(spec.root, id);
      let width = 0, height = 0;
      if (specNode && nodeHasSize(specNode)) { width = specNode.size.width; height = specNode.size.height; }
      else {
        // Fallback to Konva bounding box (approx for text/etc.)
        const bb = n.getClientRect({ relativeTo: stage });
        width = bb.width; height = bb.height;
      }
      const topLeft = { x: n.x(), y: n.y() };
      const center = { x: topLeft.x + width / 2, y: topLeft.y + height / 2 };
      snapshot.nodes[id] = { topLeft, size: { width, height }, center };
      minX = Math.min(minX, center.x); minY = Math.min(minY, center.y);
      maxX = Math.max(maxX, center.x); maxY = Math.max(maxY, center.y);
    });

    if (nodes.length > 1 && isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY)) {
      const selW = maxX - minX;
      const selH = maxY - minY;
      snapshot.selectionBox = { x: minX, y: minY, width: selW, height: selH, center: { x: minX + selW/2, y: minY + selH/2 } };
    }

    setTransformSession(snapshot);
  }, [transformSession, spec.root, findNode]);

  // Commit transform (resize, scale, rotate)
  const onTransformEnd = useCallback(() => {
    const nodes = trRef.current?.nodes() ?? [];
    if (nodes.length === 0) return;
  // const session = transformSession; // snapshot no longer used in current simplified bake
    
    // For multi-selection, we need to get the transform values that were applied to all nodes
    // and apply them uniformly to our spec
  if (nodes.length > 1) {
  // multi-selection transform bake
      // NOTE: Current implementation still naive for relative offsets; we only remove cumulative rotation bug here.
      const firstNode = nodes[0];
      const scaleX = firstNode.scaleX();
      const scaleY = firstNode.scaleY();
      const rotationDeg = firstNode.rotation(); // absolute final rotation
  // collective transform values captured
      nodes.forEach(node => {
        const nodeId = node.id(); if (!nodeId) return;
        const currentNode = findNode(spec.root, nodeId); if (!currentNode) return;
        const newPos = { x: node.x(), y: node.y() }; // Konva final top-left already adjusted for center-rotation illusion
        // Store position directly (remove prior inverse compensation)
        setSpec(prev => applyPosition(prev, nodeId, newPos));
        // Store absolute rotation (no cumulative addition)
        setSpec(prev => ({
          ...prev,
                          root: mapNode<FrameNode>(prev.root, nodeId, (n) => ({
              ...n,
              rotation: rotationDeg
            }))
        }));
        // Scaling logic: text nodes accumulate glyph scale; others resize as before
        if (scaleX !== 1 || scaleY !== 1) {
          if (currentNode.type === 'text') {
            // For text nodes in multi-selection, Konva node.scaleX()/scaleY() already represent absolute glyph scale.
            const absX = Math.max(0.05, node.scaleX());
            const absY = Math.max(0.05, node.scaleY());
            setSpec(prev => ({
              ...prev,
              root: mapNode<FrameNode>(prev.root, nodeId, (n) => n.type === 'text' ? { ...n, textScaleX: absX, textScaleY: absY } : n)
            }));
          } else if (nodeHasSize(currentNode)) {
            const newSize = {
              width: Math.round(currentNode.size.width * scaleX),
              height: Math.round(currentNode.size.height * scaleY)
            };
            if (currentNode.type === 'image') {
              const nonUniform = Math.abs(scaleX - scaleY) > 0.0001;
              setSpec(prev => ({
                ...prev,
                root: mapNode<FrameNode>(prev.root, nodeId, (n) => {
                  if (n.type !== 'image') return n;
                  return {
                    ...n,
                    position: { x: newPos.x, y: newPos.y },
                    size: newSize,
                    preserveAspect: nonUniform ? false : (n.preserveAspect !== undefined ? n.preserveAspect : true),
                    objectFit: nonUniform ? undefined : n.objectFit
                  };
                })
              }));
            } else {
              setSpec(prev => applyPositionAndSize(prev, nodeId, newPos, newSize));
            }
          }
        }
        node.scaleX(1); node.scaleY(1); node.rotation(0);
      });
    } else {
      // Single node transform
      const node = nodes[0];
      const nodeId = node.id();
      if (!nodeId) return;

      const newPos = { x: node.x(), y: node.y() };
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const rotationDeg = node.rotation(); // absolute degrees

  // single node transform bake

      const currentNode = findNode(spec.root, nodeId);
      if (!currentNode) return;
      
      const isGroup = currentNode?.type === 'group';

      // Store the position exactly as provided by Konva (already adjusted for center-rotation illusion)
      setSpec(prev => applyPosition(prev, nodeId, newPos));
      // Set absolute rotation (no cumulative add)
      setSpec(prev => ({
        ...prev,
        root: mapNode<FrameNode>(prev.root, nodeId, (n) => ({
          ...n,
          rotation: rotationDeg
        }))
      }));
      
      // Handle scaling
      if (scaleX !== 1 || scaleY !== 1) {
        if (isGroup && currentNode.children) {
          // For groups: scale the group container and all children
          // scaling group and children
          
          setSpec(prev => ({
            ...prev,
            root: mapNode<FrameNode>(prev.root, nodeId, (groupNode) => {
              if (groupNode.type !== 'group') return groupNode;
            
              // Scale the group's size if it has one
              let newGroupSize = groupNode.size;
              if (groupNode.size) {
                newGroupSize = {
                  width: Math.round(groupNode.size.width * scaleX),
                  height: Math.round(groupNode.size.height * scaleY)
                };
              }
            
              // Scale all children positions and sizes
              const scaledChildren = groupNode.children.map((child) => {
                const scaledChild = { ...child };
              
                if (child.position) {
                  scaledChild.position = {
                    x: Math.round(child.position.x * scaleX),
                    y: Math.round(child.position.y * scaleY)
                  };
                }
                
                if (nodeHasSize(child)) {
                  scaledChild.size = {
                    width: Math.round(child.size.width * scaleX),
                    height: Math.round(child.size.height * scaleY)
                  };
                }
              
                return scaledChild;
              });
            
              return {
                ...groupNode,
                size: newGroupSize,
                children: scaledChildren
              };
            })
          }));
          // Persist absolute Konva scale as glyph scale
          const absX = Math.max(0.05, node.scaleX());
          const absY = Math.max(0.05, node.scaleY());
          setSpec(prev => ({
            ...prev,
            root: mapNode<FrameNode>(prev.root, nodeId, (n) => n.type === 'text' ? { ...n, textScaleX: absX, textScaleY: absY } : n)
          }));
        } else {
          // For individual non-text nodes: scale size
          if (currentNode && nodeHasSize(currentNode)) {
            const newSize = {
              width: Math.round(currentNode.size.width * scaleX),
              height: Math.round(currentNode.size.height * scaleY)
            };
            if (currentNode.type === 'image') {
              const nonUniform = Math.abs(scaleX - scaleY) > 0.0001;
              setSpec(prev => ({
                ...prev,
                root: mapNode<FrameNode>(prev.root, nodeId, (n) => {
                  if (n.type !== 'image') return n;
                  return {
                    ...n,
                    position: { x: newPos.x, y: newPos.y },
                    size: newSize,
                    preserveAspect: nonUniform ? false : (n.preserveAspect !== undefined ? n.preserveAspect : true),
                    objectFit: nonUniform ? undefined : n.objectFit
                  };
                })
              }));
            } else {
              setSpec(prev => applyPositionAndSize(prev, nodeId, newPos, newSize));
            }
          }
        }
      }

      // Reset the node's transform properties
      node.scaleX(1);
      node.scaleY(1);
      node.rotation(0);
    }

    // Clear transform session after bake
    setTransformSession(null);

    // Force transformer to update its targets after React re-renders
    setTimeout(() => {
      const tr = trRef.current;
      if (!tr) return;
      const stage = tr.getStage();
      if (!stage) return;
      
      // Re-attach transformer to the updated nodes
      const targets = selected.map(id => stage.findOne(`#${CSS.escape(id)}`)).filter(Boolean) as Konva.Node[];
  // re-attaching transformer after bake
      tr.nodes(targets);
      tr.forceUpdate();
      tr.getLayer()?.batchDraw();
    }, 0);
  }, [setSpec, spec.root, selected, findNode]);


  return (
  <div ref={wrapperRef} style={{ position: 'relative', width, height, cursor: isRectMode ? 'crosshair' : undefined, backgroundColor: GRID_BG_COLOR }} onContextMenu={onWrapperContextMenu}>
      <Stage 
        ref={stageRef} 
        width={width} 
        height={height} 
        scaleX={scale} 
        scaleY={scale} 
        x={pos.x} 
        y={pos.y}
        onWheel={onWheel} 
        onMouseDown={onMouseDown} 
        onMouseMove={onMouseMove} 
        onMouseUp={onMouseUp} 
        onClick={onClick}
        onDblClick={onDblClick}
      >
        {/* Background grid layer */}
        <Layer listening={false}>
          <InfiniteGrid 
            width={width} 
            height={height} 
            scale={scale} 
            offsetX={pos.x} 
            offsetY={pos.y} 
          />
        </Layer>
        
        {/* Main content layer */}
        <Layer>
          <Group>
            {renderNode(spec.root)}
          </Group>
          
          {isSelectMode && !editingTextId && (
            <Transformer 
              ref={trRef as unknown as React.RefObject<Konva.Transformer>} 
              rotateEnabled={true} 
              resizeEnabled={true}
              keepRatio={false} // we enforce manually only while shift is held via boundBoxFunc
              centeredScaling={altPressed}
              rotationSnaps={[0, 90, 180, 270]}
              boundBoxFunc={(oldBox, newBox) => {
                // Prevent scaling to zero or negative size
                if (newBox.width < 10 || newBox.height < 10) {
                  return oldBox;
                }
                if (!shiftPressed) return newBox;
                // Constrain proportionally relative to old box when shift held.
                const aspect = oldBox.width / (oldBox.height || 1);
                // Determine which dimension changed more in relative terms
                const dw = Math.abs(newBox.width - oldBox.width);
                const dh = Math.abs(newBox.height - oldBox.height);
                if (dw > dh) {
                  // Width is driver -> derive height
                  const constrainedHeight = newBox.width / aspect;
                  return { ...newBox, height: constrainedHeight };
                } else {
                  // Height driver -> derive width
                  const constrainedWidth = newBox.height * aspect;
                  return { ...newBox, width: constrainedWidth };
                }
              }}
              onTransform={onTransform}
              onTransformEnd={onTransformEnd} 
            />
          )}
          
          {/* Marquee rectangle */}
          <Rect
            ref={marqueeRectRef}
            x={0}
            y={0}
            width={0}
            height={0}
            visible={false}
            listening={false}
            fill={'rgba(59,130,246,0.1)'}
            stroke={'#3b82f6'}
            dash={[4,4]}
          />
          {/* Rectangle draft preview */}
          {isRectMode && rectDraft && (() => {
            const { start, current } = rectDraft;
            let x = start.x; let y = start.y; let w = current.x - start.x; let h = current.y - start.y;
            const alt = altPressed; const shift = shiftPressed;
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
              x = start.x - Math.abs(w)/2;
              y = start.y - Math.abs(h)/2;
              w = Math.abs(w); h = Math.abs(h);
            } else {
              if (w < 0) { x = x + w; w = Math.abs(w);} 
              if (h < 0) { y = y + h; h = Math.abs(h);} 
            }
            return (
              <Rect
                x={x}
                y={y}
                width={Math.max(1, w)}
                height={Math.max(1, h)}
                fill={'rgba(255,255,255,0.35)'}
                stroke={'#334155'}
                strokeWidth={1}
                dash={[6,4]}
                listening={false}
              />
            );
          })()}
          {/* Ellipse draft preview */}
          {isEllipseMode && ellipseDraft && (() => {
            const { start, current } = ellipseDraft;
            let x = start.x; let y = start.y; let w = current.x - start.x; let h = current.y - start.y;
            const alt = altPressed; const shift = shiftPressed;
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
              x = start.x - Math.abs(w)/2;
              y = start.y - Math.abs(h)/2;
              w = Math.abs(w); h = Math.abs(h);
            } else {
              if (w < 0) { x = x + w; w = Math.abs(w);} 
              if (h < 0) { y = y + h; h = Math.abs(h);} 
            }
            const radiusX = Math.max(1, w) / 2;
            const radiusY = Math.max(1, h) / 2;
            return (
              <Ellipse
                x={x + radiusX}
                y={y + radiusY}
                radiusX={radiusX}
                radiusY={radiusY}
                fill={'rgba(255,255,255,0.35)'}
                stroke={'#334155'}
                strokeWidth={1}
                dash={[6,4]}
                listening={false}
              />
            );
          })()}
          {/* Line draft preview */}
          {isLineMode && lineDraft && (() => {
            const { start, current } = lineDraft;
            return (
              <Line
                points={[start.x, start.y, current.x, current.y]}
                stroke={'#334155'}
                strokeWidth={2}
                dash={[6,4]}
                lineCap="round"
                listening={false}
              />
            );
          })()}
          {/* Curve draft preview */}
          {isCurveMode && curveDraft && curveDraft.points.length >= 1 && (() => {
            const pts: number[] = [];
            for (const p of curveDraft.points) {
              pts.push(p.x, p.y);
            }
            pts.push(curveDraft.current.x, curveDraft.current.y);
            return (
              <Line
                points={pts}
                stroke={'#334155'}
                strokeWidth={2}
                dash={[6,4]}
                lineCap="round"
                tension={0.5}
                listening={false}
              />
            );
          })()}
          
          {/* Curve control point handles (when a curve is selected) */}
          {isSelectMode && selected.length === 1 && (() => {
            const curveNode = selectionContext.nodeById[selected[0]];
            if (!curveNode || curveNode.type !== 'curve') return null;
            
            const curveX = curveNode.position?.x ?? 0;
            const curveY = curveNode.position?.y ?? 0;
            const pts = curveNode.points as number[];
            
            // Extract control points from the points array
            // points are stored as [x1, y1, x2, y2, x3, y3, ...] pairs
            const controlPoints: Array<{ x: number; y: number; index: number }> = [];
            for (let i = 0; i < pts.length; i += 2) {
              controlPoints.push({ x: pts[i] + curveX, y: pts[i + 1] + curveY, index: i });
            }
            
            return (
              <Group listening={!curveNode.locked}>
                {/* Lines connecting control points */}
                {controlPoints.length >= 2 && controlPoints.map((cp, idx) => {
                  if (idx === controlPoints.length - 1) return null;
                  const next = controlPoints[idx + 1];
                  return (
                    <Line
                      key={`curve-line-${curveNode.id}-${idx}`}
                      points={[cp.x, cp.y, next.x, next.y]}
                      stroke="rgba(59, 130, 246, 0.5)"
                      strokeWidth={1 / scale}
                      dash={[4 / scale, 4 / scale]}
                      listening={false}
                    />
                  );
                })}
                {/* Control point circles */}
                {controlPoints.map((cp, idx) => {
                  const isEndpoint = idx === 0 || idx === controlPoints.length - 1;
                  return (
                    <Circle
                      key={`curve-handle-${curveNode.id}-${idx}`}
                      x={cp.x}
                      y={cp.y}
                      radius={isEndpoint ? 6 / scale : 5 / scale}
                      fill={isEndpoint ? '#3b82f6' : 'white'}
                      stroke="#3b82f6"
                      strokeWidth={2 / scale}
                      draggable={!curveNode.locked}
                      onDragMove={(e) => {
                        const newX = e.target.x() - curveX;
                        const newY = e.target.y() - curveY;
                        
                        // Update the curve points
                        const newPoints = [...pts];
                        newPoints[cp.index] = newX;
                        newPoints[cp.index + 1] = newY;
                        
                        setSpec(prev => ({
                          ...prev,
                          root: mapNode<FrameNode>(prev.root, curveNode.id, (n) => {
                            if (n.type !== 'curve') return n;
                            return { ...n, points: newPoints };
                          })
                        }));
                      }}
                      onMouseEnter={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'move';
                      }}
                      onMouseLeave={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'default';
                      }}
                    />
                  );
                })}
              </Group>
            );
          })()}
        </Layer>
      </Stage>
      
      {/* Inline Text Editing Overlay */}
      {editingTextId && (() => {
        const textNode = findNode(spec.root, editingTextId) as TextNode | null;
        if (!textNode) return null;
        
        const baseStyles = {
          fontFamily: textNode.fontFamily || 'Arial',
          fontSize: (textNode.fontSize ?? 14) * scale,
          fontWeight: textNode.fontWeight || '400',
          fontStyle: textNode.fontStyle || 'normal',
          color: textNode.color ?? '#0f172a',
        };
        
        // Calculate toolbar anchor position (center of text node)
        const worldPos = getNodeWorldPosition(editingTextId) ?? { x: 0, y: 0 };
        const textX = worldPos.x * scale + pos.x;
        const textY = worldPos.y * scale + pos.y;
        const textWidth = (textNode.size?.width ?? 200) * scale;
        const toolbarAnchor = { x: textX + textWidth / 2, y: textY };
        
        return (
          <>
            {/* Fixed toolbar above text */}
            <TextEditToolbar
              visible={!!(textSelection && textSelection.start !== textSelection.end)}
              anchorPosition={toolbarAnchor}
              hasSelection={!!(textSelection && textSelection.start !== textSelection.end)}
              currentFormat={undefined}
              onApplyFormat={applyFormat}
            />
            <RichTextEditor
              ref={richTextEditorRef}
              autoFocus
              commitOnBlur={false}
              value={editingTextValue}
              spans={editingTextSpans}
              baseStyles={baseStyles}
              onChange={handleTextChange}
              onCommit={commitTextEdit}
              onCancel={cancelTextEdit}
              onSelectionChange={(sel) => {
                setTextSelection(sel);
              }}
              onFormatShortcut={(format) => {
                if (!richTextEditorRef.current) return;
                const sel = richTextEditorRef.current.getSelection();
                if (!sel || sel.start === sel.end) return;
                
                if (format === 'bold') {
                  richTextEditorRef.current.applyFormatToSelection({ fontWeight: 'bold' });
                } else if (format === 'italic') {
                  richTextEditorRef.current.applyFormatToSelection({ fontStyle: 'italic' });
                }
              }}
              style={getTextEditStyle() || undefined}
              className="focus:outline-none selection:bg-blue-200"
            />
          </>
        );
      })()}
      
      {/* Context Menu */}
      {menu && isSelectMode && (
        <div 
          ref={(el) => {
            // Adjust position if menu extends past viewport
            if (el) {
              const rect = el.getBoundingClientRect();
              const viewportHeight = window.innerHeight;
              const viewportWidth = window.innerWidth;
              if (rect.bottom > viewportHeight - 10) {
                el.style.top = `${menu.y - (rect.bottom - viewportHeight) - 20}px`;
              }
              if (rect.right > viewportWidth - 10) {
                el.style.left = `${menu.x - (rect.right - viewportWidth) - 20}px`;
              }
            }
          }}
          style={{ position: 'absolute', left: menu.x, top: menu.y, pointerEvents: 'auto', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}
          className="z-50 text-xs bg-white border border-gray-300 rounded shadow-md select-none min-w-40"
        >
          {/* Layer ordering actions (true sibling reordering) */}
          {selected.length > 0 && (
            (() => {
              // Build map parentId -> list of child ids selected
              const parentMap: Record<string, string[]> = {};
              for (const id of selected) {
                const p = selectionContext.parentOf[id];
                if (p) {
                  parentMap[p] = parentMap[p] ? [...parentMap[p], id] : [id];
                }
              }
              const applyReorder = (mode: 'forward'|'lower'|'top'|'bottom') => {
                setSpec(prev => {
                  const nextRoot = (function walk(n: LayoutNode): LayoutNode {
                    if (!nodeHasChildren(n)) return n;
                    const children = n.children;
                    if (parentMap[n.id] && children.length > 0) {
                      const selectedChildren = new Set(parentMap[n.id]);
                      let newChildren = children.slice();
                      if (mode === 'forward') {
                        for (let i = newChildren.length - 2; i >= 0; i--) {
                          if (selectedChildren.has(newChildren[i].id) && !selectedChildren.has(newChildren[i + 1].id)) {
                            const tmp = newChildren[i + 1];
                            newChildren[i + 1] = newChildren[i];
                            newChildren[i] = tmp;
                          }
                        }
                      } else if (mode === 'lower') {
                        for (let i = 1; i < newChildren.length; i++) {
                          if (selectedChildren.has(newChildren[i].id) && !selectedChildren.has(newChildren[i - 1].id)) {
                            const tmp = newChildren[i - 1];
                            newChildren[i - 1] = newChildren[i];
                            newChildren[i] = tmp;
                          }
                        }
                      } else if (mode === 'top') {
                        const moving = newChildren.filter((c) => selectedChildren.has(c.id));
                        const staying = newChildren.filter((c) => !selectedChildren.has(c.id));
                        newChildren = [...staying, ...moving];
                      } else if (mode === 'bottom') {
                        const moving = newChildren.filter((c) => selectedChildren.has(c.id));
                        const staying = newChildren.filter((c) => !selectedChildren.has(c.id));
                        newChildren = [...moving, ...staying];
                      }
                      n = { ...n, children: newChildren.map((c) => walk(c)) };
                      return n;
                    }
                    if (children.length > 0) {
                      return { ...n, children: children.map((c) => walk(c)) };
                    }
                    return n;
                  })(prev.root);
                  return {
                    ...prev,
                    root: nextRoot as FrameNode
                  };
                });
                setMenu(null);
              };
              return (
                <>
                  <button onClick={() => applyReorder('forward')} className="px-3 py-1.5 w-full text-left hover:bg-gray-100">Move Forward</button>
                  <button onClick={() => applyReorder('top')} className="px-3 py-1.5 w-full text-left hover:bg-gray-100">Move To Top</button>
                  <button onClick={() => applyReorder('lower')} className="px-3 py-1.5 w-full text-left hover:bg-gray-100">Move Lower</button>
                  <button onClick={() => applyReorder('bottom')} className="px-3 py-1.5 w-full text-left hover:bg-gray-100">Move To Bottom</button>
                  <div className="h-px bg-gray-200 my-1" />
                </>
              );
            })()
          )}
          <button
            disabled={selected.length === 0}
            onClick={() => {
              if (selected.length === 0) return;
              const nodes = selected.map(id => findNode(spec.root, id)).filter(Boolean) as LayoutNode[];
              if (nodes.length > 0) {
                clipboardRef.current = nodes.map(n => cloneNode(n));
                pasteOffsetRef.current = 0;
              }
              setMenu(null);
            }}
            className={`px-3 py-1.5 w-full text-left ${selected.length > 0 ? 'hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
          >
            Copy
          </button>
          <button
            disabled={!clipboardRef.current || clipboardRef.current.length === 0}
            onClick={() => {
              if (!clipboardRef.current || clipboardRef.current.length === 0) return;
              const offset = 16 * (pasteOffsetRef.current + 1);
              const existing = collectExistingIds(spec.root as LayoutNode);
              const makeId = createUniqueIdFactory(existing);
              const clones = clipboardRef.current.map(n => remapIdsAndOffset(cloneNode(n), { x: offset, y: offset }, makeId));
              setSpec(prev => appendNodesToRoot(prev, clones));
              setSelection(clones.map(n => n.id));
              pasteOffsetRef.current += 1;
              setMenu(null);
            }}
            className={`px-3 py-1.5 w-full text-left ${clipboardRef.current && clipboardRef.current.length > 0 ? 'hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
          >
            Paste
          </button>
          <div className="h-px bg-gray-200 my-1" />
          <button 
            disabled={!canGroup}
            onClick={() => { if (canGroup) performGroup(); else setMenu(null); }}
            className={`px-3 py-1.5 w-full text-left ${canGroup ? 'hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
          >
            Group Selection
          </button>
          <button 
            disabled={!canUngroup}
            onClick={() => { if (canUngroup) performUngroup(); else setMenu(null); }}
            className={`px-3 py-1.5 w-full text-left ${canUngroup ? 'hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
          >
            Ungroup
          </button>
          {/* Re-enable aspect for stretched image(s) */}
          {selected.length > 0 && (() => {
            const anyStretch = selected.some(id => {
              const node = selectionContext.nodeById[id];
              return node?.type === 'image' && node.preserveAspect === false;
            });
            return anyStretch;
          })() && (
            <button
              onClick={() => {
                setSpec(prev => ({
                  ...prev,
                  root: mapNode<FrameNode>(prev.root, '__bulk__', (n) => n)
                }));
                setSpec(prev => {
                  const mapAll = <T extends LayoutNode>(n: T): T => {
                    if (selected.includes(n.id) && n.type === 'image' && n.preserveAspect === false) {
                      return { ...n, preserveAspect: true, objectFit: n.objectFit || 'contain' } as T;
                    }
                    if (nodeHasChildren(n)) {
                      const mappedChildren = n.children.map((child) => mapAll(child));
                      return { ...n, children: mappedChildren } as T;
                    }
                    return n;
                  };
                  const nextRoot = mapAll(prev.root);
                  return {
                    ...prev,
                    root: nextRoot
                  };
                });
                setMenu(null);
              }}
              className="px-3 py-1.5 w-full text-left hover:bg-gray-100"
            >
              Re-enable Aspect
            </button>
          )}
          {/* Reset Text Scale (only if any selected text node has scale !=1) */}
          {selected.length > 0 && (() => {
            const anyScaled = selected.some(id => {
              const node = selectionContext.nodeById[id];
              return node?.type === 'text' && ((node.textScaleX && Math.abs(node.textScaleX - 1) > 0.001) || (node.textScaleY && Math.abs(node.textScaleY - 1) > 0.001));
            });
            return anyScaled;
          })() && (
            <button
              onClick={() => {
                setSpec(prev => {
                  const mapAll = <T extends LayoutNode>(n: T): T => {
                    if (selected.includes(n.id) && n.type === 'text') {
                      return { ...n, textScaleX: 1, textScaleY: 1 } as T;
                    }
                    if (nodeHasChildren(n)) {
                      const mappedChildren = n.children.map((child) => mapAll(child));
                      return { ...n, children: mappedChildren } as T;
                    }
                    return n;
                  };
                  const nextRoot = mapAll(prev.root);
                  return {
                    ...prev,
                    root: nextRoot
                  };
                });
                setMenu(null);
              }}
              className="px-3 py-1.5 w-full text-left hover:bg-gray-100"
            >Reset Text Scale</button>
          )}
          {/* Delete */}
          {selected.length > 0 && (
            <button
              onClick={() => {
                setSpec(prev => deleteNodes(prev, new Set(selected)));
                setSelection([]);
                setMenu(null);
              }}
              className="px-3 py-1.5 w-full text-left hover:bg-red-50 text-red-600"
            >Delete</button>
          )}
          <div className="h-px bg-gray-200 my-1" />
          {/* Lock/Unlock */}
          {selected.length > 0 && (() => {
            const anyLocked = selected.some(id => selectionContext.nodeById[id]?.locked === true);
            const anyUnlocked = selected.some(id => selectionContext.nodeById[id]?.locked !== true);
            return (
              <>
                {anyUnlocked && (
                  <button
                    onClick={() => {
                      const lockedIds = [...selected];
                      setSpec(prev => {
                        const mapAll = <T extends LayoutNode>(n: T): T => {
                          if (lockedIds.includes(n.id)) {
                            return { ...n, locked: true } as T;
                          }
                          if (nodeHasChildren(n)) {
                            const mappedChildren = n.children.map((child) => mapAll(child));
                            return { ...n, children: mappedChildren } as T;
                          }
                          return n;
                        };
                        const nextRoot = mapAll(prev.root);
                        return { ...prev, root: nextRoot };
                      });
                      // Clear selection so the locked state takes effect immediately
                      setSelection([]);
                      setMenu(null);
                    }}
                    className="px-3 py-1.5 w-full text-left hover:bg-gray-100 flex items-center gap-2"
                  >
                    <i className="fa-solid fa-lock text-gray-400 w-4" />
                    Lock
                  </button>
                )}
                {anyLocked && (
                  <button
                    onClick={() => {
                      setSpec(prev => {
                        const mapAll = <T extends LayoutNode>(n: T): T => {
                          if (selected.includes(n.id)) {
                            return { ...n, locked: false } as T;
                          }
                          if (nodeHasChildren(n)) {
                            const mappedChildren = n.children.map((child) => mapAll(child));
                            return { ...n, children: mappedChildren } as T;
                          }
                          return n;
                        };
                        const nextRoot = mapAll(prev.root);
                        return { ...prev, root: nextRoot };
                      });
                      setMenu(null);
                    }}
                    className="px-3 py-1.5 w-full text-left hover:bg-gray-100 flex items-center gap-2"
                  >
                    <i className="fa-solid fa-lock-open text-gray-400 w-4" />
                    Unlock
                  </button>
                )}
                <div className="h-px bg-gray-200 my-1" />
              </>
            );
          })()}
          <button 
            onClick={() => setMenu(null)} 
            className="px-3 py-1.5 hover:bg-gray-100 w-full text-left text-gray-500"
          >
            Close
          </button>
        </div>
      )}
      
      {/* Image Picker Modal */}
      <ImagePickerModal
        isOpen={imagePickerOpen}
        onClose={handleImagePickerClose}
        onImageSelected={handleImageSelected}
      />
    </div>
  );
}

export default CanvasStage;