/**
 * Durable Object for real-time collaboration
 * Manages WebSocket connections and Yjs synchronization for a single canvas
 * Security: Requires authentication before accepting connections
 */

import * as Y from 'yjs';
import { authenticateWebSocket, checkCanvasAccess } from './auth';

interface Env {
  CANVAS_ROOM: DurableObjectNamespace;
  DB: D1Database;
  ENVIRONMENT?: string;
}

/** Maximum connections allowed per room */
const MAX_CONNECTIONS_PER_ROOM = 50;

/** Maximum incoming message size in bytes */
const MAX_MESSAGE_SIZE = 2 * 1024 * 1024; // 2 MB

/** Heartbeat interval — stale connections are pruned after this many ms without a pong */
const HEARTBEAT_INTERVAL_MS = 60_000;
const HEARTBEAT_TIMEOUT_MS = 90_000;

/** Idle alarm: persist Yjs state and hibernate after this long without any connections */
const IDLE_TIMEOUT_MS = 5 * 60_000; // 5 minutes

/**
 * Durable Object representing a collaborative canvas room
 *
 * Security hardening:
 *  - Enforces max connections per room (C2)
 *  - Validates message structure and size (S6)
 *  - Requires userId header forwarded by the outer Worker (S7)
 *  - Heartbeat-based pruning of stale connections (C2)
 *  - Idle alarm: persists Yjs state to DO storage and allows eviction (C2)
 */
export class CanvasRoom {
  private state: DurableObjectState;
  private sessions: Map<WebSocket, { userId: string; lastPong: number }>;
  private ydoc: Y.Doc;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = new Map();
    this.ydoc = new Y.Doc();
  }

  /**
   * Handle incoming HTTP requests (WebSocket upgrade)
   */
  async fetch(request: Request): Promise<Response> {
    // Check for WebSocket upgrade
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // S7: Require user identity forwarded by the outer Worker via header
    const userId = request.headers.get('X-WS-User-Id');
    if (!userId) {
      return new Response('Forbidden — missing user context', { status: 403 });
    }

    // C2: Enforce connection cap
    if (this.sessions.size >= MAX_CONNECTIONS_PER_ROOM) {
      return new Response('Room is full — too many connections', { status: 429 });
    }

    // Restore persisted Yjs state on first connection (if any)
    if (this.sessions.size === 0) {
      await this.restoreState();
      this.startHeartbeat();
    }

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket
    server.accept();
    this.sessions.set(server, { userId, lastPong: Date.now() });

    // Set up message handling
    server.addEventListener('message', (event) => {
      this.handleMessage(server, event.data);
    });

    server.addEventListener('close', () => {
      this.sessions.delete(server);
      this.scheduleIdleAlarmIfEmpty();
    });

    server.addEventListener('error', () => {
      this.sessions.delete(server);
      this.scheduleIdleAlarmIfEmpty();
    });

    // Send current document state to new client
    const stateVector = Y.encodeStateAsUpdate(this.ydoc);
    server.send(JSON.stringify({
      type: 'sync',
      state: Array.from(stateVector),
    }));

    // Cancel any pending idle alarm since we now have a connection
    await this.state.storage.deleteAlarm();

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  // ---- Alarm: persist & hibernate when idle ----

  async alarm() {
    // If connections are still active, don't hibernate — reschedule
    if (this.sessions.size > 0) return;

    // Persist Yjs state to DO storage
    await this.persistState();

    // Stop heartbeat timer
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async persistState() {
    const state = Y.encodeStateAsUpdate(this.ydoc);
    await this.state.storage.put('ydoc', Array.from(state));
  }

  private async restoreState() {
    const saved = await this.state.storage.get<number[]>('ydoc');
    if (saved) {
      Y.applyUpdate(this.ydoc, new Uint8Array(saved));
    }
  }

  private async scheduleIdleAlarmIfEmpty() {
    if (this.sessions.size === 0) {
      await this.state.storage.setAlarm(Date.now() + IDLE_TIMEOUT_MS);
    }
  }

  // ---- Heartbeat ----

  private startHeartbeat() {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      for (const [ws, meta] of this.sessions.entries()) {
        if (now - meta.lastPong > HEARTBEAT_TIMEOUT_MS) {
          // Stale — prune
          try { ws.close(1000, 'heartbeat timeout'); } catch { /* ignore */ }
          this.sessions.delete(ws);
          continue;
        }
        try {
          ws.send(JSON.stringify({ type: 'ping' }));
        } catch {
          this.sessions.delete(ws);
        }
      }
      if (this.sessions.size === 0) {
        this.scheduleIdleAlarmIfEmpty();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Handle WebSocket messages — validates structure and size (S6)
   */
  private handleMessage(ws: WebSocket, data: string | ArrayBuffer) {
    try {
      // Size guard
      const size = typeof data === 'string' ? data.length : data.byteLength;
      if (size > MAX_MESSAGE_SIZE) {
        ws.send(JSON.stringify({ type: 'error', message: 'Message too large' }));
        return;
      }

      if (typeof data !== 'string') return;

      const message = JSON.parse(data);

      // Structure validation: must have a recognised type
      if (!message || typeof message.type !== 'string') return;

      switch (message.type) {
        case 'update': {
          if (!Array.isArray(message.update)) return;
          const update = new Uint8Array(message.update);
          Y.applyUpdate(this.ydoc, update);
          this.broadcast(ws, JSON.stringify({ type: 'update', update: message.update }));
          break;
        }

        case 'awareness': {
          if (message.state == null) return;
          this.broadcast(ws, JSON.stringify({ type: 'awareness', state: message.state }));
          break;
        }

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        case 'pong': {
          const meta = this.sessions.get(ws);
          if (meta) meta.lastPong = Date.now();
          break;
        }

        // Unknown types are silently dropped
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  /**
   * Broadcast message to all connected clients except sender
   */
  private broadcast(sender: WebSocket, message: string) {
    for (const [ws] of this.sessions) {
      if (ws !== sender && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
        } catch {
          this.sessions.delete(ws);
        }
      }
    }
  }
}

/**
 * Worker entry point
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Extract canvas ID from URL
    const url = new URL(request.url);
    const canvasId = url.pathname.slice(1); // Remove leading slash

    if (!canvasId) {
      return new Response('Canvas ID required', { status: 400 });
    }

    // Authenticate the WebSocket connection
    const userId = await authenticateWebSocket(request, env);
    if (!userId) {
      return new Response('Unauthorized - authentication required', { status: 401 });
    }

    // Check if user has access to this canvas
    const hasAccess = await checkCanvasAccess(env, userId, canvasId);
    if (!hasAccess) {
      return new Response('Forbidden - no access to this canvas', { status: 403 });
    }

    // Get Durable Object instance
    const id = env.CANVAS_ROOM.idFromName(canvasId);
    const room = env.CANVAS_ROOM.get(id);

    // Forward request to Durable Object with authenticated user identity (S7)
    const doRequest = new Request(request.url, request);
    doRequest.headers.set('X-WS-User-Id', userId);
    return room.fetch(doRequest);
  },
};
