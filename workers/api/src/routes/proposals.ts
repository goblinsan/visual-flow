/**
 * Proposal routes for Phase 4
 */

import type { Env, User } from '../types';
import { generateId, jsonResponse, errorResponse } from '../utils';
import { checkCanvasAccess } from '../auth';

interface ProposalOperation {
  type: 'create' | 'update' | 'delete' | 'move';
  nodeId: string;
  before?: unknown;
  after?: unknown;
  rationale?: string;
}

interface AgentProposal {
  id: string;
  branch_id: string;
  canvas_id: string;
  agent_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'superseded';
  title: string;
  description: string;
  operations: string; // JSON
  rationale: string;
  assumptions: string; // JSON
  confidence: number;
  created_at: number;
  reviewed_at?: number;
  reviewed_by?: string;
}

/**
 * GET /api/canvases/:id/proposals
 * List all proposals for a canvas
 */
export async function listProposals(
  user: User,
  env: Env,
  canvasId: string
): Promise<Response> {
  // Check canvas access
  const access = await checkCanvasAccess(env, user.id, canvasId);
  if (!access.allowed) {
    return errorResponse('Canvas not found', 404);
  }

  try {
    const result = await env.DB
      .prepare(`
        SELECT * FROM agent_proposals
        WHERE canvas_id = ?
        ORDER BY created_at DESC
      `)
      .bind(canvasId)
      .all<AgentProposal>();

    // Parse JSON fields
    const proposals = (result.results || []).map(p => ({
      ...p,
      operations: JSON.parse(p.operations),
      assumptions: JSON.parse(p.assumptions),
    }));

    return jsonResponse(proposals);
  } catch (error) {
    console.error('Error listing proposals:', error);
    return errorResponse('Failed to list proposals', 500);
  }
}

/**
 * POST /api/branches/:id/proposals
 * Create a new proposal
 */
