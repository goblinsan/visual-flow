import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { Stage, Layer, Group } from "react-konva";
import type Konva from "konva";
import type { LayoutSpec } from "../layout-schema.ts";
import { renderNode } from "./CanvasRenderer.tsx";
import { deleteNodes, duplicateNodes, nudgeNodes } from "./editing";
import { applyPosition, groupNodes, ungroupNodes } from "./stage-internal";
import { CanvasOrchestrator } from "./core/CanvasOrchestrator";
import type { CanvasNode } from "./core/CanvasOrchestrator";

// Props
interface CanvasStageProps {
  spec: LayoutSpec;
  setSpec: (spec: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void;
  width?: number;
  height?: number;
  tool?: string;
}

function CanvasStage({ spec, setSpec, width = 800, height = 600, tool = "select" }: CanvasStageProps) {
  // Refs
  const stageRef = useRef<Konva.Stage>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const orchestratorRef = useRef<CanvasOrchestrator | null>(null);
  
  // State
  const [selected, setSelected] = React.useState<string[]>([]);
  const [scale, setScale] = React.useState(1);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const [menu, setMenu] = React.useState<null | { x: number; y: number }>(null);

  // Store callbacks at component level for menu actions
  const callbacks = useMemo(() => ({
    onNodesGroup: (nodeIds: string[]) => {
      const before = new Set(nodeIds);
      const next = groupNodes(spec, before);
      let newGroup: string | null = null;
      
      // Find the new group
      function scan(n: any): void {
        if (newGroup) return;
        if (n.type === 'group' && Array.isArray(n.children)) {
          const childIds = n.children.map((c: any) => c.id);
          const matches = [...before].every(id => childIds.includes(id)) && !before.has(n.id);
          if (matches) newGroup = n.id;
        }
        if (Array.isArray(n.children)) n.children.forEach(scan);
      }
      
      scan(next.root);
      setSpec(next);
      if (newGroup) setSelected([newGroup]);
    },
    onNodeUngroup: (nodeId: string) => {
      const stage = stageRef.current;
      if (!stage) return;
      
      const gNode = stage.findOne(`#${CSS.escape(nodeId)}`) as Konva.Group | null;
      const childAbs: { id: string; abs: { x: number; y: number } }[] = [];
      
      if (gNode) {
        const gPos = gNode.position();
        gNode.getChildren((n: Konva.Node) => Boolean(n.id())).forEach((c: Konva.Node) => {
          const cp = (c as any).position ? (c as any).position() : { x: (c as any).x?.() ?? 0, y: (c as any).y?.() ?? 0 };
          childAbs.push({ id: c.id(), abs: { x: gPos.x + cp.x, y: gPos.y + cp.y } });
        });
      }
      
      let next = ungroupNodes(spec, new Set([nodeId]));
      childAbs.forEach(cr => { next = applyPosition(next, cr.id, cr.abs); });
      setSpec(next);
      setSelected(childAbs.map(c => c.id));
    },
    onNodesDuplicate: (nodeIds: string[]) => {
      setSpec(prev => duplicateNodes(prev, new Set(nodeIds)));
    },
    onNodesDelete: (nodeIds: string[]) => {
      setSpec(prev => deleteNodes(prev, new Set(nodeIds)));
      setSelected([]);
    },
  }), [spec, setSpec]);

  const isSelectMode = tool === "select";

  // Build selection context from spec
  const selectionContext = useMemo(() => {
    const parentOf: Record<string, string | null> = {};
    const nodeById: Record<string, any> = {};
    function walk(node: any, parent: string | null) {
      nodeById[node.id] = node;
      parentOf[node.id] = parent;
      if (Array.isArray(node.children)) {
        node.children.forEach((c: any) => walk(c, node.id));
      }
    }
    walk(spec.root, null);
    return { parentOf, nodeById };
  }, [spec]);

  // Convert spec to CanvasNode format
  const canvasNodes = useMemo(() => {
    const nodes: CanvasNode[] = [];
    
    function walk(node: any) {
      if (node.id && node.id !== spec.root.id) {
        nodes.push({
          id: node.id,
          type: node.type || 'unknown',
          position: node.position || { x: 0, y: 0 },
          size: node.size || { width: 100, height: 100 },
          visible: true,
          selectable: true,
          draggable: true,
          data: node,
        });
      }
      
      if (Array.isArray(node.children)) {
        node.children.forEach(walk);
      }
    }
    
    walk(spec.root);
    return nodes;
  }, [spec]);

  // Group/ungroup logic
  const canUngroup = useMemo(() => 
    selected.length === 1 && selectionContext.nodeById[selected[0]]?.type === "group", 
    [selected, selectionContext]
  );
  
  const canGroup = useMemo(() => {
    if (selected.length < 2) return false;
    const selSet = new Set(selected);
    const parent = selectionContext.parentOf[selected[0]];
    if (!parent) return false;
    
    // Check all selected nodes have same parent
    for (let i = 1; i < selected.length; i++) {
      if (selectionContext.parentOf[selected[i]] !== parent) return false;
    }
    
    // Check no ancestor/descendant pairs
    for (const id of selected) {
      let p = selectionContext.parentOf[id];
      while (p) {
        if (selSet.has(p)) return false;
        p = selectionContext.parentOf[p];
      }
    }
    
    return !selSet.has(parent);
  }, [selected, selectionContext]);

  // Initialize orchestrator
  useEffect(() => {
    if (!wrapperRef.current || !isSelectMode) return;

    const orchestrator = new CanvasOrchestrator(
      wrapperRef.current,
      {
        selectionOptions: { multiSelect: true },
        enableDefaultMenuItems: false, // We'll handle menus manually
        dragConstraints: {},
        marqueeOptions: {
          minSize: 5,
          visualStyle: {
            strokeColor: '#3b82f6',
            strokeWidth: 1,
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            dashArray: [4, 4],
          },
        },
        contextMenuOptions: {
          autoHide: true,
          hideDelay: 100,
          maxWidth: 250,
          maxHeight: 400,
          offsetX: 0,
          offsetY: 0,
        },
      },
      {
        onNodeUpdate: (nodeId: string, position: { x: number; y: number }) => {
          setSpec(prev => applyPosition(prev, nodeId, position));
        },
        onNodesDelete: (nodeIds: string[]) => {
          setSpec(prev => deleteNodes(prev, new Set(nodeIds)));
          setSelected([]);
        },
        onNodesDuplicate: (nodeIds: string[]) => {
          setSpec(prev => duplicateNodes(prev, new Set(nodeIds)));
        },
        onNodesGroup: (nodeIds: string[]) => {
          const before = new Set(nodeIds);
          const next = groupNodes(spec, before);
          let newGroup: string | null = null;
          
          // Find the new group
          function scan(n: any): void {
            if (newGroup) return;
            if (n.type === 'group' && Array.isArray(n.children)) {
              const childIds = n.children.map((c: any) => c.id);
              const matches = [...before].every(id => childIds.includes(id)) && !before.has(n.id);
              if (matches) newGroup = n.id;
            }
            if (Array.isArray(n.children)) n.children.forEach(scan);
          }
          
          scan(next.root);
          setSpec(next);
          if (newGroup) setSelected([newGroup]);
        },
        onNodeUngroup: (nodeId: string) => {
          const stage = stageRef.current;
          if (!stage) return;
          
          const gNode = stage.findOne(`#${CSS.escape(nodeId)}`) as Konva.Group | null;
          const childAbs: { id: string; abs: { x: number; y: number } }[] = [];
          
          if (gNode) {
            const gPos = gNode.position();
            gNode.getChildren((n: Konva.Node) => Boolean(n.id())).forEach((c: Konva.Node) => {
              const cp = (c as any).position ? (c as any).position() : { x: (c as any).x?.() ?? 0, y: (c as any).y?.() ?? 0 };
              childAbs.push({ id: c.id(), abs: { x: gPos.x + cp.x, y: gPos.y + cp.y } });
            });
          }
          
          let next = ungroupNodes(spec, new Set([nodeId]));
          childAbs.forEach(cr => { next = applyPosition(next, cr.id, cr.abs); });
          setSpec(next);
          setSelected(childAbs.map(c => c.id));
        },
        onZoomChange: (zoom: number) => {
          setScale(zoom);
        },
        onPanChange: (offset: { x: number; y: number }) => {
          setPos(offset);
        },
      }
    );

    // Add context menu provider
    orchestrator.addMenuItemProvider((_targetNodeId, selectedNodeIds) => {
      const items = [];
      
      if (selectedNodeIds.length >= 2) {
        items.push({
          id: 'group',
          label: 'Group Selection',
          disabled: !canGroup,
          action: () => {
            if (canGroup) {
              callbacks.onNodesGroup(selectedNodeIds);
            }
          },
        });
      }
      
      if (selectedNodeIds.length === 1) {
        const nodeId = selectedNodeIds[0];
        const node = selectionContext.nodeById[nodeId];
        
        if (node?.type === 'group') {
          items.push({
            id: 'ungroup',
            label: 'Ungroup',
            action: () => {
              callbacks.onNodeUngroup(nodeId);
            },
          });
        }
        
        items.push({
          id: 'duplicate',
          label: 'Duplicate',
          action: () => {
            callbacks.onNodesDuplicate([nodeId]);
          },
        });
      }
      
      if (selectedNodeIds.length > 0) {
        items.push({
          id: 'delete',
          label: 'Delete',
          action: () => {
            callbacks.onNodesDelete(selectedNodeIds);
          },
        });
      }
      
      return items;
    });

    orchestratorRef.current = orchestrator;

    // Sync initial selection
    const currentSelection = orchestrator.getSelectedNodeIds();
    if (currentSelection.length !== selected.length || 
        currentSelection.some((id, i) => id !== selected[i])) {
      setSelected(currentSelection);
    }

    // Listen for selection changes
    // Note: We'll sync this through the state updates from the orchestrator callbacks

    return () => {
      orchestrator.destroy();
      orchestratorRef.current = null;
    };
  }, [isSelectMode, canGroup, canUngroup, spec, selectionContext, callbacks]);

  // Update orchestrator when nodes change
  useEffect(() => {
    if (orchestratorRef.current) {
      orchestratorRef.current.updateNodes(canvasNodes);
    }
  }, [canvasNodes]);

  // Sync coordinate system with Konva stage
  useEffect(() => {
    const stage = stageRef.current;
    const orchestrator = orchestratorRef.current;
    
    if (stage && orchestrator) {
      // Sync stage transform with orchestrator coordinate system
      const coords = orchestrator.getCoordinateSystem();
      const transform = coords.getTransform();
      
      stage.scale({ x: transform.scaleX, y: transform.scaleY });
      stage.position({ x: transform.x, y: transform.y });
      
      setScale(transform.scaleX);
      setPos({ x: transform.x, y: transform.y });
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      if (!isSelectMode) return;

      // Group / Ungroup
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        if (e.shiftKey) {
          if (canUngroup && selected.length === 1) {
            e.preventDefault();
            callbacks.onNodeUngroup(selected[0]);
          }
        } else {
          if (canGroup) {
            e.preventDefault();
            callbacks.onNodesGroup(selected);
          }
        }
        return;
      }

      if (selected.length === 0) return;

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        callbacks.onNodesDelete(selected);
        return;
      }

      // Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        callbacks.onNodesDuplicate(selected);
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
  }, [isSelectMode, canGroup, canUngroup, selected, setSpec, callbacks]);

