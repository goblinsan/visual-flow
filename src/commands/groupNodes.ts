import type { Command, CommandContext, NodeWithChildren } from './types';
import { findNode, nodeHasChildren, cloneNode } from './types';
import type { LayoutNode, GroupNode, FrameNode } from '../layout-schema';

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
      const { parentId, indices, nodes } = snapshot;
      const root = ctx.spec.root;
      const groupId = `group_${Math.random().toString(36).slice(2,9)}`;

      function transform(node: NodeWithChildren): NodeWithChildren {
        if (node.id === parentId) {
          const selectedSet = new Set(payload.ids);
          const newChildren: LayoutNode[] = [];
          const groupedChildren: LayoutNode[] = [];
          node.children.forEach((child) => {
            if (selectedSet.has(child.id)) {
              groupedChildren.push(child);
            } else {
              newChildren.push(child);
            }
          });
          const groupedNode: GroupNode = {
            id: groupId,
            type: 'group',
            children: groupedChildren,
          };
          const insertAt = Math.min(...indices);
          newChildren.splice(insertAt, 0, groupedNode);
          return { ...node, children: newChildren };
        }
        return { ...node, children: node.children.map(child => nodeHasChildren(child) ? transform(child) : child) };
      }

      const nextRoot = transform(root);
      if (nextRoot === root) return ctx.spec;

      const inverseNodes = nodes.map(n => cloneNode(n));
      const inverse: Command = {
        id: 'group-nodes',
        description: `Ungroup ${groupId}`,
        apply(innerCtx) {
          const currentRoot = innerCtx.spec.root;

          function ungroup(node: NodeWithChildren): NodeWithChildren {
            if (node.id === parentId) {
              const idx = node.children.findIndex(child => child.id === groupId);
              if (idx >= 0) {
                const filtered = node.children.filter((child) => child.id !== groupId);
                const zipped = indices
                  .map((i, j) => ({ i, node: cloneNode(inverseNodes[j]) }))
                  .sort((a, b) => a.i - b.i);
                const restored: LayoutNode[] = [];
                let nextInsert = 0;
                filtered.forEach((child) => {
                  while (nextInsert < zipped.length && zipped[nextInsert].i === restored.length) {
                    restored.push(zipped[nextInsert].node);
                    nextInsert += 1;
                  }
                  restored.push(child);
                });
                while (nextInsert < zipped.length) {
                  restored.push(zipped[nextInsert].node);
                  nextInsert += 1;
                }
                return { ...node, children: restored };
              }
            }
            return { ...node, children: node.children.map(child => nodeHasChildren(child) ? ungroup(child) : child) };
          }

          return { ...innerCtx.spec, root: ungroup(currentRoot) as FrameNode };
        }
      };
      cachedInverse = inverse;
      return { ...ctx.spec, root: nextRoot as FrameNode };
    },
    invert() { return cachedInverse; },
  };
}
