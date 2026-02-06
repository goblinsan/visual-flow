import { useState, useCallback } from 'react';

export interface ToolState {
  tool: string;
  editingCurveId: string | null;
  selectedCurvePointIndex: number | null;
}

export interface UseToolStateReturn extends ToolState {
  setTool: React.Dispatch<React.SetStateAction<string>>;
  setEditingCurveId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedCurvePointIndex: React.Dispatch<React.SetStateAction<number | null>>;
  clearSelectedCurvePoint: () => void;
}

/**
 * Manages tool selection and curve editing state
 */
export function useToolState(initialTool = 'select'): UseToolStateReturn {
  const [tool, setTool] = useState<string>(initialTool);
  const [editingCurveId, setEditingCurveId] = useState<string | null>(null);
  const [selectedCurvePointIndex, setSelectedCurvePointIndex] = useState<number | null>(null);

  const clearSelectedCurvePoint = useCallback(() => {
    setSelectedCurvePointIndex(null);
  }, []);

  return {
    tool,
    setTool,
    editingCurveId,
    setEditingCurveId,
    selectedCurvePointIndex,
    setSelectedCurvePointIndex,
    clearSelectedCurvePoint,
  };
}
