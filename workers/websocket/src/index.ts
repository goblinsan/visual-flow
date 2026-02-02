/**
 * Durable Object for real-time collaboration
 * Manages WebSocket connections and Yjs synchronization for a single canvas
 */

import * as Y from 'yjs';

interface Env {
  CANVAS_ROOM: DurableObjectNamespace;
}

/**
 * Durable Object representing a collaborative canvas room
 */
export class CanvasRoom {
  private state: DurableObjectState;
  private sessions: Set<WebSocket>;
  private ydoc: Y.Doc;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = new Set();
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

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket
    server.accept();
    this.sessions.add(server);

    // Set up message handling
    server.addEventListener('message', (event) => {
      this.handleMessage(server, event.data);
    });

    server.addEventListener('close', () => {
      this.sessions.delete(server);
    });

    server.addEventListener('error', () => {
      this.sessions.delete(server);
    });

    // Send current document state to new client
    const stateVector = Y.encodeStateAsUpdate(this.ydoc);
    server.send(JSON.stringify({
      type: 'sync',
      state: Array.from(stateVector),
    }));

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Handle WebSocket messages
   */
  private handleMessage(ws: WebSocket, data: string | ArrayBuffer) {
    try {
      const message = typeof data === 'string' ? JSON.parse(data) : null;
      
      if (!message) return;

      switch (message.type) {
        case 'update':
          // Apply Yjs update to document
          if (message.update) {
            const update = new Uint8Array(message.update);
            Y.applyUpdate(this.ydoc, update);
            
            // Broadcast to all other clients
            this.broadcast(ws, JSON.stringify({
              type: 'update',
              update: message.update,
            }));
          }
          break;

        case 'awareness':
          // Broadcast awareness update to all other clients
          this.broadcast(ws, JSON.stringify({
            type: 'awareness',
            state: message.state,
          }));
          break;

        case 'ping':
          // Respond to ping
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  /**
   * Broadcast message to all connected clients except sender
   */
  private broadcast(sender: WebSocket, message: string) {
    this.sessions.forEach((ws) => {
      if (ws !== sender && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
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

    // Get Durable Object instance
    const id = env.CANVAS_ROOM.idFromName(canvasId);
    const room = env.CANVAS_ROOM.get(id);

    // Forward request to Durable Object
    return room.fetch(request);
  },
};
