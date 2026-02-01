import type {
  LayoutSpec,
  LayoutNode,
  FrameNode,
  GroupNode,
  StackNode,
  GridNode,
  BoxNode,
} from '../layout-schema';

/**
 * CommandContext provided at execution time (can be expanded later with services, history, etc.).
 */
export interface CommandContext {
  spec: LayoutSpec; // current spec prior to apply
  selection: string[]; // current selection state (pre-command)
}

/** Generic mutation command interface */
export interface Command {
  id: string; // stable identifier (e.g. 'update-node-props')
  description?: string;
  /** Apply the command, returning the next spec */
  apply(ctx: CommandContext): LayoutSpec;
  /** Optional: produce an inverse command using pre/post snapshots */
  invert?(before: LayoutSpec, after: LayoutSpec): Command | null;
}

/** Helper: deep clone spec (cheap for now; can optimize later) */
export type NodeWithChildren = FrameNode | GroupNode | StackNode | GridNode | BoxNode;

const NODE_WITH_CHILDREN_TYPES = new Set(['frame', 'group', 'stack', 'grid', 'box']);

export function nodeHasChildren(node: LayoutNode): node is NodeWithChildren {
  return NODE_WITH_CHILDREN_TYPES.has(node.type) && Array.isArray((node as NodeWithChildren).children);
}

export function cloneSpec(spec: LayoutSpec): LayoutSpec {
  return JSON.parse(JSON.stringify(spec));
}

/** Utility: find node by id within the layout tree */
export function findNode(root: LayoutNode | null | undefined, id: string): LayoutNode | null {
  if (!root) return null;
  if (root.id === id) return root;
  if (!nodeHasChildren(root)) return null;
  for (const child of root.children) {
    const result = findNode(child, id);
    if (result) return result;
  }
  return null;
}

/** Immutable map helper for nodes containing children */
export function mapNode(root: LayoutNode, id: string, fn: (n: LayoutNode) => LayoutNode): LayoutNode {
  if (root.id === id) return fn(root);
  if (!nodeHasChildren(root)) return root;
  const children = root.children.map(child => mapNode(child, id, fn));
  return { ...root, children } as LayoutNode;
}
