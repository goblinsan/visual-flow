import type { LayoutNode, LayoutSpec, GroupNode } from "../layout-schema";
// Phase 1 lint: typed helpers replacing several `any` casts.

function mapNode<T extends LayoutNode>(n: T, id: string, f: (n: LayoutNode) => LayoutNode): T {
  if (n.id === id) return f(n) as T;
  const maybeChildren = (n as unknown as { children?: LayoutNode[] }).children;
  if (Array.isArray(maybeChildren)) {
    const children = maybeChildren.map((c) => mapNode(c, id, f));
    return { ...(n as object), children } as T;
  }
  return n;
}

export function applyPosition(spec: LayoutSpec, id: string, pos: { x: number; y: number }): LayoutSpec {
  return { ...spec, root: mapNode(spec.root, id, (n) => ({ ...(n as object), position: pos } as LayoutNode)) };
}

export function applyPositionAndSize(spec: LayoutSpec, id: string, pos: { x: number; y: number }, size: { width: number; height: number }): LayoutSpec {
  return { ...spec, root: mapNode(spec.root, id, (n) => ({ ...(n as object), position: pos, size } as LayoutNode)) };
}

// Group a set of sibling node ids under a new group
export function groupNodes(spec: LayoutSpec, ids: Set<string>): LayoutSpec {
  if (ids.size < 2) return spec; // nothing to do
  // Walk tree to find parent containing all ids as direct children
  function visit(n: LayoutNode): LayoutNode {
    const maybeChildren = (n as unknown as { children?: LayoutNode[] }).children;
    if (!maybeChildren) return n;
    const childIds = new Set(maybeChildren.map(c => c.id));
    // Check if all ids are in this child set (only group if all share same parent)
    let allHere = true;
    ids.forEach(id => { if (!childIds.has(id)) allHere = false; });
    if (allHere) {
      const toGroup: LayoutNode[] = [];
      const remaining: LayoutNode[] = [];
      for (const c of maybeChildren) {
        if (ids.has(c.id)) toGroup.push(c); else remaining.push(c);
      }
      if (toGroup.length < 2) return n; // safety
      // Compute bounding box (assumes each has position & size) relative to parent
      const boxes = toGroup.map(c => {
        const pos = (c as unknown as { position?: { x: number; y: number } }).position ?? { x: 0, y: 0 };
        const size = (c as unknown as { size?: { width: number; height: number } }).size ?? { width: 100, height: 100 };
        return { x: pos.x, y: pos.y, w: size.width, h: size.height };
      });
    const minX = Math.min(...boxes.map(b => b.x));
    const minY = Math.min(...boxes.map(b => b.y));
    const maxX = Math.max(...boxes.map(b => b.x + b.w));
    const maxY = Math.max(...boxes.map(b => b.y + b.h));
      const groupId = `group_${Date.now().toString(36)}`;
      // Adjust children positions to be relative to new group origin
      const adjusted = toGroup.map(c => {
        const pos = (c as unknown as { position?: { x: number; y: number } }).position ?? { x: 0, y: 0 };
        return { ...c, position: { x: pos.x - minX, y: pos.y - minY } } as LayoutNode;
      });
      const groupNode: GroupNode = {
        id: groupId,
        type: 'group',
        position: { x: minX, y: minY },
        size: { width: maxX - minX, height: maxY - minY },
        children: adjusted,
      };
      const newChildren = [...remaining, { ...groupNode }];
      return { ...(n as object), children: newChildren } as LayoutNode;
    }
    // Recurse
    const newChildren = maybeChildren.map(c => visit(c));
    return { ...(n as object), children: newChildren } as LayoutNode;
  }
  const nextRoot = visit(spec.root) as LayoutNode;
  // Preserve original LayoutSpec shape (root expected FrameNode subtype) – rely on existing runtime discipline.
  return { ...spec, root: nextRoot as unknown as typeof spec.root };
}

// Ungroup: replace each target group id with its children (adjust positions to parent space)
export function ungroupNodes(spec: LayoutSpec, ids: Set<string>): LayoutSpec {
  function visit(n: LayoutNode): LayoutNode {
    const maybeChildren = (n as unknown as { children?: LayoutNode[] }).children;
    if (!maybeChildren) return n;
  // changed flag removed (result always reconstructed with newChildren)
    const newChildren: LayoutNode[] = [];
    for (const c of maybeChildren) {
      const isGroup = (c as unknown as { type?: string }).type === 'group';
      const groupChildren = (c as unknown as { children?: LayoutNode[] }).children;
      if (ids.has(c.id) && isGroup && Array.isArray(groupChildren)) {
        // expand
        const gPos = (c as unknown as { position?: { x: number; y: number } }).position ?? { x: 0, y: 0 };
        for (const gc of groupChildren) {
          const childPos = (gc as unknown as { position?: { x: number; y: number } }).position ?? { x: 0, y: 0 };
            newChildren.push({ ...gc, position: { x: childPos.x + gPos.x, y: childPos.y + gPos.y } });
        }
      } else {
        newChildren.push(visit(c));
      }
    }
    return { ...(n as object), children: newChildren } as LayoutNode;
  }
  return { ...spec, root: visit(spec.root) as unknown as typeof spec.root };
}
