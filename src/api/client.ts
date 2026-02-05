/**
 * API Client for Vizail Cloud Backend
 * Phase 1: Cloud Persistence & Sharing
 */

import type { LayoutSpec } from '../layout-schema';
import type {
  AgentToken,
  AgentBranch,
  AgentProposal,
  AgentScope,
  ProposalOperation,
} from '../types/agent';

export interface CloudCanvas {
  id: string;
  owner_id: string;
  name: string;
  spec: LayoutSpec;
  created_at: number;
  updated_at: number;
  user_role?: 'owner' | 'editor' | 'viewer';
}

export interface CloudMember {
  id: string;
  canvas_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  email: string;
  display_name?: string;
  invited_by?: string;
  created_at: number;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || `HTTP ${response.status}` };
      }

      return { data };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  // Canvas methods
  async listCanvases(): Promise<{ data?: CloudCanvas[]; error?: string }> {
    return this.request<CloudCanvas[]>('/canvases', { method: 'GET' });
  }

  async createCanvas(name: string, spec: LayoutSpec): Promise<{ data?: CloudCanvas; error?: string }> {
    return this.request<CloudCanvas>('/canvases', {
      method: 'POST',
      body: JSON.stringify({ name, spec }),
    });
  }

  async getCanvas(id: string): Promise<{ data?: CloudCanvas; error?: string }> {
    return this.request<CloudCanvas>(`/canvases/${id}`, { method: 'GET' });
  }

  async updateCanvas(
    id: string,
    updates: { name?: string; spec?: LayoutSpec }
  ): Promise<{ data?: CloudCanvas; error?: string }> {
    return this.request<CloudCanvas>(`/canvases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteCanvas(id: string): Promise<{ data?: { success: boolean }; error?: string }> {
    return this.request<{ success: boolean }>(`/canvases/${id}`, { method: 'DELETE' });
  }

  // Membership methods
  async listMembers(canvasId: string): Promise<{ data?: CloudMember[]; error?: string }> {
    return this.request<CloudMember[]>(`/canvases/${canvasId}/members`, { method: 'GET' });
  }

  async addMember(
    canvasId: string,
    email: string,
    role: 'editor' | 'viewer'
  ): Promise<{ data?: CloudMember; error?: string }> {
    return this.request<CloudMember>(`/canvases/${canvasId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  }

  async removeMember(
    canvasId: string,
    userId: string
  ): Promise<{ data?: { success: boolean }; error?: string }> {
    return this.request<{ success: boolean }>(`/canvases/${canvasId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async health(): Promise<{ data?: { status: string; timestamp: number }; error?: string }> {
    return this.request<{ status: string; timestamp: number }>('/health', { method: 'GET' });
  }

  // Agent Token methods
  async generateAgentToken(
    canvasId: string,
    agentId: string,
    scope: AgentScope
  ): Promise<{ data?: AgentToken; error?: string }> {
    return this.request<AgentToken>(`/canvases/${canvasId}/agent-token`, {
      method: 'POST',
      body: JSON.stringify({ agentId, scope }),
    });
  }

  async revokeAgentToken(
    canvasId: string,
    agentId: string
  ): Promise<{ data?: { success: boolean }; error?: string }> {
    return this.request<{ success: boolean }>(`/canvases/${canvasId}/agent-token/${agentId}`, {
      method: 'DELETE',
    });
  }

  // Branch methods
  async listBranches(canvasId: string): Promise<{ data?: AgentBranch[]; error?: string }> {
    return this.request<AgentBranch[]>(`/canvases/${canvasId}/branches`, { method: 'GET' });
  }

  async createBranch(
    canvasId: string,
    agentId: string,
    baseVersion: number
  ): Promise<{ data?: AgentBranch; error?: string }> {
    return this.request<AgentBranch>(`/canvases/${canvasId}/branches`, {
      method: 'POST',
      body: JSON.stringify({ agentId, baseVersion }),
    });
  }

  async getBranch(branchId: string): Promise<{ data?: AgentBranch; error?: string }> {
    return this.request<AgentBranch>(`/branches/${branchId}`, { method: 'GET' });
  }

  async deleteBranch(branchId: string): Promise<{ data?: { success: boolean }; error?: string }> {
    return this.request<{ success: boolean }>(`/branches/${branchId}`, { method: 'DELETE' });
  }

  // Proposal methods
  async listProposals(canvasId: string): Promise<{ data?: AgentProposal[]; error?: string }> {
    return this.request<AgentProposal[]>(`/canvases/${canvasId}/proposals`, { method: 'GET' });
  }

  async createProposal(
    branchId: string,
    proposal: {
      title: string;
      description: string;
      operations: ProposalOperation[];
      rationale: string;
      assumptions: string[];
      confidence: number;
    }
  ): Promise<{ data?: AgentProposal; error?: string }> {
    return this.request<AgentProposal>(`/branches/${branchId}/proposals`, {
      method: 'POST',
      body: JSON.stringify(proposal),
    });
  }

  async getProposal(proposalId: string): Promise<{ data?: AgentProposal; error?: string }> {
    return this.request<AgentProposal>(`/proposals/${proposalId}`, { method: 'GET' });
  }

  async approveProposal(proposalId: string): Promise<{ data?: AgentProposal; error?: string }> {
    return this.request<AgentProposal>(`/proposals/${proposalId}/approve`, { method: 'POST' });
  }

  async rejectProposal(
    proposalId: string,
    reason?: string
  ): Promise<{ data?: AgentProposal; error?: string }> {
    return this.request<AgentProposal>(`/proposals/${proposalId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }
}

// Singleton instance
export const apiClient = new ApiClient();
