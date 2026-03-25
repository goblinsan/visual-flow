import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchKulrsPalettes,
  fetchKulrsPaletteById,
  fetchKulrsPalettesByColor,
} from './kulrsClient';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePaletteRaw(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pal-1',
    name: 'Sunset',
    description: null,
    likesCount: 5,
    createdAt: '2024-01-01T00:00:00Z',
    colors: [
      { id: 'c1', hexValue: '#ff6b6b', name: 'Red', position: 0 },
      { id: 'c2', hexValue: '#feca57', name: null, position: 1 },
      { id: 'c3', hexValue: '#48dbfb', name: 'Blue', position: 2 },
    ],
    ...overrides,
  };
}

function mockFetch(responses: Array<{ ok: boolean; status: number; json: unknown }>) {
  let call = 0;
  return vi.fn().mockImplementation(() => {
    const r = responses[Math.min(call++, responses.length - 1)];
    return Promise.resolve({
      ok: r.ok,
      status: r.status,
      json: () => Promise.resolve(r.json),
    });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('kulrsClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ── fetchKulrsPalettes ──────────────────────────────────────────────────

  describe('fetchKulrsPalettes', () => {
    it('normalizes { success, data: [] } envelope', async () => {
      const raw = makePaletteRaw();
      global.fetch = mockFetch([{ ok: true, status: 200, json: { success: true, data: [raw] } }]);

      const promise = fetchKulrsPalettes();
      // Advance timers so setTimeout resolves (fetch completes synchronously here)
      vi.runAllTimers();
      const palettes = await promise;

      expect(palettes).toHaveLength(1);
      expect(palettes[0].id).toBe('pal-1');
      expect(palettes[0].name).toBe('Sunset');
      expect(palettes[0].colors).toHaveLength(3);
    });

    it('normalizes bare array response', async () => {
      const raw = makePaletteRaw({ id: 'pal-bare' });
      global.fetch = mockFetch([{ ok: true, status: 200, json: [raw] }]);

      const promise = fetchKulrsPalettes('popular');
      vi.runAllTimers();
      const palettes = await promise;

      expect(palettes[0].id).toBe('pal-bare');
    });

    it('normalizes snake_case likesCount → camelCase', async () => {
      const raw = { ...makePaletteRaw(), likesCount: undefined, likes_count: 99 };
      global.fetch = mockFetch([{ ok: true, status: 200, json: { success: true, data: [raw] } }]);

      const promise = fetchKulrsPalettes();
      vi.runAllTimers();
      const palettes = await promise;

      expect(palettes[0].likesCount).toBe(99);
    });

    it('normalizes hex values without # prefix', async () => {
      const raw = makePaletteRaw({
        colors: [{ id: 'c1', hexValue: 'ff6b6b', name: null, position: 0 }],
      });
      global.fetch = mockFetch([{ ok: true, status: 200, json: { success: true, data: [raw] } }]);

      const promise = fetchKulrsPalettes();
      vi.runAllTimers();
      const palettes = await promise;

      expect(palettes[0].colors[0].hexValue).toBe('#ff6b6b');
    });

    it('normalizes hex values to lowercase', async () => {
      const raw = makePaletteRaw({
        colors: [{ id: 'c1', hexValue: '#FF6B6B', name: null, position: 0 }],
      });
      global.fetch = mockFetch([{ ok: true, status: 200, json: { success: true, data: [raw] } }]);

      const promise = fetchKulrsPalettes();
      vi.runAllTimers();
      const palettes = await promise;

      expect(palettes[0].colors[0].hexValue).toBe('#ff6b6b');
    });

    it('throws on non-ok response (e.g. 500)', async () => {
      global.fetch = mockFetch([
        { ok: false, status: 500, json: {} },
        { ok: false, status: 500, json: {} },
        { ok: false, status: 500, json: {} },
      ]);

      await expect(
        Promise.all([fetchKulrsPalettes(), vi.runAllTimersAsync()]).then(([r]) => r),
      ).rejects.toThrow('Kulrs API 500');
    });

    it('returns empty array when data is missing', async () => {
      global.fetch = mockFetch([{ ok: true, status: 200, json: { success: true } }]);

      const promise = fetchKulrsPalettes();
      vi.runAllTimers();
      const palettes = await promise;

      expect(palettes).toEqual([]);
    });
  });

  // ── fetchKulrsPaletteById ───────────────────────────────────────────────

  describe('fetchKulrsPaletteById', () => {
    it('returns normalized palette on success', async () => {
      const raw = makePaletteRaw({ id: 'abc123' });
      global.fetch = mockFetch([
        { ok: true, status: 200, json: { success: true, data: raw } },
      ]);

      const promise = fetchKulrsPaletteById('abc123');
      vi.runAllTimers();
      const palette = await promise;

      expect(palette).not.toBeNull();
      expect(palette!.id).toBe('abc123');
    });

    it('returns null on 404', async () => {
      global.fetch = mockFetch([{ ok: false, status: 404, json: {} }]);

      const promise = fetchKulrsPaletteById('missing');
      vi.runAllTimers();
      const palette = await promise;

      expect(palette).toBeNull();
    });

    it('throws on 500', async () => {
      global.fetch = mockFetch([
        { ok: false, status: 500, json: {} },
        { ok: false, status: 500, json: {} },
        { ok: false, status: 500, json: {} },
      ]);

      await expect(
        Promise.all([fetchKulrsPaletteById('boom'), vi.runAllTimersAsync()]).then(([r]) => r),
      ).rejects.toThrow('Kulrs API 500');
    });

    it('normalizes bare palette object (no envelope)', async () => {
      const raw = makePaletteRaw({ id: 'bare-id' });
      global.fetch = mockFetch([{ ok: true, status: 200, json: raw }]);

      const promise = fetchKulrsPaletteById('bare-id');
      vi.runAllTimers();
      const palette = await promise;

      expect(palette?.id).toBe('bare-id');
    });
  });

  // ── fetchKulrsPalettesByColor ───────────────────────────────────────────

  describe('fetchKulrsPalettesByColor', () => {
    it('returns palettes containing a color within tolerance', async () => {
      const matching = makePaletteRaw({
        id: 'match',
        colors: [{ id: 'c1', hexValue: '#ff6b6b', name: null, position: 0 }],
      });
      const nonMatching = makePaletteRaw({
        id: 'no-match',
        colors: [{ id: 'c1', hexValue: '#000000', name: null, position: 0 }],
      });
      global.fetch = mockFetch([
        { ok: true, status: 200, json: { success: true, data: [matching, nonMatching] } },
      ]);

      const promise = fetchKulrsPalettesByColor('#ff6b6b', 10);
      vi.runAllTimers();
      const results = await promise;

      expect(results.map(p => p.id)).toContain('match');
      expect(results.map(p => p.id)).not.toContain('no-match');
    });

    it('accepts target hex without # prefix', async () => {
      const palette = makePaletteRaw({
        id: 'p1',
        colors: [{ id: 'c1', hexValue: '#3366cc', name: null, position: 0 }],
      });
      global.fetch = mockFetch([
        { ok: true, status: 200, json: { success: true, data: [palette] } },
      ]);

      const promise = fetchKulrsPalettesByColor('3366cc', 5);
      vi.runAllTimers();
      const results = await promise;

      expect(results).toHaveLength(1);
    });
  });
});
