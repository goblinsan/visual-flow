import type { Command, CommandContext } from './types';
import { findNode, cloneSpec } from './types';

export interface GroupNodesPayload { ids: string[]; }

interface GroupSnapshot {
  parentId: string;
  indices: number[]; // indices of selected nodes inside parent BEFORE grouping (sorted)
  nodes: any[]; // original nodes
}

function validateAndSnapshot(root: any, ids: string[]): GroupSnapshot | null {
  const idSet = new Set(ids);
  // find common parent and ensure no ancestor/descendant mixing
  let parentId: string | null = null;
  const nodeRefs: any[] = [];
  function walk(node: any, parent: any | null) {
    if (idSet.has(node.id)) {
      if (node.id === root.id) return; // disallow root
      if (parentId == null) parentId = parent?.id ?? null; else if (parentId !== (parent?.id ?? null)) parentId = '__MISMATCH__';
      nodeRefs.push({ node, parent });
    }
    if (Array.isArray(node.children)) node.children.forEach((c: any) => walk(c, node));
  }
  walk(root, null);
  if (!nodeRefs.length || parentId == null || parentId === '__MISMATCH__') return null;
  // Disallow grouping if any selected node is itself a group whose child is also selected (nested group scenario)
  for (const ref of nodeRefs) {
    if (ref.node.type === 'group') {
      // If any child of this group is also in selection, treat as invalid to mirror CanvasStage rule
      if (Array.isArray(ref.node.children) && ref.node.children.some((c: any) => idSet.has(c.id))) {
        return null;
      }
      // Additionally disallow grouping a group with other non-group nodes (simpler invariant for now)
      return null;
    }
  }
  // (Ancestor mixing already prevented by CanvasStage selection logic; skip deep validation here for now.)
  // capture indices + nodes from parent
  const parent = findNode(root, parentId);
  if (!parent || !Array.isArray(parent.children)) return null;
  const indices: number[] = [];
  const nodes: any[] = [];
  parent.children.forEach((c: any, idx: number) => {
    if (idSet.has(c.id)) { indices.push(idx); nodes.push(c); }
  });
  if (indices.length < 2) return null;
  return { parentId, indices, nodes };
}

export function createGroupNodesCommand(payload: GroupNodesPayload): Command {
  return {
    id: 'group-nodes',
    description: `Group nodes ${payload.ids.join(',')}`,
    apply(ctx: CommandContext) {
      const snapshot = validateAndSnapshot(ctx.spec.root, payload.ids);
      if (!snapshot) return ctx.spec;
  const { parentId, indices } = snapshot;
      const groupId = `group_${Math.random().toString(36).slice(2,9)}`;

      function transform(node: any): any {
        if (node.id === parentId && Array.isArray(node.children)) {
          const newChildren: any[] = [];
          const selectedSet = new Set(payload.ids);
          const groupChildren: any[] = [];
          node.children.forEach((c: any) => {
            if (selectedSet.has(c.id)) {
              groupChildren.push(c);
            } else {
              newChildren.push(c);
            }
          });
          // insert group at position of first selected index
          const insertAt = Math.min(...indices);
          newChildren.splice(insertAt, 0, {
            id: groupId,
            type: 'group',
            children: groupChildren.map(n => n) // keep references (will be cloned on inverse via snapshot)
          });
          return { ...node, children: newChildren };
        }
        if (Array.isArray(node.children)) return { ...node, children: node.children.map(transform) };
        return node;
      }

      const nextRoot = transform(ctx.spec.root);
      if (nextRoot === ctx.spec.root) return ctx.spec;

      const snapCopy = snapshot; // close over for inverse without TS nullable complaint
      const inverse: Command = {
        id: 'group-nodes',
        description: `Ungroup ${groupId}`,
        apply(inner) {
          function ungroup(node: any): any {
            if (node.id === parentId && Array.isArray(node.children)) {
              const idx = node.children.findIndex((c: any) => c.id === groupId);
              if (idx >= 0) {
                const before = node.children.slice(0, idx);
                const after = node.children.slice(idx + 1);
                const restored = [...before];
                // reinsert originals at original relative order using snapshot.indices ordering
                const zipped = snapCopy.indices.map((i, j) => ({ i, node: cloneSpec({ root: snapCopy.nodes[j] }).root }));
                zipped.sort((a,b)=>a.i-b.i);
                zipped.forEach(z => restored.push(z.node));
                restored.push(...after);
                return { ...node, children: restored };
              }
            }
            if (Array.isArray(node.children)) return { ...node, children: node.children.map(ungroup) };
            return node;
          }
          return { ...inner.spec, root: ungroup(inner.spec.root) };
        }
      };
      (this as any)._inverse = inverse;
      return { ...ctx.spec, root: nextRoot };
    },
    invert() { return (this as any)._inverse || null; }
  };
}
