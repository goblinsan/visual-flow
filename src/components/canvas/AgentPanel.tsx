import { useState, useEffect, useCallback } from 'react';
import type { LayoutSpec } from "../../layout-schema";
import { applyProposalOperations } from '../../utils/proposalHelpers';
import type { UseProposalsResult } from '../../hooks/useProposals';
import type { AgentToken, AgentBranch } from '../../types/agent';
import { useAuth } from '../../hooks/useAuth';

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
  const [generatedToken, setGeneratedToken] = useState<AgentToken | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [showChatGPTGuide, setShowChatGPTGuide] = useState(false);
  const [branches, setBranches] = useState<AgentBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const { isAuthenticated } = useAuth();

  const fetchBranches = useCallback(async () => {
    if (!currentCanvasId) return;
    setLoadingBranches(true);
    try {
      const { apiClient } = await import('../../api/client');
      const result = await apiClient.listBranches(currentCanvasId);
      if (result.data) {
        setBranches(result.data);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    } finally {
      setLoadingBranches(false);
    }
  }, [currentCanvasId]);

  // Auto-fetch branches when canvas ID changes
  useEffect(() => {
    if (currentCanvasId) {
      fetchBranches();
      // Only auto-refresh every 10 seconds to reduce API load
      const interval = setInterval(fetchBranches, 10000);
      return () => clearInterval(interval);
    }
  }, [currentCanvasId, fetchBranches]);

  const handleGenerateToken = async () => {
    if (!currentCanvasId) return;
    
    setGeneratingToken(true);
    setTokenError(null);
    
    try {
      const { apiClient } = await import('../../api/client');
      const result = await apiClient.generateAgentToken(
        currentCanvasId,
        'chatgpt-agent',
        'propose'
      );
      
      if (result.data) {
        setGeneratedToken(result.data);
        setShowChatGPTGuide(true);
      } else {
        setTokenError(result.error || 'Failed to generate token');
      }
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setGeneratingToken(false);
    }
  };

  const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (typeof window !== 'undefined' && window.location.hostname === 'vizail.com') {
      return 'https://vizail.com/api';
    }
    return 'http://localhost:62587/api';
  };

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
        ) : !isAuthenticated ? (
          <div className="space-y-2">
            <div className="text-xs text-gray-500">Sign in to share your canvas with agents and enable cloud collaboration.</div>
            <button
              onClick={() => { window.location.href = `/api/auth/signin?redirect=${encodeURIComponent(window.location.href)}`; }}
              className="w-full px-3 py-2 bg-gray-500 text-white text-xs font-medium rounded hover:bg-gray-600 transition"
            >
              Sign in to Share
            </button>
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

      {/* Connect to ChatGPT Section - Issue 5.1 */}
      {currentCanvasId && (
        <div className="border-t pt-4 space-y-3">
          <div className="text-xs font-semibold text-gray-700">Connect to ChatGPT</div>
          
          {!generatedToken ? (
            <button
              onClick={handleGenerateToken}
              disabled={generatingToken}
              className="w-full px-3 py-2 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition disabled:opacity-50"
            >
              {generatingToken ? 'Generating Token...' : 'Generate Token for ChatGPT'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <div className="text-xs font-semibold text-green-900 mb-2">✓ Token Generated!</div>
                <div className="flex items-center gap-2 mb-2">
                  <code className="flex-1 p-2 bg-white border border-gray-300 rounded text-xs break-all font-mono">
                    {generatedToken.token}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedToken.token)}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs whitespace-nowrap"
                  >
                    Copy
                  </button>
                </div>
                <div className="text-xs text-green-800">
                  Expires: {new Date(generatedToken.expiresAt).toLocaleDateString()}
                </div>
              </div>

              {showChatGPTGuide && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
                  <div className="text-xs font-semibold text-blue-900">Setup Instructions:</div>
                  <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Go to ChatGPT and create a new GPT</li>
                    <li>In "Configure" tab, add these instructions:</li>
                  </ol>
                  <div className="bg-white border border-blue-300 rounded p-2 mt-1">
                    <code className="text-xs block whitespace-pre-wrap break-all">
{`You are a design assistant for Vizail Canvas.
API URL: ${getApiUrl()}
Canvas ID: ${currentCanvasId}
Token: ${generatedToken.token}

Use the API to read the canvas and submit design proposals.`}
                    </code>
                    <button
                      onClick={() => {
                        const instructions = `You are a design assistant for Vizail Canvas.\nAPI URL: ${getApiUrl()}\nCanvas ID: ${currentCanvasId}\nToken: ${generatedToken.token}\n\nUse the API to read the canvas and submit design proposals.`;
                        navigator.clipboard.writeText(instructions);
                      }}
                      className="mt-2 px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-xs"
                    >
                      Copy Instructions
                    </button>
                  </div>
                  <div className="text-xs text-blue-700 mt-2">
                    ⏱️ Setup time: Under 2 minutes
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setGeneratedToken(null);
                  setShowChatGPTGuide(false);
                }}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Generate New Token
              </button>
            </div>
          )}

          {tokenError && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded p-2">
              {tokenError}
            </div>
          )}
        </div>
      )}

      {/* Multi-Agent Activity Feed - Issues 5.4 & 5.5 */}
      {currentCanvasId && branches.length > 0 && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-gray-700">
              Active Agents ({branches.filter(b => b.status === 'active').length})
            </div>
            <button
              onClick={fetchBranches}
              disabled={loadingBranches}
              className="text-xs text-blue-600 hover:text-blue-700 transition"
            >
              {loadingBranches ? '↻ Loading...' : '↻ Refresh'}
            </button>
          </div>

          <div className="space-y-2">
            {branches
              .filter(b => b.status === 'active')
              .map((branch) => {
                const agentProposals = proposals.proposals.filter(
                  p => p.branchId === branch.id
                );
                return (
                  <div
                    key={branch.id}
                    className="border border-gray-200 rounded p-2 bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs font-medium text-gray-900">
                          {branch.agentId}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {agentProposals.length} proposal{agentProposals.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Last updated: {new Date(branch.updatedAt).toLocaleString()}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

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
