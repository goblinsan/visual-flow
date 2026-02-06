import { useState } from 'react';
import { ICON_LIBRARY, COMPONENT_LIBRARY } from '../../library';

export interface LibraryState {
  selectedIconId: string;
  selectedComponentId: string;
  iconSearch: string;
}

export interface UseLibraryStateReturn extends LibraryState {
  setSelectedIconId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedComponentId: React.Dispatch<React.SetStateAction<string>>;
  setIconSearch: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * Manages icon and component library selection state
 */
export function useLibraryState(): UseLibraryStateReturn {
  const [selectedIconId, setSelectedIconId] = useState(ICON_LIBRARY[0]?.id || 'star');
  const [selectedComponentId, setSelectedComponentId] = useState(COMPONENT_LIBRARY[0]?.id || 'button');
  const [iconSearch, setIconSearch] = useState('');

  return {
    selectedIconId,
    setSelectedIconId,
    selectedComponentId,
    setSelectedComponentId,
    iconSearch,
    setIconSearch,
  };
}
