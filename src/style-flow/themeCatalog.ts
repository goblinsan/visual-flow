import {
  BUTTON_STYLES as SHARED_BUTTON_STYLES,
  NAVIGATION_STYLES as SHARED_NAVIGATION_STYLES,
  THEME_GUIDANCES,
  TYPOGRAPHY_PAIRINGS as SHARED_TYPOGRAPHY_PAIRINGS,
  buildThemeGuidanceTokens,
  resolveThemeGuidance,
} from '@goblinsan/design-themes';
import type {
  ButtonStyle as SharedButtonStyle,
  NavigationStyle as SharedNavigationStyle,
  ThemeGuidance,
  TypographyPairing as SharedTypographyPairing,
} from '@goblinsan/design-themes';
import type { ButtonStyle, DesignToken, NavigationStyle, TypographyPairing } from './types';

export const TYPOGRAPHY_PAIRINGS: TypographyPairing[] =
  SHARED_TYPOGRAPHY_PAIRINGS as TypographyPairing[];

export const BUTTON_STYLES: ButtonStyle[] = SHARED_BUTTON_STYLES.map(
  (style: SharedButtonStyle) => ({
    id: style.id,
    name: style.name,
    description: style.description,
    borderRadius: style.borderRadius,
    fontWeight: style.fontWeight,
    paddingX: style.paddingX,
    outlined: style.outlined,
  }),
) as ButtonStyle[];

export const NAVIGATION_STYLES: NavigationStyle[] =
  SHARED_NAVIGATION_STYLES as NavigationStyle[];

export function resolveTypographyPairing(id: string | null): TypographyPairing | null {
  if (!id) return null;
  return (SHARED_TYPOGRAPHY_PAIRINGS as SharedTypographyPairing[]).find((item) => item.id === id) as TypographyPairing | null;
}

export function resolveButtonStyle(id: string | null): ButtonStyle | null {
  if (!id) return null;
  return BUTTON_STYLES.find((item) => item.id === id) ?? null;
}

export function resolveNavigationStyle(id: string | null): NavigationStyle | null {
  if (!id) return null;
  return (SHARED_NAVIGATION_STYLES as SharedNavigationStyle[]).find((item) => item.id === id) as NavigationStyle | null;
}

export function guidanceTokens(guidanceId: string): DesignToken[] {
  return buildThemeGuidanceTokens(guidanceId).map((token) => ({
    name: token.name,
    value: token.value,
    description: token.description,
  }));
}

export function guidanceForMood(mood: string): ThemeGuidance {
  switch (mood) {
    case 'minimal':
      return THEME_GUIDANCES.find((item) => item.id === 'editorial-minimal')!;
    case 'bold':
      return THEME_GUIDANCES.find((item) => item.id === 'builder-energized')!;
    case 'playful':
      return THEME_GUIDANCES.find((item) => item.id === 'warm-hospitality')!;
    case 'elegant':
      return THEME_GUIDANCES.find((item) => item.id === 'immersive-dark')!;
    case 'technical':
      return THEME_GUIDANCES.find((item) => item.id === 'ops-control')!;
    default:
      return THEME_GUIDANCES[0]!;
  }
}

export { THEME_GUIDANCES, resolveThemeGuidance };
