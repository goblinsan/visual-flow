import type Konva from "konva";
import { rectsIntersect } from "./editing";

export function findNodeIdsIntersecting(
  stage: Konva.Stage,
  worldRect: { x: number; y: number; width: number; height: number }
): string[] {
  const ids = new Set<string>();
  stage.find((node: Konva.Node) => {
    const id = node.id?.();
    if (!id) return false;
    const abs = node.getClientRect?.({ skipShadow: true, skipStroke: true } as { skipShadow?: boolean; skipStroke?: boolean });
    if (!abs) return false;
    const r = { x: abs.x, y: abs.y, width: abs.width, height: abs.height };
    if (rectsIntersect(worldRect, r)) ids.add(id);
    return false;
  });
  return Array.from(ids);
}
