// Color utility helpers with alpha support
// Supported inputs: #RGB, #RRGGBB, #RRGGBBAA, rgb(r,g,b), rgba(r,g,b,a), hsl/hsla (basic parse via browser), plain hex without '#'

export interface RGBA { r: number; g: number; b: number; a: number; }

const clamp255 = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function parseColor(input: string): RGBA | null {
  if (!input) return null;
  let str = input.trim();
  if (/^[0-9a-fA-F]{6}$/.test(str)) str = '#' + str; // bare hex
  // Hex forms
  if (str.startsWith('#')) {
    const hex = str.slice(1);
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b, a: 1 };
    }
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      const r = parseInt(hex.slice(0,2),16);
      const g = parseInt(hex.slice(2,4),16);
      const b = parseInt(hex.slice(4,6),16);
      return { r, g, b, a: 1 };
    }
    if (/^[0-9a-fA-F]{8}$/.test(hex)) {
      const r = parseInt(hex.slice(0,2),16);
      const g = parseInt(hex.slice(2,4),16);
      const b = parseInt(hex.slice(4,6),16);
      const a = parseInt(hex.slice(6,8),16) / 255;
      return { r, g, b, a: clamp01(a) };
    }
    return null;
  }
  // rgb/rgba
  const rgbm = str.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbm) {
    const parts = rgbm[1].split(/\s*,\s*/);
    if (parts.length < 3) return null;
    const r = Number(parts[0]);
    const g = Number(parts[1]);
    const b = Number(parts[2]);
    const a = parts[3] !== undefined ? Number(parts[3]) : 1;
    if ([r,g,b].some(n => isNaN(n)) || isNaN(a)) return null;
    return { r: clamp255(r), g: clamp255(g), b: clamp255(b), a: clamp01(a) };
  }
  // hsl/hsla fallback via canvas
  if (/^hsla?\(/i.test(str)) {
    try {
      const doc = typeof document !== 'undefined' ? document : undefined;
      const canvas = doc?.createElement('canvas');
      const ctx = canvas?.getContext?.('2d');
      if (!ctx) return null;
      ctx.fillStyle = str;
      const v = ctx.fillStyle; // returns in rgb(a) form
      return parseColor(v);
    } catch { return null; }
  }
  return null;
}

export function toHex(c: RGBA, includeAlpha = false): string {
  const r = c.r.toString(16).padStart(2,'0');
  const g = c.g.toString(16).padStart(2,'0');
  const b = c.b.toString(16).padStart(2,'0');
  if (!includeAlpha) return `#${r}${g}${b}`;
  const a = Math.round(clamp01(c.a) * 255).toString(16).padStart(2,'0');
  return `#${r}${g}${b}${a}`;
}

export function toRgba(c: RGBA): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${Number(c.a.toFixed(3))})`;
}

export function adjustAlpha(input: string, alpha: number): string {
  const parsed = parseColor(input);
  if (!parsed) return input;
  return toRgba({ ...parsed, a: clamp01(alpha) });
}

export function normalizeHex(input: string): string | null {
  const p = parseColor(input);
  if (!p) return null;
  return toHex(p, p.a !== 1);
}

export function isSameColor(a: string, b: string): boolean {
  const pa = parseColor(a); const pb = parseColor(b);
  if (!pa || !pb) return false;
  return pa.r===pb.r && pa.g===pb.g && pa.b===pb.b && Math.abs(pa.a-pb.a) < 0.004;
}

export function addRecentColor(list: string[], color: string, limit = 8): string[] {
  const p = parseColor(color); if (!p) return list;
  const hex = toHex(p, p.a !== 1);
  const existing = list.filter(c => !isSameColor(c, hex));
  return [hex, ...existing].slice(0, limit);
}
