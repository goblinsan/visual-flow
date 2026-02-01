# Schema Versioning & Migration Guide

## Overview

Phase 0 introduces schema versioning to LayoutSpec to enable safe evolution of the data model and graceful handling of legacy designs.

## Current Schema Version

**Version: 1.0.0**

## Schema Structure

### LayoutSpec Interface

```typescript
export interface LayoutSpec {
  version?: string;  // Schema version (e.g., "1.0.0"); undefined = legacy
  root: FrameNode;   // Root frame node
  flows?: Flow[];    // Optional flow definitions
}
```

## Migration System

### Automatic Migration

The migration system automatically upgrades specs to the current version when loaded:

```typescript
import { migrateSpec, CURRENT_SCHEMA_VERSION } from './utils/schemaMigration';

// Load spec from storage
const rawSpec = loadDesignSpec();

// Migrate to current version
const result = migrateSpec(rawSpec);

if (result.success) {
  const spec = result.spec; // Migrated spec
  console.log(`Migrated to ${spec.version}`);
} else {
  console.error('Migration failed:', result.error);
  // Handle error - provide fallback or clear storage
}
```

### Migration Result

Migration returns a result object:

```typescript
interface MigrationResult {
  success: boolean;
  spec?: LayoutSpec;    // Migrated spec (if successful)
  error?: string;       // Error message (if failed)
}
```

## Supported Migrations

### Legacy (No Version) → v1.0.0

Legacy specs without a `version` field are automatically upgraded to v1.0.0:

```typescript
// Before migration
const legacySpec = {
  root: {
    id: 'root',
    type: 'frame',
    size: { width: 800, height: 600 },
    children: []
  }
};

// After migration
const migratedSpec = {
  version: '1.0.0',
  root: {
    id: 'root',
    type: 'frame',
    size: { width: 800, height: 600 },
    children: []
  }
};
```

This migration is non-destructive - all existing data is preserved.

## Validation

### Structure Validation

Before migration, specs are validated for basic structure:

```typescript
import { isValidSpecStructure } from './utils/schemaMigration';

if (!isValidSpecStructure(spec)) {
  console.error('Invalid spec structure');
  // Handle invalid data
}
```

Validation checks:
- Spec is an object
- Has a `root` property (object)
- Root has `id` (string) and `type` (string)

## Error Handling

### Graceful Degradation

The system handles corrupt or invalid data gracefully:

1. **Parse Errors**: Returns `null` with console warning
2. **Invalid Structure**: Migration fails with descriptive error
3. **Unknown Version**: Migration fails with version mismatch error

### Example Error Handling

```typescript
const result = migrateSpec(rawSpec);

if (!result.success) {
  // Log error for debugging
  console.error('Migration error:', result.error);
  
  // Provide user feedback
  showErrorMessage('Failed to load design: corrupt data');
  
  // Offer recovery options
  if (confirm('Clear corrupt data and start fresh?')) {
    localStorage.clear();
    window.location.reload();
  }
}
```

## Storage Integration

### Persistence Layer

The persistence module integrates with migration:

```typescript
import { loadDesignSpec, saveDesignSpec } from './utils/persistence';
import { migrateSpec, CURRENT_SCHEMA_VERSION } from './utils/schemaMigration';

// Load with migration
function loadSpec(): LayoutSpec | null {
  const raw = loadDesignSpec();
  if (!raw) return null;
  
  const result = migrateSpec(raw);
  return result.success ? result.spec : null;
}

// Save with version
function saveSpec(spec: LayoutSpec) {
  const versionedSpec = {
    ...spec,
    version: CURRENT_SCHEMA_VERSION
  };
  saveDesignSpec(versionedSpec);
}
```

### Error Logging

All persistence operations now log errors instead of silently failing:

```typescript
// Before (Phase 0)
try {
  localStorage.setItem(key, value);
} catch { /* ignore */ }

// After (Phase 0)
try {
  localStorage.setItem(key, value);
} catch (err) {
  console.warn('Failed to save to localStorage:', err);
}
```

This helps with debugging storage quota issues, privacy mode restrictions, etc.

## Future Schema Changes

### Adding New Properties

When adding new optional properties, no migration is needed:

```typescript
// v1.0.0
interface LayoutSpec {
  version?: string;
  root: FrameNode;
  flows?: Flow[];
}

// v1.1.0 - backward compatible
interface LayoutSpec {
  version?: string;
  root: FrameNode;
  flows?: Flow[];
  theme?: ThemeConfig;  // New optional property
}
```

Simply update the schema and increment version to 1.1.0.

### Breaking Changes

For breaking changes, add a migration function:

```typescript
// In schemaMigration.ts

export function migrateSpec(spec: any): MigrationResult {
  // ... existing code ...
  
  // Add version-specific migration
  if (currentVersion === '1.0.0') {
    return migrateV1ToV2(spec);
  }
  
  // ... rest of code ...
}

function migrateV1ToV2(spec: any): MigrationResult {
  try {
    // Perform transformation
    const migrated = {
      ...spec,
      version: '2.0.0',
      // Apply breaking changes here
    };
    return { success: true, spec: migrated };
  } catch (err) {
    return { success: false, error: `v1→v2 migration failed: ${err}` };
  }
}
```

## Testing

Migration is thoroughly tested:

```bash
npm test src/utils/schemaMigration.test.ts
```

Tests cover:
- Legacy spec migration
- Current version pass-through
- Invalid data handling
- Structure validation
- Error cases

## Best Practices

1. **Always Use Current Version**
   - When creating new specs, include version field
   - Use `CURRENT_SCHEMA_VERSION` constant

2. **Preserve User Data**
   - Migrations should never lose user data
   - If data must be discarded, warn user first

3. **Test Migrations**
   - Add tests for each migration path
   - Verify round-trip fidelity

4. **Document Changes**
   - Update this guide when schema changes
   - Document breaking changes in CHANGELOG

5. **Handle Errors Gracefully**
   - Provide clear error messages
   - Offer recovery options (clear data, export, etc.)

## Error Boundary Integration

The ErrorBoundary component catches React errors from corrupt data:

```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <CanvasApp />
    </ErrorBoundary>
  );
}
```

When corrupt data causes render errors:
1. Error is caught and logged
2. User sees error UI with options:
   - Try Again (re-render)
   - Clear Data & Reload (fresh start)

## See Also

- [Schema Migration Source](../src/utils/schemaMigration.ts)
- [Migration Tests](../src/utils/schemaMigration.test.ts)
- [Persistence Module](../src/utils/persistence.ts)
- [Error Boundary](../src/components/ErrorBoundary.tsx)
- [Layout Schema](../src/layout-schema.ts)
