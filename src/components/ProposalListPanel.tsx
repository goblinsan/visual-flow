/**
 * Panel for listing and managing agent proposals
 * Phase 4: Agent Collaboration
 */

import React, { useState } from 'react';
import type { AgentProposal } from '../types/agent';
import {
  calculateProposalDiff,
  formatConfidence,
  getProposalStatusColor,
} from '../utils/proposalHelpers';

export interface ProposalListPanelProps {
  proposals: AgentProposal[];
  loading: boolean;
  onSelectProposal: (proposalId: string) => void;
  onApprove: (proposalId: string) => Promise<void>;
  onReject: (proposalId: string) => Promise<void>;
}

export function ProposalListPanel(props: ProposalListPanelProps): JSX.Element {
  const { proposals, loading, onSelectProposal, onApprove, onReject } = props;
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const filteredProposals = proposals.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const sortedProposals = [...filteredProposals].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold mb-3">Agent Proposals</h2>

        <div className="flex gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs rounded ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 text-xs rounded ${
              filter === 'pending'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1 text-xs rounded ${
              filter === 'approved'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1 text-xs rounded ${
              filter === 'rejected'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading proposals...</div>
        ) : sortedProposals.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {filter === 'pending' ? 'No pending proposals' : 'No proposals found'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sortedProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onSelect={() => onSelectProposal(proposal.id)}
                onApprove={() => onApprove(proposal.id)}
                onReject={() => onReject(proposal.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ProposalCardProps {
  proposal: AgentProposal;
  onSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
}

function ProposalCard(props: ProposalCardProps): JSX.Element {
  const { proposal, onSelect, onApprove, onReject } = props;
  const diff = calculateProposalDiff(proposal.operations);
  const statusColor = getProposalStatusColor(proposal.status);

  return (
    <div
      className="p-4 hover:bg-gray-50 cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-medium text-sm text-gray-900">{proposal.title}</h3>
          <div className="text-xs text-gray-500 mt-1">
            by {proposal.agentId} • {new Date(proposal.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div
          className="px-2 py-1 rounded text-xs font-medium"
          style={{ backgroundColor: statusColor + '20', color: statusColor }}
        >
          {proposal.status}
        </div>
      </div>

      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{proposal.description}</p>

      <div className="flex gap-3 text-xs text-gray-500 mb-2">
        {diff.created.length > 0 && <span className="text-green-600">+{diff.created.length}</span>}
        {diff.updated.length > 0 && <span className="text-blue-600">~{diff.updated.length}</span>}
        {diff.deleted.length > 0 && <span className="text-red-600">-{diff.deleted.length}</span>}
        {diff.moved.length > 0 && <span className="text-purple-600">→{diff.moved.length}</span>}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full"
            style={{ width: `${proposal.confidence * 100}%` }}
          />
        </div>
        <span className="text-gray-500">{formatConfidence(proposal.confidence)}</span>
      </div>

      {proposal.status === 'pending' && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApprove();
            }}
            className="flex-1 px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600"
          >
            Approve
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReject();
            }}
            className="flex-1 px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
