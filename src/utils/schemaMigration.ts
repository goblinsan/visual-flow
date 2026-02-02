import type { LayoutSpec, FrameNode } from '../layout-schema';

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
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

export function migrateSpec(spec: unknown): MigrationResult {
  try {
    // Validate basic structure
    if (!isRecord(spec)) {
      return { success: false, error: 'Invalid spec: not an object' };
    }

    if (!isRecord(spec.root)) {
      return { success: false, error: 'Invalid spec: missing or invalid root' };
    }

    const versionValue = spec.version;
    const currentVersion = typeof versionValue === 'string' ? versionValue : undefined;

    // Legacy spec without version field
    if (!currentVersion) {
      return migrateLegacyToV1(spec);
    }

    // Already current version
    if (currentVersion === CURRENT_SCHEMA_VERSION) {
      return { success: true, spec: toLayoutSpec(spec) };
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
function migrateLegacyToV1(spec: Record<string, unknown>): MigrationResult {
  try {
    // Legacy specs are assumed to be compatible with v1.0.0
    // Just add the version field
    const migratedSpec: LayoutSpec = {
      ...toLayoutSpec(spec),
      version: CURRENT_SCHEMA_VERSION,
    };

    return { success: true, spec: migratedSpec };
  } catch (err) {
    return { success: false, error: `Legacy migration failed: ${err}` };
  }
}

function toLayoutSpec(record: Record<string, unknown>): LayoutSpec {
  const flows = Array.isArray(record.flows) ? (record.flows as LayoutSpec['flows']) : undefined;
  return {
    version: (record.version as string | undefined) ?? undefined,
    root: record.root as FrameNode,
    flows,
  };
}

/**
 * Validate that a spec has valid basic structure
 */
export function isValidSpecStructure(spec: unknown): boolean {
  if (!isRecord(spec)) return false;
  if (!isRecord(spec.root)) return false;
  if (typeof spec.root.id !== 'string') return false;
  if (typeof spec.root.type !== 'string') return false;
  return true;
}
