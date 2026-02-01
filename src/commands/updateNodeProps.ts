import type { Command, CommandContext } from './types';
import { findNode, mapNode } from './types';
import type { LayoutNode, LayoutSpec } from '../layout-schema';

export interface UpdateNodePropsPayload {
  id: string;
  props: Record<string, unknown>;
}

/**
 * Creates a command that updates (shallow merges) properties on a node.
 * Captures previous values for inversion.
 */
export function createUpdateNodePropsCommand(payload: UpdateNodePropsPayload): Command {
  let cachedInverse: Command | null = null;

  return {
    id: 'update-node-props',
    description: `Update props of node ${payload.id}`,
    apply(ctx: CommandContext): LayoutSpec {
      const beforeNode = findNode(ctx.spec.root, payload.id);
      if (!beforeNode) return ctx.spec; // no-op if missing
      const prevValues = new Map<string, unknown>();
      const addedKeys = new Set<string>();
      for (const key of Object.keys(payload.props)) {
        if (key in beforeNode) {
          prevValues.set(key, (beforeNode as Record<string, unknown>)[key]);
        } else {
          addedKeys.add(key); // track keys to delete on invert
        }
      }
      const nextRoot = mapNode(ctx.spec.root, payload.id, (node) => applyProps(node, payload.props));
      if (nextRoot === ctx.spec.root) return ctx.spec;
      const next = { ...ctx.spec, root: nextRoot };
      const inverse: Command = {
        id: 'update-node-props',
        description: `Revert props of node ${payload.id}`,
        apply(innerCtx: CommandContext): LayoutSpec {
          return {
            ...innerCtx.spec,
            root: mapNode(innerCtx.spec.root, payload.id, (node) => restoreNode(node, prevValues, addedKeys)),
          };
        },
      };
      cachedInverse = inverse;
      return next;
    },
    invert() {
      return cachedInverse;
    },
  };
}

function applyProps(node: LayoutNode, props: Record<string, unknown>): LayoutNode {
  return { ...node, ...props } as LayoutNode;
}

function restoreNode(node: LayoutNode, prevValues: Map<string, unknown>, addedKeys: Set<string>): LayoutNode {
  const restored = { ...node } as Record<string, unknown>;
  for (const [key, value] of prevValues) {
    restored[key] = value;
  }
  for (const key of addedKeys) {
    delete restored[key];
  }
  return restored as LayoutNode;
}