export async function createProposal(
  user: User,
  env: Env,
  branchId: string,
  request: Request
): Promise<Response> {
  try {
    // Get branch to check canvas access
    const branch = await env.DB
      .prepare(`SELECT * FROM agent_branches WHERE id = ?`)
      .bind(branchId)
      .first<{ canvas_id: string; agent_id: string }>();

    if (!branch) {
      return errorResponse('Branch not found', 404);
    }

    // Check canvas access
    const access = await checkCanvasAccess(env, user.id, branch.canvas_id, 'editor');
    if (!access.allowed) {
      return errorResponse('Canvas not found or insufficient permissions', 404);
    }

    const body = await request.json() as {
      title: string;
      description: string;
      operations: ProposalOperation[];
      rationale: string;
      assumptions: string[];
      confidence: number;
    };

    const { title, description, operations, rationale, assumptions, confidence } = body;

    if (!title || !description || !operations || !rationale || assumptions === undefined || confidence === undefined) {
      return errorResponse('Missing required fields', 400);
    }

    if (confidence < 0 || confidence > 1) {
      return errorResponse('Confidence must be between 0 and 1', 400);
    }

    const now = Date.now();
    const proposalId = generateId();

    await env.DB
      .prepare(`
        INSERT INTO agent_proposals (
          id, branch_id, canvas_id, agent_id, status,
          title, description, operations, rationale, assumptions,
          confidence, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        proposalId,
        branchId,
        branch.canvas_id,
        branch.agent_id,
        'pending',
        title,
        description,
        JSON.stringify(operations),
        rationale,
        JSON.stringify(assumptions),
        confidence,
        now
      )
      .run();

    const proposal = {
      id: proposalId,
      branch_id: branchId,
      canvas_id: branch.canvas_id,
      agent_id: branch.agent_id,
      status: 'pending' as const,
      title,
      description,
      operations,
      rationale,
      assumptions,
      confidence,
      created_at: now,
    };

    return jsonResponse(proposal);
  } catch (error) {
    console.error('Error creating proposal:', error);
    return errorResponse('Failed to create proposal', 500);
  }
}

/**
 * GET /api/proposals/:id
 * Get a specific proposal
 */
export async function getProposal(
  user: User,
  env: Env,
  proposalId: string
): Promise<Response> {
  try {
    const proposal = await env.DB
      .prepare(`SELECT * FROM agent_proposals WHERE id = ?`)
      .bind(proposalId)
      .first<AgentProposal>();

    if (!proposal) {
      return errorResponse('Proposal not found', 404);
    }

    // Check canvas access
    const access = await checkCanvasAccess(env, user.id, proposal.canvas_id);
    if (!access.allowed) {
      return errorResponse('Canvas not found', 404);
    }

    // Parse JSON fields
    const parsed = {
      ...proposal,
      operations: JSON.parse(proposal.operations),
      assumptions: JSON.parse(proposal.assumptions),
    };

    return jsonResponse(parsed);
  } catch (error) {
    console.error('Error getting proposal:', error);
    return errorResponse('Failed to get proposal', 500);
  }
}

/**
 * POST /api/proposals/:id/approve
 * Approve a proposal
 */
export async function approveProposal(
  user: User,
  env: Env,
  proposalId: string
): Promise<Response> {
  try {
    const proposal = await env.DB
      .prepare(`SELECT * FROM agent_proposals WHERE id = ?`)
      .bind(proposalId)
      .first<AgentProposal>();

    if (!proposal) {
      return errorResponse('Proposal not found', 404);
    }

    // Check canvas access (owner or editor)
    const access = await checkCanvasAccess(env, user.id, proposal.canvas_id, 'editor');
    if (!access.allowed) {
      return errorResponse('Canvas not found or insufficient permissions', 404);
    }

    if (proposal.status !== 'pending') {
      return errorResponse('Only pending proposals can be approved', 400);
    }

    const now = Date.now();

    await env.DB
      .prepare(`
        UPDATE agent_proposals
        SET status = ?, reviewed_at = ?, reviewed_by = ?
        WHERE id = ?
      `)
      .bind('approved', now, user.id, proposalId)
      .run();

    const updated = {
      ...proposal,
      status: 'approved' as const,
      reviewed_at: now,
      reviewed_by: user.id,
      operations: JSON.parse(proposal.operations),
      assumptions: JSON.parse(proposal.assumptions),
    };

    return jsonResponse(updated);
  } catch (error) {
    console.error('Error approving proposal:', error);
    return errorResponse('Failed to approve proposal', 500);
  }
}

/**
 * POST /api/proposals/:id/reject
 * Reject a proposal
 */
export async function rejectProposal(
  user: User,
  env: Env,
  proposalId: string,
  request: Request
): Promise<Response> {
  try {
    const proposal = await env.DB
      .prepare(`SELECT * FROM agent_proposals WHERE id = ?`)
      .bind(proposalId)
      .first<AgentProposal>();

    if (!proposal) {
      return errorResponse('Proposal not found', 404);
    }

    // Check canvas access (owner or editor)
    const access = await checkCanvasAccess(env, user.id, proposal.canvas_id, 'editor');
    if (!access.allowed) {
      return errorResponse('Canvas not found or insufficient permissions', 404);
    }

    if (proposal.status !== 'pending') {
      return errorResponse('Only pending proposals can be rejected', 400);
    }

    const now = Date.now();

    await env.DB
      .prepare(`
        UPDATE agent_proposals
        SET status = ?, reviewed_at = ?, reviewed_by = ?
        WHERE id = ?
      `)
      .bind('rejected', now, user.id, proposalId)
      .run();

    const updated = {
      ...proposal,
      status: 'rejected' as const,
      reviewed_at: now,
      reviewed_by: user.id,
      operations: JSON.parse(proposal.operations),
      assumptions: JSON.parse(proposal.assumptions),
    };

    return jsonResponse(updated);
  } catch (error) {
    console.error('Error rejecting proposal:', error);
    return errorResponse('Failed to reject proposal', 500);
  }
}
