import type { Command, CommandContext } from './types';
import { findNode, nodeHasChildren } from './types';
import type { LayoutNode, GroupNode } from '../layout-schema';

export interface GroupNodesPayload { ids: string[]; }

interface GroupSnapshot {
  parentId: string;
  indices: number[]; // indices of selected nodes inside parent BEFORE grouping (sorted)
  nodes: LayoutNode[]; // original nodes
}

function validateAndSnapshot(root: LayoutNode, ids: string[]): GroupSnapshot | null {
  const idSet = new Set(ids);
  // find common parent and ensure no ancestor/descendant mixing
  let parentId: string | null = null;
  const nodeRefs: { node: LayoutNode; parent: LayoutNode | null }[] = [];
  function walk(node: LayoutNode, parent: LayoutNode | null) {
    if (idSet.has(node.id)) {
      if (node.id === root.id) return; // disallow root
      if (parentId == null) parentId = parent?.id ?? null; else if (parentId !== (parent?.id ?? null)) parentId = '__MISMATCH__';
      nodeRefs.push({ node, parent });
    }
    if (nodeHasChildren(node)) node.children.forEach((c) => walk(c, node));
  }
  walk(root, null);
  if (!nodeRefs.length || parentId == null || parentId === '__MISMATCH__') return null;
  // Disallow grouping if any selected node is itself a group whose child is also selected (nested group scenario)
  for (const ref of nodeRefs) {
    if (ref.node.type === 'group') {
      // If any child of this group is also in selection, treat as invalid to mirror CanvasStage rule
      if (nodeHasChildren(ref.node) && ref.node.children.some((c) => idSet.has(c.id))) {
        return null;
      }
      // Additionally disallow grouping a group with other non-group nodes (simpler invariant for now)
      return null;
    }
  }
  // (Ancestor mixing already prevented by CanvasStage selection logic; skip deep validation here for now.)
  // capture indices + nodes from parent
  const parent = findNode(root, parentId);
  if (!parent || !nodeHasChildren(parent)) return null;
  const indices: number[] = [];
  const nodes: LayoutNode[] = [];
  parent.children.forEach((c, idx: number) => {
    if (idSet.has(c.id)) { indices.push(idx); nodes.push(c); }
  });
  if (indices.length < 2) return null;
  return { parentId, indices, nodes };
}

export function createGroupNodesCommand(payload: GroupNodesPayload): Command {
  let cachedInverse: Command | null = null;
  return {
    id: 'group-nodes',
    description: `Group nodes ${payload.ids.join(',')}`,
    apply(ctx: CommandContext) {
        const snapshot = validateAndSnapshot(ctx.spec.root, payload.ids);
        if (!snapshot) return ctx.spec;
        const { parentId, indices } = snapshot;
      const groupId = `group_${Math.random().toString(36).slice(2,9)}`;

      function transform(node: LayoutNode): LayoutNode {
        if (node.id === parentId && nodeHasChildren(node)) {
          const newChildren: LayoutNode[] = [];
          const selectedSet = new Set(payload.ids);
          const groupChildren: LayoutNode[] = [];
          node.children.forEach((c) => {
            if (selectedSet.has(c.id)) {
              groupChildren.push(c);
            } else {
              newChildren.push(c);
            }
          });
          // insert group at position of first selected index
          const insertAt = Math.min(...indices);
          const groupedNode: GroupNode = {
            id: groupId,
            type: 'group',
            children: groupChildren.map((n) => n),
          };
          newChildren.splice(insertAt, 0, groupedNode);
          return { ...node, children: newChildren };
        }
        if (nodeHasChildren(node)) return { ...node, children: node.children.map(transform) };
        return node;
      }

      const nextRoot = transform(ctx.spec.root);
      if (nextRoot === ctx.spec.root) return ctx.spec;

      const snapCopy = snapshot; // close over for inverse without TS nullable complaint
      const inverse: Command = {
        id: 'group-nodes',
        description: `Ungroup ${groupId}`,
        apply(inner) {
          function ungroup(node: LayoutNode): LayoutNode {
            if (node.id === parentId && nodeHasChildren(node)) {
              const idx = node.children.findIndex((c) => c.id === groupId);
              if (idx >= 0) {
                const before = node.children.slice(0, idx);
                const after = node.children.slice(idx + 1);
                const restored = [...before];
                // reinsert originals at original relative order using snapshot.indices ordering
                const zipped = snapCopy.indices
                  .map((i, j) => ({ i, node: cloneLayoutNode(snapCopy.nodes[j]) }))
                  .sort((a,b) => a.i - b.i);
                zipped.forEach((z) => restored.push(z.node));
                restored.push(...after);
                return { ...node, children: restored };
              }
            }
            if (nodeHasChildren(node)) return { ...node, children: node.children.map(ungroup) };
            return node;
          }
          return { ...inner.spec, root: ungroup(inner.spec.root) };
        }
      };
      cachedInverse = inverse;
      return { ...ctx.spec, root: nextRoot };
    },
    invert() { return cachedInverse; }
  };
}

function cloneLayoutNode<T extends LayoutNode>(node: T): T {
  return JSON.parse(JSON.stringify(node)) as T;
}
