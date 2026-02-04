import type { FrameNode, LayoutNode } from '../layout-schema';
import { nodeHasChildren } from '../commands/types';

/** specUtils: tree traversal helpers for layout spec nodes.
 * Phase 1 extraction: no behavior change vs inline functions previously embedded in components.
 */

export type SpecNode = LayoutNode;
export interface RootLike { root: FrameNode; }

/** Depth-first search for node by id. */
export function findNode(root: LayoutNode, id: string): LayoutNode | null {
  if (root.id === id) return root;
  if (!nodeHasChildren(root)) return null;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

/**
 * Immutable update: returns new root tree with patch merged into node of matching id.
 * If id not found, original root reference is returned.
 */
export type SpecPatch = Partial<LayoutNode>;

export function updateNode(root: FrameNode, id: string, patch: SpecPatch): FrameNode {
  let changed = false;
  function walk(node: LayoutNode): LayoutNode {
    if (node.id === id) {
      changed = true;
      return { ...node, ...patch } as LayoutNode;
    }
    if (!nodeHasChildren(node)) return node;
    const children = node.children.map(walk);
    return node.children === children ? node : { ...node, children };
  }
  const next = walk(root);
  return changed ? (next as FrameNode) : root;
}

/** Find the parent node of a given node by id. Returns null if not found or if node is root. */
export function findParentNode(root: LayoutNode, childId: string): LayoutNode | null {
  if (root.id === childId) return null; // root has no parent
  if (!nodeHasChildren(root)) return null;
  for (const child of root.children) {
    if (child.id === childId) return root;
    const found = findParentNode(child, childId);
    if (found) return found;
  }
  return null;
}
