import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentPanel } from './AgentPanel';
import type { LayoutSpec } from '../../layout-schema';
import type { UseProposalsResult } from '../../hooks/useProposals';

// Mock the API client
vi.mock('../../api/client', () => ({
  apiClient: {
    createCanvas: vi.fn(),
  },
}));

describe('AgentPanel', () => {
  const mockSpec: LayoutSpec = {
    root: {
      id: 'root',
      type: 'frame',
      size: { width: 800, height: 600 },
      children: [],
    },
  };

  const mockProposals: UseProposalsResult = {
    proposals: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
    approveProposal: vi.fn(),
    rejectProposal: vi.fn(),
  };

  const defaultProps = {
    currentCanvasId: null,
    setCurrentCanvasId: vi.fn(),
    creatingCanvasId: false,
    setCreatingCanvasId: vi.fn(),
    currentDesignName: 'Test Design',
    spec: mockSpec,
    proposals: mockProposals,
    selectedProposalId: null,
    setSelectedProposalId: vi.fn(),
    viewingProposedSpec: false,
    setViewingProposedSpec: vi.fn(),
    setSpec: vi.fn(),
  };

  it('should show "Share with Agent" button when no canvas ID', () => {
    render(<AgentPanel {...defaultProps} />);
    expect(screen.getByText('Share with Agent')).toBeInTheDocument();
  });

  it('should show canvas ID input when canvas ID exists', () => {
    render(<AgentPanel {...defaultProps} currentCanvasId="test-canvas-123" />);
    expect(screen.getByDisplayValue('test-canvas-123')).toBeInTheDocument();
    expect(screen.getByText('Share this ID with agents to allow proposals')).toBeInTheDocument();
  });

  it('should not show proposals section when no canvas ID', () => {
    render(<AgentPanel {...defaultProps} />);
    expect(screen.queryByText(/Proposals/)).not.toBeInTheDocument();
  });

  it('should show proposals section when canvas ID exists', () => {
    render(<AgentPanel {...defaultProps} currentCanvasId="test-canvas-123" />);
    expect(screen.getByText('Proposals (0)')).toBeInTheDocument();
  });

  it('should show loading state when proposals are loading', () => {
    const loadingProposals = { ...mockProposals, loading: true };
    render(
      <AgentPanel
        {...defaultProps}
        currentCanvasId="test-canvas-123"
        proposals={loadingProposals}
      />
    );
    expect(screen.getByText('Loading proposals...')).toBeInTheDocument();
  });

  it('should show error message when proposals fail to load', () => {
    const errorProposals = { ...mockProposals, error: 'Network error' };
    render(
      <AgentPanel
        {...defaultProps}
        currentCanvasId="test-canvas-123"
        proposals={errorProposals}
      />
    );
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('should show "No pending proposals" when no proposals', () => {
    render(
      <AgentPanel {...defaultProps} currentCanvasId="test-canvas-123" />
    );
    expect(screen.getByText('No pending proposals')).toBeInTheDocument();
  });

  it('should render proposals when they exist', () => {
    const proposalsWithData = {
      ...mockProposals,
      proposals: [
        {
          id: 'prop1',
          title: 'Test Proposal',
          description: 'Test description',
          operations: [{ type: 'create' as const, path: '/root/children/-', value: {} }],
          confidence: 0.85,
          status: 'pending' as const,
          rationale: 'Test rationale',
        },
      ],
    };

    render(
      <AgentPanel
        {...defaultProps}
        currentCanvasId="test-canvas-123"
        proposals={proposalsWithData}
      />
    );

    expect(screen.getByText('Test Proposal')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('1 change')).toBeInTheDocument();
    expect(screen.getByText('85% confidence')).toBeInTheDocument();
  });

  it('should call refetch when refresh button is clicked', () => {
    const refetchMock = vi.fn();
    const proposalsWithRefetch = { ...mockProposals, refetch: refetchMock };

    render(
      <AgentPanel
        {...defaultProps}
        currentCanvasId="test-canvas-123"
        proposals={proposalsWithRefetch}
      />
    );

    const refreshButton = screen.getByText('↻ Refresh');
    fireEvent.click(refreshButton);

    expect(refetchMock).toHaveBeenCalled();
  });

  it('should show proposal details when a proposal is selected', () => {
    const proposalsWithData = {
      ...mockProposals,
      proposals: [
        {
          id: 'prop1',
          title: 'Test Proposal',
          description: 'Test description',
          operations: [{ type: 'create' as const, path: '/root/children/-', value: {} }],
          confidence: 0.85,
          status: 'pending' as const,
          rationale: 'This is the rationale',
          assumptions: ['Assumption 1', 'Assumption 2'],
        },
      ],
    };

    render(
      <AgentPanel
        {...defaultProps}
        currentCanvasId="test-canvas-123"
        proposals={proposalsWithData}
        selectedProposalId="prop1"
      />
    );

    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Rationale')).toBeInTheDocument();
    expect(screen.getByText('This is the rationale')).toBeInTheDocument();
    expect(screen.getByText('Assumptions')).toBeInTheDocument();
    expect(screen.getByText('• Assumption 1')).toBeInTheDocument();
    expect(screen.getByText('• Assumption 2')).toBeInTheDocument();
    expect(screen.getByText('✓ Approve')).toBeInTheDocument();
    expect(screen.getByText('✗ Reject')).toBeInTheDocument();
  });
});
