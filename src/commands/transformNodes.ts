import type { Command, CommandContext } from './types';
import { findNode, mapNode } from './types';

export interface TransformUpdate {
  id: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  rotation?: number; // absolute degrees
  textScaleX?: number;
  textScaleY?: number;
}

export interface TransformNodesPayload {
  updates: TransformUpdate[];
}

export function createTransformNodesCommand(payload: TransformNodesPayload): Command {
  return {
    id: 'transform-nodes',
    description: `Transform ${payload.updates.map(u=>u.id).join(',')}`,
    apply(ctx: CommandContext) {
      if (!payload.updates.length) return ctx.spec;
      const prev: Record<string, any> = {};
      const toApply = payload.updates.filter(u => u.id !== ctx.spec.root.id);
      if (!toApply.length) return ctx.spec;

      // capture previous state for each node (only fields we might mutate)
      toApply.forEach(u => {
        const node = findNode(ctx.spec.root as any, u.id);
        if (!node) return;
        const snap: any = {};
        if (u.position && node.position) snap.position = { ...node.position };
        if (u.size && node.size) snap.size = { ...node.size };
        if (typeof u.rotation === 'number' && typeof (node as any).rotation === 'number') snap.rotation = (node as any).rotation;
        if (typeof u.textScaleX === 'number' && typeof (node as any).textScaleX === 'number') snap.textScaleX = (node as any).textScaleX;
        if (typeof u.textScaleY === 'number' && typeof (node as any).textScaleY === 'number') snap.textScaleY = (node as any).textScaleY;
        prev[u.id] = snap;
      });

      let nextRoot: any = ctx.spec.root;
      toApply.forEach(u => {
        nextRoot = mapNode(nextRoot, u.id, (n: any) => {
          const patch: any = { ...n };
          if (u.position && n.position) patch.position = { ...n.position, ...u.position };
          if (u.size && n.size) patch.size = { ...n.size, ...u.size };
          if (typeof u.rotation === 'number') patch.rotation = u.rotation;
          if (typeof u.textScaleX === 'number') patch.textScaleX = u.textScaleX;
          if (typeof u.textScaleY === 'number') patch.textScaleY = u.textScaleY;
          return patch;
        });
      });

      if (nextRoot === ctx.spec.root) return ctx.spec;

      const inverse: Command = {
        id: 'transform-nodes',
        description: `Revert transforms ${toApply.map(u=>u.id).join(',')}`,
        apply(inner) {
          let root2: any = inner.spec.root;
          toApply.forEach(u => {
            const snap = prev[u.id];
            if (!snap) return;
            root2 = mapNode(root2, u.id, (n: any) => {
              const patch: any = { ...n };
              if (snap.position) patch.position = { ...snap.position };
              if (snap.size) patch.size = { ...snap.size };
              if ('rotation' in snap) patch.rotation = snap.rotation;
              if ('textScaleX' in snap) patch.textScaleX = snap.textScaleX;
              if ('textScaleY' in snap) patch.textScaleY = snap.textScaleY;
              return patch;
            });
          });
          return { ...inner.spec, root: root2 };
        }
      };
      (this as any)._inverse = inverse;
      return { ...ctx.spec, root: nextRoot };
    },
    invert() { return (this as any)._inverse || null; }
  };
}
