import type { Command, CommandContext } from './types';
import { cloneSpec } from './types';

export interface DeleteNodesPayload { ids: string[]; }

interface RemovedNodeInfo {
  id: string;
  parentId: string;
  index: number;
  node: any;
}

/** Find parent and remove children; returns {nextRoot, removed[]} */
function removeNodes(root: any, ids: Set<string>): { root: any; removed: RemovedNodeInfo[] } {
  const removed: RemovedNodeInfo[] = [];
  function walk(node: any): any {
    if (!node) return node;
    if (!node.children || !Array.isArray(node.children)) return node;
    let changed = false;
    const newChildren: any[] = [];
    node.children.forEach((child: any, idx: number) => {
      if (ids.has(child.id)) {
        removed.push({ id: child.id, parentId: node.id, index: idx, node: child });
        changed = true;
        return; // skip adding
      }
      const newChild = walk(child);
      if (newChild !== child) changed = true;
      newChildren.push(newChild);
    });
    if (!changed) return node;
    return { ...node, children: newChildren };
  }
  const next = walk(root);
  return { root: next, removed };
}

export function createDeleteNodesCommand(payload: DeleteNodesPayload): Command {
  return {
    id: 'delete-nodes',
    description: `Delete nodes ${payload.ids.join(',')}`,
    apply(ctx: CommandContext) {
      const idSet = new Set(payload.ids.filter(id => id !== ctx.spec.root.id));
      if (!idSet.size) return ctx.spec;
      const { root, removed } = removeNodes(ctx.spec.root, idSet);
      if (!removed.length) return ctx.spec;
      // capture inverse data
      const inverse: Command = {
        id: 'delete-nodes',
        description: `Restore nodes ${removed.map(r=>r.id).join(',')}`,
        apply(innerCtx) {
          // Reinsert nodes at original parent + index
          const byParent: Record<string, RemovedNodeInfo[]> = {};
          removed.forEach(r => { (byParent[r.parentId] = byParent[r.parentId] || []).push(r); });
          Object.values(byParent).forEach(list => list.sort((a,b)=>a.index-b.index));

          function restore(node: any): any {
            if (!node.children) return node;
            const inserts = byParent[node.id];
            if (inserts) {
              const existing = node.children;
              const result: any[] = [];
              let insertIdx = 0;
              let originalPos = 0; // original index position reference
              for (const child of existing) {
                while (insertIdx < inserts.length && inserts[insertIdx].index === originalPos) {
                  result.push(cloneSpec({ root: inserts[insertIdx].node }).root);
                  insertIdx++; originalPos++;
                }
                result.push(restore(child));
                originalPos++;
              }
              // remaining inserts at tail (if their original index was after the last surviving child)
              while (insertIdx < inserts.length && inserts[insertIdx].index === originalPos) {
                result.push(cloneSpec({ root: inserts[insertIdx].node }).root);
                insertIdx++; originalPos++;
              }
              return { ...node, children: result };
            }
            return { ...node, children: node.children.map(restore) };
          }
          return { ...innerCtx.spec, root: restore(innerCtx.spec.root) };
        }
      };
      (this as any)._inverse = inverse;
      return { ...ctx.spec, root };
    },
    invert() {
      return (this as any)._inverse || null;
    }
  };
}
