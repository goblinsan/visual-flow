/**
 * useRealtimeCanvas hook
 * Phase 2: Real-time collaboration with Yjs + WebSocket
 * Phase 3: Performance optimizations - throttled updates, batched awareness
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { LayoutSpec } from '../layout-schema';
import { layoutSpecToYjs, yjsToLayoutSpec } from './yjsConversion';
import type {
  UseRealtimeCanvasOptions,
  RealtimeState,
  UserAwareness,
  ConnectionStatus,
} from './types';

/**
 * Assign a consistent color to each user
 */
function getUserColor(userId: string): string {
  const colors = [
    '#ef4444', // red
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
  ];
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Real-time collaborative canvas hook
 * Manages Yjs document, WebSocket connection, and awareness
 */
export function useRealtimeCanvas(
  options: UseRealtimeCanvasOptions
): RealtimeState {
  const {
    canvasId,
    userId,
    displayName,
    buildInitial,
    wsUrl = 'ws://localhost:8787',
    enabled = true,
    awarenessDebounceMs = 100,
  } = options;

  // Yjs document and provider
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  // State
  const [spec, setSpecState] = useState<LayoutSpec>(buildInitial);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [collaborators, setCollaborators] = useState<Map<number, UserAwareness>>(new Map());
  const [clientId, setClientId] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Awareness debounce timer
  const awarenessTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Performance optimization: Throttle remote spec updates (max 10fps = 100ms)
  const lastUpdateTimeRef = useRef<number>(0);
  const pendingUpdateRef = useRef<boolean>(false);
  
  // Use ref for current spec to avoid stale closures in setSpec callback
  const specRef = useRef<LayoutSpec>(spec);
  useEffect(() => {
    specRef.current = spec;
  }, [spec]);

  /**
   * Initialize Yjs document and WebSocket provider
   */
  useEffect(() => {
    if (!enabled) return;

    try {
      // Create new Yjs document
      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;

      // Set initial spec
      layoutSpecToYjs(buildInitial(), ydoc);

      // Create WebSocket provider
      const provider = new WebsocketProvider(
        wsUrl,
        canvasId,
        ydoc,
        {
          // Don't connect automatically - we'll control it
          connect: true,
        }
      );
      providerRef.current = provider;

      // Set up awareness
      const awareness = provider.awareness;
      const color = getUserColor(userId);
      
      awareness.setLocalStateField('user', {
        userId,
        displayName,
        color,
        selection: [],
      });

      // Connection status handlers
      provider.on('status', (event: { status: string }) => {
        switch (event.status) {
          case 'connecting':
            setStatus('connecting');
            break;
          case 'connected':
            setStatus('connected');
            setLastError(null);
            break;
          case 'disconnected':
            setStatus('disconnected');
            break;
          default:
            setStatus('error');
        }
      });

      provider.on('sync', (isSynced: boolean) => {
        if (isSynced) {
          setIsSyncing(false);
          // Update local spec from synced document
          try {
            const syncedSpec = yjsToLayoutSpec(ydoc);
            setSpecState(syncedSpec);
          } catch (error) {
            console.error('Error converting synced Yjs to spec:', error);
          }
        } else {
          setIsSyncing(true);
        }
      });

      // Listen for document updates with throttling for performance
      const updateHandler = () => {
        // Throttle updates to max 10fps (100ms) for better performance with multiple collaborators
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
        
        if (timeSinceLastUpdate >= 100) {
          // Update immediately
          try {
            const newSpec = yjsToLayoutSpec(ydoc);
            setSpecState(newSpec);
            lastUpdateTimeRef.current = now;
            pendingUpdateRef.current = false;
          } catch (error) {
            console.error('Error converting Yjs to spec:', error);
          }
        } else {
          // Schedule update if not already pending
          if (!pendingUpdateRef.current) {
            pendingUpdateRef.current = true;
            setTimeout(() => {
              try {
                const newSpec = yjsToLayoutSpec(ydoc);
                setSpecState(newSpec);
                lastUpdateTimeRef.current = Date.now();
                pendingUpdateRef.current = false;
              } catch (error) {
                console.error('Error converting Yjs to spec:', error);
              }
            }, 100 - timeSinceLastUpdate);
          }
        }
      };

      ydoc.on('update', updateHandler);

      // Listen for awareness updates (other users)
      const awarenessUpdateHandler = () => {
        const states = awareness.getStates();
        const collabMap = new Map<number, UserAwareness>();

        states.forEach((state, clientId) => {
          if (clientId === awareness.clientID) {
            // Skip our own state
            return;
          }

          const user = state.user as any;
          if (user) {
            collabMap.set(clientId, {
              clientId,
              userId: user.userId,
              displayName: user.displayName,
              color: user.color,
              cursor: user.cursor,
              selection: user.selection || [],
              dragging: user.dragging,
              isAgent: user.isAgent,
              agentName: user.agentName,
            });
          }
        });

        setCollaborators(collabMap);
        setClientId(awareness.clientID);
      };

      awareness.on('change', awarenessUpdateHandler);

      // Clean up awareness on page unload
      const handleBeforeUnload = () => {
        if (providerRef.current) {
          providerRef.current.awareness.setLocalState(null);
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      // Cleanup
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        ydoc.off('update', updateHandler);
        awareness.off('change', awarenessUpdateHandler);
        awareness.setLocalState(null); // Clear awareness before destroying
        provider.destroy();
        ydoc.destroy();
      };
    } catch (error) {
      console.error('Error initializing realtime canvas:', error);
      setStatus('error');
      setLastError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [enabled, canvasId, userId, displayName, wsUrl, buildInitial]);

  /**
   * Update spec (local change that gets synced)
   */
  const setSpec = useCallback((newSpec: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => {
    const actualSpec = typeof newSpec === 'function' ? newSpec(specRef.current) : newSpec;
    
    setSpecState(actualSpec);

    // Update Yjs document
    if (ydocRef.current) {
      try {
        ydocRef.current.transact(() => {
          layoutSpecToYjs(actualSpec, ydocRef.current!);
        }, 'local'); // Mark as local change
      } catch (error) {
        console.error('Error updating Yjs document:', error);
        setLastError(error instanceof Error ? error.message : 'Update error');
      }
    }
  }, []);

  /**
   * Update cursor position
   */
  const updateCursor = useCallback((x: number, y: number) => {
    if (!providerRef.current) return;

    if (awarenessTimerRef.current) {
      clearTimeout(awarenessTimerRef.current);
    }

    awarenessTimerRef.current = setTimeout(() => {
      const awareness = providerRef.current!.awareness;
      const currentState = awareness.getLocalState();
      awareness.setLocalStateField('user', {
        ...currentState?.user,
        cursor: { x, y },
      });
    }, awarenessDebounceMs);
  }, [awarenessDebounceMs]);

  /**
   * Update selection
   */
  const updateSelection = useCallback((nodeIds: string[]) => {
    if (!providerRef.current) return;

    const awareness = providerRef.current.awareness;
    const currentState = awareness.getLocalState();
    awareness.setLocalStateField('user', {
      ...currentState?.user,
      selection: nodeIds,
    });
  }, []);

  /**
   * Update dragging state with batching
   * Batches multiple rapid updates during drag to improve performance
   */
  const updateDragging = useCallback((dragging?: { nodeIds: string[]; ghostPosition: { x: number; y: number } }) => {
    if (!providerRef.current) return;

    const awareness = providerRef.current.awareness;
    const currentState = awareness.getLocalState();
    
    // Use requestAnimationFrame for batching drag updates
    requestAnimationFrame(() => {
      awareness.setLocalStateField('user', {
        ...currentState?.user,
        dragging,
      });
    });
  }, []);

  /**
   * Disconnect
   */
  const disconnect = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.disconnect();
      setStatus('disconnected');
    }
  }, []);

  /**
   * Reconnect
   */
  const reconnect = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.connect();
      setStatus('connecting');
    }
  }, []);

  return {
    spec,
    setSpec,
    status,
    collaborators,
    clientId,
    isSyncing,
    lastError,
    updateCursor,
    updateSelection,
    updateDragging,
    disconnect,
    reconnect,
  };
}
