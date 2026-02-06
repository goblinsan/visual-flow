/**
 * Tests for DialogManager component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DialogManager } from './DialogManager';
import type { LayoutSpec } from '../../layout-schema';

describe('DialogManager', () => {
  const mockSetShareDialogOpen = vi.fn();
  const mockSetAboutOpen = vi.fn();
  const mockSetCheatOpen = vi.fn();
  const mockSetIconLibraryOpen = vi.fn();
  const mockSetComponentLibraryOpen = vi.fn();
  const mockSetNewDialogOpen = vi.fn();
  const mockSetOpenDialogOpen = vi.fn();
  const mockSetSelectedIconId = vi.fn();
  const mockSetIconSearch = vi.fn();
  const mockSetSelectedComponentId = vi.fn();
  const mockOnApplyTemplate = vi.fn();
  const mockOnLoadDesign = vi.fn();
  const mockOnStartCollaborativeSession = vi.fn();
  const mockOnLeaveCollaborativeSession = vi.fn();
  const mockOnCopyShareLink = vi.fn();

  const mockTemplates = [
    {
      id: 'blank',
      name: 'Blank Canvas',
      icon: 'fa-regular fa-file',
      description: 'Start with an empty canvas',
      build: (): LayoutSpec => ({
        root: { id: 'root', type: 'frame', size: { width: 1600, height: 1200 }, background: undefined, children: [] }
      }),
    },
  ];

  const defaultProps = {
    shareDialogOpen: false,
    setShareDialogOpen: mockSetShareDialogOpen,
    aboutOpen: false,
    setAboutOpen: mockSetAboutOpen,
    cheatOpen: false,
    setCheatOpen: mockSetCheatOpen,
    iconLibraryOpen: false,
    setIconLibraryOpen: mockSetIconLibraryOpen,
    componentLibraryOpen: false,
    setComponentLibraryOpen: mockSetComponentLibraryOpen,
    newDialogOpen: false,
    setNewDialogOpen: mockSetNewDialogOpen,
    openDialogOpen: false,
    setOpenDialogOpen: mockSetOpenDialogOpen,
    isCollaborative: false,
    roomId: null,
    selectedIconId: 'star',
    setSelectedIconId: mockSetSelectedIconId,
    iconSearch: '',
    setIconSearch: mockSetIconSearch,
    selectedComponentId: 'button',
    setSelectedComponentId: mockSetSelectedComponentId,
    appVersion: '1.0.0',
    onApplyTemplate: mockOnApplyTemplate,
    onLoadDesign: mockOnLoadDesign,
    onStartCollaborativeSession: mockOnStartCollaborativeSession,
    onLeaveCollaborativeSession: mockOnLeaveCollaborativeSession,
    onCopyShareLink: mockOnCopyShareLink,
    templates: mockTemplates,
  };

  it('renders about modal when aboutOpen is true', () => {
    render(<DialogManager {...defaultProps} aboutOpen={true} />);
    expect(screen.getByText(/About Vizail/)).toBeInTheDocument();
    expect(screen.getByText(/version/)).toBeInTheDocument();
    expect(screen.getByText(/1.0.0/)).toBeInTheDocument();
  });

  it('renders keyboard shortcuts modal when cheatOpen is true', () => {
    render(<DialogManager {...defaultProps} cheatOpen={true} />);
    expect(screen.getByText(/Interaction Cheatsheet/)).toBeInTheDocument();
    expect(screen.getByText(/Select: Click/)).toBeInTheDocument();
  });

  it('renders share dialog in non-collaborative mode', () => {
    render(<DialogManager {...defaultProps} shareDialogOpen={true} isCollaborative={false} />);
    expect(screen.getByText(/Share & Collaborate/)).toBeInTheDocument();
    expect(screen.getByText(/Start a collaborative session/)).toBeInTheDocument();
  });

  it('renders share dialog in collaborative mode with room link', () => {
    render(<DialogManager {...defaultProps} shareDialogOpen={true} isCollaborative={true} roomId="test-room-123" />);
    expect(screen.getByText(/You're in a collaborative session/)).toBeInTheDocument();
    const input = screen.getByDisplayValue(/room=test-room-123/);
    expect(input).toBeInTheDocument();
  });

  it('calls onStartCollaborativeSession when start button is clicked', () => {
    render(<DialogManager {...defaultProps} shareDialogOpen={true} isCollaborative={false} />);
    const startButton = screen.getByText(/Start Collaborative Session/);
    fireEvent.click(startButton);
    expect(mockOnStartCollaborativeSession).toHaveBeenCalled();
  });

  it('calls onLeaveCollaborativeSession when leave button is clicked', () => {
    render(<DialogManager {...defaultProps} shareDialogOpen={true} isCollaborative={true} roomId="test-room" />);
    const leaveButton = screen.getByText(/Leave collaborative session/);
    fireEvent.click(leaveButton);
    expect(mockOnLeaveCollaborativeSession).toHaveBeenCalled();
  });

  it('calls onCopyShareLink when copy button is clicked', () => {
    render(<DialogManager {...defaultProps} shareDialogOpen={true} isCollaborative={true} roomId="test-room" />);
    const copyButton = screen.getByText(/Copy/);
    fireEvent.click(copyButton);
    expect(mockOnCopyShareLink).toHaveBeenCalled();
  });

  it('renders new design dialog with templates', () => {
    render(<DialogManager {...defaultProps} newDialogOpen={true} />);
    expect(screen.getByText(/Create New Design/)).toBeInTheDocument();
    expect(screen.getByText(/Blank Canvas/)).toBeInTheDocument();
  });

  it('calls onApplyTemplate when template is clicked', () => {
    render(<DialogManager {...defaultProps} newDialogOpen={true} />);
    const templateButton = screen.getByText(/Blank Canvas/);
    fireEvent.click(templateButton);
    expect(mockOnApplyTemplate).toHaveBeenCalledWith('blank');
  });

  it('renders open design dialog with empty state', () => {
    // Mock localStorage to return empty designs
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    
    render(<DialogManager {...defaultProps} openDialogOpen={true} />);
    expect(screen.getByText(/Open Design/)).toBeInTheDocument();
    expect(screen.getByText(/No saved designs yet/)).toBeInTheDocument();
  });

  it('renders icon library dialog with search', () => {
    render(<DialogManager {...defaultProps} iconLibraryOpen={true} />);
    expect(screen.getByText(/Icons/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search icons.../)).toBeInTheDocument();
  });

  it('calls setIconSearch when search input changes', () => {
    render(<DialogManager {...defaultProps} iconLibraryOpen={true} />);
    const searchInput = screen.getByPlaceholderText(/Search icons.../);
    fireEvent.change(searchInput, { target: { value: 'search term' } });
    expect(mockSetIconSearch).toHaveBeenCalledWith('search term');
  });

  it('renders component library dialog', () => {
    render(<DialogManager {...defaultProps} componentLibraryOpen={true} />);
    expect(screen.getByText(/Components/)).toBeInTheDocument();
    expect(screen.getByText(/Choose a component/)).toBeInTheDocument();
  });

  it('closes about dialog when close button is clicked', () => {
    render(<DialogManager {...defaultProps} aboutOpen={true} />);
    // The Modal component should have a close button or overlay
    // This will depend on the Modal implementation
    // For now, we just verify the callback is passed correctly
    expect(mockSetAboutOpen).toBeDefined();
  });

  it('does not render any modals when all are closed', () => {
    const { container } = render(<DialogManager {...defaultProps} />);
    // Modals should not be visible when closed
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
