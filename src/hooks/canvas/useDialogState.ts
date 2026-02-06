import { useState, useCallback } from 'react';

export interface DialogState {
  helpOpen: boolean;
  fileOpen: boolean;
  aboutOpen: boolean;
  cheatOpen: boolean;
  iconLibraryOpen: boolean;
  componentLibraryOpen: boolean;
  newDialogOpen: boolean;
  openDialogOpen: boolean;
  shareDialogOpen: boolean;
}

export interface UseDialogStateReturn extends DialogState {
  setHelpOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setFileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setAboutOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCheatOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIconLibraryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setComponentLibraryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setNewDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShareDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  closeAllDialogs: () => void;
}

/**
 * Manages all dialog open/close states
 */
export function useDialogState(): UseDialogStateReturn {
  const [helpOpen, setHelpOpen] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [cheatOpen, setCheatOpen] = useState(false);
  const [iconLibraryOpen, setIconLibraryOpen] = useState(false);
  const [componentLibraryOpen, setComponentLibraryOpen] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const closeAllDialogs = useCallback(() => {
    setHelpOpen(false);
    setFileOpen(false);
    setAboutOpen(false);
    setCheatOpen(false);
    setIconLibraryOpen(false);
    setComponentLibraryOpen(false);
    setNewDialogOpen(false);
    setOpenDialogOpen(false);
    setShareDialogOpen(false);
  }, []);

  return {
    helpOpen,
    setHelpOpen,
    fileOpen,
    setFileOpen,
    aboutOpen,
    setAboutOpen,
    cheatOpen,
    setCheatOpen,
    iconLibraryOpen,
    setIconLibraryOpen,
    componentLibraryOpen,
    setComponentLibraryOpen,
    newDialogOpen,
    setNewDialogOpen,
    openDialogOpen,
    setOpenDialogOpen,
    shareDialogOpen,
    setShareDialogOpen,
    closeAllDialogs,
  };
}
