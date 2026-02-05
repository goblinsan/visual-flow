/**
 * Detailed view showing proposal changes
 * Phase 4: Agent Collaboration
 */

import { useState } from 'react';
import type { AgentProposal } from '../types/agent';
import { getOperationIcon } from '../utils/proposalHelpers';

export interface ProposalDiffViewProps {
  proposal: AgentProposal;
  onClose: () => void;
  onApprove?: () => Promise<void>;
  onReject?: () => Promise<void>;
}

export function ProposalDiffView(props: ProposalDiffViewProps) {
  const { proposal, onClose, onApprove, onReject } = props;
  const [activeTab, setActiveTab] = useState<'changes' | 'rationale' | 'assumptions'>('changes');
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    if (!onApprove) return;
    setLoading(true);
    try {
      await onApprove();
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    setLoading(true);
    try {
      await onReject();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-semibold">{proposal.title}</h2>
              <div className="text-sm text-gray-500 mt-1">
                by {proposal.agentId} • {new Date(proposal.createdAt).toLocaleString()}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <p className="text-gray-700">{proposal.description}</p>

          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Confidence:</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${proposal.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {Math.round(proposal.confidence * 100)}%
                </span>
              </div>
            </div>

            <div className="text-sm">
              <span className="text-gray-500">Status:</span>{' '}
              <span
                className="px-2 py-1 rounded text-xs font-medium"
                style={{
                  backgroundColor: getStatusColor(proposal.status) + '20',
                  color: getStatusColor(proposal.status),
                }}
              >
                {proposal.status}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('changes')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'changes'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Changes ({proposal.operations.length})
            </button>
            <button
              onClick={() => setActiveTab('rationale')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'rationale'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Rationale
            </button>
            <button
              onClick={() => setActiveTab('assumptions')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'assumptions'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Assumptions ({proposal.assumptions.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'changes' && (
            <div className="space-y-3">
              {proposal.operations.map((op, idx) => (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded flex items-center justify-center text-white font-bold ${
                        op.type === 'create'
                          ? 'bg-green-500'
                          : op.type === 'update'
                          ? 'bg-blue-500'
                          : op.type === 'delete'
                          ? 'bg-red-500'
                          : 'bg-purple-500'
                      }`}
                    >
                      {getOperationIcon(op.type)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm capitalize">{op.type}</span>
                        <span className="text-xs text-gray-500">#{op.nodeId}</span>
                      </div>

                      {op.rationale && (
                        <p className="text-sm text-gray-600 mb-2">{op.rationale}</p>
                      )}

                      {(op.before || op.after) && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {op.before && (
                            <div className="bg-red-50 border border-red-200 rounded p-2">
                              <div className="font-medium text-red-700 mb-1">Before</div>
                              <pre className="text-red-600 overflow-x-auto">
                                {JSON.stringify(op.before, null, 2)}
                              </pre>
                            </div>
                          )}
                          {op.after && (
                            <div className="bg-green-50 border border-green-200 rounded p-2">
                              <div className="font-medium text-green-700 mb-1">After</div>
                              <pre className="text-green-600 overflow-x-auto">
                                {JSON.stringify(op.after, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'rationale' && (
            <div className="prose max-w-none">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    AI
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-blue-900 mb-2">Agent Reasoning</div>
                    <p className="text-gray-700 whitespace-pre-wrap">{proposal.rationale}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assumptions' && (
            <div className="space-y-2">
              {proposal.assumptions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No assumptions listed</p>
              ) : (
                proposal.assumptions.map((assumption, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div className="text-yellow-600 font-bold">⚠</div>
                    <p className="text-sm text-gray-700">{assumption}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {proposal.status === 'pending' && (onApprove || onReject) && (
          <div className="p-6 border-t border-gray-200 flex gap-3">
            {onReject && (
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Reject
              </button>
            )}
            {onApprove && (
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Approve & Merge'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return '#FFA500';
    case 'approved':
      return '#22C55E';
    case 'rejected':
      return '#EF4444';
    case 'superseded':
      return '#6B7280';
    default:
      return '#6B7280';
  }
}
