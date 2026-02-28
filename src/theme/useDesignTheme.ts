/**
 * useDesignTheme — React hook for managing the active design theme.
 * 
 * Persists the theme to localStorage and provides methods to:
 * - Set a theme from a Kulrs palette
 * - Update individual token colors
 * - Update typography
 * - Switch light/dark mode
 * - Apply the theme to the current spec
 */

import { useState, useCallback, useEffect } from 'react';
import type { DesignTheme, ColorTokenName, ThemeTypography, ThemeBindings } from './types';
import { generateThemeFromPalette, applyThemeToSpec, createDefaultTheme } from './themeGenerator';
import type { LayoutSpec, LayoutNode } from '../layout-schema';

const THEME_STORAGE_KEY = 'vizail_design_theme';

function loadPersistedTheme(): DesignTheme | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function persistTheme(theme: DesignTheme | null) {
  try {
    if (theme) localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    else localStorage.removeItem(THEME_STORAGE_KEY);
  } catch { /* ignore */ }
}

export interface UseDesignThemeReturn {
  /** Current active theme (null if no theme set) */
  theme: DesignTheme | null;
  /** Set a complete theme */
  setTheme: (theme: DesignTheme | null) => void;
  /** Generate and apply a theme from a palette */
  applyPalette: (paletteColors: string[], mode: 'light' | 'dark', options?: {
    name?: string;
    kulrsPaletteId?: string;
    typography?: Partial<ThemeTypography>;
  }) => DesignTheme;
  /** Toggle between light and dark mode (re-generates from palette) */
  toggleMode: () => void;
  /** Update a single token color */
  updateTokenColor: (token: ColorTokenName, hex: string) => void;
  /** Update typography settings */
  updateTypography: (updates: Partial<ThemeTypography>) => void;
  /** Rearrange palette colors and regenerate theme */
  updatePaletteOrder: (newOrder: string[]) => void;
  /** Apply the active theme to a spec, resolving all bindings */
  applyToSpec: (spec: LayoutSpec) => LayoutSpec;
  /** Resolve a single token to its hex value */
  resolveToken: (token: ColorTokenName) => string | undefined;
  /** Get the hex value for a color property, checking theme bindings first */
  resolveColor: (node: LayoutNode, prop: 'fill' | 'stroke' | 'color' | 'background') => string | undefined;
}

export function useDesignTheme(): UseDesignThemeReturn {
  const [theme, setThemeRaw] = useState<DesignTheme | null>(() => loadPersistedTheme());

  // Persist whenever theme changes
  useEffect(() => {
    persistTheme(theme);
  }, [theme]);

  const setTheme = useCallback((t: DesignTheme | null) => {
    setThemeRaw(t);
  }, []);

  const applyPalette = useCallback((
    paletteColors: string[],
    mode: 'light' | 'dark',
    options?: {
      name?: string;
      kulrsPaletteId?: string;
      typography?: Partial<ThemeTypography>;
    },
  ): DesignTheme => {
    const existingTypo = theme?.typography;
    const newTheme = generateThemeFromPalette(paletteColors, mode, {
      ...options,
      typography: {
        ...(existingTypo ?? {}),
        ...(options?.typography ?? {}),
      },
    });
    setThemeRaw(newTheme);
    return newTheme;
  }, [theme]);

  const toggleMode = useCallback(() => {
    if (!theme) {
      setThemeRaw(createDefaultTheme('dark'));
      return;
    }
    const newMode = theme.mode === 'dark' ? 'light' : 'dark';
    const regen = generateThemeFromPalette(theme.paletteColors, newMode, {
      name: theme.name.replace(/(Light|Dark)/i, newMode === 'dark' ? 'Dark' : 'Light'),
      kulrsPaletteId: theme.kulrsPaletteId,
      typography: theme.typography,
    });
    setThemeRaw(regen);
  }, [theme]);

  const updateTokenColor = useCallback((token: ColorTokenName, hex: string) => {
    setThemeRaw(prev => {
      if (!prev) return prev;
      return { ...prev, colors: { ...prev.colors, [token]: hex } };
    });
  }, []);

  const updateTypography = useCallback((updates: Partial<ThemeTypography>) => {
    setThemeRaw(prev => {
      if (!prev) return prev;
      return { ...prev, typography: { ...prev.typography, ...updates } };
    });
  }, []);

  const updatePaletteOrder = useCallback((newOrder: string[]) => {
    setThemeRaw(prev => {
      if (!prev) return prev;
      const regen = generateThemeFromPalette(newOrder, prev.mode, {
        name: prev.name,
        kulrsPaletteId: prev.kulrsPaletteId,
        typography: prev.typography,
      });
      return regen;
    });
  }, []);

  const applyToSpec = useCallback((spec: LayoutSpec): LayoutSpec => {
    if (!theme) return spec;
    return applyThemeToSpec(spec, theme);
  }, [theme]);

  const resolveToken = useCallback((token: ColorTokenName): string | undefined => {
    return theme?.colors[token];
  }, [theme]);

  const resolveColor = useCallback((node: LayoutNode, prop: 'fill' | 'stroke' | 'color' | 'background'): string | undefined => {
    const bindings = (node as LayoutNode & { themeBindings?: ThemeBindings }).themeBindings;
    if (bindings?.[prop] && theme?.colors[bindings[prop]]) {
      return theme.colors[bindings[prop]];
    }
    // Fall back to the raw value on the node
    return (node as Record<string, unknown>)[prop] as string | undefined;
  }, [theme]);

  return {
    theme,
    setTheme,
    applyPalette,
    toggleMode,
    updateTokenColor,
    updateTypography,
    updatePaletteOrder,
    applyToSpec,
    resolveToken,
    resolveColor,
  };
}
