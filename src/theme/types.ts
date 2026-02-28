/**
 * Design Theme Token System
 * 
 * Provides semantic color tokens and typography settings that can be
 * derived from Kulrs palettes. Elements reference tokens by name,
 * so changing the theme updates all bound elements automatically.
 */

// ---------------------------------------------------------------------------
// Color Token Names — semantic design-token-style keys
// ---------------------------------------------------------------------------

/** All supported semantic color token names */
export const COLOR_TOKEN_NAMES = [
  // Backgrounds
  'color.background.primary',
  'color.background.secondary',
  'color.background.tertiary',
  'color.background.inverse',
  // Text
  'color.text.primary',
  'color.text.secondary',
  'color.text.inverse',
  'color.text.link',
  // Borders
  'color.border.primary',
  'color.border.secondary',
  'color.border.focus',
  // Actions
  'color.action.primary',
  'color.action.primaryHover',
  'color.action.secondary',
  'color.action.secondaryHover',
  // Status
  'color.status.success',
  'color.status.warning',
  'color.status.error',
  'color.status.info',
  // Surface / Accent
  'color.surface.card',
  'color.surface.overlay',
  'color.accent.primary',
  'color.accent.secondary',
] as const;

export type ColorTokenName = (typeof COLOR_TOKEN_NAMES)[number];

/** Group labels for the token editor */
export const COLOR_TOKEN_GROUPS: { label: string; tokens: ColorTokenName[] }[] = [
  {
    label: 'Backgrounds',
    tokens: [
      'color.background.primary',
      'color.background.secondary',
      'color.background.tertiary',
      'color.background.inverse',
    ],
  },
  {
    label: 'Text',
    tokens: [
      'color.text.primary',
      'color.text.secondary',
      'color.text.inverse',
      'color.text.link',
    ],
  },
  {
    label: 'Borders',
    tokens: [
      'color.border.primary',
      'color.border.secondary',
      'color.border.focus',
    ],
  },
  {
    label: 'Actions',
    tokens: [
      'color.action.primary',
      'color.action.primaryHover',
      'color.action.secondary',
      'color.action.secondaryHover',
    ],
  },
  {
    label: 'Status',
    tokens: [
      'color.status.success',
      'color.status.warning',
      'color.status.error',
      'color.status.info',
    ],
  },
  {
    label: 'Surface / Accent',
    tokens: [
      'color.surface.card',
      'color.surface.overlay',
      'color.accent.primary',
      'color.accent.secondary',
    ],
  },
];

// ---------------------------------------------------------------------------
// Typography Tokens
// ---------------------------------------------------------------------------

export interface ThemeTypography {
  headingFont: string;
  bodyFont: string;
  monoFont?: string;
}

// ---------------------------------------------------------------------------
// Full Design Theme
// ---------------------------------------------------------------------------

export interface DesignTheme {
  /** Unique identifier for the theme */
  id: string;
  /** Human-readable name */
  name: string;
  /** The kulrs palette ID this theme was derived from (if any) */
  kulrsPaletteId?: string;
  /** Raw palette hex colors from Kulrs */
  paletteColors: string[];
  /** Light or dark base */
  mode: 'light' | 'dark';
  /** Semantic color tokens — maps token name → hex value */
  colors: Record<ColorTokenName, string>;
  /** Typography settings */
  typography: ThemeTypography;
}

// ---------------------------------------------------------------------------
// Node-level theme binding
// ---------------------------------------------------------------------------

/**
 * Stored on layout nodes to bind a color property to a theme token.
 * e.g. { fill: 'color.action.primary', color: 'color.text.primary' }
 */
export type ThemeBindings = Partial<Record<'fill' | 'stroke' | 'color' | 'background', ColorTokenName>>;

// ---------------------------------------------------------------------------
// Shorthand display name for tokens (used in dropdowns)
// ---------------------------------------------------------------------------

const TOKEN_SHORT_NAMES: Record<ColorTokenName, string> = {
  'color.background.primary': 'BG Primary',
  'color.background.secondary': 'BG Secondary',
  'color.background.tertiary': 'BG Tertiary',
  'color.background.inverse': 'BG Inverse',
  'color.text.primary': 'Text Primary',
  'color.text.secondary': 'Text Secondary',
  'color.text.inverse': 'Text Inverse',
  'color.text.link': 'Text Link',
  'color.border.primary': 'Border Primary',
  'color.border.secondary': 'Border Secondary',
  'color.border.focus': 'Border Focus',
  'color.action.primary': 'Action Primary',
  'color.action.primaryHover': 'Action Hover',
  'color.action.secondary': 'Action Secondary',
  'color.action.secondaryHover': 'Action 2 Hover',
  'color.status.success': 'Success',
  'color.status.warning': 'Warning',
  'color.status.error': 'Error',
  'color.status.info': 'Info',
  'color.surface.card': 'Card Surface',
  'color.surface.overlay': 'Overlay',
  'color.accent.primary': 'Accent Primary',
  'color.accent.secondary': 'Accent Secondary',
};

export function tokenShortName(token: ColorTokenName): string {
  return TOKEN_SHORT_NAMES[token] ?? token;
}
