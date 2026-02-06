/**
 * HTTP client for the Vizail REST API
 * Used by the MCP server to make authenticated requests
 */

export class VizailApiClient {
  constructor(
    private baseUrl: string,
    private agentToken: string
  ) {}

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.agentToken}`,
    };
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: { ...this.headers, ...options.headers },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API error ${response.status}: ${body}`);
    }

    return response.json() as Promise<T>;
  }

  // --- Canvas ---

  async getCanvas(canvasId: string) {
    return this.request<{
      id: string;
      name: string;
      spec: { root: any };
      created_at: number;
      updated_at: number;
    }>(`/canvases/${canvasId}`);
  }

  // --- Branches ---

  async listBranches(canvasId: string) {
    return this.request<Array<{
      id: string;
      canvas_id: string;
      agent_id: string;
      base_version: number;
      status: string;
      created_at: number;
    }>>(`/canvases/${canvasId}/branches`);
  }

  async createBranch(canvasId: string, agentId: string) {
    return this.request<{
      id: string;
      canvas_id: string;
      agent_id: string;
      status: string;
    }>(`/canvases/${canvasId}/branches`, {
      method: 'POST',
      body: JSON.stringify({ agentId, baseVersion: 1 }),
    });
  }

  // --- Proposals ---

  async listProposals(canvasId: string) {
    return this.request<Array<{
      id: string;
      status: string;
      title: string;
      description: string;
      operations: any[];
      confidence: number;
      created_at: number;
      reviewed_at?: number;
    }>>(`/canvases/${canvasId}/proposals`);
  }

  async createProposal(
    branchId: string,
    proposal: {
      title: string;
      description: string;
      operations: any[];
      rationale: string;
      assumptions: string[];
      confidence: number;
    }
  ) {
    return this.request<{
      id: string;
      status: string;
      title: string;
    }>(`/branches/${branchId}/proposals`, {
      method: 'POST',
      body: JSON.stringify(proposal),
    });
  }

  async getProposal(proposalId: string) {
    return this.request<{
      id: string;
      status: string;
      title: string;
      operations: any[];
      reviewed_at?: number;
      reviewed_by?: string;
    }>(`/proposals/${proposalId}`);
  }
}
