import type { Command, CommandContext } from './types';
import { findNode, mapNode } from './types';
import type { LayoutNode, FrameNode, Pos, Size, TextNode } from '../layout-schema';

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

interface TransformSnapshot {
  position?: Pos;
  size?: Size;
  rotation?: number;
  textScaleX?: number;
  textScaleY?: number;
}

export function createTransformNodesCommand(payload: TransformNodesPayload): Command {
  let cachedInverse: Command | null = null;

  return {
    id: 'transform-nodes',
    description: `Transform ${payload.updates.map((u) => u.id).join(',')}`,
    apply(ctx: CommandContext) {
      if (!payload.updates.length) return ctx.spec;
      const toApply = payload.updates.filter((u) => u.id !== ctx.spec.root.id);
      if (!toApply.length) return ctx.spec;

      const prev = new Map<string, TransformSnapshot>();
      toApply.forEach((u) => {
        const node = findNode(ctx.spec.root, u.id);
        if (!node) return;
        const snap: TransformSnapshot = {};
        if (u.position && node.position) snap.position = { ...node.position };
        if (u.size && node.size) snap.size = { ...node.size };
        if (typeof node.rotation === 'number') snap.rotation = node.rotation;
        if (node.type === 'text') {
          if (typeof node.textScaleX === 'number') snap.textScaleX = node.textScaleX;
          if (typeof node.textScaleY === 'number') snap.textScaleY = node.textScaleY;
        }
        prev.set(u.id, snap);
      });

      const root: FrameNode = ctx.spec.root;
      let nextRoot: FrameNode = root;
      toApply.forEach((u) => {
        nextRoot = mapNode(nextRoot, u.id, (node) => {
          const patch: LayoutNode = { ...node };
          if (u.position && patch.position) patch.position = { ...patch.position, ...u.position };
          if (u.size && patch.size) patch.size = { ...patch.size, ...u.size };
          if (typeof u.rotation === 'number') patch.rotation = u.rotation;
          if (node.type === 'text') {
            const textPatch = patch as TextNode;
            if (typeof u.textScaleX === 'number') textPatch.textScaleX = u.textScaleX;
            if (typeof u.textScaleY === 'number') textPatch.textScaleY = u.textScaleY;
          }
          return patch;
        });
      });

      if (nextRoot === root) return ctx.spec;

      const inverse: Command = {
        id: 'transform-nodes',
        description: `Revert transforms ${toApply.map((u) => u.id).join(',')}`,
        apply(inner) {
          let root2: FrameNode = inner.spec.root;
          toApply.forEach((u) => {
            const snap = prev.get(u.id);
            if (!snap) return;
            root2 = mapNode(root2, u.id, (node) => {
              const patch: LayoutNode = { ...node };
              if (snap.position) patch.position = { ...snap.position };
              if (snap.size) patch.size = { ...snap.size };
              if ('rotation' in snap) patch.rotation = snap.rotation;
              if (node.type === 'text') {
                const textPatch = patch as TextNode;
                if ('textScaleX' in snap) textPatch.textScaleX = snap.textScaleX;
                if ('textScaleY' in snap) textPatch.textScaleY = snap.textScaleY;
              }
              return patch;
            });
          });
          return { ...inner.spec, root: root2 };
        },
      };
      cachedInverse = inverse;
      return { ...ctx.spec, root: nextRoot };
    },
    invert() {
      return cachedInverse;
    },
  };
}
