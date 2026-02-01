/**
 * Share Dialog Component
 * Phase 1: Invite users to collaborate on canvases
 */

import { useState, useEffect } from 'react';
import { apiClient, type CloudMember } from '../api/client';

export interface ShareDialogProps {
  canvasId: string;
  canvasName: string;
  userRole: 'owner' | 'editor' | 'viewer';
  onClose: () => void;
}

export function ShareDialog({ canvasId, canvasName, userRole, onClose }: ShareDialogProps) {
  const [members, setMembers] = useState<CloudMember[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load members
  useEffect(() => {
    async function loadMembers() {
      const { data, error } = await apiClient.listMembers(canvasId);
      if (data) {
        setMembers(data);
      } else {
        setError(error || 'Failed to load members');
      }
    }
    loadMembers();
  }, [canvasId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: inviteError } = await apiClient.addMember(canvasId, email.trim(), role);

    if (data) {
      setMembers([...members, data]);
      setEmail('');
      setError(null);
    } else {
      setError(inviteError || 'Failed to invite user');
    }

    setIsLoading(false);
  };

  const handleRemove = async (userId: string) => {
    const { error: removeError } = await apiClient.removeMember(canvasId, userId);

    if (!removeError) {
      setMembers(members.filter(m => m.user_id !== userId));
    } else {
      setError(removeError);
    }
  };

  const canInvite = userRole === 'owner' || userRole === 'editor';
  const canRemove = userRole === 'owner';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Share "{canvasName}"</h2>
          <p className="text-sm text-gray-600 mt-1">
            Invite people to collaborate on this canvas
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Invite form */}
          {canInvite && (
            <form onSubmit={handleInvite} className="mb-6">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as 'editor' | 'viewer')}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="editor">Can edit</option>
                  <option value="viewer">Can view</option>
                </select>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? 'Inviting...' : 'Invite'}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </form>
          )}

          {!canInvite && (
            <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                You can only view this canvas. Contact the owner to get edit access.
              </p>
            </div>
          )}

          {/* Members list */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              People with access ({members.length})
            </h3>
            <div className="space-y-2">
              {members.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {member.email}
                      {member.display_name && (
                        <span className="text-gray-600"> ({member.display_name})</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                  </div>
                  {canRemove && member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemove(member.user_id)}
                      className="ml-4 text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No members yet. Invite someone to collaborate!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShareDialog;
