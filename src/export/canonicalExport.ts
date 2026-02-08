/**
 * JSON Canonical Export
 * 
 * Exports a LayoutSpec to a canonical JSON format that can be:
 * 1. Round-tripped losslessly (import → export → import produces identical spec)
 * 2. Version-controlled (stable serialization)
 * 3. Human-readable
 */

import type { LayoutSpec } from '../layout-schema';

export interface ExportOptions {
  /**
   * Pretty-print the JSON output
   * @default true
   */
  pretty?: boolean;
  
  /**
   * Include metadata in the export
   * @default true
   */
  includeMetadata?: boolean;
  
  /**
   * Sort object keys for stable output
   * @default true
   */
  sortKeys?: boolean;
}

export interface ExportMetadata {
  exportedAt: string; // ISO 8601 timestamp
  exportVersion: string; // Version of the export format
  schemaVersion?: string; // Version from the spec
}

export interface CanonicalExport {
  metadata?: ExportMetadata;
  spec: LayoutSpec;
}

const EXPORT_VERSION = '1.0.0';

/**
 * Export a LayoutSpec to canonical JSON format
 */
export function exportToJSON(
  spec: LayoutSpec,
  options: ExportOptions = {}
): string {
  const {
    pretty = true,
    includeMetadata = true,
    sortKeys = true,
  } = options;

  const exportData: CanonicalExport = {
    spec,
  };

  if (includeMetadata) {
    exportData.metadata = {
      exportedAt: new Date().toISOString(),
      exportVersion: EXPORT_VERSION,
      schemaVersion: spec.version,
    };
  }

  // Sort keys for stable output
  const jsonString = pretty
    ? JSON.stringify(exportData, sortKeys ? sortedReplacer : undefined, 2)
    : JSON.stringify(exportData, sortKeys ? sortedReplacer : undefined);

  return jsonString;
}

/**
 * Import a LayoutSpec from canonical JSON format
 */
export function importFromJSON(jsonString: string): LayoutSpec {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Handle both wrapped and unwrapped formats
    if (parsed.spec) {
      // Wrapped format with metadata
      return parsed.spec as LayoutSpec;
    } else if (parsed.root) {
      // Direct spec format (backward compatible)
      return parsed as LayoutSpec;
    } else {
      throw new Error('Invalid export format: missing spec or root');
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to import JSON: ${error.message}`);
    }
    throw new Error('Failed to import JSON: Unknown error');
  }
}

/**
 * Validate that a round-trip export/import produces the same spec
 */
export function validateRoundTrip(spec: LayoutSpec): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  try {
    // Export and re-import
    const exported = exportToJSON(spec, { includeMetadata: false });
    const reimported = importFromJSON(exported);

    // Deep compare (excluding metadata)
    const original = JSON.stringify(spec, sortedReplacer);
    const roundtrip = JSON.stringify(reimported, sortedReplacer);

    if (original !== roundtrip) {
      errors.push('Round-trip data mismatch');
      
      // Try to identify differences
      const origObj = JSON.parse(original);
      const rtObj = JSON.parse(roundtrip);
      
      const diffs = findDifferences(origObj, rtObj);
      errors.push(...diffs);
    }
  } catch (error) {
    if (error instanceof Error) {
      errors.push(`Round-trip failed: ${error.message}`);
    } else {
      errors.push('Round-trip failed: Unknown error');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Replacer function that sorts object keys for stable serialization
 */
function sortedReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    Object.keys(value).sort().forEach(k => {
      sorted[k] = (value as Record<string, unknown>)[k];
    });
    return sorted;
  }
  return value;
}

/**
 * Find differences between two objects (for debugging round-trip issues)
 */
function findDifferences(
  obj1: unknown,
  obj2: unknown,
  path = 'root'
): string[] {
  const diffs: string[] = [];

  if (typeof obj1 !== typeof obj2) {
    diffs.push(`${path}: type mismatch (${typeof obj1} vs ${typeof obj2})`);
    return diffs;
  }

  if (obj1 === null || obj2 === null) {
    if (obj1 !== obj2) {
      diffs.push(`${path}: null mismatch`);
    }
    return diffs;
  }

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      diffs.push(`${path}: array length mismatch (${obj1.length} vs ${obj2.length})`);
    }
    const minLen = Math.min(obj1.length, obj2.length);
    for (let i = 0; i < minLen; i++) {
      diffs.push(...findDifferences(obj1[i], obj2[i], `${path}[${i}]`));
    }
    return diffs;
  }

  if (typeof obj1 === 'object' && typeof obj2 === 'object') {
    const keys1 = Object.keys(obj1 as object);
    const keys2 = Object.keys(obj2 as object);
    
    const allKeys = new Set([...keys1, ...keys2]);
    
    for (const key of allKeys) {
      const val1 = (obj1 as Record<string, unknown>)[key];
      const val2 = (obj2 as Record<string, unknown>)[key];
      
      if (val1 === undefined && val2 !== undefined) {
        diffs.push(`${path}.${key}: missing in original`);
      } else if (val1 !== undefined && val2 === undefined) {
        diffs.push(`${path}.${key}: missing in round-trip`);
      } else if (val1 !== val2) {
        if (typeof val1 === 'object' && typeof val2 === 'object') {
          diffs.push(...findDifferences(val1, val2, `${path}.${key}`));
        } else {
          diffs.push(`${path}.${key}: value mismatch (${val1} vs ${val2})`);
        }
      }
    }
    return diffs;
  }

  if (obj1 !== obj2) {
    diffs.push(`${path}: value mismatch (${obj1} vs ${obj2})`);
  }

  return diffs;
}
