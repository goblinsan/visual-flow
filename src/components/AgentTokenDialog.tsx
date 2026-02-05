/**
 * Dialog for generating agent access tokens
 * Phase 4: Agent Collaboration
 */

import React, { useState } from 'react';
import type { AgentScope, AgentToken } from '../types/agent';

export interface AgentTokenDialogProps {
  canvasId: string;
  onClose: () => void;
  onGenerate: (agentId: string, scope: AgentScope) => Promise<AgentToken | null>;
}

export function AgentTokenDialog(props: AgentTokenDialogProps): JSX.Element {
  const { canvasId, onClose, onGenerate } = props;
  const [agentId, setAgentId] = useState('');
  const [scope, setScope] = useState<AgentScope>('propose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<AgentToken | null>(null);

  const handleGenerate = async () => {
    if (!agentId.trim()) {
      setError('Agent ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await onGenerate(agentId, scope);
      if (token) {
        setGeneratedToken(token);
      } else {
        setError('Failed to generate token');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken.token);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Generate Agent Token</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {!generatedToken ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="agentId" className="block text-sm font-medium text-gray-700 mb-1">
                Agent ID
              </label>
              <input
                id="agentId"
                type="text"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="my-ai-agent"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="scope" className="block text-sm font-medium text-gray-700 mb-1">
                Scope
              </label>
              <select
                id="scope"
                value={scope}
                onChange={(e) => setScope(e.target.value as AgentScope)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="read">Read Only</option>
                <option value="propose">Propose Changes</option>
                <option value="trusted-propose">Trusted Propose (Auto-merge)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {scope === 'read' && 'Agent can only read canvas data'}
                {scope === 'propose' && 'Agent can create branches and submit proposals'}
                {scope === 'trusted-propose' && 'Agent can auto-merge approved proposals'}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Token'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 mb-2">Token generated successfully!</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-white border border-gray-300 rounded text-xs break-all">
                  {generatedToken.token}
                </code>
                <button
                  onClick={handleCopyToken}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>Agent ID:</strong> {generatedToken.agentId}
              </p>
              <p>
                <strong>Scope:</strong> {generatedToken.scope}
              </p>
              <p>
                <strong>Expires:</strong> {new Date(generatedToken.expiresAt).toLocaleString()}
              </p>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800">
              ⚠️ Store this token securely. It won't be shown again.
            </div>

            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
