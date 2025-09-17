import type { LayoutNode, LayoutSpec, FrameNode } from "../layout-schema";

export function normalizeRect(r: { x: number; y: number; w: number; h: number }) {
  const x = Math.min(r.x, r.x + r.w);
  const y = Math.min(r.y, r.y + r.h);
  const width = Math.abs(r.w);
  const height = Math.abs(r.h);
  return { x, y, width, height };
}

export function rectsIntersect(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return !(a.x > b.x + b.width || a.x + a.width < b.x || a.y > b.y + b.height || a.y + a.height < b.y);
}

type WithChildren = { children: LayoutNode[] };
function hasChildren(n: LayoutNode): n is LayoutNode & WithChildren {
  return Array.isArray((n as { children?: unknown }).children);
}

function copyWithChildren<T extends LayoutNode & WithChildren>(n: T, children: LayoutNode[]): T {
  return { ...n, children } as T;
}

export function deleteNodes(spec: LayoutSpec, ids: Set<string>): LayoutSpec {
  const rewrite = (n: LayoutNode): LayoutNode => {
    if (!hasChildren(n)) return n;
    const children = n.children
      .filter((c) => !ids.has(c.id))
      .map(rewrite);
    return copyWithChildren(n, children);
  };
  return { ...spec, root: rewrite(spec.root) as FrameNode };
}

export function duplicateNodes(spec: LayoutSpec, ids: Set<string>): LayoutSpec {
  const existingIds = new Set<string>();
  const collect = (n: LayoutNode) => {
    existingIds.add(n.id);
    if (hasChildren(n)) n.children.forEach(collect);
  };
  collect(spec.root);

  const mkId = (base: string) => {
    let candidate = `${base}-copy`;
    let i = 2;
    while (existingIds.has(candidate)) { candidate = `${base}-copy-${i++}`; }
    existingIds.add(candidate);
    return candidate;
  };

  const rewrite = (n: LayoutNode): LayoutNode => {
    if (!hasChildren(n)) return n;
    const children: LayoutNode[] = [];
    for (const c of n.children) {
      const nextChild = rewrite(c);
      children.push(nextChild);
      if (ids.has(c.id)) {
        const clone = deepCloneNode(c);
        clone.id = mkId(c.id);
        // If node is positionable, offset the position (mutate clone safely)
        if ("position" in clone && clone.position) {
          const px = clone.position.x ?? 0;
          const py = clone.position.y ?? 0;
          (clone as LayoutNode & { position: { x?: number; y?: number } }).position = { x: px + 16, y: py + 16 };
        }
        children.push(clone);
      }
    }
    return copyWithChildren(n as LayoutNode & WithChildren, children);
  };
  return { ...spec, root: rewrite(spec.root) as FrameNode };
}

export function nudgeNodes(spec: LayoutSpec, ids: Set<string>, dx: number, dy: number): LayoutSpec {
  const rewrite = (n: LayoutNode): LayoutNode => {
    let node: LayoutNode = n;
    if (ids.has(n.id) && "position" in n) {
      const p = (n as LayoutNode & { position?: { x?: number; y?: number } }).position ?? { x: 0, y: 0 };
      const copy = { ...n } as LayoutNode & { position?: { x?: number; y?: number } };
      copy.position = { x: (p.x ?? 0) + dx, y: (p.y ?? 0) + dy };
      node = copy as LayoutNode;
    }
    if (hasChildren(node)) {
      const children = node.children.map(rewrite);
      node = copyWithChildren(node as LayoutNode & WithChildren, children);
    }
    return node;
  };
  return { ...spec, root: rewrite(spec.root) as FrameNode };
}

function deepCloneNode<T extends LayoutNode>(n: T): T {
  return JSON.parse(JSON.stringify(n)) as T;
}