  // Handle context menu
  const onWrapperContextMenu = useCallback((e: React.MouseEvent) => {
    if (!isSelectMode) return;
    e.preventDefault();
    
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (rect) {
      setMenu({ 
        x: e.clientX - rect.left, 
        y: e.clientY - rect.top 
      });
    }
  }, [isSelectMode]);

  // Close menu on outside clicks
  useEffect(() => {
    if (!menu) return;
    
    const handleClick = (e: MouseEvent) => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      
      const menuEl = wrapper.querySelector('.context-menu');
      if (menuEl && menuEl.contains(e.target as Node)) return;
      
      setMenu(null);
    };

    setTimeout(() => {
      document.addEventListener('click', handleClick);
    }, 0);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [menu]);

  // Sync selection from orchestrator
  useEffect(() => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator) return;

    const currentSelection = orchestrator.getSelectedNodeIds();
    if (currentSelection.length !== selected.length || 
        currentSelection.some((id, i) => id !== selected[i])) {
      setSelected(currentSelection);
    }
  });

  return (
    <div 
      ref={wrapperRef} 
      style={{ position: 'relative', width, height }} 
      onContextMenu={onWrapperContextMenu}
    >
      <Stage 
        ref={stageRef} 
        width={width} 
        height={height} 
        scaleX={scale} 
        scaleY={scale} 
        x={pos.x} 
        y={pos.y}
      >
        <Layer>
          <Group>
            {renderNode(spec.root)}
          </Group>
        </Layer>
      </Stage>

      {/* Context Menu */}
      {menu && isSelectMode && (
        <div 
          className="context-menu"
          style={{ 
            position: 'absolute', 
            left: menu.x, 
            top: menu.y, 
            pointerEvents: 'auto',
            zIndex: 50
          }}
        >
          <div className="bg-white border border-gray-300 rounded shadow-md text-xs min-w-40">
            {selected.length >= 2 && (
              <button
                disabled={!canGroup}
                onClick={() => {
                  if (canGroup) {
                    callbacks.onNodesGroup(selected);
                  }
                  setMenu(null);
                }}
                className={`px-3 py-1.5 w-full text-left ${
                  canGroup ? 'hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                Group Selection
              </button>
            )}
            
            {selected.length === 1 && canUngroup && (
              <button
                onClick={() => {
                  callbacks.onNodeUngroup(selected[0]);
                  setMenu(null);
                }}
                className="px-3 py-1.5 w-full text-left hover:bg-gray-100"
              >
                Ungroup
              </button>
            )}
            
            {selected.length === 1 && (
              <button
                onClick={() => {
                  callbacks.onNodesDuplicate(selected);
                  setMenu(null);
                }}
                className="px-3 py-1.5 w-full text-left hover:bg-gray-100"
              >
                Duplicate
              </button>
            )}
            
            {selected.length > 0 && (
              <>
                <div className="h-px bg-gray-200 my-1" />
                <button
                  onClick={() => {
                    callbacks.onNodesDelete(selected);
                    setMenu(null);
                  }}
                  className="px-3 py-1.5 w-full text-left hover:bg-gray-100 text-red-600"
                >
                  Delete
                </button>
              </>
            )}
            
            <div className="h-px bg-gray-200 my-1" />
            <button
              onClick={() => setMenu(null)}
              className="px-3 py-1.5 hover:bg-gray-100 w-full text-left text-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CanvasStage;