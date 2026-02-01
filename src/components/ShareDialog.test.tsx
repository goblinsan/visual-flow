/**
 * Tests for ShareDialog component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareDialog } from './ShareDialog';
import * as apiClientModule from '../api/client';

vi.mock('../api/client', () => ({
  apiClient: {
    listMembers: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
  },
}));

describe('ShareDialog', () => {
  const mockOnClose = vi.fn();

  const defaultProps = {
    canvasId: 'canvas-1',
    canvasName: 'Test Canvas',
    userRole: 'owner' as const,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog with canvas name', () => {
    vi.mocked(apiClientModule.apiClient.listMembers).mockResolvedValueOnce({
      data: [],
    });

    render(<ShareDialog {...defaultProps} />);

    expect(screen.getByText(/Share "Test Canvas"/)).toBeInTheDocument();
  });

  it('should load and display members', async () => {
    const mockMembers = [
      {
        id: '1',
        canvas_id: 'canvas-1',
        user_id: 'user-1',
        email: 'owner@example.com',
        role: 'owner' as const,
        created_at: 123,
      },
      {
        id: '2',
        canvas_id: 'canvas-1',
        user_id: 'user-2',
        email: 'editor@example.com',
        role: 'editor' as const,
        created_at: 456,
      },
    ];

    vi.mocked(apiClientModule.apiClient.listMembers).mockResolvedValueOnce({
      data: mockMembers,
    });

    render(<ShareDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('owner@example.com')).toBeInTheDocument();
      expect(screen.getByText('editor@example.com')).toBeInTheDocument();
    });
  });

  it('should allow owner to invite new members', async () => {
    vi.mocked(apiClientModule.apiClient.listMembers).mockResolvedValueOnce({
      data: [],
    });

    const newMember = {
      id: '2',
      canvas_id: 'canvas-1',
      user_id: 'new-user',
      email: 'newuser@example.com',
      role: 'editor' as const,
      created_at: 789,
    };

    vi.mocked(apiClientModule.apiClient.addMember).mockResolvedValueOnce({
      data: newMember,
    });

    render(<ShareDialog {...defaultProps} />);

    // Fill in email
    const emailInput = screen.getByPlaceholderText('Email address');
    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });

    // Submit form
    const inviteButton = screen.getByText('Invite');
    fireEvent.click(inviteButton);

    await waitFor(() => {
      expect(apiClientModule.apiClient.addMember).toHaveBeenCalledWith(
        'canvas-1',
        'newuser@example.com',
        'editor'
      );
    });

    await waitFor(() => {
      expect(screen.getByText('newuser@example.com')).toBeInTheDocument();
    });
  });

  it('should show viewer role option', async () => {
    vi.mocked(apiClientModule.apiClient.listMembers).mockResolvedValueOnce({
      data: [],
    });

    render(<ShareDialog {...defaultProps} />);

    const roleSelect = screen.getByRole('combobox');
    expect(roleSelect).toBeInTheDocument();
    
    fireEvent.change(roleSelect, { target: { value: 'viewer' } });
    expect((roleSelect as HTMLSelectElement).value).toBe('viewer');
  });

  it('should not show invite form for viewers', () => {
    vi.mocked(apiClientModule.apiClient.listMembers).mockResolvedValueOnce({
      data: [],
    });

    render(<ShareDialog {...defaultProps} userRole="viewer" />);

    expect(screen.queryByPlaceholderText('Email address')).not.toBeInTheDocument();
    expect(screen.getByText(/You can only view this canvas/)).toBeInTheDocument();
  });

  it('should allow owner to remove non-owner members', async () => {
    const mockMembers = [
      {
        id: '1',
        canvas_id: 'canvas-1',
        user_id: 'user-1',
        email: 'owner@example.com',
        role: 'owner' as const,
        created_at: 123,
      },
      {
        id: '2',
        canvas_id: 'canvas-1',
        user_id: 'user-2',
        email: 'editor@example.com',
        role: 'editor' as const,
        created_at: 456,
      },
    ];

    vi.mocked(apiClientModule.apiClient.listMembers).mockResolvedValueOnce({
      data: mockMembers,
    });

    vi.mocked(apiClientModule.apiClient.removeMember).mockResolvedValueOnce({
      data: { success: true },
    });

    render(<ShareDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('editor@example.com')).toBeInTheDocument();
    });

    // Find and click remove button for editor
    const removeButtons = screen.getAllByText('Remove');
    expect(removeButtons).toHaveLength(1); // Only for editor, not owner

    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(apiClientModule.apiClient.removeMember).toHaveBeenCalledWith(
        'canvas-1',
        'user-2'
      );
    });
  });

  it('should call onClose when close button is clicked', () => {
    vi.mocked(apiClientModule.apiClient.listMembers).mockResolvedValueOnce({
      data: [],
    });

    render(<ShareDialog {...defaultProps} />);

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show error message when invite fails', async () => {
    vi.mocked(apiClientModule.apiClient.listMembers).mockResolvedValueOnce({
      data: [],
    });

    vi.mocked(apiClientModule.apiClient.addMember).mockResolvedValueOnce({
      error: 'User already has access',
    });

    render(<ShareDialog {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText('Email address');
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });

    const inviteButton = screen.getByText('Invite');
    fireEvent.click(inviteButton);

    await waitFor(() => {
      expect(screen.getByText('User already has access')).toBeInTheDocument();
    });
  });
});
