/**
 * Image Export – Phase 5 (#191)
 *
 * Renders a StyleConcept's visual identity onto an HTML Canvas and returns a
 * PNG data URL, enabling "Export Preview as PNG" from the export step.
 *
 * The render is intentionally self-contained (no DOM dependencies beyond
 * `document.createElement('canvas')`), so it can be called from any React
 * component or utility code.
 */

import type { StyleConcept } from './types';

// ── Public API ────────────────────────────────────────────────────────────────

export interface ImageExportOptions {
  /** Canvas width in logical pixels. Default: 800. */
  width?: number;
  /** Canvas height in logical pixels. Default: 480. */
  height?: number;
  /**
   * Device-pixel-ratio scaling factor for high-DPI output.
   * The returned data URL will be (width * scale) × (height * scale) pixels.
   * Default: 1.
   */
  scale?: number;
}

/**
 * Render the given concept's colour swatches, typography, and metadata onto
 * an off-screen canvas and return the result as a PNG data URL.
 *
 * Throws when the canvas 2D context cannot be obtained (e.g. in certain
 * Node environments without a canvas implementation).
 */
export function renderConceptToPng(
  concept: StyleConcept,
  options: ImageExportOptions = {},
): string {
  const width = options.width ?? 800;
  const height = options.height ?? 480;
  const scale = options.scale ?? 1;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.scale(scale, scale);
  drawConcept(ctx, concept, width, height);

  return canvas.toDataURL('image/png');
}

/**
 * Trigger a browser file download for a PNG data URL.
 */
export function downloadPng(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/**
 * Convenience wrapper: render the concept to PNG and immediately download it.
 */
export function exportConceptAsPng(
  concept: StyleConcept,
  options: ImageExportOptions = {},
): void {
  const dataUrl = renderConceptToPng(concept, options);
  const safeName = concept.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  downloadPng(dataUrl, `${safeName}.png`);
}

// ── Rendering helpers ─────────────────────────────────────────────────────────

/**
 * Compute the layout data (positions, sizes, colours) for a concept render.
 * Pure function – useful for testing without a real canvas context.
 */
export function computeConceptLayout(
  concept: StyleConcept,
  width: number,
  height: number,
): ConceptLayout {
  const rec = concept.recommendation;
  const surface = rec.swatches.find((s) => s.role === 'surface')?.hex ?? '#FFFFFF';
  const primary = rec.swatches.find((s) => s.role === 'primary')?.hex ?? '#1A73E8';
  const textColor = rec.swatches.find((s) => s.role === 'text')?.hex ?? '#111111';

  // Swatches row
  const swatchCount = rec.swatches.length;
  const swatchSize = Math.min(80, Math.floor((width - 80) / swatchCount) - 12);
  const swatchY = 140;
  const swatches = rec.swatches.map((swatch, i) => ({
    x: 40 + i * (swatchSize + 12),
    y: swatchY,
    size: swatchSize,
    hex: swatch.hex,
    role: swatch.role,
  }));

  return {
    width,
    height,
    surface,
    primary,
    textColor,
    conceptName: concept.name,
    tagline: concept.tagline,
    headingFont: rec.typography.headingFont,
    bodyFont: rec.typography.bodyFont,
    swatches,
  };
}

export interface SwatchLayout {
  x: number;
  y: number;
  size: number;
  hex: string;
  role: string;
}

export interface ConceptLayout {
  width: number;
  height: number;
  surface: string;
  primary: string;
  textColor: string;
  conceptName: string;
  tagline: string;
  headingFont: string;
  bodyFont: string;
  swatches: SwatchLayout[];
}

// ── Internal canvas drawing ───────────────────────────────────────────────────

function drawConcept(
  ctx: CanvasRenderingContext2D,
  concept: StyleConcept,
  width: number,
  height: number,
): void {
  const layout = computeConceptLayout(concept, width, height);

  // ── Background ────────────────────────────────────────────────────────────
  ctx.fillStyle = layout.surface;
  ctx.fillRect(0, 0, width, height);

  // ── Concept name ──────────────────────────────────────────────────────────
  ctx.fillStyle = layout.textColor;
  ctx.font = `bold 32px "${layout.headingFont}", Inter, sans-serif`;
  ctx.fillText(layout.conceptName, 40, 60);

  // ── Tagline ───────────────────────────────────────────────────────────────
  ctx.globalAlpha = 0.6;
  ctx.font = `16px "${layout.bodyFont}", Inter, sans-serif`;
  ctx.fillText(layout.tagline, 40, 90);
  ctx.globalAlpha = 1;

  // ── Section label ─────────────────────────────────────────────────────────
  ctx.globalAlpha = 0.4;
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText('COLOUR PALETTE', 40, 128);
  ctx.globalAlpha = 1;

  // ── Colour swatches ───────────────────────────────────────────────────────
  for (const swatch of layout.swatches) {
    ctx.fillStyle = swatch.hex;
    roundRect(ctx, swatch.x, swatch.y, swatch.size, swatch.size, 8);
    ctx.fill();

    // Role label
    ctx.fillStyle = layout.textColor;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(swatch.role, swatch.x, swatch.y + swatch.size + 16);

    // Hex label
    ctx.globalAlpha = 0.5;
    ctx.font = '10px monospace';
    ctx.fillText(swatch.hex, swatch.x, swatch.y + swatch.size + 30);
    ctx.globalAlpha = 1;
  }

  // ── Typography section ────────────────────────────────────────────────────
  const typoY = 300;
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = layout.textColor;
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText('TYPOGRAPHY', 40, typoY);
  ctx.globalAlpha = 1;

  ctx.fillStyle = layout.textColor;
  ctx.font = `bold 24px "${layout.headingFont}", serif`;
  ctx.fillText(layout.headingFont, 40, typoY + 28);

  ctx.globalAlpha = 0.6;
  ctx.font = `16px "${layout.bodyFont}", sans-serif`;
  ctx.fillText(layout.bodyFont, 40, typoY + 52);
  ctx.globalAlpha = 1;

  // ── Bottom accent bar ─────────────────────────────────────────────────────
  ctx.fillStyle = layout.primary;
  ctx.fillRect(0, height - 8, width, 8);
}

/** Draw a rounded rectangle path. Uses manual arcs for broad compatibility. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}
