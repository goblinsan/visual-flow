/**
 * API Client for Vizail Cloud Backend
 * Phase 1: Cloud Persistence & Sharing
 */

import type { LayoutSpec } from '../layout-schema';
import type {
  AgentToken,
  AgentTokenSummary,
  AgentLinkCode,
  AgentBranch,
  AgentProposal,
  AgentScope,
  AgentConnectResponse,
  AgentConfigTemplate,
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

/** Map snake_case API response keys to camelCase for frontend types */
function mapBranch(raw: Record<string, unknown>): AgentBranch {
  return {
    id: raw.id as string,
    canvasId: (raw.canvas_id ?? raw.canvasId) as string,
    agentId: (raw.agent_id ?? raw.agentId) as string,
    ownerId: (raw.owner_id ?? raw.ownerId ?? '') as string,
    status: (raw.status as AgentBranch['status']) ?? 'active',
    baseVersion: (raw.base_version ?? raw.baseVersion ?? 1) as number,
    createdAt: (raw.created_at ?? raw.createdAt ?? 0) as number,
    updatedAt: (raw.updated_at ?? raw.updatedAt ?? 0) as number,
  };
}

function mapProposal(raw: Record<string, unknown>): AgentProposal {
  return {
    id: raw.id as string,
    branchId: (raw.branch_id ?? raw.branchId) as string,
    canvasId: (raw.canvas_id ?? raw.canvasId) as string,
    agentId: (raw.agent_id ?? raw.agentId) as string,
    status: (raw.status as AgentProposal['status']) ?? 'pending',
    title: (raw.title ?? '') as string,
    description: (raw.description ?? '') as string,
    operations: (raw.operations ?? []) as ProposalOperation[],
    rationale: (raw.rationale ?? '') as string,
    assumptions: (raw.assumptions ?? []) as string[],
    confidence: (raw.confidence ?? 0) as number,
    createdAt: (raw.created_at ?? raw.createdAt ?? 0) as number,
    reviewedAt: (raw.reviewed_at ?? raw.reviewedAt) as number | undefined,
    reviewedBy: (raw.reviewed_by ?? raw.reviewedBy) as string | undefined,
  };
}

function mapAgentToken(raw: Record<string, unknown>): AgentToken {
  return {
    token: (raw.token ?? '') as string,
    agentId: (raw.agent_id ?? raw.agentId ?? '') as string,
    ownerId: (raw.owner_id ?? raw.ownerId ?? '') as string,
    canvasId: (raw.canvas_id ?? raw.canvasId ?? '') as string,
    scope: (raw.scope as AgentScope) ?? 'read',
    expiresAt: (raw.expires_at ?? raw.expiresAt ?? 0) as number,
    createdAt: (raw.created_at ?? raw.createdAt ?? 0) as number,
  };
}

function mapAgentTokenSummary(raw: Record<string, unknown>): AgentTokenSummary {
  const lastUsedAt = Object.prototype.hasOwnProperty.call(raw, 'last_used_at')
    ? raw.last_used_at
    : raw.lastUsedAt;

  return {
    id: (raw.id ?? '') as string,
    canvasId: (raw.canvas_id ?? raw.canvasId ?? '') as string,
    agentId: (raw.agent_id ?? raw.agentId ?? '') as string,
    scope: (raw.scope as AgentScope) ?? 'read',
    expiresAt: (raw.expires_at ?? raw.expiresAt ?? 0) as number,
    createdAt: (raw.created_at ?? raw.createdAt ?? 0) as number,
    lastUsedAt: lastUsedAt as number | null | undefined,
  };
}

function mapAgentLinkCode(raw: Record<string, unknown>): AgentLinkCode {
  return {
    id: (raw.id ?? '') as string,
    canvasId: (raw.canvas_id ?? raw.canvasId ?? '') as string,
    agentId: (raw.agent_id ?? raw.agentId ?? '') as string,
    scope: (raw.scope as AgentScope) ?? 'read',
    code: (raw.code ?? '') as string,
    expiresAt: (raw.expires_at ?? raw.expiresAt ?? 0) as number,
    createdAt: (raw.created_at ?? raw.createdAt ?? 0) as number,
  };
}

function mapAgentConfigTemplate(raw?: Record<string, unknown>): AgentConfigTemplate {
  return {
    filename: (raw?.filename ?? '') as string,
    content: (raw?.content ?? {}) as Record<string, unknown>,
  };
}

function mapAgentConnectResponse(raw: Record<string, unknown>): AgentConnectResponse {
  const configs = (raw.configs ?? {}) as Record<string, unknown>;
  const tokenRaw = (raw.token ?? {}) as Record<string, unknown>;

  return {
    token: mapAgentToken(tokenRaw),
    apiUrl: (raw.api_url ?? raw.apiUrl ?? '') as string,
    canvasId: (raw.canvas_id ?? raw.canvasId ?? '') as string,
    configs: {
      mcpJson: mapAgentConfigTemplate((configs.mcp_json ?? configs.mcpJson) as Record<string, unknown>),
      cursor: mapAgentConfigTemplate(configs.cursor as Record<string, unknown>),
      vscode: mapAgentConfigTemplate(configs.vscode as Record<string, unknown>),
      claudeDesktop: mapAgentConfigTemplate((configs.claude_desktop ?? configs.claudeDesktop) as Record<string, unknown>),
    },
  };
}

export class ApiClient {
  private baseUrl: string;
  /** Maximum retries on 429 rate-limit responses */
  private maxRetries = 3;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string }> {
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(import.meta.env.DEV ? { 'X-User-Email': 'dev@localhost' } : {}),
            ...options.headers,
          },
        });

        // Retry on 429 with exponential backoff
        if (response.status === 429 && attempt < this.maxRetries) {
          const retryAfter = response.headers.get('Retry-After');
          const delayMs = retryAfter
            ? Math.min(parseInt(retryAfter, 10) * 1000, 30_000)
            : Math.min(1000 * 2 ** attempt, 30_000);
          await new Promise(r => setTimeout(r, delayMs));
          continue;
        }

        const data = await response.json();

        if (!response.ok) {
          return { error: data.error || `HTTP ${response.status}` };
        }

        return { data };
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Network error';
        // Don't retry network errors
        break;
      }
    }

    return { error: lastError ?? 'Rate limited — please try again' };
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

  // User identity
  async whoami(): Promise<{ data?: { id: string; email: string; display_name?: string | null }; error?: string }> {
    return this.request<{ id: string; email: string; display_name?: string | null }>('/whoami', { method: 'GET' });
  }

  async updateDisplayName(displayName: string): Promise<{ data?: { ok: boolean; display_name: string }; error?: string }> {
    return this.request<{ ok: boolean; display_name: string }>('/user/display-name', {
      method: 'POST',
      body: JSON.stringify({ display_name: displayName }),
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
    const result = await this.request<Record<string, unknown>>(`/canvases/${canvasId}/agent-token`, {
      method: 'POST',
      body: JSON.stringify({ agentId, scope }),
    });
    if (result.error) return { error: result.error };
    return { data: result.data ? mapAgentToken(result.data) : undefined };
  }

  async revokeAgentToken(
    canvasId: string,
    agentId: string
  ): Promise<{ data?: { success: boolean }; error?: string }> {
    return this.request<{ success: boolean }>(`/canvases/${canvasId}/agent-token/${agentId}`, {
      method: 'DELETE',
    });
  }

  async listAgentTokens(
    canvasId: string
  ): Promise<{ data?: AgentTokenSummary[]; error?: string }> {
    const result = await this.request<Record<string, unknown>[]>(`/canvases/${canvasId}/agent-tokens`, { method: 'GET' });
    if (result.error) return { error: result.error };
    return { data: (result.data || []).map(mapAgentTokenSummary) };
  }

  async connectAgent(
    canvasId: string,
    options: { agentId?: string; scope?: AgentScope; client?: string } = {}
  ): Promise<{ data?: AgentConnectResponse; error?: string }> {
    const result = await this.request<Record<string, unknown>>('/agent/connect', {
      method: 'POST',
      body: JSON.stringify({ canvasId, ...options }),
    });
    if (result.error) return { error: result.error };
    return { data: result.data ? mapAgentConnectResponse(result.data) : undefined };
  }

  async createLinkCode(
    canvasId: string,
    options: { agentId?: string; scope?: AgentScope; client?: string } = {}
  ): Promise<{ data?: AgentLinkCode; error?: string }> {
    const result = await this.request<Record<string, unknown>>('/agent/link-code', {
      method: 'POST',
      body: JSON.stringify({ canvasId, ...options }),
    });
    if (result.error) return { error: result.error };
    return { data: result.data ? mapAgentLinkCode(result.data) : undefined };
  }

  // Branch methods
  async listBranches(canvasId: string): Promise<{ data?: AgentBranch[]; error?: string }> {
    const result = await this.request<Record<string, unknown>[]>(`/canvases/${canvasId}/branches`, { method: 'GET' });
    if (result.error) return { error: result.error };
    return { data: (result.data || []).map(mapBranch) };
  }

  async createBranch(
    canvasId: string,
    agentId: string,
    baseVersion: number
  ): Promise<{ data?: AgentBranch; error?: string }> {
    const result = await this.request<Record<string, unknown>>(`/canvases/${canvasId}/branches`, {
      method: 'POST',
      body: JSON.stringify({ agentId, baseVersion }),
    });
    if (result.error) return { error: result.error };
    return { data: result.data ? mapBranch(result.data) : undefined };
  }

  async getBranch(branchId: string): Promise<{ data?: AgentBranch; error?: string }> {
    const result = await this.request<Record<string, unknown>>(`/branches/${branchId}`, { method: 'GET' });
    if (result.error) return { error: result.error };
    return { data: result.data ? mapBranch(result.data) : undefined };
  }

  async deleteBranch(branchId: string): Promise<{ data?: { success: boolean }; error?: string }> {
    return this.request<{ success: boolean }>(`/branches/${branchId}`, { method: 'DELETE' });
  }

  // Proposal methods
  async listProposals(canvasId: string): Promise<{ data?: AgentProposal[]; error?: string }> {
    const result = await this.request<Record<string, unknown>[]>(`/canvases/${canvasId}/proposals`, { method: 'GET' });
    if (result.error) return { error: result.error };
    return { data: (result.data || []).map(mapProposal) };
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
    const result = await this.request<Record<string, unknown>>(`/branches/${branchId}/proposals`, {
      method: 'POST',
      body: JSON.stringify(proposal),
    });
    if (result.error) return { error: result.error };
    return { data: result.data ? mapProposal(result.data) : undefined };
  }

  async getProposal(proposalId: string): Promise<{ data?: AgentProposal; error?: string }> {
    const result = await this.request<Record<string, unknown>>(`/proposals/${proposalId}`, { method: 'GET' });
    if (result.error) return { error: result.error };
    return { data: result.data ? mapProposal(result.data) : undefined };
  }

  async approveProposal(proposalId: string): Promise<{ data?: AgentProposal; error?: string }> {
    const result = await this.request<Record<string, unknown>>(`/proposals/${proposalId}/approve`, { method: 'POST' });
    if (result.error) return { error: result.error };
    return { data: result.data ? mapProposal(result.data) : undefined };
  }

  async rejectProposal(
    proposalId: string,
    reason?: string
  ): Promise<{ data?: AgentProposal; error?: string }> {
    const result = await this.request<Record<string, unknown>>(`/proposals/${proposalId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    if (result.error) return { error: result.error };
    return { data: result.data ? mapProposal(result.data) : undefined };
  }
}

/** Resolve the API base URL at runtime:
 *  1. Explicit env var (VITE_API_URL) wins.
 *  2. On vizail.com (production) → same-origin /api (routed to Worker via Cloudflare Worker Route)
 *  3. Otherwise → local dev server.
 */
function resolveApiUrl(): string {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname === 'vizail.com') {
    return '/api';  // Same-origin path; Cloudflare Worker Route handles vizail.com/api/*
  }
  return 'http://localhost:62587/api';
}

// Singleton instance
export const apiClient = new ApiClient(resolveApiUrl());
