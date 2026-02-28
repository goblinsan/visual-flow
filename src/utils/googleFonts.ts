/**
 * Shared Google Font loader — single source of truth for all font loading.
 *
 * Usage:
 *   import { loadGoogleFont } from '../utils/googleFonts';
 *   loadGoogleFont('Inter');                    // loads 400+700
 *   loadGoogleFont('Inter', [400, 600, 700]);   // loads specified weights
 */

const SYSTEM_FONTS = new Set([
  'Arial', 'Helvetica', 'Verdana', 'Georgia',
  'Times New Roman', 'Courier New', 'Tahoma', 'Trebuchet MS',
  'Impact', 'Comic Sans MS', 'Palatino Linotype',
]);

/** Tracks which font+weight combos have already been loaded */
const loadedFonts = new Set<string>();

/** Fonts currently being loaded */
const pendingFonts = new Set<string>();

/** Listeners notified when any font finishes loading */
const fontListeners = new Set<() => void>();

function notifyFontLoaded() {
  fontListeners.forEach(fn => fn());
}

/**
 * Subscribe to font load completions.
 * Returns an unsubscribe function.
 */
export function onFontLoaded(cb: () => void): () => void {
  fontListeners.add(cb);
  return () => fontListeners.delete(cb);
}

/**
 * Returns true if the given font is a system font (no loading needed).
 */
export function isSystemFont(fontName: string): boolean {
  return SYSTEM_FONTS.has(fontName);
}

/**
 * Load a Google Font by name.
 *
 * @param fontName  e.g. "Inter", "Playfair Display"
 * @param weights   numeric weights to request (default: [400, 700]).
 *                  The font CSS is loaded once per unique fontName+weights combo.
 */
export function loadGoogleFont(
  fontName: string,
  weights: number[] = [400, 700],
): void {
  if (!fontName || SYSTEM_FONTS.has(fontName)) return;
  // Skip font stacks
  if (fontName.includes(',')) return;

  const key = `${fontName}:${weights.join(',')}`;
  if (loadedFonts.has(key) || pendingFonts.has(key)) return;

  pendingFonts.add(key);

  // Build the weight axis string: e.g. "wght@400;700"
  const sortedWeights = [...new Set(weights)].sort((a, b) => a - b);
  const weightParam = sortedWeights.join(';');
  const family = encodeURIComponent(fontName).replace(/%20/g, '+');

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@${weightParam}&display=swap`;
  document.head.appendChild(link);

  // Wait for the font to be usable (guard for test environments without FontFaceSet)
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      const fontSpec = `${sortedWeights[0]} 16px "${fontName}"`;
      document.fonts.load(fontSpec).then(() => {
        loadedFonts.add(key);
        pendingFonts.delete(key);
        notifyFontLoaded();
      });
    });
  } else {
    // Fallback: mark loaded after a tick (e.g. in jsdom/test env)
    loadedFonts.add(key);
    pendingFonts.delete(key);
  }
}
