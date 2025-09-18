import { Stage, Layer, Transformer, Rect, Group } from "react-konva";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import type { LayoutNode, LayoutSpec } from "../layout-schema.ts";
import { renderNode } from "./CanvasRenderer.tsx";
import { deleteNodes, duplicateNodes, nudgeNodes } from "./editing";
import { applyPosition, applyPositionAndSize, groupNodes, ungroupNodes } from "./stage-internal";

function findNode(spec: LayoutSpec, id: string): LayoutNode | null {
  function walk(node: LayoutNode): LayoutNode | null {
    if (node.id === id) return node;
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of (node as any).children) {
        const found = walk(child);
        if (found) return found;
      }
    }
    return null;
  }
  return walk(spec.root);
}

// Props
interface CanvasStageProps {
  spec: LayoutSpec;
  setSpec: (spec: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void;
  width?: number;
  height?: number;
  tool?: string;
}

function CanvasStage({ spec, setSpec, width = 800, height = 600, tool = "select" }: CanvasStageProps) {
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
  const [spacePan, setSpacePan] = useState(false);

  // Konva refs
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const marqueeRectRef = useRef<Konva.Rect>(null);

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

  // Enhanced mouse handlers with proper interaction detection
  const onMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isSelectMode) return;
    const stage = e.target.getStage();
    if (!stage) return;

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
  }, [isSelectMode, spacePan, spec.root.id, toWorld, selected, getTopContainerAncestor, normalizeSelection]);

  const onMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
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
        stage.batchDraw();
        // Force re-render of selection outlines during drag
        // setTransforming(prev => !prev);
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
  }, [panning, dragState, marqueeState, spec.root.id, getTopContainerAncestor, normalizeSelection, setSpec]);

  // Single click handler for empty canvas
  const onClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isSelectMode) return;
    if (e.evt.button !== 0) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    if (e.target === stage && !dragState.hasPassedThreshold && !marqueeState.active) {
      setSelected([]);
      setMenu(null);
    }
  }, [isSelectMode, dragState.hasPassedThreshold, marqueeState.active]);

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
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') { setSpacePan(false); }
    };
    window.addEventListener('keydown', down, { capture: true });
    window.addEventListener('keyup', up, { capture: true });
    return () => {
      window.removeEventListener('keydown', down, { capture: true } as any);
      window.removeEventListener('keyup', up, { capture: true } as any);
    };
  }, []);

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
    tr.nodes(targets);
    tr.getLayer()?.batchDraw();
  }, [selected]);

  // Handle ongoing transform (during drag/resize)
  const onTransform = useCallback(() => {
    setTransforming(prev => !prev); // Toggle to force re-render
  }, []);

  // Commit transform (resize)
  const onTransformEnd = useCallback(() => {
    const nodes = trRef.current?.nodes() ?? [];
    nodes.forEach(node => {
      const nodeId = node.id();
      if (!nodeId) return;

      const sx = node.scaleX();
      const sy = node.scaleY();
      const newRotation = node.rotation();

      // Update spec with new dimensions and rotation
      setSpec(prev => {
        const specNode = findNode(prev, nodeId);
        if (!specNode) return prev;

        const newWidth = (specNode.size?.width ?? node.width()) * sx;
        const newHeight = (specNode.size?.height ?? node.height()) * sy;

        let next = applyPositionAndSize(prev, nodeId, node.position(), { width: newWidth, height: newHeight });
        
        const nodeInNext = findNode(next, nodeId);
        if (nodeInNext) {
          nodeInNext.rotation = newRotation;
        }
        
        // Handle group resizing
        if (specNode?.type === 'group' && specNode.size && specNode.size.width && specNode.size.height && Array.isArray(specNode.children)) {
          const prevW = specNode.size.width || 1;
          const prevH = specNode.size.height || 1;
          const sxC = prevW ? newWidth / prevW : 1;
          const syC = prevH ? newHeight / prevH : 1;
          
          function map(nl: any): any {
            if (nl.id === nodeId && Array.isArray(nl.children)) {
              return { 
                ...nl, 
                size: { width: newWidth, height: newHeight }, 
                children: nl.children.map((c: any) => {
                  const cpos = c.position ?? { x: 0, y: 0 };
                  const csize = c.size ?? null;
                  const newPos = { x: cpos.x * sxC, y: cpos.y * syC };
                  let newSize = csize;
                  if (csize) newSize = { width: csize.width * sxC, height: csize.height * syC };
                  return { ...c, position: newPos, size: newSize ?? c.size };
                }) 
              };
            }
            if (Array.isArray(nl.children)) return { ...nl, children: nl.children.map(map) };
            return nl;
          }
          next = { ...next, root: map(next.root) };
        }
        return next;
      });

      // Reset node transformations
      node.scaleX(1);
      node.scaleY(1);
      node.rotation(0);
    });
    trRef.current?.getLayer()?.batchDraw();
  }, [setSpec]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width, height }} onContextMenu={onWrapperContextMenu}>
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
              keepRatio={false}
              rotationSnaps={[0, 90, 180, 270]}
              boundBoxFunc={(oldBox, newBox) => {
                // Enforce a minimum size
                if (newBox.width < 10 || newBox.height < 10) {
                  return oldBox;
                }
                return newBox;
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
        </Layer>
      </Stage>
      
      {/* Context Menu */}
      {menu && isSelectMode && (
        <div 
          style={{ position: 'absolute', left: menu.x, top: menu.y, pointerEvents: 'auto' }}
          className="z-50 text-xs bg-white border border-gray-300 rounded shadow-md select-none min-w-40"
        >
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