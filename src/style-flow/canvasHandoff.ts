/**
 * Canvas Handoff – Phase 5 (#192)
 *
 * Translates a chosen StyleConcept (with its typography, button, and
 * navigation selections) into an editable LayoutSpec canvas scene that can
 * be loaded directly into the Vizail canvas editor.
 *
 * The generated scene contains:
 *  - A root frame with the concept's surface colour as background
 *  - Colour swatch rectangles with role labels
 *  - Typography showcase text nodes
 *  - A button preview element
 *  - A navigation preview element
 *
 * All nodes are assigned stable, deterministic IDs derived from the concept
 * ID so that repeated handoffs of the same concept produce identical specs.
 */

import type { LayoutSpec, FrameNode, TextNode, RectNode, StackNode } from '../layout-schema';
import type { StyleConcept } from './types';
import type { ButtonStyle } from './types';
import type { NavigationStyle } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

type TextNodeFontWeight = TextNode['fontWeight'];

const FONT_WEIGHT_VALUES = new Set<string>([
  'normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900',
]);

/** Coerce a free-form fontWeight string to the union expected by TextNode. */
function toFontWeight(value: string | undefined): TextNodeFontWeight {
  if (value && FONT_WEIGHT_VALUES.has(value)) return value as TextNodeFontWeight;
  return 'bold';
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface CanvasHandoffOptions {
  /** Canvas scene width in px. Default: 1280. */
  width?: number;
  /** Canvas scene height in px. Default: 800. */
  height?: number;
}

/**
 * Convert the chosen concept (plus optional resolved style lookups) into an
 * editable LayoutSpec that can be loaded into the Vizail canvas.
 *
 * @param concept      The chosen StyleConcept from the comparison step.
 * @param buttonStyle  The resolved ButtonStyle object (may be undefined).
 * @param navStyle     The resolved NavigationStyle object (may be undefined).
 * @param options      Optional width/height overrides.
 */
export function buildCanvasScene(
  concept: StyleConcept,
  buttonStyle?: ButtonStyle | null,
  navStyle?: NavigationStyle | null,
  options: CanvasHandoffOptions = {},
): LayoutSpec {
  const width = options.width ?? 1280;
  const height = options.height ?? 800;

  const rec = concept.recommendation;
  const surface = rec.swatches.find((s) => s.role === 'surface')?.hex ?? '#FFFFFF';
  const primary = rec.swatches.find((s) => s.role === 'primary')?.hex ?? '#1A73E8';
  const secondary = rec.swatches.find((s) => s.role === 'secondary')?.hex ?? '#16213E';
  const textColor = rec.swatches.find((s) => s.role === 'text')?.hex ?? '#111111';

  const id = concept.id;

  // ── Header / nav preview ──────────────────────────────────────────────────
  const navHeight = 64;
  const navVariant = navStyle?.variant ?? 'top-bar';
  const navNodes = buildNavPreview(id, width, navHeight, primary, surface, navVariant);

  // ── Swatches row ──────────────────────────────────────────────────────────
  const swatchStartY = navHeight + 48;
  const swatchNodes = buildSwatchRow(id, rec.swatches, swatchStartY, primary);

  // ── Typography showcase ───────────────────────────────────────────────────
  const typoStartY = swatchStartY + 160;
  const typoNodes = buildTypographyShowcase(
    id,
    rec.typography.headingFont,
    rec.typography.bodyFont,
    textColor,
    typoStartY,
  );

  // ── Button preview ────────────────────────────────────────────────────────
  const btnStartY = typoStartY + 180;
  const btnNodes = buildButtonPreview(id, primary, surface, buttonStyle, btnStartY);

  // ── Concept name label (top-left) ─────────────────────────────────────────
  const nameLabel: TextNode = {
    id: `${id}-name`,
    name: 'Concept Name',
    type: 'text',
    text: concept.name,
    variant: 'h1',
    color: textColor,
    fontFamily: rec.typography.headingFont,
    fontSize: 28,
    fontWeight: 'bold',
    position: { x: 40, y: navHeight + 12 },
    size: { width: 400, height: 36 },
  };

  const taglineLabel: TextNode = {
    id: `${id}-tagline`,
    name: 'Tagline',
    type: 'text',
    text: concept.tagline,
    variant: 'body',
    color: textColor,
    fontFamily: rec.typography.bodyFont,
    fontSize: 14,
    position: { x: 40, y: navHeight + 52 },
    size: { width: 600, height: 20 },
  };

  // ── Root frame ────────────────────────────────────────────────────────────
  const root: FrameNode = {
    id: `${id}-root`,
    name: concept.name,
    type: 'frame',
    size: { width, height },
    background: secondary,
    children: [
      ...navNodes,
      nameLabel,
      taglineLabel,
      ...swatchNodes,
      ...typoNodes,
      ...btnNodes,
    ],
  };

  return {
    version: '1.0.0',
    root,
  };
}

// ── Section builders ──────────────────────────────────────────────────────────

function buildNavPreview(
  conceptId: string,
  width: number,
  height: number,
  primary: string,
  surface: string,
  variant: string,
): (FrameNode | StackNode | TextNode | RectNode)[] {
  if (variant === 'sidebar') {
    // Sidebar navigation
    const sidebarWidth = 220;
    const sidebar: RectNode = {
      id: `${conceptId}-nav-sidebar`,
      name: 'Navigation Sidebar',
      type: 'rect',
      fill: primary,
      position: { x: 0, y: 0 },
      size: { width: sidebarWidth, height },
    };
    const logo: TextNode = {
      id: `${conceptId}-nav-logo`,
      name: 'Nav Logo',
      type: 'text',
      text: 'Vizail',
      fontFamily: 'Inter',
      fontSize: 18,
      fontWeight: 'bold',
      color: surface,
      position: { x: 20, y: 24 },
      size: { width: sidebarWidth - 40, height: 28 },
    };
    return [sidebar, logo];
  }

  // Default: top-bar
  const bar: RectNode = {
    id: `${conceptId}-nav-bar`,
    name: 'Navigation Bar',
    type: 'rect',
    fill: primary,
    position: { x: 0, y: 0 },
    size: { width, height },
  };
  const logo: TextNode = {
    id: `${conceptId}-nav-logo`,
    name: 'Nav Logo',
    type: 'text',
    text: 'Vizail',
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: 'bold',
    color: surface,
    position: { x: 32, y: height / 2 - 12 },
    size: { width: 120, height: 28 },
  };
  return [bar, logo];
}

function buildSwatchRow(
  conceptId: string,
  swatches: StyleConcept['recommendation']['swatches'],
  startY: number,
  _primary: string,
): (RectNode | TextNode)[] {
  const nodes: (RectNode | TextNode)[] = [];
  const swatchSize = 88;
  const gap = 16;
  const startX = 40;

  // Section label
  const label: TextNode = {
    id: `${conceptId}-palette-header`,
    name: 'Swatches Section Label',
    type: 'text',
    text: 'COLOUR PALETTE',
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    position: { x: startX, y: startY - 24 },
    size: { width: 200, height: 16 },
  };
  nodes.push(label);

  swatches.forEach((swatch, i) => {
    const x = startX + i * (swatchSize + gap);

    const rect: RectNode = {
      id: `${conceptId}-swatch-${swatch.role}`,
      name: `Swatch – ${swatch.role}`,
      type: 'rect',
      fill: swatch.hex,
      radius: 8,
      position: { x, y: startY },
      size: { width: swatchSize, height: swatchSize },
    };

    const roleText: TextNode = {
      id: `${conceptId}-swatch-${swatch.role}-label`,
      name: `Swatch Role – ${swatch.role}`,
      type: 'text',
      text: swatch.role,
      fontFamily: 'Inter',
      fontSize: 11,
      color: '#FFFFFF',
      position: { x, y: startY + swatchSize + 8 },
      size: { width: swatchSize, height: 14 },
    };

    const hexText: TextNode = {
      id: `${conceptId}-swatch-${swatch.role}-hex`,
      name: `Swatch Hex – ${swatch.role}`,
      type: 'text',
      text: swatch.hex,
      fontFamily: 'monospace',
      fontSize: 10,
      color: '#FFFFFF',
      position: { x, y: startY + swatchSize + 24 },
      size: { width: swatchSize, height: 14 },
    };

    nodes.push(rect, roleText, hexText);
  });

  return nodes;
}

function buildTypographyShowcase(
  conceptId: string,
  headingFont: string,
  bodyFont: string,
  textColor: string,
  startY: number,
): TextNode[] {
  const label: TextNode = {
    id: `${conceptId}-typo-label`,
    name: 'Typography Section Label',
    type: 'text',
    text: 'TYPOGRAPHY',
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    position: { x: 40, y: startY },
    size: { width: 200, height: 16 },
  };

  const heading: TextNode = {
    id: `${conceptId}-typo-heading`,
    name: 'Heading Font Example',
    type: 'text',
    text: `Heading – ${headingFont}`,
    fontFamily: headingFont,
    fontSize: 32,
    fontWeight: 'bold',
    color: textColor,
    position: { x: 40, y: startY + 28 },
    size: { width: 700, height: 44 },
  };

  const subheading: TextNode = {
    id: `${conceptId}-typo-subheading`,
    name: 'Subheading Font Example',
    type: 'text',
    text: 'Subheading style – clean and readable',
    fontFamily: headingFont,
    fontSize: 20,
    color: textColor,
    position: { x: 40, y: startY + 84 },
    size: { width: 700, height: 28 },
  };

  const body: TextNode = {
    id: `${conceptId}-typo-body`,
    name: 'Body Font Example',
    type: 'text',
    text: `Body copy – ${bodyFont}. Use this font for paragraphs and UI labels.`,
    fontFamily: bodyFont,
    fontSize: 16,
    color: textColor,
    position: { x: 40, y: startY + 124 },
    size: { width: 700, height: 24 },
  };

  return [label, heading, subheading, body];
}

function buildButtonPreview(
  conceptId: string,
  primary: string,
  surface: string,
  buttonStyle: ButtonStyle | null | undefined,
  startY: number,
): (RectNode | TextNode)[] {
  const label: TextNode = {
    id: `${conceptId}-btn-label`,
    name: 'Button Section Label',
    type: 'text',
    text: 'BUTTON STYLE',
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    position: { x: 40, y: startY },
    size: { width: 200, height: 16 },
  };

  const radiusPx = parseFloat(buttonStyle?.borderRadius ?? '8px') || 8;
  const btnWidth = 160;
  const btnHeight = 44;

  const primaryBtn: RectNode = {
    id: `${conceptId}-btn-primary`,
    name: 'Primary Button',
    type: 'rect',
    fill: primary,
    radius: radiusPx,
    position: { x: 40, y: startY + 28 },
    size: { width: btnWidth, height: btnHeight },
  };

  const primaryBtnText: TextNode = {
    id: `${conceptId}-btn-primary-text`,
    name: 'Primary Button Text',
    type: 'text',
    text: 'Get Started',
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: toFontWeight(buttonStyle?.fontWeight),
    color: surface,
    position: { x: 40, y: startY + 28 + btnHeight / 2 - 9 },
    size: { width: btnWidth, height: 20 },
    align: 'center',
  };

  const outlineBtn: RectNode = {
    id: `${conceptId}-btn-outline`,
    name: 'Outline Button',
    type: 'rect',
    fill: 'transparent',
    stroke: primary,
    strokeWidth: 2,
    radius: radiusPx,
    position: { x: 220, y: startY + 28 },
    size: { width: btnWidth, height: btnHeight },
  };

  const outlineBtnText: TextNode = {
    id: `${conceptId}-btn-outline-text`,
    name: 'Outline Button Text',
    type: 'text',
    text: 'Learn More',
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: toFontWeight(buttonStyle?.fontWeight),
    color: primary,
    position: { x: 220, y: startY + 28 + btnHeight / 2 - 9 },
    size: { width: btnWidth, height: 20 },
    align: 'center',
  };

  return [label, primaryBtn, primaryBtnText, outlineBtn, outlineBtnText];
}
