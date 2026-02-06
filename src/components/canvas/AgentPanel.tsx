import type { LayoutSpec } from "../../layout-schema";
import { applyProposalOperations } from '../../utils/proposalHelpers';
import type { UseProposalsResult } from '../../hooks/useProposals';

interface AgentPanelProps {
  currentCanvasId: string | null;
  setCurrentCanvasId: (id: string | null) => void;
  creatingCanvasId: boolean;
  setCreatingCanvasId: (creating: boolean) => void;
  currentDesignName: string | null;
  spec: LayoutSpec;
  proposals: UseProposalsResult;
  selectedProposalId: string | null;
  setSelectedProposalId: (id: string | null) => void;
  viewingProposedSpec: boolean;
  setViewingProposedSpec: (viewing: boolean) => void;
  setSpec: (spec: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void;
}

export function AgentPanel({
  currentCanvasId,
  setCurrentCanvasId,
  creatingCanvasId,
  setCreatingCanvasId,
  currentDesignName,
  spec,
  proposals,
  selectedProposalId,
  setSelectedProposalId,
  viewingProposedSpec,
  setViewingProposedSpec,
  setSpec,
}: AgentPanelProps) {
  return (
    <>
      {/* Canvas ID Section */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-700">Canvas ID</div>
        {currentCanvasId ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={currentCanvasId}
                readOnly
                className="flex-1 px-2 py-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded"
              />
              <button
                onClick={() => navigator.clipboard.writeText(currentCanvasId)}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition"
                title="Copy to clipboard"
              >
                <i className="fa-solid fa-copy text-gray-600" />
              </button>
            </div>
            <div className="text-xs text-gray-500">Share this ID with agents to allow proposals</div>
          </div>
        ) : (
          <button
            onClick={async () => {
              setCreatingCanvasId(true);
              try {
                const { apiClient } = await import('../../api/client');
                const result = await apiClient.createCanvas(currentDesignName || 'Untitled Canvas', spec);
                if (result.data) {
                  setCurrentCanvasId(result.data.id);
                } else {
                  console.error('Failed to create canvas:', result.error);
                }
              } catch (err) {
                console.error('Error creating canvas:', err);
              } finally {
                setCreatingCanvasId(false);
              }
            }}
            disabled={creatingCanvasId}
            className="w-full px-3 py-2 bg-teal-600 text-white text-xs font-medium rounded hover:bg-teal-700 transition disabled:opacity-50"
          >
            {creatingCanvasId ? 'Creating...' : 'Share with Agent'}
          </button>
        )}
      </div>

      {/* Proposals Section */}
      {currentCanvasId && (
        <>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-gray-700">
                Proposals ({proposals.proposals.length})
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  proposals.refetch();
                }}
                className="text-xs text-blue-600 hover:text-blue-700 transition"
                disabled={proposals.loading}
              >
                {proposals.loading ? '↻ Loading...' : '↻ Refresh'}
              </button>
            </div>

            {proposals.error && (
              <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded p-2 mb-2">
                {proposals.error}
              </div>
            )}

            {proposals.loading && proposals.proposals.length === 0 && (
              <div className="text-xs text-gray-500 text-center py-4">Loading proposals...</div>
            )}

            {!proposals.loading && !proposals.error && proposals.proposals.filter(p => p.status === 'pending').length === 0 && (
              <div className="text-xs text-gray-500 text-center py-4">No pending proposals</div>
            )}

            {proposals.proposals.filter(p => p.status === 'pending').map((proposal) => (
              <div
                key={proposal.id}
                className={`border rounded-lg p-3 cursor-pointer transition mb-2 ${
                  selectedProposalId === proposal.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => {
                  setSelectedProposalId(proposal.id);
                  setViewingProposedSpec(false);
                }}
              >
                <div className="font-medium text-gray-900 mb-1 text-sm">{proposal.title}</div>
                <div className="text-xs text-gray-600 mb-2">{proposal.description}</div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{proposal.operations.length} change{proposal.operations.length !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{Math.round(proposal.confidence * 100)}% confidence</span>
                </div>
              </div>
            ))}

            {/* Selected Proposal Details */}
            {selectedProposalId && (() => {
              const selectedProposal = proposals.proposals.find(p => p.id === selectedProposalId);
              if (!selectedProposal) return null;

              return (
                <div className="border-t pt-3 mt-3 space-y-3">
                  <div className="text-xs font-semibold text-gray-700">Preview</div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewingProposedSpec(false)}
                      className={`flex-1 px-3 py-2 rounded text-xs font-medium transition ${
                        !viewingProposedSpec
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Current
                    </button>
                    <button
                      onClick={() => setViewingProposedSpec(true)}
                      className={`flex-1 px-3 py-2 rounded text-xs font-medium transition ${
                        viewingProposedSpec
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Proposed
                    </button>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs">
                    <div className="font-semibold text-blue-900 mb-1">Rationale</div>
                    <div className="text-blue-800">{selectedProposal.rationale}</div>
                  </div>
                  
                  {selectedProposal.assumptions && selectedProposal.assumptions.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs">
                      <div className="font-semibold text-amber-900 mb-1">Assumptions</div>
                      <ul className="text-amber-800 space-y-1">
                        {selectedProposal.assumptions.map((assumption, i) => (
                          <li key={i}>• {assumption}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={async () => {
                        const success = await proposals.approveProposal(selectedProposal.id);
                        if (success) {
                          // Apply the proposal operations to the local spec so changes persist
                          const mergedSpec = applyProposalOperations(spec, selectedProposal.operations);
                          setSpec(mergedSpec);
                        }
                        setSelectedProposalId(null);
                        setViewingProposedSpec(false);
                      }}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition text-xs"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={async () => {
                        await proposals.rejectProposal(selectedProposal.id, 'User rejected');
                        setSelectedProposalId(null);
                        setViewingProposedSpec(false);
                      }}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition text-xs"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}
    </>
  );
}
