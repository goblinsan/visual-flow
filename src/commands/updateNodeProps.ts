import type { Command, CommandContext } from './types';
import { findNode, mapNode } from './types';
import type { LayoutSpec } from '../layout-schema';

export interface UpdateNodePropsPayload {
  id: string;
  props: Record<string, any>; // TODO: tighten typing with node shape discriminants
}

/**
 * Creates a command that updates (shallow merges) properties on a node.
 * Captures previous values for inversion.
 */
export function createUpdateNodePropsCommand(payload: UpdateNodePropsPayload): Command {
  return {
    id: 'update-node-props',
    description: `Update props of node ${payload.id}`,
    apply(ctx: CommandContext): LayoutSpec {
      const beforeNode = findNode(ctx.spec.root, payload.id);
      if (!beforeNode) return ctx.spec; // no-op if missing
      const prevValues: Record<string, any> = {};
      const addedKeys: string[] = [];
      for (const k of Object.keys(payload.props)) {
        if (k in beforeNode) {
          prevValues[k] = (beforeNode as any)[k];
        } else {
          addedKeys.push(k); // track keys to delete on invert
        }
      }
      const next = {
        ...ctx.spec,
        root: mapNode(ctx.spec.root, payload.id, (n: any) => ({ ...n, ...payload.props }))
      };
      // Attach invert closure via dynamic property capture
      const inverse: Command = {
        id: 'update-node-props',
        description: `Revert props of node ${payload.id}`,
        apply(innerCtx: CommandContext): LayoutSpec {
          return {
            ...innerCtx.spec,
            root: mapNode(innerCtx.spec.root, payload.id, (n: any) => {
              const restored = { ...n, ...prevValues };
              // Remove keys that were added (did not exist previously)
              for (const k of addedKeys) {
                delete (restored as any)[k];
              }
              return restored;
            })
          };
        }
      };
      // Provide invert implementation
      (this as any)._inverse = inverse; // ephemeral attach
      return next;
    },
  invert(): Command | null {
      // Prefer the captured inverse if present
      return (this as any)._inverse || null;
    }
  };
}
