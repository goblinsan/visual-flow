/**
 * useThemeActions — Theme propagation effect + action handlers.
 * Extracted from CanvasApp.tsx.
 */
import { useCallback, useEffect, useRef } from 'react';
import type { LayoutSpec } from '../../layout-schema';
import type { DesignTheme, ColorTokenName } from '../../theme/types';
import { bindAndApplyTheme, createNeutralTheme } from '../../theme';

export interface ThemeActionsResult {
  handleApplyPaletteAsTheme: (paletteColors: string[], mode: 'light' | 'dark', paletteId?: string) => void;
  handleClearTheme: () => void;
  handlePickThemeColor: (hex: string, token: ColorTokenName) => void;
}

export function useThemeActions(
  activeTheme: DesignTheme | null,
  setSpec: (next: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void,
  updateRectDefaults: (patch: Record<string, unknown>) => void,
  setTextDefaults: React.Dispatch<React.SetStateAction<{ fontFamily: string; fontSize: number; fontWeight: string; fontStyle: string; color: string; variant: string }>>,
  applyPalette: (colors: string[], mode: 'light' | 'dark', opts?: { name?: string; kulrsPaletteId?: string }) => DesignTheme,
  setTheme: (theme: DesignTheme) => void,
  pushRecent: (hex?: string) => void,
): ThemeActionsResult {
  // Propagate theme changes to all canvas elements
  const themeAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeTheme) return;
    const fingerprint = activeTheme.id
      + JSON.stringify(activeTheme.colors)
      + activeTheme.mode
      + (activeTheme.typography?.headingFont ?? '')
      + (activeTheme.typography?.bodyFont ?? '');
    if (themeAppliedRef.current === fingerprint) return;
    themeAppliedRef.current = fingerprint;
    setSpec(prev => bindAndApplyTheme(prev, activeTheme));

    updateRectDefaults({
      fill: activeTheme.colors['color.background.primary'],
      stroke: activeTheme.colors['color.border.primary'],
    });

    setTextDefaults(prev => {
      const isHeading = prev.variant === 'h1' || prev.variant === 'h2' || prev.variant === 'h3';
      return {
        ...prev,
        fontFamily: isHeading ? activeTheme.typography.headingFont : activeTheme.typography.bodyFont,
        color: activeTheme.colors['color.text.primary'],
      };
    });
  }, [activeTheme, setSpec, updateRectDefaults, setTextDefaults]);

  const handleApplyPaletteAsTheme = useCallback((paletteColors: string[], mode: 'light' | 'dark', paletteId?: string) => {
    const newTheme = applyPalette(paletteColors, mode, {
      name: `Kulrs ${mode === 'dark' ? 'Dark' : 'Light'}`,
      kulrsPaletteId: paletteId,
    });
    setSpec(prev => bindAndApplyTheme(prev, newTheme));
  }, [applyPalette, setSpec]);

  const handleClearTheme = useCallback(() => {
    const neutral = createNeutralTheme(activeTheme?.mode ?? 'light');
    setTheme(neutral);
    setSpec(prev => bindAndApplyTheme(prev, neutral));
    updateRectDefaults({ fill: neutral.colors['color.background.secondary'], stroke: neutral.colors['color.border.primary'] });
  }, [setTheme, setSpec, updateRectDefaults, activeTheme?.mode]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePickThemeColor = useCallback((hex: string, _token: ColorTokenName) => {
    pushRecent(hex);
  }, [pushRecent]);

  return { handleApplyPaletteAsTheme, handleClearTheme, handlePickThemeColor };
}
