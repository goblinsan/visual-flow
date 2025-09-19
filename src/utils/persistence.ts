/**
 * Persistence helpers (Phase 0): encapsulate localStorage key usage for rectangle defaults & recent colors.
 * Intentionally mirrors current CanvasApp behavior without altering semantics.
 */

export const LS_KEYS = {
  rectDefaults: 'vf_rect_defaults',
  recentColors: 'vf_recent_colors',
  designSpec: 'vf_design_spec',
  logLevel: 'vf:logLevel',
} as const;

export interface RectDefaultsPersisted {
  fill?: string; // omitted means keep existing default
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  opacity?: number;
  strokeDash?: number[];
}

export function loadRectDefaults(): RectDefaultsPersisted | null {
  try {
    const raw = localStorage.getItem(LS_KEYS.rectDefaults);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {/* ignore */}
  return null;
}

export function saveRectDefaults(data: RectDefaultsPersisted): void {
  try { localStorage.setItem(LS_KEYS.rectDefaults, JSON.stringify(data)); } catch {/* ignore */}
}

export function loadRecentColors(): string[] | null {
  try {
    const raw = localStorage.getItem(LS_KEYS.recentColors);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(c => typeof c === 'string') : null;
  } catch { return null; }
}

export function saveRecentColors(colors: string[]): void {
  try { localStorage.setItem(LS_KEYS.recentColors, JSON.stringify(colors)); } catch {/* ignore */}
}

// --- Design Spec Persistence (Phase 3 extraction) ---
// We persist the entire LayoutSpec root object. Future enhancements may add versioning & migrations.

export function loadDesignSpec<T = any>(): T | null {
  try {
    const raw = localStorage.getItem(LS_KEYS.designSpec);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as T;
  } catch {/* ignore */}
  return null;
}

export function saveDesignSpec<T = any>(spec: T): void {
  try { localStorage.setItem(LS_KEYS.designSpec, JSON.stringify(spec)); } catch {/* ignore */}
}

export function clearDesignSpec(): void {
  try { localStorage.removeItem(LS_KEYS.designSpec); } catch {/* ignore */}
}

// Note: Disabled fill/stroke (represented as undefined) are NOT explicitly persisted yet.
// A future phase may introduce explicit boolean flags or sentinel values for disabled states.
