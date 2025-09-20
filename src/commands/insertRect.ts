import type { Command, CommandContext } from './types';
import { findNode, mapNode } from './types';

export interface InsertRectPayload {
  parentId: string; // usually root
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  opacity?: number;
  strokeDash?: number[];
}

export function createInsertRectCommand(payload: InsertRectPayload): Command {
  return {
    id: 'insert-rect',
    description: `Insert rect ${payload.id}`,
    apply(ctx: CommandContext) {
      const parent = findNode(ctx.spec.root as any, payload.parentId);
      if (!parent || !Array.isArray(parent.children)) return ctx.spec; // invalid
      // Do not insert if id already exists
      const exists = (function walk(n:any): boolean { if (n.id===payload.id) return true; if (n.children) return n.children.some(walk); return false; })(ctx.spec.root);
      if (exists) return ctx.spec;
      const rectNode: any = {
        id: payload.id,
        type: 'rect',
        position: { ...payload.position },
        size: { width: payload.size.width, height: payload.size.height },
        fill: payload.fill,
        stroke: payload.stroke,
        strokeWidth: payload.strokeWidth,
        radius: payload.radius,
        opacity: payload.opacity,
        strokeDash: payload.strokeDash,
      };
      const nextRoot = mapNode(ctx.spec.root, payload.parentId, (n:any) => ({ ...n, children: [...(n.children||[]), rectNode] }));
      if (nextRoot === ctx.spec.root) return ctx.spec;
      const inverse: Command = {
        id: 'insert-rect',
        description: `Remove rect ${payload.id}`,
        apply(inner) {
          function remove(node:any): any {
            if (!node.children) return node;
            let changed = false;
            const newChildren = node.children.filter((c:any) => {
              if (c.id === payload.id) { changed = true; return false; }
              return true;
            }).map(remove);
            if (!changed) return { ...node, children: newChildren };
            return { ...node, children: newChildren };
          }
          return { ...inner.spec, root: remove(inner.spec.root) };
        }
      };
      (this as any)._inverse = inverse;
      return { ...ctx.spec, root: nextRoot };
    },
    invert() { return (this as any)._inverse || null; }
  };
}
