import type { LayoutNode } from '../layout-schema';
import type { Command, CommandContext } from './types';
import { cloneSpec, findNode, nodeHasChildren } from './types';

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
  let cachedInverse: Command | null = null;

  return {
    id: 'duplicate-nodes',
    description: `Duplicate nodes ${payload.ids.join(',')}`,
    apply(ctx: CommandContext) {
      const root = ctx.spec.root;
      const allIds = new Set<string>();
      (function collect(node: LayoutNode) {
        allIds.add(node.id);
        if (nodeHasChildren(node)) node.children.forEach(collect);
      })(root);
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
        function insert(node: LayoutNode): LayoutNode {
          if (!nodeHasChildren(node)) return node;
          const idx = node.children.findIndex(child => child.id === id);
          if (idx >= 0) {
            const newChildren = node.children.slice();
            newChildren.splice(idx + 1, 0, clone);
            return { ...node, children: newChildren } as LayoutNode;
          }
          const mapped = node.children.map(child => insert(child));
          const changed = mapped.some((child, index) => child !== node.children[index]);
          return changed ? ({ ...node, children: mapped } as LayoutNode) : node;
        }
        nextRoot = insert(nextRoot);
      });

      if (!createdIds.length) return ctx.spec;

      const inverse: Command = {
        id: 'duplicate-nodes',
        description: `Remove duplicated nodes ${createdIds.join(',')}`,
        apply(innerCtx) {
          function remove(node: LayoutNode): LayoutNode {
            if (!nodeHasChildren(node)) return node;
            const filtered = node.children
              .filter(child => !createdIds.includes(child.id))
              .map(remove);
            return { ...node, children: filtered } as LayoutNode;
          }
          return { ...innerCtx.spec, root: remove(innerCtx.spec.root) };
        }
      };
      cachedInverse = inverse;
      return { ...ctx.spec, root: nextRoot };
    },
    invert() { return cachedInverse; }
  };
}
