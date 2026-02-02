import type { LayoutNode, FrameNode } from '../layout-schema';
import type { Command, CommandContext, NodeWithChildren } from './types';
import { cloneNode, nodeHasChildren } from './types';

export interface DeleteNodesPayload { ids: string[]; }

interface RemovedNodeInfo {
  id: string;
  parentId: string;
  index: number;
  node: LayoutNode;
}

/** Find parent and remove children; returns {nextRoot, removed[]} */
function removeNodes(root: NodeWithChildren, ids: Set<string>): { root: NodeWithChildren; removed: RemovedNodeInfo[] } {
  const removed: RemovedNodeInfo[] = [];
  function walk(node: NodeWithChildren): NodeWithChildren {
    let changed = false;
    const nextChildren: LayoutNode[] = [];
    node.children.forEach((child, idx) => {
      if (ids.has(child.id)) {
        removed.push({ id: child.id, parentId: node.id, index: idx, node: child });
        changed = true;
        return;
      }
      if (nodeHasChildren(child)) {
        const newChild = walk(child);
        if (newChild !== child) changed = true;
        nextChildren.push(newChild);
      } else {
        nextChildren.push(child);
      }
    });
    if (!changed) return node;
    return { ...node, children: nextChildren } as NodeWithChildren;
  }
  const nextRoot = walk(root);
  return { root: nextRoot, removed };
}

export function createDeleteNodesCommand(payload: DeleteNodesPayload): Command {
  let cachedInverse: Command | null = null;

  return {
    id: 'delete-nodes',
    description: `Delete nodes ${payload.ids.join(',')}`,
    apply(ctx: CommandContext) {
      const idSet = new Set(payload.ids.filter(id => id !== ctx.spec.root.id));
      if (!idSet.size) return ctx.spec;
      const { root, removed } = removeNodes(ctx.spec.root, idSet);
      if (!removed.length) return ctx.spec;
      const inverse: Command = {
        id: 'delete-nodes',
        description: `Restore nodes ${removed.map(r => r.id).join(',')}`,
        apply(innerCtx) {
          const byParent = new Map<string, RemovedNodeInfo[]>();
          removed.forEach(r => {
            const list = byParent.get(r.parentId) || [];
            list.push(r);
            byParent.set(r.parentId, list);
          });
          byParent.forEach(list => list.sort((a, b) => a.index - b.index));

          function restore(node: LayoutNode): LayoutNode {
            if (!nodeHasChildren(node)) return node;
            const inserts = byParent.get(node.id) ?? [];
            const existing = node.children;
            const result: LayoutNode[] = [];
            let insertIdx = 0;
            let originalPos = 0;
            for (const child of existing) {
              while (insertIdx < inserts.length && inserts[insertIdx].index === originalPos) {
                const restored = cloneNode(inserts[insertIdx].node);
                result.push(restore(restored));
                insertIdx++;
                originalPos++;
              }
              result.push(restore(child));
              originalPos++;
            }
            while (insertIdx < inserts.length) {
              const restored = cloneNode(inserts[insertIdx].node);
              result.push(restore(restored));
              insertIdx++;
              originalPos++;
            }
            return { ...node, children: result } as NodeWithChildren;
          }

          return { ...innerCtx.spec, root: restore(innerCtx.spec.root) as FrameNode };
        },
      };
      cachedInverse = inverse;
      return { ...ctx.spec, root: root as FrameNode };
    },
    invert() {
      return cachedInverse;
    },
  };
}
