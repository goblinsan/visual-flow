import { Stage, Layer, Transformer, Rect, Group } from "react-konva";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import type { LayoutSpec } from "../layout-schema.ts";
import { renderNode } from "./CanvasRenderer.tsx";
import { deleteNodes, duplicateNodes, nudgeNodes } from "./editing";
import { applyPosition, applyPositionAndSize, groupNodes, ungroupNodes } from "./stage-internal";

// Props
interface CanvasStageProps {
  spec: LayoutSpec;
  setSpec: (spec: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void;
  width?: number;
  height?: number;
  tool?: string;
  onToolChange?: (tool: string) => void; // allow CanvasStage to request tool mode changes (e.g., after shape creation)
}

function CanvasStage({ spec, setSpec, width = 800, height = 600, tool = "select", onToolChange }: CanvasStageProps) {
  // View / interaction state
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [menu, setMenu] = useState<null | { x: number; y: number }>(null);
  
  // Interaction state
  const [dragState, setDragState] = useState<{
    active: boolean;
    startPoint: { x: number; y: number } | null;
    threshold: number;
    hasPassedThreshold: boolean;
    nodeIds: string[];
    initialPositions: Record<string, { x: number; y: number }>;
  }>({
    active: false,
    startPoint: null,
    threshold: 3,
    hasPassedThreshold: false,
    nodeIds: [],
    initialPositions: {},
  });

  // Marquee state
  const [marqueeState, setMarqueeState] = useState<{
    active: boolean;
    startPoint: { x: number; y: number } | null;
    currentPoint: { x: number; y: number } | null;
    isShiftModifier: boolean;
    initialSelection: string[];
  }>({
    active: false,
    startPoint: null,
    currentPoint: null,
    isShiftModifier: false,
    initialSelection: [],
  });

  const isSelectMode = tool === "select";
  const isRectMode = tool === 'rect';
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

  // Utility: world coordinate conversion
  const toWorld = useCallback((stage: Konva.Stage, p: { x: number; y: number }) => ({
    x: (p.x - stage.x()) / stage.scaleX(),
    y: (p.y - stage.y()) / stage.scaleY(),
  }), []);

  // Build selection context
  const selectionContext = useMemo(() => {
    const parentOf: Record<string, string | null> = {};
    const nodeById: Record<string, any> = {};
    function walk(node: any, parent: string | null) {
      nodeById[node.id] = node;
      parentOf[node.id] = parent;
      if (Array.isArray(node.children)) node.children.forEach((c: any) => walk(c, node.id));
    }
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
  const isTransformerTarget = useCallback((target: any): boolean => {
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

  // Helper: finalize rectangle (called on mouseup or via global listener)
  const finalizeRect = useCallback(() => {
    if (!isRectMode || !rectDraft) return;
    const { start, current } = rectDraft;
    let x1 = start.x, y1 = start.y, x2 = current.x, y2 = current.y;
    let w = x2 - x1; let h = y2 - y1;
    const alt = altPressed;
    const shift = shiftPressed;
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
      setSpec(prev => ({
        ...prev,
        root: { ...prev.root, children: [...prev.root.children, { id, type: 'rect', position: topLeft, size: sizeFinal, fill: '#ffffff', stroke: '#334155', strokeWidth: 1 }] }
      }));
      setSelected([id]);
      onToolChange?.('select');
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
    setSpec(prev => ({
      ...prev,
      root: { ...prev.root, children: [...prev.root.children, { id, type: 'rect', position: { x: x1, y: y1 }, size: finalSize, fill: '#ffffff', stroke: '#334155', strokeWidth: 1 }] }
    }));
    setSelected([id]);
    onToolChange?.('select');
    setRectDraft(null);
  }, [isRectMode, rectDraft, altPressed, shiftPressed, setSpec, onToolChange]);

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
    if (!isSelectMode) return;
    const stage = e.target.getStage();
    if (!stage) return;

    // Don't process selection if clicking on transformer handles
    if (isTransformerTarget(e.target)) {
  // transformer interaction: ignore selection logic
      return;
    }

    // Handle panning
    if (e.evt.button === 1 || (e.evt.button === 0 && (e.evt.altKey || spacePan))) {
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
        
        let newSelection = selected;
        
        if (isShiftClick) {
          // Multi-select logic
          if (selected.includes(nodeId)) {
            newSelection = selected.filter(id => id !== nodeId);
          } else {
            newSelection = [...selected, nodeId];
          }
        } else {
          // Single select logic
          if (!selected.includes(nodeId)) {
            newSelection = [nodeId];
          }
        }
        
        setSelected(normalizeSelection(newSelection));
        
        // Prepare for potential drag
        const nodesToDrag = newSelection.includes(nodeId) ? newSelection : [nodeId];
        const initialPositions: Record<string, { x: number; y: number }> = {};
        
        for (const id of nodesToDrag) {
          const node = stage.findOne(`#${CSS.escape(id)}`);
          if (node) {
            initialPositions[id] = { x: node.x(), y: node.y() };
          }
        }
        
        setDragState({
          active: true,
          startPoint: worldPos,
          threshold: 3,
          hasPassedThreshold: false,
          nodeIds: nodesToDrag,
          initialPositions,
        });
        
        setMenu(null);
        return;
      }
    }
    
    // Clicked on empty space - start marquee
    setMarqueeState({
      active: true,
      startPoint: worldPos,
      currentPoint: worldPos,
      isShiftModifier: e.evt.shiftKey || e.evt.ctrlKey,
      initialSelection: selected,
    });
    
    // Clear selection if not using shift
    if (!e.evt.shiftKey && !e.evt.ctrlKey) {
      setSelected([]);
    }
    
    setMenu(null);
  }, [isSelectMode, spacePan, spec.root.id, toWorld, selected, getTopContainerAncestor, normalizeSelection, isTransformerTarget]);

  const onMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    if (isRectMode) {
      if (!rectDraft) return;
      const pointer = stage.getPointerPosition(); if (!pointer) return;
      const worldPos = toWorld(stage, pointer);
      setRectDraft(prev => prev ? { ...prev, current: worldPos } : prev);
      return;
    }
    if (!isSelectMode) return;

    if (panning) {
      setPos({ x: stage.x() + e.evt.movementX, y: stage.y() + e.evt.movementY });
      return;
    }

    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const worldPos = toWorld(stage, pointer);

    // Handle drag movement
    if (dragState.active && dragState.startPoint) {
      const dx = worldPos.x - dragState.startPoint.x;
      const dy = worldPos.y - dragState.startPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (!dragState.hasPassedThreshold && distance >= dragState.threshold) {
        setDragState(prev => ({ ...prev, hasPassedThreshold: true }));
      }
      
      if (dragState.hasPassedThreshold) {
        // Update node positions
        for (const nodeId of dragState.nodeIds) {
          const node = stage.findOne(`#${CSS.escape(nodeId)}`);
          const initialPos = dragState.initialPositions[nodeId];
          if (node && initialPos) {
            node.position({
              x: initialPos.x + dx,
              y: initialPos.y + dy,
            });
          }
        }
        // Force re-render of selection outlines during drag
        // A bit of a hack, but it works for now
        trRef.current?.forceUpdate();
      }
      return;
    }

    // Handle marquee movement
    if (marqueeState.active && marqueeState.startPoint) {
      setMarqueeState(prev => ({ ...prev, currentPoint: worldPos }));
      
      // Update marquee rectangle
      const rect = marqueeRectRef.current;
      if (rect && marqueeState.startPoint) {
        const start = marqueeState.startPoint;
        const minX = Math.min(start.x, worldPos.x);
        const minY = Math.min(start.y, worldPos.y);
        const width = Math.abs(worldPos.x - start.x);
        const height = Math.abs(worldPos.y - start.y);
        
        rect.position({ x: minX, y: minY });
        rect.size({ width, height });
        rect.visible(width > 5 || height > 5);
        rect.getLayer()?.batchDraw();
      }
    }
  }, [isSelectMode, panning, toWorld, dragState, marqueeState]);

