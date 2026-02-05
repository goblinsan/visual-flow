/**
 * Hook for managing agent proposals
 * Phase 4: Agent Collaboration
 */

import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { AgentProposal, ProposalOperation } from '../types/agent';

export interface UseProposalsOptions {
  canvasId: string;
  enabled?: boolean;
  refreshInterval?: number; // ms
}

export interface UseProposalsResult {
  proposals: AgentProposal[];
  loading: boolean;
  error: string | null;
  createProposal: (
    branchId: string,
    proposal: {
      title: string;
      description: string;
      operations: ProposalOperation[];
      rationale: string;
      assumptions: string[];
      confidence: number;
    }
  ) => Promise<AgentProposal | null>;
  approveProposal: (proposalId: string) => Promise<boolean>;
  rejectProposal: (proposalId: string, reason?: string) => Promise<boolean>;
  refreshProposals: () => Promise<void>;
  /** Manual fetch that works even when auto-refresh is disabled */
  refetch: () => Promise<void>;
}

/**
 * Hook for managing agent proposals
 */
export function useProposals(options: UseProposalsOptions): UseProposalsResult {
  const { canvasId, enabled = true, refreshInterval } = options;
  const [proposals, setProposals] = useState<AgentProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProposals = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.listProposals(canvasId);

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setProposals(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [canvasId, enabled]);

  /** Manual fetch that works even when auto-refresh is disabled */
  const refetch = useCallback(async () => {
    if (!canvasId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.listProposals(canvasId);

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setProposals(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [canvasId]);

  const createProposal = useCallback(
    async (
      branchId: string,
      proposal: {
        title: string;
        description: string;
        operations: ProposalOperation[];
        rationale: string;
        assumptions: string[];
        confidence: number;
      }
    ): Promise<AgentProposal | null> => {
      setError(null);

      const result = await apiClient.createProposal(branchId, proposal);

      if (result.error) {
        setError(result.error);
        return null;
      }

      if (result.data) {
        setProposals((prev) => [...prev, result.data!]);
        return result.data;
      }

      return null;
    },
    []
  );

  const approveProposal = useCallback(
    async (proposalId: string): Promise<boolean> => {
      setError(null);

      const result = await apiClient.approveProposal(proposalId);

      if (result.error) {
        setError(result.error);
        return false;
      }

      if (result.data) {
        setProposals((prev) =>
          prev.map((p) => (p.id === proposalId ? result.data! : p))
        );
        return true;
      }

      return false;
    },
    []
  );

  const rejectProposal = useCallback(
    async (proposalId: string, reason?: string): Promise<boolean> => {
      setError(null);

      const result = await apiClient.rejectProposal(proposalId, reason);

      if (result.error) {
        setError(result.error);
        return false;
      }

      if (result.data) {
        setProposals((prev) =>
          prev.map((p) => (p.id === proposalId ? result.data! : p))
        );
        return true;
      }

      return false;
    },
    []
  );

  // Initial load
  useEffect(() => {
    if (enabled) {
      refreshProposals();
    }
  }, [enabled, refreshProposals]);

  // Auto-refresh
  useEffect(() => {
    if (!enabled || !refreshInterval) return;

    const interval = setInterval(refreshProposals, refreshInterval);
    return () => clearInterval(interval);
  }, [enabled, refreshInterval, refreshProposals]);

  return {
    proposals,
    loading,
    error,
    createProposal,
    approveProposal,
    rejectProposal,
    refreshProposals,
    refetch,
  };
}
