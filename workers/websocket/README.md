# Vizail WebSocket Worker (Durable Objects)

Real-time collaboration WebSocket server using Cloudflare Durable Objects and Yjs CRDT.

## Overview

This worker provides WebSocket endpoints for real-time collaborative canvas editing. Each canvas gets its own Durable Object instance that coordinates updates between connected users.

## Architecture

```
Client 1 ─┐
          │
Client 2 ─┼─ WebSocket ──► Durable Object (CanvasRoom) ──► Yjs Document
          │                    │
Client 3 ─┘                    └─ Broadcasts to all clients
```

### Key Features

- **One Durable Object per canvas** - Isolated state for each canvas
- **Automatic state persistence** - Durable Objects persist state automatically
- **WebSocket coordination** - Manages connections and broadcasts updates
- **Yjs CRDT integration** - Conflict-free collaborative editing

## Deployment

### Prerequisites

- Cloudflare account with Workers enabled
- Wrangler CLI installed

### Steps

1. **Install dependencies:**
   ```bash
   cd workers/websocket
   npm install
   ```

2. **Configure wrangler.toml:**
   ```toml
   name = "vizail-websocket"
   main = "src/index.ts"
   compatibility_date = "2024-01-01"

   [durable_objects]
   bindings = [
     { name = "CANVAS_ROOM", class_name = "CanvasRoom" }
   ]

   [[migrations]]
   tag = "v1"
   new_classes = ["CanvasRoom"]
   ```

3. **Deploy to Cloudflare:**
   ```bash
   wrangler deploy
   ```

4. **Note the deployed URL:**
   ```
   https://vizail-websocket.<your-subdomain>.workers.dev
   ```

## Local Development

```bash
# Start local development server
wrangler dev --local

# Worker will be available at:
# ws://localhost:8787
```

## WebSocket Protocol

### Connection

Connect to: `ws://localhost:8787/{canvasId}`

Example:
```javascript
const ws = new WebSocket('ws://localhost:8787/canvas-abc123');
```

### Message Types

#### Client → Server

**Update Message:**
```json
{
  "type": "update",
  "update": [/* Uint8Array as number[] */]
}
```
Sends a Yjs document update to be applied and broadcast.

**Awareness Message:**
```json
{
  "type": "awareness",
  "state": {
    "userId": "user@example.com",
    "displayName": "John Doe",
    "cursor": { "x": 100, "y": 200 },
    "selection": ["node-1", "node-2"]
  }
}
```
Broadcasts cursor position and selection to other users.

**Ping Message:**
```json
{
  "type": "ping"
}
```
Keep-alive message.

#### Server → Client

**Sync Message (initial state):**
```json
{
  "type": "sync",
  "state": [/* Uint8Array as number[] */]
}
```
Sent when client first connects with current document state.

**Update Message:**
```json
{
  "type": "update",
  "update": [/* Uint8Array as number[] */]
}
```
Broadcast of another user's update.

**Awareness Message:**
```json
{
  "type": "awareness",
  "state": { /* ... */ }
}
```
Broadcast of another user's cursor/selection.

**Pong Message:**
```json
{
  "type": "pong"
}
```
Response to ping.

## Implementation Details

### CanvasRoom Durable Object

Each canvas has one instance of `CanvasRoom` identified by canvas ID:

```typescript
export class CanvasRoom {
  private sessions: Set<WebSocket>;  // Connected clients
  private ydoc: Y.Doc;                // Yjs document

  async fetch(request: Request): Promise<Response>
  private handleMessage(ws: WebSocket, data: any): void
  private broadcast(sender: WebSocket, message: string): void
}
```

### State Management

- **Yjs Document:** In-memory CRDT document
- **Automatic Persistence:** Durable Objects persist state automatically
- **Session Tracking:** Set of active WebSocket connections

### Broadcast Logic

When a client sends an update:
1. Apply update to Durable Object's Yjs document
2. Broadcast to all other connected clients
3. Exclude the sender (they already have the update)

## Performance

- **Latency:** ~20-50ms (Durable Object to client)
- **Throughput:** Handles 10-50 concurrent users per canvas
- **Memory:** ~1-5MB per active canvas (scales automatically)

## Security

### Authentication

Currently relies on client-side user identification. For production:

1. **Verify JWT tokens** in WebSocket upgrade:
   ```typescript
   const token = request.headers.get('Authorization');
   // Verify token...
   ```

2. **Check canvas access permissions:**
   ```typescript
   // Query D1 to verify user has access to canvas
   ```

### Rate Limiting

Add rate limiting for message frequency:

```typescript
private rateLimits = new Map<WebSocket, number>();

private isRateLimited(ws: WebSocket): boolean {
  const lastMessage = this.rateLimits.get(ws) || 0;
  const now = Date.now();
  if (now - lastMessage < 50) { // 50ms minimum between messages
    return true;
  }
  this.rateLimits.set(ws, now);
  return false;
}
```

## Monitoring

### Logs

View logs in Cloudflare dashboard or via wrangler:

```bash
wrangler tail
```

### Metrics

Cloudflare provides automatic metrics:
- WebSocket connections
- Request count
- Duration
- Errors

## Troubleshooting

### WebSocket Upgrade Failed

**Error:** `426 Upgrade Required`

**Solution:** Ensure request includes `Upgrade: websocket` header

### Messages Not Broadcasting

**Issue:** Updates not reaching other clients

**Check:**
1. Verify all clients connected to same canvas ID
2. Check browser console for WebSocket errors
3. Verify message format matches protocol

### Durable Object Not Found

**Error:** `Cannot get Durable Object`

**Solution:** Run migrations after deploying:
```bash
wrangler deploy
```

## Testing

### Manual Testing

1. Open two browser tabs
2. Connect both to same canvas
3. Send updates from one tab
4. Verify other tab receives updates

### Automated Testing

```bash
# Unit tests (when implemented)
npm test

# Integration tests with wrangler
wrangler dev --test
```

## Upgrading

When deploying changes:

```bash
# 1. Update code
# 2. Deploy with migration
wrangler deploy

# 3. Verify in dashboard
```

## Cost Estimation

Cloudflare pricing (as of 2024):

- **Requests:** $0.15 per million requests (after free tier)
- **Duration:** $12.50 per million GB-seconds (after free tier)
- **WebSockets:** Included in duration pricing

**Typical costs for 100 active users:**
- ~$1-5 per month

## References

- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Yjs Documentation](https://docs.yjs.dev/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
