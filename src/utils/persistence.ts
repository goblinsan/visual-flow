/**
 * Persistence helpers (Phase 0): encapsulate localStorage key usage for rectangle defaults & recent colors.
 * Intentionally mirrors current CanvasApp behavior without altering semantics.
 */
import type { LayoutSpec } from '../layout-schema';

export const LS_KEYS = {
  rectDefaults: 'vf_rect_defaults',
  recentColors: 'vf_recent_colors',
  designSpec: 'vf_design_spec',
  savedDesigns: 'vf_saved_designs',
  currentDesignName: 'vf_current_design_name',
  logLevel: 'vf:logLevel',
  mobileSnapshot: 'vf_mobile_snapshot',
  mobileFlowSession: 'vf_mobile_flow_session',
} as const;

export interface SavedDesign {
  name: string;
  spec: LayoutSpec;
  savedAt: number;
}

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
// We persist the entire LayoutSpec root object with versioning & migration support.

export function loadDesignSpec<T = LayoutSpec>(): T | null {
  try {
    const raw = localStorage.getItem(LS_KEYS.designSpec);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as T;
  } catch (err) {
    // Log corruption for debugging but don't throw
    console.warn('Failed to load design spec from localStorage:', err);
  }
  return null;
}

export function saveDesignSpec<T = LayoutSpec>(spec: T): void {
  try {
    localStorage.setItem(LS_KEYS.designSpec, JSON.stringify(spec));
  } catch (err) {
    // Log storage errors for debugging
    console.warn('Failed to save design spec to localStorage:', err);
  }
}

export function clearDesignSpec(): void {
  try { localStorage.removeItem(LS_KEYS.designSpec); } catch {/* ignore */}
}

// --- Named Design Persistence (Save/SaveAs/Open) ---

/** Get list of all saved designs */
export function getSavedDesigns(): SavedDesign[] {
  try {
    const raw = localStorage.getItem(LS_KEYS.savedDesigns);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load saved designs from localStorage:', err);
    return [];
  }
}

/** Save a design with a name (creates new or updates existing) */
export function saveNamedDesign(name: string, spec: LayoutSpec): void {
  try {
    const designs = getSavedDesigns();
    const existingIndex = designs.findIndex(d => d.name === name);
    const design: SavedDesign = { name, spec, savedAt: Date.now() };
    
    if (existingIndex >= 0) {
      designs[existingIndex] = design;
    } else {
      designs.push(design);
    }
    
    localStorage.setItem(LS_KEYS.savedDesigns, JSON.stringify(designs));
    setCurrentDesignName(name);
  } catch (err) {
    console.warn('Failed to save named design to localStorage:', err);
  }
}

/** Load a design by name */
export function loadNamedDesign(name: string): SavedDesign | null {
  const designs = getSavedDesigns();
  return designs.find(d => d.name === name) ?? null;
}

/** Delete a design by name */
export function deleteNamedDesign(name: string): void {
  try {
    const designs = getSavedDesigns().filter(d => d.name !== name);
    localStorage.setItem(LS_KEYS.savedDesigns, JSON.stringify(designs));
  } catch (err) {
    console.warn('Failed to delete named design from localStorage:', err);
  }
}

/** Get/set current design name */
export function getCurrentDesignName(): string | null {
  try {
    return localStorage.getItem(LS_KEYS.currentDesignName);
  } catch {
    return null;
  }
}

export function setCurrentDesignName(name: string | null): void {
  try {
    if (name) {
      localStorage.setItem(LS_KEYS.currentDesignName, name);
    } else {
      localStorage.removeItem(LS_KEYS.currentDesignName);
    }
  } catch (err) {
    console.warn('Failed to set current design name in localStorage:', err);
  }
}

// Note: Disabled fill/stroke (represented as undefined) are NOT explicitly persisted yet.
// A future phase may introduce explicit boolean flags or sentinel values for disabled states.

// --- Mobile Design Snapshot Handoff (Issue #211) ---
// Persists the snapshot produced at the end of the mobile flow so the desktop
// editor can pick it up and apply the chosen colours + typography.

import type { MobileDesignSnapshot, MobileFlowSessionState } from '../mobile/types';

