import type { LayoutSpec } from '../layout-schema';

/** Current schema version */
export const CURRENT_SCHEMA_VERSION = '1.0.0';

/** Migration result with success/failure info */
export interface MigrationResult {
  success: boolean;
  spec?: LayoutSpec;
  error?: string;
}

/**
 * Migrate a LayoutSpec to the current version.
 * Handles legacy specs without version field.
 */
export function migrateSpec(spec: any): MigrationResult {
  try {
    // Validate basic structure
    if (!spec || typeof spec !== 'object') {
      return { success: false, error: 'Invalid spec: not an object' };
    }

    if (!spec.root || typeof spec.root !== 'object') {
      return { success: false, error: 'Invalid spec: missing or invalid root' };
    }

    const currentVersion = spec.version;

    // Legacy spec without version field
    if (!currentVersion) {
      return migrateLegacyToV1(spec);
    }

    // Already current version
    if (currentVersion === CURRENT_SCHEMA_VERSION) {
      return { success: true, spec: spec as LayoutSpec };
    }

    // Future: add version-specific migrations here
    // e.g., if (currentVersion === '0.9.0') return migrateV09ToV1(spec);

    return { success: false, error: `Unknown schema version: ${currentVersion}` };
  } catch (err) {
    return { success: false, error: `Migration error: ${err}` };
  }
}

/**
 * Migrate legacy spec (no version field) to v1.0.0
 */
function migrateLegacyToV1(spec: any): MigrationResult {
  try {
    // Legacy specs are assumed to be compatible with v1.0.0
    // Just add the version field
    const migratedSpec: LayoutSpec = {
      ...spec,
      version: CURRENT_SCHEMA_VERSION,
    };

    return { success: true, spec: migratedSpec };
  } catch (err) {
    return { success: false, error: `Legacy migration failed: ${err}` };
  }
}

/**
 * Validate that a spec has valid basic structure
 */
export function isValidSpecStructure(spec: any): boolean {
  if (!spec || typeof spec !== 'object') return false;
  if (!spec.root || typeof spec.root !== 'object') return false;
  if (!spec.root.id || typeof spec.root.id !== 'string') return false;
  if (!spec.root.type || typeof spec.root.type !== 'string') return false;
  return true;
}
