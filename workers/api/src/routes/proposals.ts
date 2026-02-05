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
 * Apply proposal operations to a canvas spec (server-side merge)
 */
function applyOperationsToSpec(
  spec: { root: { children: any[]; [key: string]: any }; [key: string]: any },
  operations: ProposalOperation[]
): any {
  const newSpec = JSON.parse(JSON.stringify(spec));

  for (const op of operations) {
    switch (op.type) {
      case 'create':
        if (op.after) {
          newSpec.root.children.push(op.after);
        }
        break;
      case 'update':
        if (op.after) {
          const idx = newSpec.root.children.findIndex((n: any) => n.id === op.nodeId);
          if (idx >= 0) {
            newSpec.root.children[idx] = { ...newSpec.root.children[idx], ...op.after };
          }
        }
        break;
      case 'delete':
        newSpec.root.children = newSpec.root.children.filter((n: any) => n.id !== op.nodeId);
        break;
      case 'move':
        if (op.after && typeof op.after === 'object' && 'position' in op.after) {
          const idx = newSpec.root.children.findIndex((n: any) => n.id === op.nodeId);
          if (idx >= 0 && 'position' in newSpec.root.children[idx]) {
            newSpec.root.children[idx].position = (op.after as any).position;
          }
        }
        break;
    }
  }

  return newSpec;
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
    const operations = JSON.parse(proposal.operations) as ProposalOperation[];

    // Apply operations to the canvas spec
    const canvas = await env.DB
      .prepare('SELECT spec FROM canvases WHERE id = ?')
      .bind(proposal.canvas_id)
      .first<{ spec: string }>();

    if (!canvas) {
      return errorResponse('Canvas not found', 404);
    }

    const currentSpec = JSON.parse(canvas.spec);
    const updatedSpec = applyOperationsToSpec(currentSpec, operations);

    // Update both the proposal status and the canvas spec in a batch
    await env.DB.batch([
      env.DB
        .prepare(`
          UPDATE agent_proposals
          SET status = ?, reviewed_at = ?, reviewed_by = ?
          WHERE id = ?
        `)
        .bind('approved', now, user.id, proposalId),
      env.DB
        .prepare(`
          UPDATE canvases
          SET spec = ?, updated_at = ?
          WHERE id = ?
        `)
        .bind(JSON.stringify(updatedSpec), now, proposal.canvas_id),
    ]);

    const updated = {
      ...proposal,
      status: 'approved' as const,
      reviewed_at: now,
      reviewed_by: user.id,
      operations,
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
