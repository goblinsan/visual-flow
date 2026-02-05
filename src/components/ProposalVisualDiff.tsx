/**
 * Side-by-side visual diff of proposal changes on canvas
 * Shows before and after preview
 */

import { useMemo } from 'react';
import type { AgentProposal } from '../types/agent';
import type { LayoutSpec } from '../layout-schema';
import { applyProposalOperations } from '../utils/proposalHelpers';
import CanvasStage from '../canvas/CanvasStage';

export interface ProposalVisualDiffProps {
  proposal: AgentProposal;
  currentSpec: LayoutSpec;
  onClose: () => void;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
}

export function ProposalVisualDiff(props: ProposalVisualDiffProps) {
  const { proposal, currentSpec, onClose, onApprove, onReject } = props;

  // Apply operations to get the "after" spec
  const proposedSpec = useMemo(() => {
    return applyProposalOperations(currentSpec, proposal.operations);
  }, [currentSpec, proposal.operations]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-[95vw] h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{proposal.title}</h2>
              <p className="text-sm text-gray-600 mt-1">{proposal.description}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl leading-none px-2"
            >
              ×
            </button>
          </div>

          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Agent:</span>
              <span className="font-medium text-gray-900">{proposal.agent_id || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Operations:</span>
              <span className="font-medium text-gray-900">{proposal.operations.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Confidence:</span>
              <span className="font-semibold text-blue-600">
                {Math.round(proposal.confidence * 100)}%
              </span>
            </div>
          </div>

          {/* Rationale */}
          <div className="mt-4 p-3 bg-blue-100 border-l-4 border-blue-500 rounded">
            <div className="text-xs font-semibold text-blue-900 mb-1">Rationale</div>
            <div className="text-sm text-blue-800">{proposal.rationale}</div>
          </div>

          {/* Assumptions */}
          {proposal.assumptions && proposal.assumptions.length > 0 && (
            <div className="mt-3 p-3 bg-purple-100 border-l-4 border-purple-500 rounded">
              <div className="text-xs font-semibold text-purple-900 mb-1">Assumptions</div>
              <ul className="text-sm text-purple-800 space-y-1">
                {proposal.assumptions.map((assumption, i) => (
                  <li key={i}>• {assumption}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Side-by-side canvas view */}
        <div className="flex-1 flex overflow-hidden">
          {/* Before */}
          <div className="flex-1 flex flex-col border-r-2 border-gray-300">
            <div className="p-3 bg-red-50 border-b border-red-200">
              <h3 className="text-lg font-semibold text-red-900">Before (Current)</h3>
              <div className="text-xs text-gray-600 mt-1">
                {currentSpec.root.children.length} elements
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg">
                <CanvasStage
                  spec={currentSpec}
                  setSpec={() => {}} // Read-only
                  width={Math.min(currentSpec.root.size?.width || 800, 800)}
                  height={Math.min(currentSpec.root.size?.height || 600, 600)}
                  selection={[]}
                  setSelection={() => {}}
                  tool="select"
                />
              </div>
            </div>
          </div>

          {/* After */}
          <div className="flex-1 flex flex-col">
            <div className="p-3 bg-green-50 border-b border-green-200">
              <h3 className="text-lg font-semibold text-green-900">After (Proposed)</h3>
              <div className="text-xs text-gray-600 mt-1">
                {proposedSpec.root.children.length} elements (+{proposedSpec.root.children.length - currentSpec.root.children.length})
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              <div className="bg-white border-2 border-green-400 rounded-lg overflow-hidden shadow-lg">
                <CanvasStage
                  spec={proposedSpec}
                  setSpec={() => {}} // Read-only
                  width={Math.min(proposedSpec.root.size?.width || 800, 800)}
                  height={Math.min(proposedSpec.root.size?.height || 600, 600)}
                  selection={[]}
                  setSelection={() => {}}
                  tool="select"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Operations list */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 max-h-48 overflow-y-auto">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Changes ({proposal.operations.length})
          </h4>
          <div className="space-y-2">
            {proposal.operations.map((op, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    op.type === 'create'
                      ? 'bg-green-100 text-green-800'
                      : op.type === 'update'
                      ? 'bg-blue-100 text-blue-800'
                      : op.type === 'delete'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {op.type}
                </span>
                <span className="font-mono text-gray-600">{op.nodeId}</span>
                {op.rationale && (
                  <span className="text-gray-500 italic">— {op.rationale}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        {proposal.status === 'pending' && (
          <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
            <button
              onClick={onReject}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md"
            >
              ✗ Reject Proposal
            </button>
            <button
              onClick={onApprove}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md"
            >
              ✓ Approve &amp; Merge
            </button>
          </div>
        )}

        {proposal.status !== 'pending' && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 text-center text-gray-600">
            This proposal has been {proposal.status}
            {proposal.reviewed_by && ` by ${proposal.reviewed_by}`}
            {proposal.reviewed_at && ` on ${new Date(proposal.reviewed_at).toLocaleString()}`}
          </div>
        )}
      </div>
    </div>
  );
}
