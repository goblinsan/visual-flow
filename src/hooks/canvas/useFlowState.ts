/**
 * useFlowState — Flow/prototype navigation state.
 * Extracted from CanvasApp.tsx.
 */
import { useCallback, useState } from 'react';
import type { LayoutSpec, Flow, FlowTransition } from '../../layout-schema';

export interface FlowStateResult {
  activeFlowId: string | null;
  setActiveFlowId: React.Dispatch<React.SetStateAction<string | null>>;
  focusNodeId: string | null;
  setFocusNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  viewportTransition: { targetId: string; durationMs?: number; easing?: FlowTransition['easing']; _key: string } | null;
  setViewportTransition: React.Dispatch<React.SetStateAction<{ targetId: string; durationMs?: number; easing?: FlowTransition['easing']; _key: string } | null>>;
  updateFlows: (nextFlows: Flow[]) => void;
  focusScreen: (screenId: string) => void;
  playTransitionPreview: (toId: string, transition?: FlowTransition) => void;
}

export function useFlowState(
  setSpec: (next: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void,
  setSelection: (ids: string[]) => void,
): FlowStateResult {
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [viewportTransition, setViewportTransition] = useState<{ targetId: string; durationMs?: number; easing?: FlowTransition['easing']; _key: string } | null>(null);

  const updateFlows = useCallback((nextFlows: Flow[]) => {
    setSpec(prev => ({ ...prev, flows: nextFlows }));
  }, [setSpec]);

  const focusScreen = useCallback((screenId: string) => {
    setSelection([screenId]);
    setFocusNodeId(screenId);
  }, [setSelection]);

  const playTransitionPreview = useCallback((toId: string, transition?: FlowTransition) => {
    if (!transition || transition.animation === 'none') {
      setViewportTransition(null);
      return;
    }
    setViewportTransition({
      targetId: toId,
      durationMs: transition.durationMs,
      easing: transition.easing,
      _key: `${transition.id}_${Date.now().toString(36)}`,
    });
  }, []);

  return {
    activeFlowId,
    setActiveFlowId,
    focusNodeId,
    setFocusNodeId,
    viewportTransition,
    setViewportTransition,
    updateFlows,
    focusScreen,
    playTransitionPreview,
  };
}
