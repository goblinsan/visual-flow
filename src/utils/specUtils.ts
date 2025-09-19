/**
 * specUtils: tree traversal helpers for layout spec nodes.
 * Phase 1 extraction: no behavior change vs inline functions previously embedded in components.
 */

export interface SpecNode {
  id: string;
  type: string;
  children?: SpecNode[];
  [key: string]: any; // allow extra properties
}

export interface RootLike { root: SpecNode; }

/** Depth-first search for node by id. */
export function findNode(root: SpecNode, id: string): SpecNode | null {
  if (root.id === id) return root;
  if (root.children) {
    for (const c of root.children) {
      const found = findNode(c, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Immutable update: returns new root tree with patch merged into node of matching id.
 * If id not found, original root reference is returned.
 */
export function updateNode(root: SpecNode, id: string, patch: Record<string, any>): SpecNode {
  let changed = false;
  function walk(n: SpecNode): SpecNode {
    if (n.id === id) {
      changed = true;
      return { ...n, ...patch };
    }
    if (!n.children) return n;
    let childChanged = false;
    const newChildren = n.children.map(c => {
      const v = walk(c);
      if (v !== c) childChanged = true;
      return v;
    });
    if (childChanged) return { ...n, children: newChildren };
    return n;
  }
  const next = walk(root);
  return changed ? next : root; // ensure stable reference when no change
}
