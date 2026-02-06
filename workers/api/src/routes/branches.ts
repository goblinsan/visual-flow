/**
 * Branch routes for Phase 4 (Agent Collaboration)
 */

import type { Env, User } from '../types';
import { generateId, jsonResponse, errorResponse } from '../utils';
import { checkCanvasAccess } from '../auth';
import { checkBranchQuota } from '../quota';

interface AgentBranch {
  id: string;
  canvas_id: string;
  agent_id: string;
  base_version: number;
  status: 'active' | 'merged' | 'abandoned';
  created_at: number;
}

/**
 * GET /api/canvases/:id/branches
 * List all branches for a canvas
 */
export async function listBranches(
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
        SELECT * FROM agent_branches
        WHERE canvas_id = ?
        ORDER BY created_at DESC
      `)
      .bind(canvasId)
      .all<AgentBranch>();

    return jsonResponse(result.results || []);
  } catch (error) {
    console.error('Error listing branches:', error);
    return errorResponse('Failed to list branches', 500);
  }
}

/**
 * POST /api/canvases/:id/branches
 * Create a new branch
 */
export async function createBranch(
  user: User,
  env: Env,
  canvasId: string,
  request: Request
): Promise<Response> {
  // Check canvas access (editors can create branches)
  const access = await checkCanvasAccess(env, user.id, canvasId, 'editor');
  if (!access.allowed) {
    return errorResponse('Canvas not found or insufficient permissions', 404);
  }

  // Check quota before creating branch
  const quota = await checkBranchQuota(env, canvasId);
  if (!quota.allowed) {
    return errorResponse(quota.error || 'Branch quota exceeded', 403);
  }

  try {
    const body = await request.json() as { agentId: string; baseVersion: number };
    const { agentId, baseVersion } = body;

    if (!agentId || baseVersion === undefined) {
      return errorResponse('Missing required fields: agentId, baseVersion', 400);
    }

    const now = Date.now();
    const branchId = generateId();

    await env.DB
      .prepare(`
        INSERT INTO agent_branches (id, canvas_id, agent_id, base_version, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(branchId, canvasId, agentId, baseVersion, 'active', now)
      .run();

    const branch: AgentBranch = {
      id: branchId,
      canvas_id: canvasId,
      agent_id: agentId,
      base_version: baseVersion,
      status: 'active',
      created_at: now,
    };

    return jsonResponse(branch);
  } catch (error) {
    console.error('Error creating branch:', error);
    return errorResponse('Failed to create branch', 500);
  }
}

/**
 * GET /api/branches/:id
 * Get a specific branch
 */
export async function getBranch(
  user: User,
  env: Env,
  branchId: string
): Promise<Response> {
  try {
    const branch = await env.DB
      .prepare(`SELECT * FROM agent_branches WHERE id = ?`)
      .bind(branchId)
      .first<AgentBranch>();

    if (!branch) {
      return errorResponse('Branch not found', 404);
    }

    // Check canvas access
    const access = await checkCanvasAccess(env, user.id, branch.canvas_id);
    if (!access.allowed) {
      return errorResponse('Canvas not found', 404);
    }

    return jsonResponse(branch);
  } catch (error) {
    console.error('Error getting branch:', error);
    return errorResponse('Failed to get branch', 500);
  }
}

/**
 * DELETE /api/branches/:id
 * Delete a branch
 */
export async function deleteBranch(
  user: User,
  env: Env,
  branchId: string
): Promise<Response> {
  try {
    // Get branch to check canvas access
    const branch = await env.DB
      .prepare(`SELECT * FROM agent_branches WHERE id = ?`)
      .bind(branchId)
      .first<AgentBranch>();

    if (!branch) {
      return errorResponse('Branch not found', 404);
    }

    // Check canvas access (owner or editor)
    const access = await checkCanvasAccess(env, user.id, branch.canvas_id, 'editor');
    if (!access.allowed) {
      return errorResponse('Canvas not found or insufficient permissions', 404);
    }

    await env.DB
      .prepare(`DELETE FROM agent_branches WHERE id = ?`)
      .bind(branchId)
      .run();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error deleting branch:', error);
    return errorResponse('Failed to delete branch', 500);
  }
}
