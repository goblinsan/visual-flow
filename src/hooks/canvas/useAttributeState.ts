import { useState } from 'react';

export interface AttributeState {
  attributeTab: 'element' | 'flow';
  panelMode: 'attributes' | 'agent';
  rawDashInput: string;
  lastFillById: Record<string, string>;
  lastStrokeById: Record<string, string>;
}

export interface UseAttributeStateReturn extends AttributeState {
  setAttributeTab: React.Dispatch<React.SetStateAction<'element' | 'flow'>>;
  setPanelMode: React.Dispatch<React.SetStateAction<'attributes' | 'agent'>>;
  setRawDashInput: React.Dispatch<React.SetStateAction<string>>;
  setLastFillById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setLastStrokeById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

/**
 * Manages attribute panel and styling state
 */
export function useAttributeState(): UseAttributeStateReturn {
  const [attributeTab, setAttributeTab] = useState<'element' | 'flow'>('element');
  const [panelMode, setPanelMode] = useState<'attributes' | 'agent'>('attributes');
  const [rawDashInput, setRawDashInput] = useState<string>('');
  const [lastFillById, setLastFillById] = useState<Record<string, string>>({});
  const [lastStrokeById, setLastStrokeById] = useState<Record<string, string>>({});

  return {
    attributeTab,
    setAttributeTab,
    panelMode,
    setPanelMode,
    rawDashInput,
    setRawDashInput,
    lastFillById,
    setLastFillById,
    lastStrokeById,
    setLastStrokeById,
  };
}
