/**
 * Test page for viewing Phase 4 proposals
 * Quick way to see proposals created via API
 */

import { useState, useEffect } from 'react';
import { useProposals } from './hooks/useProposals';
import { useBranches } from './hooks/useBranches';
import { ProposalVisualDiff } from './components/ProposalVisualDiff';
import { apiClient } from './api/client';
import type { LayoutSpec } from './layout-schema';

export default function ProposalsTestPage() {
  const [canvasId, setCanvasId] = useState('c5ac2c60-b82b-46e5-afc6-97c04b11e8f1');
  const [enabled, setEnabled] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [currentSpec, setCurrentSpec] = useState<LayoutSpec | null>(null);
  
  const branches = useBranches({
    canvasId,
    enabled,
    refreshInterval: 5000, // Refresh every 5 seconds
  });
  
  const proposals = useProposals({
    canvasId,
    enabled,
    refreshInterval: 5000,
  });

  // Fetch canvas spec when canvas ID changes
  useEffect(() => {
    if (!canvasId) return;
    
    apiClient.getCanvas(canvasId).then((result) => {
      if (result.data) {
        setCurrentSpec(result.data.spec);
      }
    });
  }, [canvasId]);

  const selectedProposal = proposals.proposals.find(p => p.id === selectedProposalId);

  const handleApprove = async () => {
    if (!selectedProposalId) return;
    await proposals.approveProposal(selectedProposalId);
    
    // Refresh canvas spec after approval
    const result = await apiClient.getCanvas(canvasId);
    if (result.data) {
      setCurrentSpec(result.data.spec);
    }
    setSelectedProposalId(null);
  };

  const handleReject = async () => {
    if (!selectedProposalId) return;
    await proposals.rejectProposal(selectedProposalId, 'Rejected from test UI');
    setSelectedProposalId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Phase 4 Proposals Test
        </h1>
        
        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Controls</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Canvas ID
              </label>
              <input
                type="text"
                value={canvasId}
                onChange={(e) => setCanvasId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter canvas ID"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setEnabled(!enabled)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  enabled
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                {enabled ? '✓ Auto-refresh enabled' : 'Enable auto-refresh'}
              </button>
              <button
                onClick={() => {
                  branches.refreshBranches();
                  proposals.refreshProposals();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Refresh Now
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Branches</div>
            <div className="text-3xl font-bold text-gray-900">
              {branches.loading ? '...' : branches.branches.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Proposals</div>
            <div className="text-3xl font-bold text-gray-900">
              {proposals.loading ? '...' : proposals.proposals.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Pending</div>
            <div className="text-3xl font-bold text-orange-600">
              {proposals.loading
                ? '...'
                : proposals.proposals.filter((p) => p.status === 'pending').length}
            </div>
          </div>
        </div>

        {/* Errors */}
        {(branches.error || proposals.error) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-semibold mb-2">Errors</h3>
            {branches.error && (
              <p className="text-red-700 text-sm">Branches: {branches.error}</p>
            )}
            {proposals.error && (
              <p className="text-red-700 text-sm">Proposals: {proposals.error}</p>
            )}
          </div>
        )}

        {/* Branches */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            Branches ({branches.branches.length})
          </h2>
          {branches.branches.length === 0 ? (
            <p className="text-gray-500 text-sm">No branches found</p>
          ) : (
            <div className="space-y-3">
              {branches.branches.map((branch) => (
                <div
                  key={branch.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-mono text-sm text-gray-600">
                      {branch.id}
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        branch.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {branch.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Agent:</span>{' '}
                      <span className="font-medium">{branch.agent_id || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Base Version:</span>{' '}
                      <span className="font-medium">{branch.base_version}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Proposals */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            Proposals ({proposals.proposals.length})
          </h2>
          {proposals.proposals.length === 0 ? (
            <p className="text-gray-500 text-sm">No proposals found</p>
          ) : (
            <div className="space-y-4">
              {proposals.proposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="border-2 border-gray-200 rounded-lg p-5"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {proposal.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {proposal.description}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ml-4 ${
                        proposal.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : proposal.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {proposal.status}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div>
                      <span className="text-gray-500">ID:</span>{' '}
                      <span className="font-mono text-xs">{proposal.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Agent:</span>{' '}
                      <span className="font-medium">{proposal.agent_id || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Branch:</span>{' '}
                      <span className="font-mono text-xs">{proposal.branch_id}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Confidence:</span>{' '}
                      <span className="font-medium">
                        {(proposal.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Rationale */}
                  <div className="bg-blue-50 rounded-lg p-3 mb-3">
                    <div className="text-xs font-semibold text-blue-900 mb-1">
                      Rationale
                    </div>
                    <div className="text-sm text-blue-800">{proposal.rationale}</div>
                  </div>

                  {/* Assumptions */}
                  {proposal.assumptions && proposal.assumptions.length > 0 && (
                    <div className="bg-purple-50 rounded-lg p-3 mb-3">
                      <div className="text-xs font-semibold text-purple-900 mb-1">
                        Assumptions
                      </div>
                      <ul className="text-sm text-purple-800 list-disc list-inside">
                        {proposal.assumptions.map((assumption, i) => (
                          <li key={i}>{assumption}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Operations */}
                  <div className="border-t border-gray-200 pt-3">
                    <div className="text-xs font-semibold text-gray-700 mb-2">
                      Operations ({proposal.operations.length})
                    </div>
                    <div className="space-y-2">
                      {proposal.operations.map((op, i) => (
                        <div
                          key={i}
                          className="bg-gray-50 rounded p-3 border border-gray-200"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-800 rounded text-xs font-medium">
                              {op.type}
                            </span>
                            <span className="font-mono text-xs text-gray-600">
                              {op.nodeId}
                            </span>
                          </div>
                          {op.rationale && (
                            <div className="text-sm text-gray-700">
                              💡 {op.rationale}
                            </div>
                          )}
                          {op.after && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                View data
                              </summary>
                              <pre className="mt-2 text-xs bg-white p-2 rounded border border-gray-200 overflow-auto">
                                {JSON.stringify(op.after, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  {proposal.status === 'pending' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => setSelectedProposalId(proposal.id)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        👁️ View Visual Diff
                      </button>
                    </div>
                  )}

                  {proposal.status !== 'pending' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => setSelectedProposalId(proposal.id)}
                        className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                      >
                        👁️ View Changes
                      </button>
                    </div>
                  )}

                  {/* Review info */}
                  {proposal.reviewed_at && (
                    <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                      Reviewed by {proposal.reviewed_by} on{' '}
                      {new Date(proposal.reviewed_at).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Visual Diff Modal */}
      {selectedProposal && currentSpec && (
        <ProposalVisualDiff
          proposal={selectedProposal}
          currentSpec={currentSpec}
          onClose={() => setSelectedProposalId(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
