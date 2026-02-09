/**
 * Types for AI Agent Branches & Proposals
 * Phase 4: Agent Collaboration
 */

import type { LayoutNode } from '../layout-schema';

/**
 * Agent permissions model
 */
export interface AgentPermissions {
  canRead: boolean;
  canCreateBranch: boolean;
  canSubmitProposals: boolean;
  canMergeOwn: boolean;
  canMergeOthers: boolean;
  maxNodesPerProposal: number;
  maxProposalsPerDay: number;
}

/**
 * Agent scope levels
 */
export type AgentScope = 'read' | 'propose' | 'trusted-propose';

/**
 * Agent token for authentication
 */
export interface AgentToken {
  token: string;
  agentId: string;
  ownerId: string;
  canvasId: string;
  scope: AgentScope;
  expiresAt: number;
  createdAt: number;
}

export interface AgentTokenSummary {
  id: string;
  canvasId: string;
  agentId: string;
  scope: AgentScope;
  expiresAt: number;
  createdAt: number;
  lastUsedAt?: number | null;
}

export interface AgentLinkCode {
  id: string;
  canvasId: string;
  agentId: string;
  scope: AgentScope;
  code: string;
  expiresAt: number;
  createdAt: number;
}

export interface AgentConfigTemplate {
  filename: string;
  content: Record<string, unknown>;
}

export interface AgentConnectResponse {
  token: AgentToken;
  apiUrl: string;
  canvasId: string;
  configs: {
    mcpJson: AgentConfigTemplate;
    cursor: AgentConfigTemplate;
    vscode: AgentConfigTemplate;
    claudeDesktop: AgentConfigTemplate;
  };
}

/**
 * Agent branch for isolated work
 */
export interface AgentBranch {
  id: string;
  canvasId: string;
  agentId: string;
  ownerId: string;
  status: 'active' | 'merged' | 'abandoned';
  baseVersion: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Operation types for proposals
 */
export type ProposalOperationType = 'create' | 'update' | 'delete' | 'move';

/**
 * Individual operation in a proposal
 */
export interface ProposalOperation {
  type: ProposalOperationType;
  nodeId: string;
  before?: Partial<LayoutNode>;
  after?: Partial<LayoutNode>;
  rationale?: string;
}

/**
 * Agent proposal for human review
 */
export interface AgentProposal {
  id: string;
  branchId: string;
  canvasId: string;
  agentId: string;
  status: 'pending' | 'approved' | 'rejected' | 'superseded';
  title: string;
  description: string;
  operations: ProposalOperation[];
  rationale: string;
  assumptions: string[];
  confidence: number; // 0.0 - 1.0
  previewImageUrl?: string;
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
}

/**
 * Design rationale attached to nodes
 */
export interface DesignRationale {
  nodeId: string;
  text: string;
  agentId: string;
  timestamp: number;
  proposalId?: string;
}

/**
 * Proposal diff summary
 */
export interface ProposalDiff {
  created: string[];
  updated: string[];
  deleted: string[];
  moved: string[];
  totalChanges: number;
}

/**
 * Agent context for UI display
 */
export interface AgentInfo {
  id: string;
  name: string;
  color: string;
  scope: AgentScope;
  isActive: boolean;
}
