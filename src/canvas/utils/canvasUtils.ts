import type { LayoutNode, Pos } from "../../layout-schema";
import { nodeHasChildren } from "../../commands/types";
import type Konva from "konva";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Find a node by ID in the node tree
 */
export function findNode(node: LayoutNode, targetId: string): LayoutNode | null {
  if (node.id === targetId) return node;
  if (nodeHasChildren(node)) {
    for (const child of node.children) {
      const found = findNode(child, targetId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Calculate bounds of a node and its children with accumulated position offsets
 */
export function getNodeBounds(node: LayoutNode, accX = 0, accY = 0): Bounds | null {
  const pos = (node as { position?: Pos }).position ?? { x: 0, y: 0 };
  const baseX = accX + (pos.x ?? 0);
  const baseY = accY + (pos.y ?? 0);
  const size = node.size;
  const hasSize = size && typeof size.width === "number" && typeof size.height === "number";
  let bounds = hasSize ? { x: baseX, y: baseY, width: size.width, height: size.height } : null;
  if (Array.isArray(node.children) && node.children.length > 0) {
    const childBounds = node.children
      .map((child) => getNodeBounds(child, baseX, baseY))
      .filter(Boolean) as Bounds[];
    if (childBounds.length > 0 && !bounds) {
      const minX = Math.min(...childBounds.map(b => b.x));
      const minY = Math.min(...childBounds.map(b => b.y));
      const maxX = Math.max(...childBounds.map(b => b.x + b.width));
      const maxY = Math.max(...childBounds.map(b => b.y + b.height));
      bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
  }
  return bounds;
}

/**
 * Get the world position of a node by walking the tree and accumulating positions
 */
export function getNodeWorldPosition(root: LayoutNode, nodeId: string): { x: number; y: number } | null {
  let result: { x: number; y: number } | null = null;
  const walk = (node: LayoutNode, accX: number, accY: number) => {
    const pos = (node as { position?: Pos }).position ?? { x: 0, y: 0 };
    const nextX = accX + (pos.x ?? 0);
    const nextY = accY + (pos.y ?? 0);
    if (node.id === nodeId) {
      result = { x: nextX, y: nextY };
      return;
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        if (result) return;
        walk(child, nextX, nextY);
      }
    }
  };
  walk(root, 0, 0);
  return result;
}

/**
 * Collect all existing IDs in the tree
 */
export function collectExistingIds(root: LayoutNode): Set<string> {
  const ids = new Set<string>();
  const walk = (node: LayoutNode) => {
    ids.add(node.id);
    if (nodeHasChildren(node)) {
      node.children.forEach(walk);
    }
  };
  walk(root);
  return ids;
}

/**
 * Create a unique ID factory that avoids collisions with existing IDs
 */
export function createUniqueIdFactory(existing: Set<string>): (base: string) => string {
  return (base: string) => {
    let candidate = `${base}-copy`;
    let i = 2;
    while (existing.has(candidate)) {
      candidate = `${base}-copy-${i++}`;
    }
    existing.add(candidate);
    return candidate;
  };
}

/**
 * Clone a node deeply
 */
export function cloneNode<T extends LayoutNode>(node: T): T {
  return JSON.parse(JSON.stringify(node)) as T;
}

/**
 * Remap IDs and offset position for a cloned node tree
 */
export function remapIdsAndOffset(
  node: LayoutNode,
  offset: { x: number; y: number },
  makeId: (base: string) => string
): LayoutNode {
  const walk = (n: LayoutNode, isRoot: boolean): LayoutNode => {
    const next = cloneNode(n);
    next.id = makeId(next.id);
    if (isRoot) {
      const posX = next.position?.x ?? 0;
      const posY = next.position?.y ?? 0;
      next.position = { x: posX + offset.x, y: posY + offset.y };
    }
    if (nodeHasChildren(next)) {
      next.children = next.children.map((c) => walk(c, false));
    }
    return next;
  };
  return walk(node, true);
}

/**
 * Convert screen coordinates to world coordinates
 */
export function toWorld(stage: Konva.Stage, p: { x: number; y: number }): { x: number; y: number } {
  return {
    x: (p.x - stage.x()) / stage.scaleX(),
    y: (p.y - stage.y()) / stage.scaleY(),
  };
}

/**
 * Get the top container ancestor for selection promotion
 */
export function getTopContainerAncestor(stage: Konva.Stage, id: string, rootId: string): string {
  const node = stage.findOne(`#${CSS.escape(id)}`);
  if (!node) return id;
  const tokens = ["group", "box", "stack", "grid"];
  let cur: Konva.Node | null = node;
  let top = id;
  while (cur) {
    const nm = cur.name() ?? "";
    if (cur.id() && cur.id() !== rootId && tokens.some(t => nm.includes(t))) {
      top = cur.id();
    }
    const p = cur.getParent();
    if (!p || p === stage) break;
    cur = p;
  }
  return top;
}

/**
 * Check if target is transformer-related
 */
export function isTransformerTarget(target: Konva.Node | null): boolean {
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
}

/**
 * Build selection context with parent relationships and node lookups
 */
export function buildSelectionContext(root: LayoutNode): {
  parentOf: Record<string, string | null>;
  nodeById: Record<string, LayoutNode>;
} {
  const parentOf: Record<string, string | null> = {};
  const nodeById: Record<string, LayoutNode> = {};
  const walk = (node: LayoutNode, parent: string | null) => {
    nodeById[node.id] = node;
    parentOf[node.id] = parent;
    if (nodeHasChildren(node)) node.children.forEach(child => walk(child, node.id));
  };
  walk(root, null);
  return { parentOf, nodeById };
}

/**
 * Generate a random ID with a prefix
 */
export function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Check if a node is a text node
 */
export function isTextNode(node: LayoutNode): boolean {
  return node.type === 'text';
}

/**
 * Check if a node is a curve node
 */
export function isCurveNode(node: LayoutNode): boolean {
  return node.type === 'curve';
}

/**
 * Check if a node is a group node
 */
export function isGroupNode(node: LayoutNode): boolean {
  return node.type === 'group';
}
