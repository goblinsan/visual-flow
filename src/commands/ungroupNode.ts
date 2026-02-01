import type { Command, CommandContext } from './types';
import { cloneSpec, nodeHasChildren } from './types';
import type { LayoutNode } from '../layout-schema';

export interface UngroupNodePayload { id: string; }

interface UngroupSnapshot {
  groupId: string;
  parentId: string;
  index: number;
  children: LayoutNode[];
}

function snapshotGroup(root: LayoutNode, id: string): UngroupSnapshot | null {
  if (id === root.id) return null;
  let parent: LayoutNode | null = null;
  let group: LayoutNode | null = null;
  function walk(node: LayoutNode, p: LayoutNode | null) {
    if (node.id === id) {
      group = node;
      parent = p;
      return;
    }
    if (nodeHasChildren(node)) node.children.forEach((child) => walk(child, node));
  }
  walk(root, null);
  if (!group || !parent || !nodeHasChildren(group)) return null;
  const idx = parent.children.findIndex((child) => child.id === id);
  if (idx < 0) return null;
  return { groupId: id, parentId: parent.id, index: idx, children: [...group.children] };
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

      function transform(node: LayoutNode): LayoutNode {
        if (node.id === parentId && nodeHasChildren(node)) {
          const childIdx = node.children.findIndex((child) => child.id === groupId);
          if (childIdx >= 0) {
            const before = node.children.slice(0, childIdx);
            const after = node.children.slice(childIdx + 1);
            const injected = [...before, ...children.map((child) => cloneLayoutNode(child)), ...after];
            return { ...node, children: injected };
          }
        }
        if (nodeHasChildren(node)) return { ...node, children: node.children.map(transform) };
        return node;
      }

      const nextRoot = transform(ctx.spec.root);
      if (nextRoot === ctx.spec.root) return ctx.spec;

      const inverse: Command = {
        id: 'ungroup-node',
        description: `Recreate group ${groupId}`,
        apply(inner) {
          function rewrap(node: LayoutNode): LayoutNode {
            if (node.id === parentId && nodeHasChildren(node)) {
              // Find start index of first child in original group sequence
              // We'll need to pull out those exact children by id sequence
              const origIds = children.map((c) => c.id);
              let start = -1;
              for (let i=0; i<= node.children.length - origIds.length; i++) {
                let match = true;
                for (let j=0; j<origIds.length; j++) {
                  if (node.children[i+j].id !== origIds[j]) { match = false; break; }
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
                      children: seq.map((s) => cloneLayoutNode(s)),
                    },
                    ...after
                  ]
                };
              }
            }
            if (nodeHasChildren(node)) return { ...node, children: node.children.map(rewrap) };
            return node;
          }
          return { ...inner.spec, root: rewrap(inner.spec.root) };
        }
      };
      cachedInverse = inverse;
      return { ...ctx.spec, root: nextRoot };
    },
    invert() { return cachedInverse; }
  };
}

function cloneLayoutNode<T extends LayoutNode>(node: T): T {
  return cloneSpec({ root: node }).root as T;
}
