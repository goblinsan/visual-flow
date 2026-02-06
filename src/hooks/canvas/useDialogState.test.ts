import { renderHook, act } from '@testing-library/react';
import { useDialogState } from './useDialogState';

describe('useDialogState', () => {
  it('initializes all dialogs as closed', () => {
    const { result } = renderHook(() => useDialogState());
    expect(result.current.helpOpen).toBe(false);
    expect(result.current.fileOpen).toBe(false);
    expect(result.current.aboutOpen).toBe(false);
    expect(result.current.cheatOpen).toBe(false);
    expect(result.current.iconLibraryOpen).toBe(false);
    expect(result.current.componentLibraryOpen).toBe(false);
    expect(result.current.newDialogOpen).toBe(false);
    expect(result.current.openDialogOpen).toBe(false);
    expect(result.current.shareDialogOpen).toBe(false);
  });

  it('opens individual dialogs', () => {
    const { result } = renderHook(() => useDialogState());
    act(() => { result.current.setHelpOpen(true); });
    expect(result.current.helpOpen).toBe(true);
    expect(result.current.fileOpen).toBe(false);
  });

  it('toggles dialogs', () => {
    const { result } = renderHook(() => useDialogState());
    act(() => { result.current.setFileOpen(prev => !prev); });
    expect(result.current.fileOpen).toBe(true);
    act(() => { result.current.setFileOpen(prev => !prev); });
    expect(result.current.fileOpen).toBe(false);
  });

  it('closes all dialogs at once', () => {
    const { result } = renderHook(() => useDialogState());
    act(() => {
      result.current.setHelpOpen(true);
      result.current.setFileOpen(true);
      result.current.setAboutOpen(true);
      result.current.setShareDialogOpen(true);
    });
    expect(result.current.helpOpen).toBe(true);
    expect(result.current.shareDialogOpen).toBe(true);
    
    act(() => { result.current.closeAllDialogs(); });
    expect(result.current.helpOpen).toBe(false);
    expect(result.current.fileOpen).toBe(false);
    expect(result.current.aboutOpen).toBe(false);
    expect(result.current.shareDialogOpen).toBe(false);
  });
});
