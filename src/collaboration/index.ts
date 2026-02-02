/**
 * Collaboration module exports
 * Phase 2: Real-time collaboration
 */

export { layoutSpecToYjs, yjsToLayoutSpec, applySpecChangesToYjs } from './yjsConversion';
export { useRealtimeCanvas } from './useRealtimeCanvas';
export type {
  UserAwareness,
  ConnectionStatus,
  RealtimeState,
  UseRealtimeCanvasOptions,
} from './types';