/** Persist a mobile design snapshot so the desktop editor can import it. */
export function saveMobileSnapshot(snapshot: MobileDesignSnapshot): void {
  try {
    localStorage.setItem(LS_KEYS.mobileSnapshot, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('Failed to save mobile snapshot to localStorage:', err);
  }
}

/** Load the pending mobile snapshot (if any). Returns null when none exists. */
export function loadMobileSnapshot(): MobileDesignSnapshot | null {
  try {
    const raw = localStorage.getItem(LS_KEYS.mobileSnapshot);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as MobileDesignSnapshot;
  } catch {
    // Ignore corrupt data
  }
  return null;
}

/** Remove the pending mobile snapshot after it has been applied or dismissed. */
export function clearMobileSnapshot(): void {
  try { localStorage.removeItem(LS_KEYS.mobileSnapshot); } catch {/* ignore */}
}

// --- Mobile Flow Session (Issue #217) ---
// Persists the in-progress guided flow state so the user can resume after
// leaving the page or refreshing the browser.

/** Persist the current in-progress mobile flow state. */
export function saveMobileFlowSession(state: MobileFlowSessionState): void {
  try {
    localStorage.setItem(LS_KEYS.mobileFlowSession, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save mobile flow session to localStorage:', err);
  }
}

/** Load a previously saved mobile flow session, or null if none exists. */
export function loadMobileFlowSession(): MobileFlowSessionState | null {
  try {
    const raw = localStorage.getItem(LS_KEYS.mobileFlowSession);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as MobileFlowSessionState;
  } catch {
    // Ignore corrupt data
  }
  return null;
}

/** Remove the saved mobile flow session (call on completion or explicit reset). */
export function clearMobileFlowSession(): void {
  try { localStorage.removeItem(LS_KEYS.mobileFlowSession); } catch {/* ignore */}
}

// --- User Saved Palettes (per-user, keyed by userId) ---

import type { DesignTheme } from '../theme/types';

export interface SavedPalette {
  /** Theme ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Kulrs palette source ID (if derived from Kulrs) */
  kulrsPaletteId?: string;
  /** Raw palette hex colors */
  paletteColors: string[];
  /** Theme mode */
  mode: 'light' | 'dark';
  /** When the palette was saved */
  savedAt: number;
}

function savedPalettesKey(userId: string): string {
  return `vizail_saved_palettes_${userId}`;
}

/** Get all palettes saved by this user */
export function getSavedPalettes(userId: string): SavedPalette[] {
  try {
    const raw = localStorage.getItem(savedPalettesKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Check whether the user has previously saved a palette with the given kulrsPaletteId or theme id */
export function userOwnsSavedPalette(userId: string, theme: DesignTheme): boolean {
  const saved = getSavedPalettes(userId);
  return saved.some(
    (p) =>
      p.id === theme.id ||
      (theme.kulrsPaletteId !== undefined && p.kulrsPaletteId === theme.kulrsPaletteId),
  );
}

/** Save or overwrite a palette in the user's list */
export function saveUserPalette(userId: string, theme: DesignTheme, mode: 'overwrite' | 'new'): SavedPalette {
  const list = getSavedPalettes(userId);
  const entry: SavedPalette = {
    id: theme.id,
    name: theme.name,
    kulrsPaletteId: theme.kulrsPaletteId,
    paletteColors: theme.paletteColors,
    mode: theme.mode,
    savedAt: Date.now(),
  };

  let updated: SavedPalette[];
  let saved: SavedPalette;
  if (mode === 'overwrite') {
    // Replace any entry matching by theme id or kulrsPaletteId
    const idx = list.findIndex(
      (p) =>
        p.id === theme.id ||
        (theme.kulrsPaletteId !== undefined && p.kulrsPaletteId === theme.kulrsPaletteId),
    );
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = entry;
    } else {
      updated = [...list, entry];
    }
    saved = entry;
  } else {
    // Save as new: always append with a unique id
    const newEntry: SavedPalette = { ...entry, id: `${theme.id}_${Date.now()}` };
    updated = [...list, newEntry];
    saved = newEntry;
  }

  try {
    localStorage.setItem(savedPalettesKey(userId), JSON.stringify(updated));
  } catch { /* ignore */ }
  return saved;
}
