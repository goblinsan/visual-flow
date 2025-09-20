import type { Command, CommandContext } from './types';
import { cloneSpec } from './types';

export interface UngroupNodePayload { id: string; }

interface UngroupSnapshot {
  groupId: string;
  parentId: string;
  index: number;
  children: any[]; // original children nodes
}

function snapshotGroup(root: any, id: string): UngroupSnapshot | null {
  if (id === root.id) return null;
  // Find group and parent
  let parent: any | null = null;
  let group: any | null = null;
  function walk(node: any, p: any | null) {
    if (node.id === id) { group = node; parent = p; return; }
    if (Array.isArray(node.children)) node.children.forEach((c: any) => walk(c, node));
  }
  walk(root, null);
  if (!group || !parent) return null;
  if (!Array.isArray(group.children)) return null;
  const idx = parent.children.findIndex((c: any) => c.id === id);
  if (idx < 0) return null;
  return { groupId: id, parentId: parent.id, index: idx, children: group.children.slice() };
}

export function createUngroupNodeCommand(payload: UngroupNodePayload): Command {
  return {
    id: 'ungroup-node',
    description: `Ungroup node ${payload.id}`,
    apply(ctx: CommandContext) {
      const snap = snapshotGroup(ctx.spec.root, payload.id);
      if (!snap) return ctx.spec;
  const { parentId, children, groupId } = snap;

      function transform(node: any): any {
        if (node.id === parentId && Array.isArray(node.children)) {
          const childIdx = node.children.findIndex((c: any) => c.id === groupId);
          if (childIdx >= 0) {
            const before = node.children.slice(0, childIdx);
            const after = node.children.slice(childIdx + 1);
            const injected = [...before, ...children.map(c => c), ...after];
            return { ...node, children: injected };
          }
        }
        if (Array.isArray(node.children)) return { ...node, children: node.children.map(transform) };
        return node;
      }

      const nextRoot = transform(ctx.spec.root);
      if (nextRoot === ctx.spec.root) return ctx.spec;

      const inverse: Command = {
        id: 'ungroup-node',
        description: `Recreate group ${groupId}`,
        apply(inner) {
          function rewrap(node: any): any {
            if (node.id === parentId && Array.isArray(node.children)) {
              // Find start index of first child in original group sequence
              // We'll need to pull out those exact children by id sequence
              const origIds = children.map(c => c.id);
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
                    { id: groupId, type: 'group', children: seq.map((s: any) => cloneSpec({ root: s }).root) },
                    ...after
                  ]
                };
              }
            }
            if (Array.isArray(node.children)) return { ...node, children: node.children.map(rewrap) };
            return node;
          }
          return { ...inner.spec, root: rewrap(inner.spec.root) };
        }
      };
      (this as any)._inverse = inverse;
      return { ...ctx.spec, root: nextRoot };
    },
    invert() { return (this as any)._inverse || null; }
  };
}
