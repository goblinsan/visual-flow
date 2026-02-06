import { Stage, Layer, Transformer, Rect, Group, Circle } from "react-konva";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import type Konva from "konva";
import type { LayoutNode, LayoutSpec, TextNode } from "../layout-schema.ts";
import { renderNode, useFontLoading } from "./CanvasRenderer.tsx";
import type { DragSession } from "../interaction/types";
import type { MarqueeSession } from "../interaction/marquee";
import { applyPosition, groupNodes, ungroupNodes } from "./stage-internal";
import { nodeHasChildren } from "../commands/types";
import { ImagePickerModal } from "../components/ImagePickerModal";
import { DraftPreviewLayer } from "./DraftPreviewLayer";
import { TextEditingOverlay } from "./TextEditingOverlay";
import { useShapeTools } from "./hooks/useShapeTools";
import { useViewportManager } from "./hooks/useViewportManager";
import { useSelectionManager } from "./hooks/useSelectionManager";
import { useTransformManager } from "./hooks/useTransformManager";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useTextEditing } from "./hooks/useTextEditing";
import { useMouseEventHandlers } from "./hooks/useMouseEventHandlers";
import { ContextMenu } from "./components/ContextMenu";
import { CurveControlPointsLayer } from "./components/CurveControlPointsLayer";
import {
  findNode,
  getNodeBounds,
  getNodeWorldPosition,
  collectExistingIds,
  createUniqueIdFactory,
  cloneNode,
  remapIdsAndOffset,
  toWorld,
  getTopContainerAncestor,
  isTransformerTarget,
  buildSelectionContext,
} from "./utils/canvasUtils";
import {
  appendNodesToRoot,
  createIcon,
  createComponent,
  createImageNode,
} from "./utils/iconComponentUtils";
import { setupGlobalDraftListeners, setupEscapeCancelListener } from "./utils/draftUtils";

// Grid configuration
const GRID_SPACING = 20; // Space between dots
const DOT_RADIUS = 1.5; // Radius of each dot
const DOT_COLOR = 'rgba(255, 255, 255, 0.5)'; // Whitish dots
const GRID_BG_COLOR = '#e5e7eb'; // Light gray background (Tailwind gray-200)
const CAPTURE_OPTIONS: AddEventListenerOptions = { capture: true };

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
  selectedCurvePointIndex?: number | null;
  setSelectedCurvePointIndex?: (index: number | null) => void;
  editingCurveId?: string | null;
  onEditingCurveIdChange?: (id: string | null) => void;
  blockCanvasClicksRef?: React.MutableRefObject<boolean>;
  skipNormalizationRef?: React.MutableRefObject<boolean>; // Skip selection normalization (for nested group editing)
  fitToContentKey?: number; // Increment to trigger fit-to-content
  viewportTransition?: {
    targetId: string;
    durationMs?: number;
    easing?: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";
    _key?: string;
  } | null;
  onViewportChange?: (viewport: { scale: number; x: number; y: number }) => void; // For collaboration overlays
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

