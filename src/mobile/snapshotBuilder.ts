/**
 * snapshotBuilder
 *
 * Derives a MobileDesignSnapshot from the user's choices collected
 * during the guided mobile flow.
 *
 * The palette fallbacks mirror the ones used in StyleFlowShell so that the
 * mobile experience stays visually consistent with the desktop journey.
 */

import type { StyleMood, StyleIndustry } from '../style-flow/types';
import type { MobileComponentSelections, MobileDesignSnapshot } from './types';

// Palette per mood (same values as StyleFlowShell's generateRecommendations)
const MOOD_PALETTES: Record<StyleMood, [string, string, string, string]> = {
  minimal:   ['#1A1A2E', '#16213E', '#0F3460', '#E94560'],
  bold:      ['#FF6B35', '#F7931E', '#FFD23F', '#EE4266'],
  playful:   ['#6C63FF', '#FF6584', '#43BCCD', '#F9C74F'],
  elegant:   ['#2D2D2D', '#B8A472', '#E8E0D4', '#8B7355'],
  technical: ['#0A0E17', '#1B2838', '#66C0F4', '#4C7899'],
};

// Heading font overrides for specific moods
const MOOD_HEADING_FONTS: Partial<Record<StyleMood, string>> = {
  elegant:   'Playfair Display',
  technical: 'JetBrains Mono',
};

/**
 * Build a MobileDesignSnapshot from the user's choices.
 *
 * @param moods            One or more moods selected by the user.
 * @param industry         The industry context.
 * @param overrideColors   Colours extracted/chosen during the pick step.
 * @param overrideFont     Font family selected during the pick step.
 * @param components       Component style selections (Issue #214).
 */
export function buildSnapshot(
  moods: StyleMood[],
  industry: StyleIndustry,
  overrideColors?: string[],
  overrideFont?: { family: string; body: string },
  components?: MobileComponentSelections,
): MobileDesignSnapshot {
  const mood = moods[0] ?? 'minimal';
  const palette = MOOD_PALETTES[mood];

  const primaryColor = overrideColors?.[0] ?? palette[0];
  const accentColor  = overrideColors?.[2] ?? palette[2];

  const headingFont = overrideFont?.family ?? MOOD_HEADING_FONTS[mood] ?? 'Inter';
  const bodyFont    = overrideFont?.body   ?? 'Inter';

  const tokens: Record<string, string> = {
    'color-primary':      primaryColor,
    'color-accent':       accentColor,
    'font-heading':       headingFont,
    'font-body':          bodyFont,
    'font-size-base':     '16px',
    'line-height-base':   '1.6',
  };

  // Emit component tokens if present (Issue #214)
  if (components) {
    tokens['component-button-style'] = components.buttonStyle;
    tokens['component-card-style']   = components.cardStyle;
    tokens['component-nav-style']    = components.navStyle;
  }

  return {
    primaryColor,
    accentColor,
    headingFont,
    bodyFont,
    mood,
    industry,
    components,
    tokens,
  };
}
