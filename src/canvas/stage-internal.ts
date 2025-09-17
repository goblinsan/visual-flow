import type { LayoutNode, LayoutSpec } from "../layout-schema";

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