function CanvasStage({ 
  spec, setSpec, width = 800, height = 600, tool = "select", onToolChange, selectedIconId, selectedComponentId, 
  onUndo, onRedo, focusNodeId, onUngroup, rectDefaults, selection, setSelection, selectedCurvePointIndex, setSelectedCurvePointIndex, 
  editingCurveId: propsEditingCurveId, onEditingCurveIdChange,
  blockCanvasClicksRef, skipNormalizationRef,
  fitToContentKey, viewportTransition, onViewportChange 
}: CanvasStageProps) {
  // View / interaction state
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const panLastPosRef = useRef<{ x: number; y: number } | null>(null);
  const selected = selection;
  const [menu, setMenu] = useState<null | { x: number; y: number }>(null);
  
  // Notify parent of viewport changes (for collaboration overlays)
  useEffect(() => {
    if (onViewportChange) {
      onViewportChange({ scale, x: pos.x, y: pos.y });
    }
  }, [scale, pos.x, pos.y, onViewportChange]);
  
  // Font loading - triggers re-render when fonts finish loading
  useFontLoading();
  
  // Interaction state
  // Drag interaction session (Milestone 1 pure helper integration)
  const [dragSession, setDragSession] = useState<DragSession | null>(null);

  // Marquee session (pure helper based)
  const [marqueeSession, setMarqueeSession] = useState<MarqueeSession | null>(null);

  // justStartedTextEditRef tracks if text editing just started to prevent immediate commit
  const justStartedTextEditRef = useRef(false);
  
  // Curve editing mode - use external state if provided, otherwise use internal
  const editingCurveId = propsEditingCurveId !== undefined ? propsEditingCurveId : null;
  const setEditingCurveId = useCallback((id: string | null) => {
    if (onEditingCurveIdChange) {
      onEditingCurveIdChange(id);
    }
  }, [onEditingCurveIdChange]);

  // Use viewport manager hook
  useViewportManager(
    width,
    height,
    scale,
    setScale,
    pos,
    setPos,
    spec,
    useCallback((node: LayoutNode) => getNodeBounds(node, 0, 0), []),
    viewportTransition,
    onViewportChange,
    fitToContentKey
  );

  const getNodeWorldPositionMemo = useCallback((nodeId: string) => getNodeWorldPosition(spec.root, nodeId), [spec.root]);

  const findNodeMemo = useCallback((root: LayoutNode, targetId: string) => findNode(root, targetId), []);

  // Image picker state
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [pendingImagePosition, setPendingImagePosition] = useState<{ x: number; y: number } | null>(null);

  const isSelectMode = tool === "select";
  const isRectMode = tool === 'rect';
  const isEllipseMode = tool === 'ellipse';
  const isLineMode = tool === 'line';
  const isCurveMode = tool === 'curve';
  const isPolygonMode = tool === 'polygon';
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
  }, [focusNodeId, spec.root, width, height]);

  // Build selection context
  const selectionContext = useMemo(() => buildSelectionContext(spec.root), [spec]);

  // Get top container ancestor for selection promotion - memoize with current rootId
  const getTopContainerAncestorMemo = useCallback(
    (stage: Konva.Stage, id: string) => getTopContainerAncestor(stage, id, spec.root.id),
    [spec.root.id]
  );

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
  
  // Polygon draft state (drag to create like rect/ellipse)
  const [polygonDraft, setPolygonDraft] = useState<null | {
    start: { x: number; y: number };
    current: { x: number; y: number };
  }>(null);
  
  // Polygon sides (adjustable with mouse wheel during creation)
  const [polygonSides, setPolygonSides] = useState(5);

  // Use shape tools hook
  const shapeTools = useShapeTools(setSpec, setSelection, onToolChange, rectDefaults, undefined, undefined, undefined);

  // Use selection manager hook
  const selectionManager = useSelectionManager(stageRef, spec.root.id, getTopContainerAncestorMemo);
  const normalizeSelection = selectionManager.normalizeSelection;

  // Use transform manager hook
  const transformManager = useTransformManager(trRef, spec, setSpec, selected, findNodeMemo);
  const { onTransform, onTransformEnd } = transformManager;

  // Use text editing hook
  const textEditingHook = useTextEditing({
    spec,
    setSpec,
    onToolChange,
    setSelection,
    findNode: findNodeMemo,
    getNodeWorldPosition: getNodeWorldPositionMemo,
    stageRef,
    wrapperRef,
    scale,
    pos,
  });
  const {
    editingTextId,
    editingTextValue,
    editingTextSpans,
    textSelection,
    richTextEditorRef,
    startTextEdit,
    commitTextEdit,
    cancelTextEdit,
    handleTextChange,
    applyFormat,
    setTextSelection,
    getTextEditStyle,
  } = textEditingHook;

  // Wrap shape finalization functions to handle draft state
  const finalizeRect = useCallback(() => {
    if (!isRectMode || !rectDraft) return;
    shapeTools.finalizeRect(rectDraft, altPressed, shiftPressed);
    setRectDraft(null);
  }, [isRectMode, rectDraft, altPressed, shiftPressed, shapeTools]);

  const finalizeEllipse = useCallback(() => {
    if (!isEllipseMode || !ellipseDraft) return;
    shapeTools.finalizeEllipse(ellipseDraft, altPressed, shiftPressed);
    setEllipseDraft(null);
  }, [isEllipseMode, ellipseDraft, altPressed, shiftPressed, shapeTools]);

  const finalizeLine = useCallback(() => {
    if (!isLineMode || !lineDraft) return;
    shapeTools.finalizeLine(lineDraft);
    setLineDraft(null);
  }, [isLineMode, lineDraft, shapeTools]);

  const finalizeCurve = useCallback(() => {
    if (!isCurveMode || !curveDraft) return;
    shapeTools.finalizeCurve(curveDraft);
    setCurveDraft(null);
  }, [isCurveMode, curveDraft, shapeTools]);

  const finalizePolygon = useCallback(() => {
    if (!isPolygonMode || !polygonDraft) return;
    shapeTools.finalizePolygon(polygonDraft, altPressed, shiftPressed, polygonSides);
    setPolygonDraft(null);
  }, [isPolygonMode, polygonDraft, shapeTools, altPressed, shiftPressed, polygonSides]);

  // Helper: open image picker at click position
  const createImage = useCallback((worldPos: { x: number; y: number }) => {
    setPendingImagePosition(worldPos);
    setImagePickerOpen(true);
  }, []);

  const createIconAtPosition = useCallback((worldPos: { x: number; y: number }) => {
    const iconNode = createIcon(worldPos, selectedIconId);
    if (!iconNode) return;
    setSpec(prev => appendNodesToRoot(prev, [iconNode]));
    setSelection([iconNode.id]);
    onToolChange?.('select');
  }, [selectedIconId, setSelection, setSpec, onToolChange]);

  const createComponentAtPosition = useCallback((worldPos: { x: number; y: number }) => {
    const groupNode = createComponent(worldPos, spec.root, selectedComponentId);
    if (!groupNode) return;
    setSpec(prev => appendNodesToRoot(prev, [groupNode]));
    setSelection([groupNode.id]);
    onToolChange?.('select');
  }, [selectedComponentId, setSelection, setSpec, spec.root, onToolChange]);

  // Actually insert the image after picker selection
  const handleImageSelected = useCallback((src: string, width: number, height: number) => {
    if (!pendingImagePosition) return;
    const imageNode = createImageNode(pendingImagePosition, src, width, height);
    setSpec(prev => appendNodesToRoot(prev, [imageNode]));
    setSelection([imageNode.id]);
    onToolChange?.('select');
    setImagePickerOpen(false);
    setPendingImagePosition(null);
  }, [pendingImagePosition, setSpec, onToolChange, setSelection]);

  const handleImagePickerClose = useCallback(() => {
    setImagePickerOpen(false);
    setPendingImagePosition(null);
    onToolChange?.('select');
  }, [onToolChange]);

  // Use mouse event handlers hook
  const mouseHandlers = useMouseEventHandlers({
    tool,
    blockCanvasClicksRef,
    spec,
    setSpec,
    selection: selected,
    setSelection,
    scale,
    setScale,
    setPos,
    rectDraft,
    setRectDraft,
    ellipseDraft,
    setEllipseDraft,
    lineDraft,
    setLineDraft,
    curveDraft,
    setCurveDraft,
    polygonDraft,
    setPolygonDraft,
    polygonSides,
    setPolygonSides,
    dragSession,
    setDragSession,
    marqueeSession,
    setMarqueeSession,
    panning,
    setPanning,
    panLastPosRef,
    spacePan,
    trRef,
    marqueeRectRef,
    toWorld,
    getTopContainerAncestor: getTopContainerAncestorMemo,
    normalizeSelection,
    isTransformerTarget,
    createImage,
    createIcon: createIconAtPosition,
    createComponent: createComponentAtPosition,
    finalizeRect,
    finalizeEllipse,
    finalizeLine,
    finalizeCurve,
    finalizePolygon,
    startTextEdit,
    justStartedTextEditRef,
    onToolChange,
    setMenu,
  });

  const { onMouseDown, onMouseMove, onMouseUp } = mouseHandlers;

  // Global listeners for rectangle draft (supports dragging outside stage bounds)
  useEffect(() => {
    if (!isRectMode || !rectDraft) return;
    return setupGlobalDraftListeners(stageRef, setRectDraft, finalizeRect);
  }, [isRectMode, rectDraft, finalizeRect]);

  // Cancel rectangle draft with Escape
  useEffect(() => {
    if (!isRectMode || !rectDraft) return;
    return setupEscapeCancelListener(setRectDraft, CAPTURE_OPTIONS);
  }, [isRectMode, rectDraft]);

  // Global listeners for ellipse draft
  useEffect(() => {
    if (!isEllipseMode || !ellipseDraft) return;
    return setupGlobalDraftListeners(stageRef, setEllipseDraft, finalizeEllipse);
  }, [isEllipseMode, ellipseDraft, finalizeEllipse]);

  // Cancel ellipse draft with Escape
  useEffect(() => {
    if (!isEllipseMode || !ellipseDraft) return;
    return setupEscapeCancelListener(setEllipseDraft, CAPTURE_OPTIONS);
  }, [isEllipseMode, ellipseDraft]);

  // Global listeners for line draft
  useEffect(() => {
    if (!isLineMode || !lineDraft) return;
    return setupGlobalDraftListeners(stageRef, setLineDraft, finalizeLine);
  }, [isLineMode, lineDraft, finalizeLine]);

  // Cancel line draft with Escape
  useEffect(() => {
    if (!isLineMode || !lineDraft) return;
    return setupEscapeCancelListener(setLineDraft, CAPTURE_OPTIONS);
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

  // Polygon: finalize on Enter, cancel on Escape
  useEffect(() => {
    if (!isPolygonMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPolygonDraft(null); }
    };
    window.addEventListener('keydown', onKey, CAPTURE_OPTIONS);
    return () => window.removeEventListener('keydown', onKey, CAPTURE_OPTIONS);
  }, [isPolygonMode]);
  
  // Polygon: adjust sides with mouse wheel during creation
  useEffect(() => {
    if (!isPolygonMode || !polygonDraft) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      setPolygonSides(prev => Math.max(3, Math.min(30, prev + delta)));
    };
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', onWheel, { capture: true } as any);
  }, [isPolygonMode, polygonDraft]);

  // Curve edit mode: exit on Escape or Enter
  useEffect(() => {
    if (!editingCurveId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        setEditingCurveId(null);
        setSelectedCurvePointIndex?.(null);
      }
    };
    window.addEventListener('keydown', onKey, CAPTURE_OPTIONS);
    return () => window.removeEventListener('keydown', onKey, CAPTURE_OPTIONS);
  }, [editingCurveId, setSelectedCurvePointIndex]);

  // Double-click: finalize curve OR enter curve edit mode OR enter text editing mode
  const onDblClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Curve finalization
    if (isCurveMode && curveDraft && curveDraft.points.length >= 1) {
      finalizeCurve();
      return;
    }
    
    // Check if double-clicked on a curve - enter edit mode
    if (isSelectMode) {
      const target = e.target;
      const name = target.name?.() || '';
      let nodeId = target.id();
      
      // Check parent if target is a Line inside a curve Group
      const parent = target.getParent();
      const parentName = parent?.name?.() || '';
      const parentId = parent?.id();
      
      // Check for curve (either direct or parent)
      const checkName = name.includes('curve') ? name : parentName;
      const checkId = name.includes('curve') ? nodeId : parentId;
      
      if (checkName.includes('curve') && checkId) {
        const curveNode = findNode(spec.root, checkId);
        if (curveNode && curveNode.type === 'curve') {
          setEditingCurveId(checkId);
          setSelectedCurvePointIndex?.(null);
          return;
        }
      }
      
      // Text editing - check if double-clicked on a text node
      let isTextNode = name.includes('text');
      
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
          startTextEdit(nodeId, textNode);
        }
      }
    }
  }, [isCurveMode, curveDraft, finalizeCurve, isSelectMode, spec.root, startTextEdit, setEditingCurveId, setSelectedCurvePointIndex]);

  // Single click handler for empty canvas
  const onClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Block canvas clicks if requested (e.g., when selecting from attribute panel)
    if (blockCanvasClicksRef?.current) {
      return;
    }
    
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
        const id = getTopContainerAncestorMemo(stage, rawId);
        // Only change selection if right-clicking on an unselected item
        if (!selected.includes(id)) {
          setSelection(normalizeSelection([id]));
        }
      }
    }
    
    // Position menu at raw client coords relative to wrapper
    const rect = wrap.getBoundingClientRect();
    setMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [isSelectMode, spec.root.id, selected, getTopContainerAncestorMemo, normalizeSelection, setSelection]);

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
  useKeyboardShortcuts({
    isSelectMode,
    canGroup,
    canUngroup,
    selected,
    editingTextId,
    spec,
    setSpec,
    setSelection,
    onUndo,
    onRedo,
    performGroup,
    performUngroup,
    selectionContext,
    collectExistingIds,
    createUniqueIdFactory,
    remapIdsAndOffset,
    cloneNode,
    findNode: findNodeMemo,
    appendNodesToRoot,
  });

  // Normalize selection on changes (skip when explicitly bypassed for nested group editing)
  useEffect(() => {
    // Skip normalization when explicitly bypassed (e.g., editing nested groups)
    if (skipNormalizationRef?.current) {
      return;
    }
    if (selected.length === 0) {
      // parent controls selection; nothing to do if empty
      return;
    }
    const norm = normalizeSelection(selected);
    if (norm.length !== selected.length || norm.some((id, i) => id !== selected[i])) {
      setSelection(norm);
    }
  }, [selected, normalizeSelection, setSelection, skipNormalizationRef]);

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
          
          {isSelectMode && !editingTextId && !editingCurveId && (
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
          
          {/* Draft preview layer */}
          <DraftPreviewLayer
            isRectMode={isRectMode}
            isEllipseMode={isEllipseMode}
            isLineMode={isLineMode}
            isCurveMode={isCurveMode}
            isPolygonMode={isPolygonMode}
            rectDraft={rectDraft}
            ellipseDraft={ellipseDraft}
            lineDraft={lineDraft}
            curveDraft={curveDraft}
            polygonDraft={polygonDraft}
            polygonSides={polygonSides}
            altPressed={altPressed}
            shiftPressed={shiftPressed}
          />
          
          {/* Curve control point handles (when a curve is in edit mode OR selected) */}
          {isSelectMode && ((selected.length === 1 && editingCurveId === selected[0]) || editingCurveId) && (() => {
            const curveNode = selectionContext.nodeById[editingCurveId || selected[0]];
            if (!curveNode || curveNode.type !== 'curve') return null;
            
            return (
              <CurveControlPointsLayer
                curveNode={curveNode}
                scale={scale}
                selectedCurvePointIndex={selectedCurvePointIndex}
                setSelectedCurvePointIndex={setSelectedCurvePointIndex}
                setSpec={setSpec}
              />
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
        const worldPos = getNodeWorldPositionMemo(editingTextId) ?? { x: 0, y: 0 };
        const textX = worldPos.x * scale + pos.x;
        const textY = worldPos.y * scale + pos.y;
        const textWidth = (textNode.size?.width ?? 200) * scale;
        const toolbarAnchor = { x: textX + textWidth / 2, y: textY };
        
        return (
          <TextEditingOverlay
            visible={true}
            editingTextValue={editingTextValue}
            editingTextSpans={editingTextSpans}
            baseStyles={baseStyles}
            textEditStyle={getTextEditStyle()}
            textSelection={textSelection}
            toolbarAnchorPosition={toolbarAnchor}
            richTextEditorRef={richTextEditorRef}
            onChange={handleTextChange}
            onCommit={commitTextEdit}
            onCancel={cancelTextEdit}
            onSelectionChange={setTextSelection}
            onApplyFormat={applyFormat}
          />
        );
      })()}
      
      {/* Context Menu */}
      {isSelectMode && (
        <ContextMenu
          menu={menu}
          onClose={() => setMenu(null)}
          selected={selected}
          selectionContext={selectionContext}
          spec={spec}
          setSpec={setSpec}
          setSelection={setSelection}
          canGroup={canGroup}
          canUngroup={canUngroup}
          performGroup={performGroup}
          performUngroup={performUngroup}
          findNode={findNode}
          cloneNode={cloneNode}
          collectExistingIds={collectExistingIds}
          createUniqueIdFactory={createUniqueIdFactory}
          remapIdsAndOffset={remapIdsAndOffset}
        />
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