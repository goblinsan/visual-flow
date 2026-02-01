# Phase 1 Integration Guide

## Using Cloud Persistence in Your App

### Basic Integration

Replace `useDesignPersistence` with `useCloudPersistence`:

```typescript
import { useCloudPersistence } from './hooks/useCloudPersistence';

function App() {
  const {
    spec,
    setSpec,
    canvasId,
    isOnline,
    isSyncing,
    lastError,
    userRole,
  } = useCloudPersistence({
    buildInitial: () => createDefaultSpec(),
    canvasId: getCanvasIdFromURL(), // or null for new canvas
    canvasName: 'My Canvas',
    debounceMs: 1000, // Save after 1 second of inactivity
  });

  return (
    <div>
      {!isOnline && <OfflineBanner />}
      {isSyncing && <SavingIndicator />}
      {lastError && <ErrorMessage error={lastError} />}
      
      <Canvas spec={spec} onChange={setSpec} readOnly={userRole === 'viewer'} />
      
      {(userRole === 'owner' || userRole === 'editor') && (
        <ShareButton canvasId={canvasId} />
      )}
    </div>
  );
}
```

### Share Dialog Integration

```typescript
import { useState } from 'react';
import { ShareDialog } from './components/ShareDialog';

function ShareButton({ canvasId, canvasName, userRole }) {
  const [showDialog, setShowDialog] = useState(false);

  if (!canvasId || !userRole) return null;

  return (
    <>
      <button onClick={() => setShowDialog(true)}>
        Share
      </button>

      {showDialog && (
        <ShareDialog
          canvasId={canvasId}
          canvasName={canvasName}
          userRole={userRole}
          onClose={() => setShowDialog(false)}
        />
      )}
    </>
  );
}
```

### Offline Mode Handling

The hook automatically:
- Detects online/offline state
- Falls back to localStorage when offline
- Syncs to cloud when connection is restored
- Shows appropriate status via `isOnline` and `isSyncing` flags

```typescript
function OfflineBanner() {
  return (
    <div className="bg-yellow-100 border-yellow-400 text-yellow-800 px-4 py-2">
      ⚠️ You're offline. Changes are saved locally and will sync when you reconnect.
    </div>
  );
}

function SavingIndicator() {
  return (
    <div className="text-sm text-gray-600">
      💾 Saving to cloud...
    </div>
  );
}
```

### Role-Based Access Control

Enforce viewer restrictions:

```typescript
function Canvas({ spec, onChange, readOnly }) {
  const handleChange = (newSpec) => {
    if (readOnly) {
      console.warn('Cannot edit in viewer mode');
      return;
    }
    onChange(newSpec);
  };

  return (
    <CanvasStage 
      spec={spec} 
      onSpecChange={handleChange}
      interactive={!readOnly}
    />
  );
}
```

### List User's Canvases

```typescript
import { useEffect, useState } from 'react';
import { apiClient } from './api/client';

function CanvasList() {
  const [canvases, setCanvases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCanvases() {
      const { data, error } = await apiClient.listCanvases();
      if (data) {
        setCanvases(data);
      } else {
        console.error('Failed to load canvases:', error);
      }
      setLoading(false);
    }
    loadCanvases();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <ul>
      {canvases.map(canvas => (
        <li key={canvas.id}>
          <a href={`/canvas/${canvas.id}`}>
            {canvas.name}
          </a>
          <span>{canvas.user_role}</span>
        </li>
      ))}
    </ul>
  );
}
```

## Migration from localStorage

For existing users with localStorage data:

```typescript
import { loadDesignSpec } from './utils/persistence';
import { apiClient } from './api/client';

async function migrateLocalToCloud() {
  // Load from localStorage
  const localSpec = loadDesignSpec();
  if (!localSpec) return;

  // Create canvas in cloud
  const { data, error } = await apiClient.createCanvas(
    'Migrated Canvas',
    localSpec
  );

  if (data) {
    console.log('Migration successful:', data.id);
    // Optionally clear localStorage after successful migration
  } else {
    console.error('Migration failed:', error);
  }
}
```

## Testing Your Integration

1. **Online Save**: Make changes, verify they appear in D1 database
2. **Offline Mode**: Disconnect network, make changes, verify localStorage fallback
3. **Reconnect**: Go online, verify changes sync to cloud
4. **Sharing**: Invite a viewer, verify they cannot edit
5. **Role Changes**: Test editor vs viewer permissions

## API Reference

See:
- `/workers/api/README.md` - Worker API documentation
- `/docs/DEPLOYMENT_PHASE1.md` - Deployment instructions
- `/src/api/client.ts` - API client TypeScript definitions
