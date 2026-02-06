import { useEffect, useRef } from 'react';
import type { LayoutSpec, LayoutNode } from '../../layout-schema';
import { deleteNodes, duplicateNodes, nudgeNodes } from '../editing';

interface KeyboardShortcutsConfig {
  isSelectMode: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  selected: string[];
  editingTextId: string | null;
  spec: LayoutSpec;
  setSpec: (spec: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void;
  setSelection: (ids: string[]) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  performGroup: () => void;
  performUngroup: () => void;
  selectionContext: {
    nodeById: Record<string, LayoutNode>;
    parentOf: Record<string, string | null>;
  };
  collectExistingIds: (root: LayoutNode) => Set<string>;
  createUniqueIdFactory: (existing: Set<string>) => (base: string) => string;
  remapIdsAndOffset: (node: LayoutNode, offset: { x: number; y: number }, makeId: (base: string) => string) => LayoutNode;
  cloneNode: <T extends LayoutNode>(node: T) => T;
  findNode: (root: LayoutNode, targetId: string) => LayoutNode | null;
  appendNodesToRoot: (spec: LayoutSpec, nodes: LayoutNode[]) => LayoutSpec;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const {
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
    findNode,
    appendNodesToRoot,
  } = config;

  const clipboardRef = useRef<LayoutNode[] | null>(null);
  const pasteOffsetRef = useRef(0);

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
      
      // Check if any selected elements are locked
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
    appendNodesToRoot,
  ]);
}
