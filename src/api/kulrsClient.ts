/**
 * Resilient Kulrs API client
 *
 * Provides typed, normalized access to the Kulrs color-palette API with:
 *  - Configurable base URL (env var → production → localhost dev fallback)
 *  - Per-request timeout (default 8 s)
 *  - Automatic retry with exponential back-off (up to 3 attempts)
 *  - Response normalization — handles both envelope shapes:
 *      { success, data: T }   (single palette)
 *      { success, data: T[] } (list)
 *    as well as bare arrays for forward-compatibility
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KulrsPaletteColor {
  id: string;
  hexValue: string;
  name: string | null;
  position: number;
}

export interface KulrsPalette {
  id: string;
  name: string;
  description: string | null;
  likesCount: number;
  createdAt: string;
  colors: KulrsPaletteColor[];
}

export type KulrsSortMode = 'recent' | 'popular';

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

function resolveKulrsBaseUrl(): string {
  const envUrl =
    typeof import.meta !== 'undefined'
      ? (import.meta as { env?: Record<string, string> }).env?.VITE_KULRS_API_URL
      : undefined;
  if (envUrl) return envUrl;
  // In tests / Node environments there is no import.meta.env, so
  // we also accept a process.env fallback.
  if (typeof process !== 'undefined' && process.env.VITE_KULRS_API_URL) {
    return process.env.VITE_KULRS_API_URL;
  }
  const isDev =
    typeof import.meta !== 'undefined' &&
    (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;
  return isDev
    ? 'http://localhost:8080'
    : 'https://kulrs-api-jyedwyfhdq-uc.a.run.app';
}

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

/** Normalize a raw color object from the API, tolerating missing/extra fields. */
function normalizeColor(raw: Record<string, unknown>, index: number): KulrsPaletteColor {
  return {
    id: String(raw.id ?? `color-${index}`),
    hexValue: normalizeHexValue(String(raw.hexValue ?? raw.hex_value ?? raw.hex ?? '')),
    name: raw.name != null ? String(raw.name) : null,
    position: typeof raw.position === 'number' ? raw.position : index,
  };
}

/** Ensure hex values start with '#' and are lower-cased. */
function normalizeHexValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '#000000';
  return trimmed.startsWith('#') ? trimmed.toLowerCase() : `#${trimmed.toLowerCase()}`;
}

/** Normalize a raw palette object from the API. */
function normalizePalette(raw: Record<string, unknown>): KulrsPalette {
  const rawColors = Array.isArray(raw.colors) ? raw.colors : [];
  const colors: KulrsPaletteColor[] = rawColors.map((c, i) =>
    normalizeColor(c as Record<string, unknown>, i),
  );
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    description: raw.description != null ? String(raw.description) : null,
    likesCount:
      typeof raw.likesCount === 'number'
        ? raw.likesCount
        : typeof raw.likes_count === 'number'
          ? (raw.likes_count as number)
          : 0,
    createdAt: String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
    colors,
  };
}

/** Extract a palette list from any known response shape. */
function extractPaletteList(json: unknown): KulrsPalette[] {
  if (Array.isArray(json)) {
    return json.map(p => normalizePalette(p as Record<string, unknown>));
  }
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj.data)) {
      return obj.data.map(p => normalizePalette(p as Record<string, unknown>));
    }
  }
  return [];
}

/** Extract a single palette from any known response shape. */
function extractSinglePalette(json: unknown): KulrsPalette | null {
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
      return normalizePalette(obj.data as Record<string, unknown>);
    }
    // Bare palette object (no envelope)
    if (obj.id) {
      return normalizePalette(obj);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Retry / fetch helpers
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_RETRIES = 3;

/** Fetch with a timeout; throws if the request takes too long. */
async function fetchWithTimeout(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Exponential back-off delay (ms): 200, 400, 800, … */
function backoffMs(attempt: number): number {
  return Math.min(200 * 2 ** attempt, 5_000);
}

/** Retry a fetch call up to `maxRetries` times on network / timeout errors. */
async function fetchWithRetry(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, timeoutMs);
      // Don't retry on 4xx — those are definitive client errors.
      if (res.status >= 400 && res.status < 500) return res;
      // Retry on 5xx / network errors.
      if (!res.ok) {
        lastError = new Error(`Kulrs API ${res.status}`);
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, backoffMs(attempt)));
          continue;
        }
        return res;
      }
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, backoffMs(attempt)));
      }
    }
  }
  throw lastError ?? new Error('Kulrs API request failed');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Browse the Kulrs palette gallery.
 *
 * @param sort   'recent' | 'popular'  (default 'recent')
 * @param limit  Number of results (default 12)
 */
export async function fetchKulrsPalettes(
  sort: KulrsSortMode = 'recent',
  limit = 12,
): Promise<KulrsPalette[]> {
  const base = resolveKulrsBaseUrl();
  const url = `${base}/palettes?sort=${encodeURIComponent(sort)}&limit=${limit}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`Kulrs API ${res.status}`);
  const json: unknown = await res.json();
  return extractPaletteList(json);
}

/**
 * Fetch a single Kulrs palette by its ID.
 *
 * Returns `null` when the palette is not found (404).
 */
export async function fetchKulrsPaletteById(id: string): Promise<KulrsPalette | null> {
  const base = resolveKulrsBaseUrl();
  const url = `${base}/palettes/${encodeURIComponent(id)}`;
  const res = await fetchWithRetry(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Kulrs API ${res.status}`);
  const json: unknown = await res.json();
  return extractSinglePalette(json);
}

/**
 * Find palettes whose colors are visually close to `targetHex`.
 *
 * This is a client-side filter on top of the browse endpoint because the
 * Kulrs API does not currently expose a color-search endpoint.
 *
 * @param targetHex  6-digit hex string to match (with or without '#')
 * @param tolerance  Maximum Euclidean RGB distance (0–441); default 60
 * @param limit      Max palettes to fetch before filtering; default 50
 */
export async function fetchKulrsPalettesByColor(
  targetHex: string,
  tolerance = 60,
  limit = 50,
): Promise<KulrsPalette[]> {
  const normalized = normalizeHexValue(targetHex);
  const tr = parseInt(normalized.slice(1, 3), 16);
  const tg = parseInt(normalized.slice(3, 5), 16);
  const tb = parseInt(normalized.slice(5, 7), 16);

  const palettes = await fetchKulrsPalettes('popular', limit);
  return palettes.filter(p =>
    p.colors.some(c => {
      const hex = c.hexValue;
      if (hex.length < 7) return false;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const dist = Math.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2);
      return dist <= tolerance;
    }),
  );
}
