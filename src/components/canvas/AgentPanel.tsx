import { useState, useEffect, useCallback, useRef } from 'react';
import type { LayoutSpec } from "../../layout-schema";
import { applyProposalOperations } from '../../utils/proposalHelpers';
import trackEvent from '../../utils/analytics';
import { Modal } from '../Modal';
import type { UseProposalsResult } from '../../hooks/useProposals';
import type { AgentBranch, AgentConnectResponse, AgentConfigTemplate, AgentTokenSummary, AgentScope } from '../../types/agent';
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
  const [connectResult, setConnectResult] = useState<AgentConnectResponse | null>(null);
  const [connectingAgent, setConnectingAgent] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [showAgentGuide, setShowAgentGuide] = useState(false);
  const [showConfigDetails, setShowConfigDetails] = useState(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const copyToastTimeoutRef = useRef<number | null>(null);
  const [linkCode, setLinkCode] = useState<{ code: string; expiresAt: number } | null>(null);
  const [linkCodeError, setLinkCodeError] = useState<string | null>(null);
  const [creatingLinkCode, setCreatingLinkCode] = useState(false);
  const [branches, setBranches] = useState<AgentBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [tokens, setTokens] = useState<AgentTokenSummary[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [tokensError, setTokensError] = useState<string | null>(null);
  const [rotatingAgentId, setRotatingAgentId] = useState<string | null>(null);
  const [revokingAgentId, setRevokingAgentId] = useState<string | null>(null);
  const [rotatedToken, setRotatedToken] = useState<{ agentId: string; token: string; expiresAt: number } | null>(null);
  const [desiredScope, setDesiredScope] = useState<AgentScope>('propose');
  const [revokeConfirmAgentId, setRevokeConfirmAgentId] = useState<string | null>(null);
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

  const fetchTokens = useCallback(async () => {
    if (!currentCanvasId) return;
    setLoadingTokens(true);
    setTokensError(null);
    try {
      const { apiClient } = await import('../../api/client');
      const result = await apiClient.listAgentTokens(currentCanvasId);
      if (result.data) {
        setTokens(result.data);
      } else {
        setTokensError(result.error || 'Failed to load tokens');
      }
    } catch (err) {
      setTokensError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingTokens(false);
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

  useEffect(() => {
    if (currentCanvasId) {
      fetchTokens();
    } else {
      setTokens([]);
      setTokensError(null);
    }
  }, [currentCanvasId, fetchTokens]);

  useEffect(() => {
    return () => {
      if (copyToastTimeoutRef.current !== null) {
        window.clearTimeout(copyToastTimeoutRef.current);
      }
    };
  }, []);

  const showCopyToast = useCallback((message: string) => {
    setCopyToast(message);
    if (copyToastTimeoutRef.current !== null) {
      window.clearTimeout(copyToastTimeoutRef.current);
    }
    copyToastTimeoutRef.current = window.setTimeout(() => {
      setCopyToast(null);
      copyToastTimeoutRef.current = null;
    }, 2000);
  }, []);

  const handleConnectAgent = async () => {
    if (!currentCanvasId) return;
    
    setConnectingAgent(true);
    setConnectError(null);
    
    try {
      const { apiClient } = await import('../../api/client');
      const result = await apiClient.connectAgent(currentCanvasId, {
        agentId: 'assistant',
        scope: desiredScope,
      });
      
      if (result.data) {
        setConnectResult(result.data);
        setShowAgentGuide(true);
        trackEvent('agent_connect_bundle_generated', { canvasId: currentCanvasId });
      } else {
        setConnectError(result.error || 'Failed to connect agent');
      }
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setConnectingAgent(false);
    }
  };

  const handleCreateLinkCode = async () => {
    if (!currentCanvasId) return;

    setCreatingLinkCode(true);
    setLinkCodeError(null);

    try {
      const { apiClient } = await import('../../api/client');
      const result = await apiClient.createLinkCode(currentCanvasId, {
        agentId: 'assistant',
        scope: desiredScope,
      });

      if (result.data) {
        setLinkCode({ code: result.data.code, expiresAt: result.data.expiresAt });
        showCopyToast('Link code generated');
        trackEvent('agent_link_code_generated', { canvasId: currentCanvasId });
      } else {
        setLinkCodeError(result.error || 'Failed to create link code');
      }
    } catch (err) {
      setLinkCodeError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreatingLinkCode(false);
    }
  };

  const handleRevokeTokens = async (agentId: string) => {
    if (!currentCanvasId) return;
    setRevokingAgentId(agentId);
    setTokensError(null);
    try {
      const { apiClient } = await import('../../api/client');
      const result = await apiClient.revokeAgentToken(currentCanvasId, agentId);
      if (result.data?.success) {
        showCopyToast(`Revoked tokens for ${agentId}`);
        trackEvent('agent_tokens_revoked', { agentId });
        await fetchTokens();
      } else {
        setTokensError(result.error || 'Failed to revoke tokens');
      }
    } catch (err) {
      setTokensError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRevokingAgentId(null);
    }
  };

  const openRevokeConfirm = (agentId: string) => {
    setRevokeConfirmAgentId(agentId);
  };

  const handleRotateToken = async (agentId: string, scope: AgentTokenSummary['scope']) => {
    if (!currentCanvasId) return;
    setRotatingAgentId(agentId);
    setTokensError(null);
    try {
      const { apiClient } = await import('../../api/client');
      const revokeResult = await apiClient.revokeAgentToken(currentCanvasId, agentId);
      if (!revokeResult.data?.success) {
        setTokensError(revokeResult.error || 'Failed to revoke existing tokens');
        return;
      }
      const tokenResult = await apiClient.generateAgentToken(currentCanvasId, agentId, scope);
      if (tokenResult.data) {
        setRotatedToken({
          agentId,
          token: tokenResult.data.token,
          expiresAt: tokenResult.data.expiresAt,
        });
        showCopyToast(`Rotated token for ${agentId}`);
        trackEvent('agent_token_rotated', { agentId });
        await fetchTokens();
      } else {
        setTokensError(tokenResult.error || 'Failed to rotate token');
      }
    } catch (err) {
      setTokensError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRotatingAgentId(null);
    }
  };

  const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (typeof window !== 'undefined' && window.location.hostname === 'vizail.com') {
      return 'https://vizail.com/api';
    }
    return 'http://localhost:62587/api';
  };

  const handleCopyConfig = async (template: AgentConfigTemplate, label?: string) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(template.content, null, 2));
      showCopyToast(`${label ?? 'Config'} JSON copied`);
      trackEvent('agent_connect_config_copied', { label: label ?? 'config' });
    } catch (err) {
      console.error('Failed to copy config:', err);
    }
  };

  const handleDownloadConfig = (template: AgentConfigTemplate) => {
    try {
      const json = JSON.stringify(template.content, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = template.filename || 'mcp.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      trackEvent('agent_connect_config_downloaded', { filename: template.filename });
    } catch (err) {
      console.error('Failed to download config:', err);
    }
  };

  const effectiveApiUrl = connectResult?.apiUrl || getApiUrl();
  const effectiveCanvasId = connectResult?.canvasId || currentCanvasId;
  const safeCanvasId = effectiveCanvasId ?? '';
  const tokenGroups = Object.entries(tokens.reduce<Record<string, AgentTokenSummary[]>>((acc, token) => {
    if (!acc[token.agentId]) {
      acc[token.agentId] = [];
    }
    acc[token.agentId].push(token);
    return acc;
  }, {}));

  return (
    <>
      <Modal
        open={revokeConfirmAgentId !== null}
        onClose={() => setRevokeConfirmAgentId(null)}
        title="Revoke agent tokens"
        size="sm"
        variant="light"
        footer={
          <>
            <button
              type="button"
              onClick={() => setRevokeConfirmAgentId(null)}
              className="px-3 py-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (revokeConfirmAgentId) {
                  void handleRevokeTokens(revokeConfirmAgentId);
                }
                setRevokeConfirmAgentId(null);
              }}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white"
            >
              Revoke tokens
            </button>
          </>
        }
      >
        <div className="text-xs text-gray-600 space-y-2">
          <p>
            This will revoke all active tokens for <span className="font-semibold">{revokeConfirmAgentId}</span>.
          </p>
          <p>Existing agents will lose access until a new token is issued.</p>
        </div>
      </Modal>

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

      {/* Connect Agent Section - Issue 5.1 */}
      {currentCanvasId && (
        <div className="border-t pt-4 space-y-3">
          <div className="text-xs font-semibold text-gray-700">Connect an Assistant</div>
          
          {!connectResult ? (
            <div className="space-y-2">
              <label className="flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-500">
                Scope
                <select
                  value={desiredScope}
                  onChange={(event) => setDesiredScope(event.target.value as AgentScope)}
                  className="ml-2 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
                >
                  <option value="read">read (view-only)</option>
                  <option value="propose">propose (submit changes)</option>
                  <option value="trusted-propose">trusted-propose (reserved)</option>
                </select>
              </label>
              <div className="text-[10px] text-gray-500">
                Tip: use read for review-only agents; propose for design changes.
              </div>
              <button
                onClick={handleConnectAgent}
                disabled={connectingAgent}
                className="w-full px-3 py-2 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition disabled:opacity-50"
              >
                {connectingAgent ? 'Generating Connection Bundle...' : 'Generate Connection Bundle'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <div className="text-xs font-semibold text-green-900 mb-2">✓ Bundle Ready</div>
                <div className="flex items-center gap-2 mb-2">
                  <code className="flex-1 p-2 bg-white border border-gray-300 rounded text-xs break-all font-mono">
                    {connectResult.token.token}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(connectResult.token.token)}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs whitespace-nowrap"
                  >
                    Copy
                  </button>
                </div>
                <div className="text-xs text-green-800">
                  Expires: {new Date(connectResult.token.expiresAt).toLocaleDateString()}
                </div>
              </div>

              {copyToast && (
                <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
                  {copyToast}
                </div>
              )}

              {showAgentGuide && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
                  <div className="text-xs font-semibold text-blue-900">Quick Start</div>
                  <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Pick a client below (Claude, Cursor, VS Code, MCP)</li>
                    <li>Copy or download the JSON config template</li>
                    <li>Paste into the client config file and launch</li>
                  </ol>
                  <div className="bg-white border border-blue-300 rounded p-2 mt-1">
                    <code className="text-xs block whitespace-pre-wrap break-all">
{`You are a design assistant for Vizail Canvas.
API URL: ${effectiveApiUrl}
Canvas ID: ${safeCanvasId}
Token: ${connectResult.token.token}

Use the API to read the canvas and submit design proposals.`}
                    </code>
                    <button
                      onClick={() => {
                        const instructions = `You are a design assistant for Vizail Canvas.\nAPI URL: ${effectiveApiUrl}\nCanvas ID: ${safeCanvasId}\nToken: ${connectResult.token.token}\n\nUse the API to read the canvas and submit design proposals.`;
                        navigator.clipboard.writeText(instructions);
                        trackEvent('agent_connect_instructions_copied');
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

              <div className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 p-2 text-xs">
                <div className="text-gray-700">CLI env vars (for npx / scripts)</div>
                <button
                  type="button"
                  onClick={() => {
                    const envVars = `VIZAIL_API_URL=${effectiveApiUrl}\nVIZAIL_AGENT_TOKEN=${connectResult.token.token}\nVIZAIL_CANVAS_ID=${safeCanvasId}`;
                    navigator.clipboard.writeText(envVars);
                    showCopyToast('Env vars copied');
                    trackEvent('agent_connect_env_copied');
                  }}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                >
                  Copy .env vars
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-gray-700">Config templates</div>
                  <button
                    type="button"
                    onClick={() => setShowConfigDetails((prev) => !prev)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    {showConfigDetails ? 'Hide JSON' : 'Show JSON'}
                  </button>
                </div>
                {[
                  {
                    label: 'Claude Desktop',
                    template: connectResult.configs.claudeDesktop,
                  },
                  {
                    label: 'Cursor',
                    template: connectResult.configs.cursor,
                  },
                  {
                    label: 'VS Code',
                    template: connectResult.configs.vscode,
                  },
                  {
                    label: 'MCP JSON',
                    template: connectResult.configs.mcpJson,
                  },
                ].map(({ label, template }) => {
                  const json = JSON.stringify(template.content, null, 2);
                  return (
                    <div key={label} className="border border-gray-200 rounded p-2 bg-gray-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-gray-900">
                          {label}
                          <span className="text-[10px] text-gray-500 ml-2">{template.filename}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyConfig(template, label)}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                          >
                            Copy JSON
                          </button>
                          <button
                            onClick={() => handleDownloadConfig(template)}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                      {showConfigDetails && (
                        <code className="block text-[10px] whitespace-pre-wrap break-all bg-white border border-gray-200 rounded p-2 font-mono text-gray-700">
                          {json}
                        </code>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-gray-700">Link code for extensions</div>
                  <button
                    type="button"
                    onClick={handleCreateLinkCode}
                    disabled={creatingLinkCode}
                    className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    {creatingLinkCode ? 'Generating...' : 'Generate code'}
                  </button>
                </div>
                <div className="text-[10px] text-gray-500">
                  Uses scope: {desiredScope}. Rotate if you need a different scope.
                </div>
                {linkCode ? (
                  <div className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 p-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-gray-900">{linkCode.code}</span>
                      <span className="text-[10px] text-gray-500">
                        Expires {new Date(linkCode.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(linkCode.code);
                        showCopyToast('Link code copied');
                        trackEvent('agent_link_code_copied');
                      }}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                    >
                      Copy code
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">Share this code with an extension to exchange for a token.</div>
                )}
                {linkCodeError && (
                  <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded p-2">
                    {linkCodeError}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-gray-700">Token management</div>
                  <button
                    type="button"
                    onClick={fetchTokens}
                    disabled={loadingTokens}
                    className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    {loadingTokens ? 'Refreshing...' : '↻ Refresh'}
                  </button>
                </div>

                {tokensError && (
                  <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded p-2">
                    {tokensError}
                  </div>
                )}

                {rotatedToken && (
                  <div className="bg-green-50 border border-green-200 rounded p-2 space-y-2">
                    <div className="text-xs text-green-800 font-semibold">
                      New token for {rotatedToken.agentId}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-white border border-gray-300 rounded text-xs break-all font-mono">
                        {rotatedToken.token}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(rotatedToken.token);
                          showCopyToast('Rotated token copied');
                          trackEvent('agent_token_rotated_copied', { agentId: rotatedToken.agentId });
                        }}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="text-[10px] text-green-700">
                      Expires {new Date(rotatedToken.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {!loadingTokens && tokens.length === 0 && (
                  <div className="text-xs text-gray-500">No agent tokens yet.</div>
                )}

                {tokenGroups.map(([agentId, agentTokens]) => {
                  const sorted = [...agentTokens].sort((a, b) => b.createdAt - a.createdAt);
                  const latest = sorted[0];
                  const lastUsedLabel = latest.lastUsedAt
                    ? new Date(latest.lastUsedAt).toLocaleDateString()
                    : '—';
                  return (
                    <div key={agentId} className="border border-gray-200 rounded p-2 bg-gray-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-gray-900">
                          {agentId}
                          <span className="text-[10px] text-gray-500 ml-2">Scope: {latest.scope}</span>
                          <span className="text-[10px] text-gray-500 ml-2">{agentTokens.length} token{agentTokens.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRotateToken(agentId, latest.scope)}
                            disabled={rotatingAgentId === agentId || revokingAgentId === agentId}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs disabled:opacity-50"
                          >
                            {rotatingAgentId === agentId ? 'Rotating...' : 'Rotate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openRevokeConfirm(agentId)}
                            disabled={revokingAgentId === agentId || rotatingAgentId === agentId}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs disabled:opacity-50"
                          >
                            {revokingAgentId === agentId ? 'Revoking...' : 'Revoke'}
                          </button>
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Created {new Date(latest.createdAt).toLocaleDateString()} · Expires {new Date(latest.expiresAt).toLocaleDateString()} · Last used {lastUsedLabel}
                      </div>
                      <div className="text-[10px] text-gray-400">Revoke removes all tokens for this agent.</div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-900 space-y-1">
                <div className="font-semibold">Security tips</div>
                <div>Store tokens like passwords and avoid committing them to Git.</div>
                <div>Rotate tokens if you share them outside your team.</div>
                <div>Use the lowest scope needed for the task.</div>
              </div>

              <button
                onClick={() => {
                  setConnectResult(null);
                  setShowAgentGuide(false);
                  setLinkCode(null);
                  setLinkCodeError(null);
                  setRotatedToken(null);
                }}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Generate New Bundle
              </button>
            </div>
          )}

          {connectError && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded p-2">
              {connectError}
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
