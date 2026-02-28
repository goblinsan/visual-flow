/**
 * useToolDefaults — Default attribute state for each drawing tool.
 * Extracted from CanvasApp.tsx.
 */
import { useCallback, useEffect, useState } from 'react';
import type { DesignTheme } from '../../theme/types';

export interface LineDefaults {
  stroke: string;
  strokeWidth: number;
  startArrow: boolean;
  endArrow: boolean;
  arrowSize: number;
}

export interface CurveDefaults {
  fill: string | undefined;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  closed: boolean;
  tension: number;
}

export interface DrawDefaults {
  stroke: string;
  strokeWidth: number;
  strokeDash: number[] | undefined;
  lineCap: CanvasLineCap;
  smoothing: number;
}

export interface TextDefaults {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  color: string;
  variant: string;
}

export interface ToolDefaultsResult {
  lineDefaults: LineDefaults;
  updateLineDefaults: (patch: Record<string, unknown>) => void;
  curveDefaults: CurveDefaults;
  updateCurveDefaults: (patch: Record<string, unknown>) => void;
  drawDefaults: DrawDefaults;
  updateDrawDefaults: (patch: Record<string, unknown>) => void;
  textDefaults: TextDefaults;
  updateTextDefaults: (patch: Record<string, unknown>) => void;
  setTextDefaults: React.Dispatch<React.SetStateAction<TextDefaults>>;
  polygonSides: number;
  setPolygonSides: React.Dispatch<React.SetStateAction<number>>;
}

export function useToolDefaults(activeTheme: DesignTheme | null): ToolDefaultsResult {
  const [lineDefaults, setLineDefaults] = useState<LineDefaults>({ stroke: '#334155', strokeWidth: 2, startArrow: false, endArrow: false, arrowSize: 1 });
  const updateLineDefaults = useCallback((patch: Record<string, unknown>) => {
    setLineDefaults(prev => ({ ...prev, ...patch }));
  }, []);

  const [curveDefaults, setCurveDefaults] = useState<CurveDefaults>({ fill: undefined, stroke: '#334155', strokeWidth: 2, opacity: 1, closed: false, tension: 0.5 });
  const updateCurveDefaults = useCallback((patch: Record<string, unknown>) => {
    setCurveDefaults(prev => ({ ...prev, ...patch }));
  }, []);

  const [drawDefaults, setDrawDefaults] = useState<DrawDefaults>({ stroke: '#334155', strokeWidth: 2, strokeDash: undefined, lineCap: 'round', smoothing: 15 });
  const updateDrawDefaults = useCallback((patch: Record<string, unknown>) => {
    setDrawDefaults(prev => ({ ...prev, ...patch }));
  }, []);

  const [textDefaults, setTextDefaults] = useState<TextDefaults>({ fontFamily: 'Arial', fontSize: 14, fontWeight: '400', fontStyle: 'normal', color: '#000000', variant: 'body' });
  const updateTextDefaults = useCallback((patch: Record<string, unknown>) => {
    setTextDefaults(prev => ({ ...prev, ...patch }));
  }, []);

  const [polygonSides, setPolygonSides] = useState(5);

  // When text variant toggles while a theme is active, switch to the appropriate theme font
  useEffect(() => {
    if (!activeTheme) return;
    const isHeading = textDefaults.variant === 'h1' || textDefaults.variant === 'h2' || textDefaults.variant === 'h3';
    const targetFont = isHeading ? activeTheme.typography.headingFont : activeTheme.typography.bodyFont;
    if (textDefaults.fontFamily !== targetFont) {
      setTextDefaults(prev => ({ ...prev, fontFamily: targetFont }));
    }
  }, [textDefaults.variant, activeTheme]);

  return {
    lineDefaults,
    updateLineDefaults,
    curveDefaults,
    updateCurveDefaults,
    drawDefaults,
    updateDrawDefaults,
    textDefaults,
    updateTextDefaults,
    setTextDefaults,
    polygonSides,
    setPolygonSides,
  };
}
