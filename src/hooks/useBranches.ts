/**
 * Hook for managing agent branches
 * Phase 4: Agent Collaboration
 */

import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { AgentBranch } from '../types/agent';

export interface UseBranchesOptions {
  canvasId: string;
  enabled?: boolean;
  refreshInterval?: number; // ms
}

export interface UseBranchesResult {
  branches: AgentBranch[];
  loading: boolean;
  error: string | null;
  createBranch: (agentId: string, baseVersion: number) => Promise<AgentBranch | null>;
  deleteBranch: (branchId: string) => Promise<boolean>;
  refreshBranches: () => Promise<void>;
}

/**
 * Hook for managing agent branches
 */
export function useBranches(options: UseBranchesOptions): UseBranchesResult {
  const { canvasId, enabled = true, refreshInterval } = options;
  const [branches, setBranches] = useState<AgentBranch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBranches = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    const result = await apiClient.listBranches(canvasId);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setBranches(result.data || []);
    setLoading(false);
  }, [canvasId, enabled]);

  const createBranch = useCallback(
    async (agentId: string, baseVersion: number): Promise<AgentBranch | null> => {
      setError(null);

      const result = await apiClient.createBranch(canvasId, agentId, baseVersion);

      if (result.error) {
        setError(result.error);
        return null;
      }

      if (result.data) {
        setBranches((prev) => [...prev, result.data!]);
        return result.data;
      }

      return null;
    },
    [canvasId]
  );

  const deleteBranch = useCallback(
    async (branchId: string): Promise<boolean> => {
      setError(null);

      const result = await apiClient.deleteBranch(branchId);

      if (result.error) {
        setError(result.error);
        return false;
      }

      if (result.data?.success) {
        setBranches((prev) => prev.filter((b) => b.id !== branchId));
        return true;
      }

      return false;
    },
    []
  );

  // Initial load
  useEffect(() => {
    if (enabled) {
      refreshBranches();
    }
  }, [enabled, refreshBranches]);

  // Auto-refresh
  useEffect(() => {
    if (!enabled || !refreshInterval) return;

    const interval = setInterval(refreshBranches, refreshInterval);
    return () => clearInterval(interval);
  }, [enabled, refreshInterval, refreshBranches]);

  return {
    branches,
    loading,
    error,
    createBranch,
    deleteBranch,
    refreshBranches,
  };
}
