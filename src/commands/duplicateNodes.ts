import type { LayoutNode, FrameNode } from '../layout-schema';
import type { Command, CommandContext, NodeWithChildren } from './types';
import { cloneNode, findNode, nodeHasChildren } from './types';

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
      const root: FrameNode = ctx.spec.root;
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
        const clone = cloneNode(original);
        // assign new id
        clone.id = generateId(original.id, 0, allIds);
        allIds.add(clone.id);
        createdIds.push(clone.id);
        // insert sibling after original (same parent index+1)
        function insert(node: NodeWithChildren): NodeWithChildren {
          const idx = node.children.findIndex(child => child.id === id);
          if (idx >= 0) {
            const newChildren = node.children.slice();
            newChildren.splice(idx + 1, 0, clone);
            return { ...node, children: newChildren } as NodeWithChildren;
          }
          const mapped: LayoutNode[] = node.children.map(child => nodeHasChildren(child) ? insert(child) : child);
          const changed = node.children.some((child, index) => child !== mapped[index]);
          return changed ? ({ ...node, children: mapped } as NodeWithChildren) : node;
        }
        nextRoot = insert(nextRoot) as FrameNode;
      });

      if (!createdIds.length) return ctx.spec;

      const inverse: Command = {
        id: 'duplicate-nodes',
        description: `Remove duplicated nodes ${createdIds.join(',')}`,
        apply(innerCtx) {
          function remove(node: NodeWithChildren): NodeWithChildren {
            const filtered = node.children
              .filter(child => !createdIds.includes(child.id))
              .map(child => nodeHasChildren(child) ? remove(child) : child);
            return { ...node, children: filtered } as NodeWithChildren;
          }
          return { ...innerCtx.spec, root: remove(innerCtx.spec.root) as FrameNode };
        }
      };
      cachedInverse = inverse;
      return { ...ctx.spec, root: nextRoot as FrameNode };
    },
    invert() { return cachedInverse; }
  };
}
