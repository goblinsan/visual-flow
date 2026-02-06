import { useCallback, useEffect, useRef } from "react";
import type { LayoutNode, LayoutSpec, FrameNode } from "../../layout-schema";
import { nodeHasChildren } from "../../commands/types";
import { deleteNodes } from "../editing";

export interface ContextMenuProps {
  menu: { x: number; y: number } | null;
  onClose: () => void;
  selected: string[];
  selectionContext: {
    parentOf: Record<string, string | null>;
    nodeById: Record<string, LayoutNode>;
  };
  spec: LayoutSpec;
  setSpec: (spec: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void;
  setSelection: (ids: string[]) => void;
  canGroup: boolean;
  canUngroup: boolean;
  performGroup: () => void;
  performUngroup: () => void;
  findNode: (node: LayoutNode, targetId: string) => LayoutNode | null;
  cloneNode: <T extends LayoutNode>(node: T) => T;
  collectExistingIds: (root: LayoutNode) => Set<string>;
  createUniqueIdFactory: (existing: Set<string>) => (base: string) => string;
  remapIdsAndOffset: (
    node: LayoutNode,
    offset: { x: number; y: number },
    makeId: (base: string) => string
  ) => LayoutNode;
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

export function ContextMenu({
  menu,
  onClose,
  selected,
  selectionContext,
  spec,
  setSpec,
  setSelection,
  canGroup,
  canUngroup,
  performGroup,
  performUngroup,
  findNode,
  cloneNode,
  collectExistingIds,
  createUniqueIdFactory,
  remapIdsAndOffset,
}: ContextMenuProps) {
  const clipboardRef = useRef<LayoutNode[] | null>(null);
  const pasteOffsetRef = useRef(0);

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!menu) return;

    const handleDocMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.context-menu')) {
        onClose();
      }
    };

    const handleDocContext = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleDocMouseDown, { capture: true });
    window.addEventListener('contextmenu', handleDocContext, { capture: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleDocMouseDown, true);
      window.removeEventListener('contextmenu', handleDocContext, true);
    };
  }, [menu, onClose]);

  const handleCopy = useCallback(() => {
    if (selected.length === 0) return;
    const nodes = selected.map(id => findNode(spec.root, id)).filter(Boolean) as LayoutNode[];
    if (nodes.length > 0) {
      clipboardRef.current = nodes.map(n => cloneNode(n));
      pasteOffsetRef.current = 0;
    }
    onClose();
  }, [selected, spec.root, findNode, cloneNode, onClose]);

  const handlePaste = useCallback(() => {
    if (!clipboardRef.current || clipboardRef.current.length === 0) return;
    const offset = 16 * (pasteOffsetRef.current + 1);
    const existing = collectExistingIds(spec.root as LayoutNode);
    const makeId = createUniqueIdFactory(existing);
    const clones = clipboardRef.current.map(n => remapIdsAndOffset(cloneNode(n), { x: offset, y: offset }, makeId));
    setSpec(prev => appendNodesToRoot(prev, clones));
    setSelection(clones.map(n => n.id));
    pasteOffsetRef.current += 1;
    onClose();
  }, [spec.root, collectExistingIds, createUniqueIdFactory, remapIdsAndOffset, cloneNode, setSpec, setSelection, onClose]);

  const handleDelete = useCallback(() => {
    setSpec(prev => deleteNodes(prev, new Set(selected)));
    setSelection([]);
    onClose();
  }, [selected, setSpec, setSelection, onClose]);

  const handleLock = useCallback(() => {
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
    onClose();
  }, [selected, setSpec, setSelection, onClose]);

  const handleUnlock = useCallback(() => {
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
    onClose();
  }, [selected, setSpec, onClose]);

  const handleReEnableAspect = useCallback(() => {
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
      return { ...prev, root: nextRoot };
    });
    onClose();
  }, [selected, setSpec, onClose]);

  const handleResetTextScale = useCallback(() => {
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
      return { ...prev, root: nextRoot };
    });
    onClose();
  }, [selected, setSpec, onClose]);

  const applyReorder = useCallback((mode: 'forward' | 'lower' | 'top' | 'bottom') => {
    // Build map parentId -> list of child ids selected
    const parentMap: Record<string, string[]> = {};
    for (const id of selected) {
      const p = selectionContext.parentOf[id];
      if (p) {
        parentMap[p] = parentMap[p] ? [...parentMap[p], id] : [id];
      }
    }

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
    onClose();
  }, [selected, selectionContext, setSpec, onClose]);

  if (!menu) return null;

  // Check if any stretched images exist
  const hasStretchedImages = selected.some(id => {
    const node = selectionContext.nodeById[id];
    return node?.type === 'image' && node.preserveAspect === false;
  });

  // Check if any scaled text exists
  const hasScaledText = selected.some(id => {
    const node = selectionContext.nodeById[id];
    return node?.type === 'text' && ((node.textScaleX && Math.abs(node.textScaleX - 1) > 0.001) || (node.textScaleY && Math.abs(node.textScaleY - 1) > 0.001));
  });

  // Check lock states
  const anyLocked = selected.some(id => selectionContext.nodeById[id]?.locked === true);
  const anyUnlocked = selected.some(id => selectionContext.nodeById[id]?.locked !== true);

  return (
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
      style={{ 
        position: 'absolute', 
        left: menu.x, 
        top: menu.y, 
        pointerEvents: 'auto', 
        maxHeight: 'calc(100vh - 40px)', 
        overflowY: 'auto' 
      }}
      className="context-menu z-50 text-xs bg-white border border-gray-300 rounded shadow-md select-none min-w-40"
    >
      {/* Layer ordering actions */}
      {selected.length > 0 && (
        <>
          <button 
            onClick={() => applyReorder('forward')} 
            className="px-3 py-1.5 w-full text-left hover:bg-gray-100"
          >
            Move Forward
          </button>
          <button 
            onClick={() => applyReorder('top')} 
            className="px-3 py-1.5 w-full text-left hover:bg-gray-100"
          >
            Move To Top
          </button>
          <button 
            onClick={() => applyReorder('lower')} 
            className="px-3 py-1.5 w-full text-left hover:bg-gray-100"
          >
            Move Lower
          </button>
          <button 
            onClick={() => applyReorder('bottom')} 
            className="px-3 py-1.5 w-full text-left hover:bg-gray-100"
          >
            Move To Bottom
          </button>
          <div className="h-px bg-gray-200 my-1" />
        </>
      )}

      {/* Copy */}
      <button
        disabled={selected.length === 0}
        onClick={handleCopy}
        className={`px-3 py-1.5 w-full text-left ${selected.length > 0 ? 'hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
      >
        Copy
      </button>

      {/* Paste */}
      <button
        disabled={!clipboardRef.current || clipboardRef.current.length === 0}
        onClick={handlePaste}
        className={`px-3 py-1.5 w-full text-left ${clipboardRef.current && clipboardRef.current.length > 0 ? 'hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
      >
        Paste
      </button>

      <div className="h-px bg-gray-200 my-1" />

      {/* Group */}
      <button 
        disabled={!canGroup}
        onClick={performGroup}
        className={`px-3 py-1.5 w-full text-left ${canGroup ? 'hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
      >
        Group Selection
      </button>

      {/* Ungroup */}
      <button 
        disabled={!canUngroup}
        onClick={performUngroup}
        className={`px-3 py-1.5 w-full text-left ${canUngroup ? 'hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
      >
        Ungroup
      </button>

      {/* Re-enable Aspect (for stretched images) */}
      {hasStretchedImages && (
        <button
          onClick={handleReEnableAspect}
          className="px-3 py-1.5 w-full text-left hover:bg-gray-100"
        >
          Re-enable Aspect
        </button>
      )}

      {/* Reset Text Scale */}
      {hasScaledText && (
        <button
          onClick={handleResetTextScale}
          className="px-3 py-1.5 w-full text-left hover:bg-gray-100"
        >
          Reset Text Scale
        </button>
      )}

      {/* Delete */}
      {selected.length > 0 && (
        <button
          onClick={handleDelete}
          className="px-3 py-1.5 w-full text-left hover:bg-red-50 text-red-600"
        >
          Delete
        </button>
      )}

      <div className="h-px bg-gray-200 my-1" />

      {/* Lock/Unlock */}
      {selected.length > 0 && (
        <>
          {anyUnlocked && (
            <button
              onClick={handleLock}
              className="px-3 py-1.5 w-full text-left hover:bg-gray-100 flex items-center gap-2"
            >
              <i className="fa-solid fa-lock text-gray-400 w-4" />
              Lock
            </button>
          )}
          {anyLocked && (
            <button
              onClick={handleUnlock}
              className="px-3 py-1.5 w-full text-left hover:bg-gray-100 flex items-center gap-2"
            >
              <i className="fa-solid fa-lock-open text-gray-400 w-4" />
              Unlock
            </button>
          )}
          <div className="h-px bg-gray-200 my-1" />
        </>
      )}

      {/* Close */}
      <button 
        onClick={onClose} 
        className="px-3 py-1.5 hover:bg-gray-100 w-full text-left text-gray-500"
      >
        Close
      </button>
    </div>
  );
}
