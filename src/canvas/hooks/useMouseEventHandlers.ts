import { useCallback } from 'react';
import type Konva from 'konva';
import type { LayoutSpec, LayoutNode, TextNode } from '../../layout-schema';
import { computeClickSelection, computeMarqueeSelection } from '../../renderer/interaction';
import { beginDrag, updateDrag, finalizeDrag } from '../../interaction/drag';
import type { DragSession } from '../../interaction/types';
import { beginMarquee, updateMarquee, finalizeMarquee, type MarqueeSession } from '../../interaction/marquee';
import { applyPosition } from '../stage-internal';
import { nodeHasChildren } from '../../commands/types';

interface DraftState {
  start: { x: number; y: number };
  current: { x: number; y: number };
}

interface CurveDraftState {
  points: { x: number; y: number }[];
  current: { x: number; y: number };
}

interface UseMouseEventHandlersProps {
  // Tool state
  tool?: string;
  blockCanvasClicksRef?: React.MutableRefObject<boolean>;
  
  // Spec and selection
  spec: LayoutSpec;
  setSpec: (spec: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void;
  selection: string[];
  setSelection: (ids: string[]) => void;
  
  // Viewport state
  scale: number;
  setScale: (scale: number) => void;
  setPos: (pos: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  
  // Draft states
  rectDraft: DraftState | null;
  setRectDraft: (draft: DraftState | null | ((prev: DraftState | null) => DraftState | null)) => void;
  ellipseDraft: DraftState | null;
  setEllipseDraft: (draft: DraftState | null | ((prev: DraftState | null) => DraftState | null)) => void;
  lineDraft: DraftState | null;
  setLineDraft: (draft: DraftState | null | ((prev: DraftState | null) => DraftState | null)) => void;
  curveDraft: CurveDraftState | null;
  setCurveDraft: (draft: CurveDraftState | null | ((prev: CurveDraftState | null) => CurveDraftState | null)) => void;
  polygonDraft: DraftState | null;
  setPolygonDraft: (draft: DraftState | null | ((prev: DraftState | null) => DraftState | null)) => void;
  polygonSides: number;
  setPolygonSides: (sides: number) => void;
  
  // Interaction sessions
  dragSession: DragSession | null;
  setDragSession: (session: DragSession | null) => void;
  marqueeSession: MarqueeSession | null;
  setMarqueeSession: (session: MarqueeSession | null) => void;
  panning: boolean;
  setPanning: (panning: boolean) => void;
  panLastPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  spacePan: boolean;
  
  // Refs and utilities
  trRef: React.RefObject<Konva.Transformer | null>;
  marqueeRectRef: React.RefObject<Konva.Rect | null>;
  toWorld: (stage: Konva.Stage, p: { x: number; y: number }) => { x: number; y: number };
  getTopContainerAncestor: (stage: Konva.Stage, id: string) => string;
  normalizeSelection: (ids: string[]) => string[];
  isTransformerTarget: (target: Konva.Node | null) => boolean;
  
  // Tool creation callbacks
  createImage: (worldPos: { x: number; y: number }) => void;
  createIcon: (worldPos: { x: number; y: number }) => void;
  createComponent: (worldPos: { x: number; y: number }) => void;
  finalizeRect: () => void;
  finalizeEllipse: () => void;
  finalizeLine: () => void;
  finalizeCurve: () => void;
  finalizePolygon: () => void;
  
  // Text editing
  startTextEdit: (id: string, node: TextNode) => void;
  justStartedTextEditRef: React.MutableRefObject<boolean>;
  
  // Callbacks
  onToolChange?: (tool: string) => void;
  setMenu: (menu: { x: number; y: number } | null) => void;
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

export function useMouseEventHandlers(props: UseMouseEventHandlersProps) {
  const {
    tool = 'select',
    blockCanvasClicksRef,
    spec,
    setSpec,
    selection,
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
    getTopContainerAncestor,
    normalizeSelection,
    isTransformerTarget,
    createImage,
    createIcon,
    createComponent,
    finalizeRect,
    finalizeEllipse,
    finalizeLine,
    // @ts-ignore - finalizeCurve and finalizePolygon are used via callback props
    finalizeCurve,
    // @ts-ignore
    finalizePolygon,
    startTextEdit,
    justStartedTextEditRef,
    onToolChange,
    setMenu,
  } = props;

  // Tool mode flags
  const isSelectMode = tool === "select";
  const isRectMode = tool === 'rect';
  const isPanMode = tool === 'pan';
  const isZoomMode = tool === 'zoom';
  const isEllipseMode = tool === 'ellipse';
  const isLineMode = tool === 'line';
  const isCurveMode = tool === 'curve';
  const isPolygonMode = tool === 'polygon';
  const isTextMode = tool === 'text';
  const isImageMode = tool === 'image';
  const isIconMode = tool === 'icon';
  const isComponentMode = tool === 'component';

  const onMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Block canvas interactions if requested (e.g., when selecting from attribute panel)
    if (blockCanvasClicksRef?.current) {
      return;
    }
    
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
    
    // Polygon tool creation pathway - drag to create regular polygon
    if (isPolygonMode) {
      if (e.evt.button !== 0) return;
      const stage = e.target.getStage(); if (!stage) return;
      const pointer = stage.getPointerPosition(); if (!pointer) return;
      const world = toWorld(stage, pointer);
      setPolygonDraft({ start: world, current: world });
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
      startTextEdit(id, placeholderText);

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
        
        const newSelection = computeClickSelection({ current: selection, clickedId: nodeId, isMultiModifier: isShiftClick });
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
    setMarqueeSession(beginMarquee(worldPos, selection, e.evt.shiftKey || e.evt.ctrlKey));
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
    selection,
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
    blockCanvasClicksRef,
    setRectDraft,
    setEllipseDraft,
    setLineDraft,
    setCurveDraft,
    setScale,
    setPos,
    setPanning,
    panLastPosRef,
    setDragSession,
    setMarqueeSession,
    setMenu,
    startTextEdit,
    justStartedTextEditRef,
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
    
    if (isPolygonMode) {
      if (!polygonDraft) return;
      const pointer = stage.getPointerPosition(); if (!pointer) return;
      const worldPos = toWorld(stage, pointer);
      setPolygonDraft(prev => prev ? { ...prev, current: worldPos } : prev);
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
  }, [
    isSelectMode,
    isPanMode,
    panning,
    toWorld,
    dragSession,
    marqueeSession,
    isRectMode,
    rectDraft,
    isEllipseMode,
    ellipseDraft,
    isLineMode,
    lineDraft,
    isCurveMode,
    curveDraft,
    setRectDraft,
    setEllipseDraft,
    setLineDraft,
    setCurveDraft,
    panLastPosRef,
    setPos,
    setDragSession,
    trRef,
    setMarqueeSession,
    marqueeRectRef,
  ]);

  const onMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    // Finalize rectangle creation
    if (isRectMode && rectDraft) { finalizeRect(); return; }
    
    // Finalize ellipse creation
    if (isEllipseMode && ellipseDraft) { finalizeEllipse(); return; }
    
    // Finalize line creation
    if (isLineMode && lineDraft) { finalizeLine(); return; }
    
    // Finalize polygon creation
    if (isPolygonMode && polygonDraft) { finalizePolygon(); return; }
    
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
    setPanning,
    panLastPosRef,
    setDragSession,
    setMarqueeSession,
    marqueeRectRef,
  ]);

  return {
    onMouseDown,
    onMouseMove,
    onMouseUp,
  };
}
