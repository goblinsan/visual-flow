/**
 * Storybook stories for Phase 4 components
 */

import type { Meta, StoryObj } from '@storybook/react';
import { AgentTokenDialog } from './components/AgentTokenDialog';
import { ProposalListPanel } from './components/ProposalListPanel';
import { ProposalDiffView } from './components/ProposalDiffView';
import { RationaleTooltip } from './components/RationaleTooltip';
import type { AgentProposal, DesignRationale, AgentToken, AgentScope } from './types/agent';

// Mock data
const mockProposals: AgentProposal[] = [
  {
    id: 'proposal-1',
    branchId: 'branch-1',
    canvasId: 'canvas-1',
    agentId: 'design-assistant',
    status: 'pending',
    title: 'Add Navigation Header',
    description: 'Added a navigation header with logo and 3 menu items based on wireframe',
    operations: [
      {
        type: 'create',
        nodeId: 'header-1',
        after: { type: 'rect', size: { width: 800, height: 60 } },
        rationale: 'Created header container to hold navigation elements',
      },
      {
        type: 'create',
        nodeId: 'logo-1',
        after: { type: 'text', position: { x: 20, y: 20 } },
        rationale: 'Added logo text in top-left corner',
      },
    ],
    rationale:
      'Based on the wireframe provided, I added a navigation header with a logo and menu items. The header uses a standard 60px height which is common for web navigation.',
    assumptions: [
      'Brand color is #1e293b (slate)',
      'Logo text is "Vizail"',
      'Menu items are: Home, Features, Pricing',
    ],
    confidence: 0.85,
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'proposal-2',
    branchId: 'branch-1',
    canvasId: 'canvas-1',
    agentId: 'layout-optimizer',
    status: 'approved',
    title: 'Improve Button Spacing',
    description: 'Adjusted spacing between buttons for better visual hierarchy',
    operations: [
      {
        type: 'update',
        nodeId: 'button-1',
        before: { position: { x: 100, y: 200 } },
        after: { position: { x: 100, y: 210 } },
        rationale: 'Increased vertical spacing to 10px for better visual separation',
      },
    ],
    rationale: 'The buttons were too close together. Standard spacing guidelines recommend 8-12px.',
    assumptions: ['Using 8px spacing grid', 'Buttons should have equal spacing'],
    confidence: 0.92,
    createdAt: Date.now() - 7200000,
    reviewedAt: Date.now() - 1800000,
    reviewedBy: 'user-123',
  },
  {
    id: 'proposal-3',
    branchId: 'branch-2',
    canvasId: 'canvas-1',
    agentId: 'color-expert',
    status: 'rejected',
    title: 'Update Color Palette',
    description: 'Changed primary color to improve accessibility',
    operations: [
      {
        type: 'update',
        nodeId: 'button-1',
        before: { fill: '#3B82F6' },
        after: { fill: '#2563EB' },
        rationale: 'Darker blue improves contrast ratio for WCAG AA compliance',
      },
    ],
    rationale: 'The original color had a contrast ratio of 4.2:1. The new color achieves 4.8:1.',
    assumptions: ['Background is white', 'Targeting WCAG AA standard'],
    confidence: 0.78,
    createdAt: Date.now() - 10800000,
    reviewedAt: Date.now() - 5400000,
    reviewedBy: 'user-123',
  },
];

const mockRationale: DesignRationale = {
  nodeId: 'node-1',
  text: 'This element was positioned here to align with the grid system and maintain visual balance',
  agentId: 'layout-optimizer',
  timestamp: Date.now(),
  proposalId: 'proposal-1',
};

// AgentTokenDialog stories
const meta: Meta<typeof AgentTokenDialog> = {
  title: 'Phase 4/AgentTokenDialog',
  component: AgentTokenDialog,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof AgentTokenDialog>;

export const Default: Story = {
  args: {
    canvasId: 'canvas-1',
    onClose: () => console.log('Close clicked'),
    onGenerate: async (agentId: string, scope: AgentScope): Promise<AgentToken | null> => {
      console.log('Generate token:', agentId, scope);
      return {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example',
        agentId,
        ownerId: 'user-123',
        canvasId: 'canvas-1',
        scope,
        expiresAt: Date.now() + 86400000,
        createdAt: Date.now(),
      };
    },
  },
};

// ProposalListPanel stories
export const ProposalList: Story = {
  render: () => (
    <div className="h-screen">
      <ProposalListPanel
        proposals={mockProposals}
        loading={false}
        onSelectProposal={(id) => console.log('Select proposal:', id)}
        onApprove={async (id) => console.log('Approve:', id)}
        onReject={async (id) => console.log('Reject:', id)}
      />
    </div>
  ),
};

export const ProposalListLoading: Story = {
  render: () => (
    <div className="h-screen">
      <ProposalListPanel
        proposals={[]}
        loading={true}
        onSelectProposal={(id) => console.log('Select proposal:', id)}
        onApprove={async (id) => console.log('Approve:', id)}
        onReject={async (id) => console.log('Reject:', id)}
      />
    </div>
  ),
};

export const ProposalListEmpty: Story = {
  render: () => (
    <div className="h-screen">
      <ProposalListPanel
        proposals={[]}
        loading={false}
        onSelectProposal={(id) => console.log('Select proposal:', id)}
        onApprove={async (id) => console.log('Approve:', id)}
        onReject={async (id) => console.log('Reject:', id)}
      />
    </div>
  ),
};

// ProposalDiffView stories
export const ProposalDiff: Story = {
  render: () => (
    <ProposalDiffView
      proposal={mockProposals[0]}
      onClose={() => console.log('Close')}
      onApprove={async () => console.log('Approve')}
      onReject={async () => console.log('Reject')}
    />
  ),
};

export const ProposalDiffApproved: Story = {
  render: () => (
    <ProposalDiffView
      proposal={mockProposals[1]}
      onClose={() => console.log('Close')}
    />
  ),
};

export const ProposalDiffRejected: Story = {
  render: () => (
    <ProposalDiffView
      proposal={mockProposals[2]}
      onClose={() => console.log('Close')}
    />
  ),
};

// RationaleTooltip stories
export const Rationale: Story = {
  render: () => (
    <div className="relative h-96 bg-gray-100 flex items-center justify-center">
      <div className="text-gray-400">Hover over this area to see rationale</div>
      <RationaleTooltip
        rationale={mockRationale}
        position={{ x: 200, y: 200 }}
        visible={true}
      />
    </div>
  ),
};
