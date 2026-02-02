import type { Command, CommandContext, NodeWithChildren } from './types';
import { cloneNode, nodeHasChildren } from './types';
import type { LayoutNode, FrameNode } from '../layout-schema';

export interface UngroupNodePayload { id: string; }

interface UngroupSnapshot {
  groupId: string;
  parentId: string;
  children: LayoutNode[];
}

function snapshotGroup(root: LayoutNode, id: string): UngroupSnapshot | null {
  if (id === root.id) return null;
  let parent: NodeWithChildren | null = null;
  let group: NodeWithChildren | null = null;
  function walk(node: LayoutNode, p: NodeWithChildren | null) {
    if (node.id === id) {
      if (nodeHasChildren(node)) {
        group = node;
        parent = p;
      }
      return;
    }
    if (nodeHasChildren(node)) {
      node.children.forEach((child) => walk(child, node));
    }
  }
  walk(root, null);
  if (!group || !parent) return null;
  const parentNode = parent as NodeWithChildren;
  const groupNode = group as NodeWithChildren;
  const hasGroup = parentNode.children.some((child: LayoutNode) => child.id === id);
  if (!hasGroup) return null;
  return { groupId: id, parentId: parentNode.id, children: groupNode.children.map((child: LayoutNode) => cloneNode(child)) };
}

export function createUngroupNodeCommand(payload: UngroupNodePayload): Command {
  let cachedInverse: Command | null = null;
  return {
    id: 'ungroup-node',
    description: `Ungroup node ${payload.id}`,
    apply(ctx: CommandContext) {
      const snap = snapshotGroup(ctx.spec.root, payload.id);
      if (!snap) return ctx.spec;
      const { parentId, children, groupId } = snap;
      const root: FrameNode = ctx.spec.root;

      function transform(node: NodeWithChildren): NodeWithChildren {
        if (node.id === parentId) {
          const childIdx = node.children.findIndex((child) => child.id === groupId);
          if (childIdx >= 0) {
            const before = node.children.slice(0, childIdx);
            const after = node.children.slice(childIdx + 1);
            const restored = [...before, ...children.map((child) => cloneNode(child)), ...after];
            return { ...node, children: restored };
          }
        }
        return { ...node, children: node.children.map((child) => (nodeHasChildren(child) ? transform(child) : child)) };
      }

      const nextRoot = transform(root);
      if (nextRoot === ctx.spec.root) return ctx.spec;

      const inverse: Command = {
        id: 'ungroup-node',
        description: `Recreate group ${groupId}`,
        apply(inner) {
          const currentRoot: FrameNode = inner.spec.root;
          function rewrap(node: NodeWithChildren): NodeWithChildren {
            if (node.id === parentId) {
              const origIds = children.map((c) => c.id);
              let start = -1;
              for (let i = 0; i <= node.children.length - origIds.length; i++) {
                let match = true;
                for (let j = 0; j < origIds.length; j++) {
                  if (node.children[i + j].id !== origIds[j]) { match = false; break; }
                }
                if (match) { start = i; break; }
              }
              if (start >= 0) {
                const before = node.children.slice(0, start);
                const seq = node.children.slice(start, start + origIds.length);
                const after = node.children.slice(start + origIds.length);
                return {
                  ...node,
                  children: [
                    ...before,
                    {
                      id: groupId,
                      type: 'group',
                      children: seq.map((s) => cloneNode(s)),
                    },
                    ...after
                  ],
                };
              }
            }
            return { ...node, children: node.children.map((child) => (nodeHasChildren(child) ? rewrap(child) : child)) };
          }
          return { ...inner.spec, root: rewrap(currentRoot) as FrameNode };
        }
      };
      cachedInverse = inverse;
      return { ...ctx.spec, root: nextRoot as FrameNode };
    },
    invert() { return cachedInverse; }
  };
}
