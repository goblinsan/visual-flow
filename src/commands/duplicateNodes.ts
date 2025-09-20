import type { Command, CommandContext } from './types';
import { cloneSpec, findNode } from './types';

export interface DuplicateNodesPayload { ids: string[]; }

/** Generate a deterministic duplicate id based on base id and increment */
function generateId(base: string, attempt: number, existing: Set<string>): string {
  let id = `${base}_copy`;
  if (attempt > 0) id = `${base}_copy${attempt+1}`; // _copy2, _copy3...
  while (existing.has(id)) {
    attempt++;
    id = `${base}_copy${attempt+1}`;
  }
  return id;
}

export function createDuplicateNodesCommand(payload: DuplicateNodesPayload): Command {
  return {
    id: 'duplicate-nodes',
    description: `Duplicate nodes ${payload.ids.join(',')}`,
    apply(ctx: CommandContext) {
      const root = ctx.spec.root;
      const allIds = new Set<string>();
      (function collect(n: any) { allIds.add(n.id); if (Array.isArray(n.children)) n.children.forEach(collect); })(root);
      const createdIds: string[] = [];

      let nextRoot = root;
      payload.ids.forEach(id => {
        const original = findNode(nextRoot, id);
        if (!original || original.id === ctx.spec.root.id) return;
        // clone node
        const clone = cloneSpec({ root: original }).root;
        // assign new id
        clone.id = generateId(original.id, 0, allIds);
        allIds.add(clone.id);
        createdIds.push(clone.id);
        // insert sibling after original (same parent index+1)
        function insert(node: any): any {
          if (!node.children) return node;
          const idx = node.children.findIndex((c: any) => c.id === id);
          if (idx >= 0) {
            const newChildren = node.children.slice();
            newChildren.splice(idx + 1, 0, clone);
            return { ...node, children: newChildren };
          }
          let changed = false;
            const children = node.children.map((c: any) => {
              const v = insert(c);
              if (v !== c) changed = true;
              return v;
            });
            return changed ? { ...node, children } : node;
        }
        nextRoot = insert(nextRoot);
      });

      if (!createdIds.length) return ctx.spec;

      const inverse: Command = {
        id: 'duplicate-nodes',
        description: `Remove duplicated nodes ${createdIds.join(',')}`,
        apply(innerCtx) {
          function remove(root: any): any {
            if (!root.children) return root;
            const filtered = root.children.filter((c: any) => !createdIds.includes(c.id)).map(remove);
            if (filtered.length === root.children.length) return { ...root, children: filtered.map(remove) }; // only descend
            return { ...root, children: filtered };
          }
          return { ...innerCtx.spec, root: remove(innerCtx.spec.root) };
        }
      };
      (this as any)._inverse = inverse;
      return { ...ctx.spec, root: nextRoot };
    },
    invert() { return (this as any)._inverse || null; }
  };
}
