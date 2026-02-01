import { describe, it, expect } from 'vitest';
import { migrateSpec, isValidSpecStructure, CURRENT_SCHEMA_VERSION } from './schemaMigration';

describe('schemaMigration', () => {
  describe('isValidSpecStructure', () => {
    it('returns true for valid spec', () => {
      const spec = {
        root: { id: 'root1', type: 'frame', size: { width: 100, height: 100 }, children: [] },
      };
      expect(isValidSpecStructure(spec)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isValidSpecStructure(null)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isValidSpecStructure('invalid')).toBe(false);
    });

    it('returns false for missing root', () => {
      expect(isValidSpecStructure({})).toBe(false);
    });

    it('returns false for invalid root', () => {
      expect(isValidSpecStructure({ root: 'invalid' })).toBe(false);
    });

    it('returns false for root without id', () => {
      expect(isValidSpecStructure({ root: { type: 'frame' } })).toBe(false);
    });

    it('returns false for root without type', () => {
      expect(isValidSpecStructure({ root: { id: 'root1' } })).toBe(false);
    });
  });

  describe('migrateSpec', () => {
    it('handles invalid input gracefully', () => {
      const result = migrateSpec(null);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid spec');
    });

    it('handles missing root gracefully', () => {
      const result = migrateSpec({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('missing or invalid root');
    });

    it('migrates legacy spec without version', () => {
      const legacySpec = {
        root: {
          id: 'root1',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
      };

      const result = migrateSpec(legacySpec);
      expect(result.success).toBe(true);
      expect(result.spec).toBeDefined();
      expect(result.spec!.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(result.spec!.root).toEqual(legacySpec.root);
    });

    it('preserves flows when migrating legacy spec', () => {
      const legacySpec = {
        root: {
          id: 'root1',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
        flows: [{ id: 'flow1', name: 'Main', screenIds: [], transitions: [] }],
      };

      const result = migrateSpec(legacySpec);
      expect(result.success).toBe(true);
      expect(result.spec!.flows).toEqual(legacySpec.flows);
    });

    it('accepts spec with current version', () => {
      const currentSpec = {
        version: CURRENT_SCHEMA_VERSION,
        root: {
          id: 'root1',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
      };

      const result = migrateSpec(currentSpec);
      expect(result.success).toBe(true);
      expect(result.spec).toEqual(currentSpec);
    });

    it('rejects unknown version', () => {
      const futureSpec = {
        version: '99.0.0',
        root: {
          id: 'root1',
          type: 'frame',
          size: { width: 800, height: 600 },
          children: [],
        },
      };

      const result = migrateSpec(futureSpec);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown schema version');
    });
  });
});
