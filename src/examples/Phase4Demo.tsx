/**
 * Phase 4 Demo - Agent Branches & Proposals
 * Demonstrates how to use agent collaboration features
 */

import { useState } from 'react';
import { useBranches } from '../hooks/useBranches';
import { useProposals } from '../hooks/useProposals';
import { AgentTokenDialog } from '../components/AgentTokenDialog';
import { ProposalListPanel } from '../components/ProposalListPanel';
import { ProposalDiffView } from '../components/ProposalDiffView';
import { RationaleOverlay } from '../components/RationaleTooltip';
import { apiClient } from '../api/client';
import type { DesignRationale, AgentToken, AgentScope } from '../types/agent';

export interface Phase4DemoProps {
  canvasId: string;
  userId: string;
}

export function Phase4Demo(props: Phase4DemoProps) {
  const { canvasId } = props;

  // State
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [hoveredNodeId] = useState<string | null>(null);
  const [rationales] = useState<Map<string, DesignRationale>>(new Map());

  // Hooks
  const branches = useBranches({
    canvasId,
    enabled: true,
    refreshInterval: 30000, // Refresh every 30s
  });

  const proposals = useProposals({
    canvasId,
    enabled: true,
    refreshInterval: 30000, // Refresh every 30s
  });

  // Handlers
  const handleGenerateToken = async (
    agentId: string,
    scope: AgentScope
  ): Promise<AgentToken | null> => {
    const result = await apiClient.generateAgentToken(canvasId, agentId, scope);
    return result.data || null;
  };

  const handleApproveProposal = async (proposalId: string) => {
    const success = await proposals.approveProposal(proposalId);
    if (success) {
      console.log('Proposal approved:', proposalId);
      setSelectedProposalId(null);
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    const success = await proposals.rejectProposal(proposalId, 'Does not meet requirements');
    if (success) {
      console.log('Proposal rejected:', proposalId);
      setSelectedProposalId(null);
    }
  };

  const getNodePosition = (): { x: number; y: number } | null => {
    // Mock implementation - in real app, get actual node position from canvas
    return { x: 100, y: 100 };
  };

  const selectedProposal = proposals.proposals.find((p) => p.id === selectedProposalId);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Phase 4: Agent Branches & Proposals</h1>

            <div className="flex gap-2">
              <button
                onClick={() => setShowTokenDialog(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Generate Agent Token
              </button>

              <button
                onClick={branches.refreshBranches}
                disabled={branches.loading}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Refresh Branches
              </button>

              <button
                onClick={proposals.refreshProposals}
                disabled={proposals.loading}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Refresh Proposals
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative bg-white">
          <div className="absolute inset-4 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">🎨</div>
              <div className="text-xl mb-2">Canvas Area</div>
              <div className="text-sm">
                Agent proposals will be displayed and merged here
              </div>
            </div>
          </div>

          {/* Rationale Overlay */}
          <RationaleOverlay
            rationales={rationales}
            hoveredNodeId={hoveredNodeId}
            getNodePosition={getNodePosition}
          />
        </div>

        {/* Status Bar */}
        <div className="bg-white border-t border-gray-200 p-2 text-sm text-gray-600">
          <div className="flex gap-4">
            <span>Branches: {branches.branches.length}</span>
            <span>|</span>
            <span>
              Proposals: {proposals.proposals.length} (
              {proposals.proposals.filter((p) => p.status === 'pending').length} pending)
            </span>
            {(branches.error || proposals.error) && (
              <>
                <span>|</span>
                <span className="text-red-600">
                  Error: {branches.error || proposals.error}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Proposal List Panel */}
      <ProposalListPanel
        proposals={proposals.proposals}
        loading={proposals.loading}
        onSelectProposal={setSelectedProposalId}
        onApprove={handleApproveProposal}
        onReject={handleRejectProposal}
      />

      {/* Agent Token Dialog */}
      {showTokenDialog && (
        <AgentTokenDialog
          canvasId={canvasId}
          onClose={() => setShowTokenDialog(false)}
          onGenerate={handleGenerateToken}
        />
      )}

      {/* Proposal Diff View */}
      {selectedProposal && (
        <ProposalDiffView
          proposal={selectedProposal}
          onClose={() => setSelectedProposalId(null)}
          onApprove={() => handleApproveProposal(selectedProposal.id)}
          onReject={() => handleRejectProposal(selectedProposal.id)}
        />
      )}
    </div>
  );
}

/**
 * Example usage with mock data
 */
export function Phase4DemoWithMockData() {
  return <Phase4Demo canvasId="demo-canvas-1" userId="demo-user-1" />;
}
