/**
 * Types for real-time collaboration
 * Phase 2: Presence and awareness
 */

import type { LayoutSpec } from '../layout-schema';

/**
 * User presence/awareness information
 */
export interface UserAwareness {
  /** Yjs client ID */
  clientId: number;
  /** Authenticated user ID */
  userId: string;
  /** Display name */
  displayName: string;
  /** Assigned cursor color */
  color: string;
  /** Current cursor position (canvas coordinates) */
  cursor?: { x: number; y: number };
  /** Currently selected node IDs */
  selection: string[];
  /** Dragging state */
  dragging?: {
    nodeIds: string[];
    ghostPosition: { x: number; y: number };
  };
  /** True for AI agents */
  isAgent?: boolean;
  /** Agent name if applicable */
  agentName?: string;
}

/**
 * Connection status
 */
export type ConnectionStatus = 
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

/**
 * Real-time collaboration state
 */
export interface RealtimeState {
  /** Current canvas spec (synced via Yjs) */
  spec: LayoutSpec;
  /** Update the canvas spec */
  setSpec: (spec: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void;
  /** Connection status */
  status: ConnectionStatus;
  /** Current collaborators */
  collaborators: Map<number, UserAwareness>;
  /** Current user's client ID */
  clientId: number | null;
  /** Whether changes are being synced */
  isSyncing: boolean;
  /** Last error message */
  lastError: string | null;
  /** Update cursor position */
  updateCursor: (x: number, y: number) => void;
  /** Update selection */
  updateSelection: (nodeIds: string[]) => void;
  /** Update dragging state */
  updateDragging: (dragging?: { nodeIds: string[]; ghostPosition: { x: number; y: number } }) => void;
  /** Force disconnect */
  disconnect: () => void;
  /** Force reconnect */
  reconnect: () => void;
}

/**
 * Options for useRealtimeCanvas hook
 */
export interface UseRealtimeCanvasOptions {
  /** Canvas ID to connect to */
  canvasId: string;
  /** User ID */
  userId: string;
  /** Display name */
  displayName: string;
  /** Initial spec factory (used if connection fails) */
  buildInitial: () => LayoutSpec;
  /** WebSocket URL (default: ws://localhost:8787) */
  wsUrl?: string;
  /** Enable real-time sync (default: true) */
  enabled?: boolean;
  /** Debounce ms for awareness updates (default: 100ms) */
  awarenessDebounceMs?: number;
}
