/**
 * useSnapSettings — Snap/grid configuration state.
 * Extracted from CanvasApp.tsx.
 */
import { useState } from 'react';

export interface SnapSettingsResult {
  snapToGrid: boolean;
  setSnapToGrid: React.Dispatch<React.SetStateAction<boolean>>;
  snapToObjects: boolean;
  setSnapToObjects: React.Dispatch<React.SetStateAction<boolean>>;
  snapToSpacing: boolean;
  setSnapToSpacing: React.Dispatch<React.SetStateAction<boolean>>;
  gridSize: number;
  setGridSize: React.Dispatch<React.SetStateAction<number>>;
  snapAnchor: 'center' | 'border' | 'both';
  setSnapAnchor: React.Dispatch<React.SetStateAction<'center' | 'border' | 'both'>>;
}

export function useSnapSettings(): SnapSettingsResult {
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapToObjects, setSnapToObjects] = useState(true);
  const [snapToSpacing, setSnapToSpacing] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [snapAnchor, setSnapAnchor] = useState<'center' | 'border' | 'both'>('both');

  return {
    snapToGrid,
    setSnapToGrid,
    snapToObjects,
    setSnapToObjects,
    snapToSpacing,
    setSnapToSpacing,
    gridSize,
    setGridSize,
    snapAnchor,
    setSnapAnchor,
  };
}
