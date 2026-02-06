import { useCallback } from 'react';
import type Konva from 'konva';

export function useSelectionManager(
  stageRef: React.RefObject<Konva.Stage | null>,
  rootId: string,
  getTopContainerAncestor: (stage: Konva.Stage, id: string) => string
) {
  const normalizeSelection = useCallback((ids: string[]) => {
    const stage = stageRef.current;
    if (!stage) return ids;
    const promoted = ids.map(id => getTopContainerAncestor(stage, id));
    const out: string[] = [];
    const seen = new Set<string>();
    for (const id of promoted) {
      if (id === rootId) continue;
      if (!seen.has(id)) { seen.add(id); out.push(id); }
    }
    return out;
  }, [getTopContainerAncestor, rootId, stageRef]);

  return {
    normalizeSelection,
  };
}