  const onMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    // Finalize rectangle creation
    if (isRectMode && rectDraft) { finalizeRect(); return; }

    if (panning) {
      setPanning(false);
      return;
    }

    // Handle drag completion
    if (dragState.active) {
      if (dragState.hasPassedThreshold) {
        // Commit drag changes to spec
        setSpec(prev => {
          let next = prev;
          for (const nodeId of dragState.nodeIds) {
            const node = stage.findOne(`#${CSS.escape(nodeId)}`);
            if (node) {
              next = applyPosition(next, nodeId, { x: node.x(), y: node.y() });
            }
          }
          return next;
        });
      }
      
      setDragState({
        active: false,
        startPoint: null,
        threshold: 3,
        hasPassedThreshold: false,
        nodeIds: [],
        initialPositions: {},
      });
    }

    // Handle marquee completion
    if (marqueeState.active) {
      const rect = marqueeRectRef.current;
      if (rect && rect.visible() && marqueeState.startPoint && marqueeState.currentPoint) {
        // Find nodes intersecting with marquee
        // Marquee is now in world coordinates, so direct comparison is fine
        const marqueeBounds = {
          x: rect.x(),
          y: rect.y(),
          width: rect.width(),
          height: rect.height(),
        };
        
        const intersectingNodes: string[] = [];
        const nodes = stage.find((n: Konva.Node) => Boolean(n.id()) && n.id() !== spec.root.id);
        
        for (const node of nodes) {
          try {
            // Get node bounds relative to the stage (world coordinates)
            const worldBounds = node.getClientRect({ relativeTo: stage });
            
            // Check intersection
            if (!(marqueeBounds.x + marqueeBounds.width < worldBounds.x ||
                  worldBounds.x + worldBounds.width < marqueeBounds.x ||
                  marqueeBounds.y + marqueeBounds.height < worldBounds.y ||
                  worldBounds.y + worldBounds.height < marqueeBounds.y)) {
              const nodeId = getTopContainerAncestor(stage, node.id());
              if (!intersectingNodes.includes(nodeId)) {
                intersectingNodes.push(nodeId);
              }
            }
          } catch (error) {
            // Ignore nodes that can't provide bounds
          }
        }
        
        // Update selection based on marquee
        let newSelection: string[];
        if (marqueeState.isShiftModifier) {
          // Toggle selection
          const baseSelection = new Set(marqueeState.initialSelection);
          for (const nodeId of intersectingNodes) {
            if (baseSelection.has(nodeId)) {
              baseSelection.delete(nodeId);
            } else {
              baseSelection.add(nodeId);
            }
          }
          newSelection = Array.from(baseSelection);
        } else {
          newSelection = intersectingNodes;
        }
        
        setSelected(normalizeSelection(newSelection));
      }
      
      // Hide marquee
      if (rect) {
        rect.visible(false);
        rect.getLayer()?.batchDraw();
      }
      
      setMarqueeState({
        active: false,
        startPoint: null,
        currentPoint: null,
        isShiftModifier: false,
        initialSelection: [],
      });
    }
  }, [panning, dragState, marqueeState, spec.root.id, getTopContainerAncestor, normalizeSelection, setSpec, isRectMode, rectDraft, finalizeRect]);

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
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true } as any);
  }, [isRectMode, rectDraft]);

  // Single click handler for empty canvas
  const onClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isSelectMode) return;
    if (e.evt.button !== 0) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    // Don't clear selection if clicking on transformer handles
    if (isTransformerTarget(e.target)) {
  // clicking transformer: keep selection
      return;
    }
    
    if (e.target === stage && !dragState.hasPassedThreshold && !marqueeState.active) {
  // empty stage click: clear selection
      setSelected([]);
      setMenu(null);
    }
  }, [isSelectMode, dragState.hasPassedThreshold, marqueeState.active, isTransformerTarget]);

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
    newScale = Math.min(5, Math.max(0.2, newScale));
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
      if (e.code === 'Space') { setSpacePan(true); e.preventDefault(); }
      if (e.key === 'Shift') setShiftPressed(true);
      if (e.key === 'Alt') setAltPressed(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') { setSpacePan(false); }
      if (e.key === 'Shift') setShiftPressed(false);
      if (e.key === 'Alt') setAltPressed(false);
    };
    window.addEventListener('keydown', down, { capture: true });
    window.addEventListener('keyup', up, { capture: true });
    return () => {
      window.removeEventListener('keydown', down, { capture: true } as any);
      window.removeEventListener('keyup', up, { capture: true } as any);
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
    
    try { (stage as any).setPointersPositions(e.nativeEvent); } catch { /* ignore */ }
    const pointer = stage.getPointerPosition();
    const shape = pointer ? stage.getIntersection(pointer) : null;
    
    if (shape) {
      const top = shape.findAncestor((n: Konva.Node) => Boolean(n.id()), true);
      const rawId = top?.id();
      if (rawId && rawId !== spec.root.id) {
        const id = getTopContainerAncestor(stage, rawId);
        // Only change selection if right-clicking on an unselected item
        if (!selected.includes(id)) {
          setSelected(normalizeSelection([id]));
        }
      }
    }
    
    // Position menu at raw client coords relative to wrapper
    const rect = wrap.getBoundingClientRect();
    setMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [isSelectMode, spec.root.id, selected, getTopContainerAncestor, normalizeSelection]);

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
    (function scan(n: any) {
      if (newGroup) return;
      if (n.type === 'group' && Array.isArray(n.children)) {
        const childIds = n.children.map((c: any) => c.id);
        const matches = [...before].every(id => childIds.includes(id)) && !before.has(n.id);
        if (matches) newGroup = n.id;
      }
      if (Array.isArray(n.children)) n.children.forEach(scan);
    })(next.root);
    setSpec(next);
    if (newGroup) setSelected([newGroup]);
  }, [canGroup, selected, spec, setSpec]);

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
        const cp = (c as any).position ? (c as any).position() : { x: (c as any).x?.() ?? 0, y: (c as any).y?.() ?? 0 };
        childAbs.push({ id: c.id(), abs: { x: gPos.x + cp.x, y: gPos.y + cp.y } });
      });
    }
    let next = ungroupNodes(spec, new Set([gId]));
    childAbs.forEach(cr => { next = applyPosition(next, cr.id, cr.abs); });
    setSpec(next);
    setSelected(childAbs.map(c => c.id));
  }, [canUngroup, selected, spec, setSpec]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
      
      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        setSpec(prev => deleteNodes(prev, new Set(selected)));
        setSelected([]);
        return;
      }
      
      // Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setSpec(prev => duplicateNodes(prev, new Set(selected)));
        return;
      }
      
      // Arrow nudge
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
  }, [isSelectMode, canGroup, canUngroup, selected, performGroup, performUngroup, setSpec]);

  // Normalize selection on changes
  useEffect(() => {
    if (selected.length === 0) return;
    const norm = normalizeSelection(selected);
    if (norm.length !== selected.length || norm.some((id, i) => id !== selected[i])) {
      setSelected(norm);
    }
  }, [selected, normalizeSelection]);

  // Transformer target attachment
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const stage = tr.getStage();
    if (!stage) return;
    const targets = selected.map(id => stage.findOne(`#${CSS.escape(id)}`)).filter(Boolean) as Konva.Node[];
  // attach transformer to current selection
    tr.nodes(targets);
    tr.getLayer()?.batchDraw();
  }, [selected]);

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
      const specNode = (function find(node:any, id:string):any|null { if (node.id===id) return node; if (node.children) { for (const c of node.children) { const f=find(c,id); if (f) return f; } } return null; })(spec.root, id);
      let width = 0, height = 0;
      if (specNode?.size) { width = specNode.size.width; height = specNode.size.height; }
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
  }, []);

  // Find a node in the spec by its ID
  const findNode = (node: any, id: string): any | null => {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNode(child, id);
        if (found) return found;
      }
    }
    return null;
  };

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
            root: mapNode(prev.root, nodeId, (n: any) => ({
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
              root: mapNode(prev.root, nodeId, (n: any) => n.type === 'text' ? { ...n, textScaleX: absX, textScaleY: absY } : n)
            }));
          } else if (currentNode.size) {
            const newSize = {
              width: Math.round(currentNode.size.width * scaleX),
              height: Math.round(currentNode.size.height * scaleY)
            };
            if (currentNode.type === 'image') {
              const nonUniform = Math.abs(scaleX - scaleY) > 0.0001;
              setSpec(prev => ({
                ...prev,
                root: mapNode(prev.root, nodeId, (n: any) => {
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
        root: mapNode(prev.root, nodeId, (n: any) => ({
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
            root: mapNode(prev.root, nodeId, (groupNode: any) => {
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
              const scaledChildren = groupNode.children.map((child: any) => {
                const scaledChild = { ...child };
                
                // Scale position
                if (child.position) {
                  scaledChild.position = {
                    x: Math.round(child.position.x * scaleX),
                    y: Math.round(child.position.y * scaleY)
                  };
                }
                
                // Scale size
                if (child.size) {
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
        } else if (currentNode.type === 'text') {
          // Persist absolute Konva scale as glyph scale
          const absX = Math.max(0.05, node.scaleX());
          const absY = Math.max(0.05, node.scaleY());
          setSpec(prev => ({
            ...prev,
            root: mapNode(prev.root, nodeId, (n: any) => n.type === 'text' ? { ...n, textScaleX: absX, textScaleY: absY } : n)
          }));
        } else {
          // For individual non-text nodes: scale size
          if (currentNode && currentNode.size) {
            const newSize = {
              width: Math.round(currentNode.size.width * scaleX),
              height: Math.round(currentNode.size.height * scaleY)
            };
            if (currentNode.type === 'image') {
              const nonUniform = Math.abs(scaleX - scaleY) > 0.0001;
              setSpec(prev => ({
                ...prev,
                root: mapNode(prev.root, nodeId, (n: any) => {
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
  }, [setSpec, spec.root, selected, transformSession]);

  // Helper function to map nodes (from stage-internal.ts pattern)
  const mapNode = (n: any, id: string, f: (n: any) => any): any => {
    if (n.id === id) return f(n);
    if (n.children && Array.isArray(n.children)) {
      const children = n.children.map((c: any) => mapNode(c, id, f));
      return { ...n, children };
    }
    return n;
  };

  return (
  <div ref={wrapperRef} style={{ position: 'relative', width, height, cursor: isRectMode ? 'crosshair' : undefined }} onContextMenu={onWrapperContextMenu}>
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
      >
        <Layer>
          <Group>
            {renderNode(spec.root)}
          </Group>
          
          {isSelectMode && (
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
        </Layer>
      </Stage>
      
      {/* Context Menu */}
      {menu && isSelectMode && (
        <div 
          style={{ position: 'absolute', left: menu.x, top: menu.y, pointerEvents: 'auto' }}
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
                setSpec(prev => ({
                  ...prev,
                  root: (function walk(n: any): any {
                    if (parentMap[n.id]) {
                      const selectedChildren = new Set(parentMap[n.id]);
                      const orig = n.children || [];
                      let newChildren = orig.slice();
                      if (mode === 'forward') {
                        // iterate right-to-left swapping with next non-selected
                        for (let i = newChildren.length - 2; i >= 0; i--) {
                          if (selectedChildren.has(newChildren[i].id) && !selectedChildren.has(newChildren[i+1].id)) {
                            const tmp = newChildren[i+1];
                            newChildren[i+1] = newChildren[i];
                            newChildren[i] = tmp;
                          }
                        }
                      } else if (mode === 'lower') {
                        // iterate left-to-right swapping with previous non-selected
                        for (let i = 1; i < newChildren.length; i++) {
                          if (selectedChildren.has(newChildren[i].id) && !selectedChildren.has(newChildren[i-1].id)) {
                            const tmp = newChildren[i-1];
                            newChildren[i-1] = newChildren[i];
                            newChildren[i] = tmp;
                          }
                        }
                      } else if (mode === 'top') {
                        const moving = newChildren.filter((c: any) => selectedChildren.has(c.id));
                        const staying = newChildren.filter((c: any) => !selectedChildren.has(c.id));
                        newChildren = [...staying, ...moving];
                      } else if (mode === 'bottom') {
                        const moving = newChildren.filter((c: any) => selectedChildren.has(c.id));
                        const staying = newChildren.filter((c: any) => !selectedChildren.has(c.id));
                        newChildren = [...moving, ...staying];
                      }
                      n = { ...n, children: newChildren.map((c: any) => walk(c)) };
                      return n;
                    }
                    if (Array.isArray(n.children)) {
                      return { ...n, children: n.children.map((c: any) => walk(c)) };
                    }
                    return n;
                  })(prev.root)
                }));
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
                  root: mapNode(prev.root, '__bulk__', (n: any) => n) // placeholder (we'll map individually below)
                }));
                // Apply per node update
                setSpec(prev => ({
                  ...prev,
                  root: (function mapAll(n: any): any {
                    if (selected.includes(n.id) && n.type === 'image' && n.preserveAspect === false) {
                      return { ...n, preserveAspect: true, objectFit: n.objectFit || 'contain' };
                    }
                    if (Array.isArray(n.children)) {
                      return { ...n, children: n.children.map(mapAll) };
                    }
                    return n;
                  })(prev.root)
                }));
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
                setSpec(prev => ({
                  ...prev,
                  root: (function mapAll(n: any): any {
                    if (selected.includes(n.id) && n.type === 'text') {
                      return { ...n, textScaleX: 1, textScaleY: 1 };
                    }
                    if (Array.isArray(n.children)) return { ...n, children: n.children.map(mapAll) };
                    return n;
                  })(prev.root)
                }));
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
                setSelected([]);
                setMenu(null);
              }}
              className="px-3 py-1.5 w-full text-left hover:bg-red-50 text-red-600"
            >Delete</button>
          )}
          <div className="h-px bg-gray-200 my-1" />
          <button 
            onClick={() => setMenu(null)} 
            className="px-3 py-1.5 hover:bg-gray-100 w-full text-left text-gray-500"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

export default CanvasStage;