import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HeaderToolbar, type HeaderToolbarProps } from './HeaderToolbar';
import type { ConnectionStatus, UserAwareness } from '../../collaboration/types';

function setup(overrides: Partial<HeaderToolbarProps> = {}) {
  const mockHeaderRef = { current: document.createElement('div') };
  const mockCollaborators: Map<number, UserAwareness> = new Map();
  const mockReconnect = vi.fn();
  const mockFileAction = vi.fn();
  const mockSetFileOpen = vi.fn();
  const mockSetHelpOpen = vi.fn();
  const mockSetAboutOpen = vi.fn();
  const mockSetCheatOpen = vi.fn();
  const mockSetGettingStartedOpen = vi.fn();
  const mockSetCanvasGuideOpen = vi.fn();
  const mockSetShareDialogOpen = vi.fn();
  const mockSetExportDialogOpen = vi.fn();

  const props: HeaderToolbarProps = {
    headerRef: mockHeaderRef as React.RefObject<HTMLDivElement>,
    fileOpen: false,
    setFileOpen: mockSetFileOpen,
    fileAction: mockFileAction,
    helpOpen: false,
    setHelpOpen: mockSetHelpOpen,
    setAboutOpen: mockSetAboutOpen,
    setCheatOpen: mockSetCheatOpen,
    setGettingStartedOpen: mockSetGettingStartedOpen,
    setCanvasGuideOpen: mockSetCanvasGuideOpen,
    isCollaborative: false,
    status: 'disconnected' as ConnectionStatus,
    collaborators: mockCollaborators,
    isSyncing: false,
    lastError: null,
    reconnect: mockReconnect,
    setShareDialogOpen: mockSetShareDialogOpen,
    setExportDialogOpen: mockSetExportDialogOpen,
    tool: 'select',
    ...overrides,
  };

  const utils = render(<HeaderToolbar {...props} />);
  return { 
    ...utils, 
    mockFileAction, 
    mockSetFileOpen, 
    mockSetHelpOpen, 
    mockSetAboutOpen, 
    mockSetCheatOpen,
    mockSetGettingStartedOpen,
    mockSetCanvasGuideOpen,
    mockSetShareDialogOpen,
    mockSetExportDialogOpen,
  };
}

describe('HeaderToolbar', () => {
  it('renders the Vizail logo and title', () => {
    const { getByText, container } = setup();
    const img = container.querySelector('img[alt="Vizail"]');
    expect(img).toBeTruthy();
    expect(getByText(/Viz/)).toBeTruthy();
  });

  it('toggles file menu when File button is clicked', () => {
    const { getByText, mockSetFileOpen } = setup();
    const fileButton = getByText('File');
    fireEvent.click(fileButton);
    expect(mockSetFileOpen).toHaveBeenCalledWith(expect.any(Function));
  });

  it('toggles help menu when Help button is clicked', () => {
    const { getByText, mockSetHelpOpen } = setup();
    const helpButton = getByText('Help');
    fireEvent.click(helpButton);
    expect(mockSetHelpOpen).toHaveBeenCalledWith(expect.any(Function));
  });

  it('displays file menu items when fileOpen is true', () => {
    const { getByText } = setup({ fileOpen: true });
    expect(getByText('New Design')).toBeTruthy();
    expect(getByText('Open…')).toBeTruthy();
    expect(getByText('Save')).toBeTruthy();
    expect(getByText('Save As…')).toBeTruthy();
  });

  it('calls fileAction when file menu item is clicked', () => {
    const { getByText, mockFileAction, mockSetFileOpen } = setup({ fileOpen: true });
    const newButton = getByText('New Design');
    fireEvent.click(newButton);
    expect(mockFileAction).toHaveBeenCalledWith('new');
    expect(mockSetFileOpen).toHaveBeenCalledWith(false);
  });

  it('displays help menu items when helpOpen is true', () => {
    const { getByText } = setup({ helpOpen: true });
    expect(getByText('About Vizail')).toBeTruthy();
    expect(getByText('Keyboard Shortcuts')).toBeTruthy();
    expect(getByText('Getting Started')).toBeTruthy();
    expect(getByText('Canvas Tools Guide')).toBeTruthy();
  });

  it('calls setAboutOpen when About is clicked', () => {
    const { getByText, mockSetAboutOpen, mockSetHelpOpen } = setup({ helpOpen: true });
    const aboutButton = getByText('About Vizail');
    fireEvent.click(aboutButton);
    expect(mockSetAboutOpen).toHaveBeenCalledWith(true);
    expect(mockSetHelpOpen).toHaveBeenCalledWith(false);
  });

  it('calls setCheatOpen when Keyboard Shortcuts is clicked', () => {
    const { getByText, mockSetCheatOpen, mockSetHelpOpen } = setup({ helpOpen: true });
    const shortcutsButton = getByText('Keyboard Shortcuts');
    fireEvent.click(shortcutsButton);
    expect(mockSetCheatOpen).toHaveBeenCalledWith(true);
    expect(mockSetHelpOpen).toHaveBeenCalledWith(false);
  });

  it('displays Share button and opens dialog on click', () => {
    const { getByText, mockSetShareDialogOpen } = setup();
    const shareButton = getByText('Share');
    fireEvent.click(shareButton);
    expect(mockSetShareDialogOpen).toHaveBeenCalledWith(true);
  });

  it('displays tool indicator with current tool name', () => {
    const { getByText } = setup({ tool: 'rect' });
    // capitalize CSS class makes it lowercase in DOM, but capitalizes display
    expect(getByText('rect')).toBeTruthy();
  });

  it('does not show collaboration status when not collaborative', () => {
    const { queryByText } = setup({ isCollaborative: false });
    // ConnectionStatusIndicator should not be rendered
    const container = document.querySelector('header');
    expect(container?.textContent).not.toContain('collaborator');
  });
});
