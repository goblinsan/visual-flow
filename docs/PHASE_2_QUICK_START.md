# Phase 2 Quick Start Guide

## Real-Time Collaboration - Getting Started in 5 Minutes

### 1. Install Dependencies (Already Done)

Dependencies have been added to the main project:
- `yjs` - CRDT library
- `y-websocket` - WebSocket provider
- `y-protocols` - Yjs protocols

### 2. Deploy WebSocket Worker

```bash
cd workers/websocket
npm install
wrangler deploy
```

Note the deployed URL (e.g., `https://vizail-websocket.your-subdomain.workers.dev`)

### 3. Enable Real-Time in Your App

**Option A: Replace existing persistence hook**

```typescript
// Before:
import { useDesignPersistence } from './hooks/useDesignPersistence';
const { spec, setSpec } = useDesignPersistence({ buildInitial });

// After:
import { useRealtimeCanvas } from './collaboration';
const {
  spec,
  setSpec,
  status,
  collaborators,
  updateCursor,
  updateSelection,
} = useRealtimeCanvas({
  canvasId: 'canvas-123',           // From URL or database
  userId: 'user@example.com',        // Current user
  displayName: 'John Doe',           // Display name
  buildInitial,                      // Same as before
  wsUrl: 'wss://your-worker.workers.dev',
});
```

**Option B: Use the example component**

```typescript
import { CollaborativeCanvas } from './examples/CollaborativeCanvas';

function App() {
  return (
    <CollaborativeCanvas
      canvasId={canvasId}
      userId={currentUser.id}
      displayName={currentUser.name}
      buildInitial={() => createDefaultSpec()}
      wsUrl="wss://your-worker.workers.dev"
    />
  );
}
```

### 4. Add Presence Overlays

```typescript
import { CursorOverlay } from './components/CursorOverlay';
import { SelectionOverlay } from './components/SelectionOverlay';
import { ConnectionStatusIndicator } from './components/ConnectionStatusIndicator';

function YourCanvas() {
  const { collaborators, status, isSyncing } = useRealtimeCanvas({...});

  return (
    <div>
      {/* Status indicator */}
      <ConnectionStatusIndicator
        status={status}
        collaboratorCount={collaborators.size}
        isSyncing={isSyncing}
      />

      {/* Your canvas */}
      <CanvasStage spec={spec} onSpecChange={setSpec} />

      {/* Presence overlays */}
      <CursorOverlay collaborators={collaborators} />
      <SelectionOverlay
        collaborators={collaborators}
        getNodeBounds={getNodeBounds}
      />
    </div>
  );
}
```

### 5. Track User Interactions

```typescript
// Update cursor position
const handleMouseMove = (e: React.MouseEvent) => {
  updateCursor(e.clientX, e.clientY);
};

// Update selection
const handleSelectionChange = (nodeIds: string[]) => {
  updateSelection(nodeIds);
};

// Track dragging
const handleDragStart = (nodeIds: string[]) => {
  updateDragging({ nodeIds, ghostPosition: { x: 0, y: 0 } });
};

const handleDragEnd = () => {
  updateDragging(undefined);
};
```

## Testing Locally

### 1. Start WebSocket Worker

```bash
cd workers/websocket
wrangler dev --local
# Worker running at ws://localhost:8787
```

### 2. Start React App

```bash
cd ../..
npm run dev
# App running at http://localhost:5173
```

### 3. Test Collaboration

1. Open `http://localhost:5173` in two browser tabs
2. Make changes in one tab
3. See changes appear in the other tab within 100ms
4. See cursors and selections in real-time

## Common Patterns

### Pattern 1: Conditional Real-Time

Enable real-time only for specific canvases:

```typescript
const isCollaborative = canvas.type === 'shared';

const { spec, setSpec } = useRealtimeCanvas({
  ...options,
  enabled: isCollaborative,  // Disable for non-shared canvases
});
```

### Pattern 2: Fallback to Local Persistence

Use real-time when available, fall back to local:

```typescript
const {
  spec: realtimeSpec,
  setSpec: setRealtimeSpec,
  status,
} = useRealtimeCanvas({ ...options });

const {
  spec: localSpec,
  setSpec: setLocalSpec,
} = useDesignPersistence({ buildInitial });

// Use real-time if connected, otherwise local
const spec = status === 'connected' ? realtimeSpec : localSpec;
const setSpec = status === 'connected' ? setRealtimeSpec : setLocalSpec;
```

### Pattern 3: Show Connection Quality

```typescript
const getConnectionQuality = (status: ConnectionStatus) => {
  switch (status) {
    case 'connected':
      return { label: 'Excellent', color: 'green' };
    case 'connecting':
    case 'reconnecting':
      return { label: 'Poor', color: 'yellow' };
    case 'disconnected':
    case 'error':
      return { label: 'Offline', color: 'red' };
  }
};
```

## Troubleshooting

### "WebSocket upgrade failed"

**Solution:** Check that WebSocket worker is deployed and URL is correct.

```typescript
// Verify URL format
wsUrl: 'wss://vizail-websocket.your-subdomain.workers.dev'  // ✓ Correct
wsUrl: 'https://vizail-websocket.your-subdomain.workers.dev' // ✗ Wrong protocol
```

### "Changes not syncing"

**Check:**
1. Both users connected to same `canvasId`
2. WebSocket worker is running
3. Browser console for errors
4. Network tab shows WebSocket connection

### "High latency (>100ms)"

**Optimize:**
1. Increase `awarenessDebounceMs` (reduce cursor update frequency)
2. Check network latency to Cloudflare edge
3. Verify Durable Object location

## Performance Tips

1. **Debounce cursor updates:** Default is 100ms, increase if needed
2. **Batch property changes:** Update multiple properties at once
3. **Limit awareness data:** Only send essential cursor/selection info
4. **Use incremental updates:** Yjs automatically sends only diffs

## Next Steps

- [ ] Deploy to production
- [ ] Add authentication to WebSocket worker
- [ ] Implement offline queue (Phase 3)
- [ ] Add version history (Phase 3)
- [ ] Set up monitoring and alerts

## Reference

- [Full Implementation Guide](./PHASE_2_IMPLEMENTATION.md)
- [WebSocket Worker README](../workers/websocket/README.md)
- [Yjs Documentation](https://docs.yjs.dev/)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
