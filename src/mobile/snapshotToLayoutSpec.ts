/**
 * snapshotToLayoutSpec
 *
 * Transformation layer: converts a MobileDesignSnapshot produced at the end
 * of the mobile guided flow into a LayoutSpec suitable for the desktop canvas
 * editor.
 *
 * The generated spec includes a phone-sized (390 × 844) root frame that
 * scaffolds a minimal but representative screen layout:
 *
 *   – A navigation bar rect (primary color)
 *   – A heading text node   (heading font)
 *   – A body text node      (body font)
 *   – A primary-action rect (accent color, respects button-style radius)
 *
 * Issue #218 – Add transformation layer between guided selections and canvas schema
 */

import type { FrameNode, LayoutSpec, RectNode, TextNode } from '../layout-schema';
import type { MobileDesignSnapshot } from './types';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Standard mobile viewport size used as the root-frame dimensions. */
const MOBILE_WIDTH  = 390;
const MOBILE_HEIGHT = 844;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Capitalise the first letter of a string. */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Derive a corner-radius from the chosen button style. */
function buttonRadius(buttonStyle?: string): number {
  if (buttonStyle === 'pill')     return 26;
  if (buttonStyle === 'outlined') return 10;
  if (buttonStyle === 'ghost')    return 8;
  return 8; // filled / default
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build a minimal {@link LayoutSpec} from a {@link MobileDesignSnapshot}.
 *
 * The returned spec is intended as a starting point for further editing in the
 * desktop canvas — it is not a pixel-perfect reproduction of the mobile preview.
 */
export function snapshotToLayoutSpec(snapshot: MobileDesignSnapshot): LayoutSpec {
  const { primaryColor, accentColor, headingFont, bodyFont, mood, industry } = snapshot;

  // Navigation bar
  const navBar: RectNode = {
    id:   'mobile-nav',
    name: 'Navigation bar',
    type: 'rect',
    fill:   primaryColor,
    radius: 0,
    position: { x: 0, y: 0 },
    size:     { width: MOBILE_WIDTH, height: 60 },
  };

  // Heading
  const heading: TextNode = {
    id:         'mobile-heading',
    name:       'Heading',
    type:       'text',
    text:       `${capitalize(industry)} App`,
    variant:    'h1',
    fontFamily: headingFont,
    fontSize:   28,
    fontWeight: 'bold',
    color:      '#ffffff',
    position:   { x: 20, y: 84 },
    size:       { width: 350, height: 40 },
  };

  // Body text
  const bodyText: TextNode = {
    id:         'mobile-body',
    name:       'Body text',
    type:       'text',
    text:       `Designed for a ${mood} feel.`,
    variant:    'body',
    fontFamily: bodyFont,
    fontSize:   16,
    color:      '#ffffff',
    position:   { x: 20, y: 140 },
    size:       { width: 350, height: 24 },
  };

  // Primary action button
  const cta: RectNode = {
    id:     'mobile-button',
    name:   'Primary button',
    type:   'rect',
    fill:   accentColor,
    radius: buttonRadius(snapshot.components?.buttonStyle),
    position: { x: 20, y: MOBILE_HEIGHT - 104 },
    size:     { width: 350, height: 52 },
  };

  const root: FrameNode = {
    id:         'mobile-root',
    name:       `${capitalize(mood)} · ${capitalize(industry)}`,
    type:       'frame',
    background: primaryColor,
    size:       { width: MOBILE_WIDTH, height: MOBILE_HEIGHT },
    children:   [navBar, heading, bodyText, cta],
  };

  return {
    version: '1.0.0',
    root,
  };
}
