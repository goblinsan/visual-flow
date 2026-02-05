/**
 * Agent Token routes for Phase 4
 */

import type { Env, User } from '../types';
import { generateId, jsonResponse, errorResponse } from '../utils';
import { checkCanvasAccess } from '../auth';

interface AgentToken {
  id: string;
  canvas_id: string;
  agent_id: string;
  token: string;
  scope: 'read' | 'propose' | 'trusted-propose';
  expires_at: number;
  created_at: number;
}

/**
 * POST /api/canvases/:id/agent-token
 * Generate an agent token
 */
export async function generateAgentToken(
  user: User,
  env: Env,
  canvasId: string,
  request: Request
): Promise<Response> {
  // Check canvas access (owner only for token generation)
  const access = await checkCanvasAccess(env, user.id, canvasId, 'owner');
  if (!access.allowed) {
    return errorResponse('Canvas not found or insufficient permissions', 404);
  }

  try {
    const body = await request.json() as { agentId: string; scope: string };
    const { agentId, scope } = body;

    if (!agentId || !scope) {
      return errorResponse('Missing required fields: agentId, scope', 400);
    }

    if (!['read', 'propose', 'trusted-propose'].includes(scope)) {
      return errorResponse('Invalid scope. Must be: read, propose, or trusted-propose', 400);
    }

    const now = Date.now();
    const tokenId = generateId();
    const token = `vz_agent_${generateId()}_${generateId()}`; // Generate secure token
    const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

    await env.DB
      .prepare(`
        INSERT INTO agent_tokens (id, canvas_id, agent_id, token, scope, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(tokenId, canvasId, agentId, token, scope, expiresAt, now)
      .run();

    const agentToken: AgentToken = {
      id: tokenId,
      canvas_id: canvasId,
      agent_id: agentId,
      token,
      scope: scope as AgentToken['scope'],
      expires_at: expiresAt,
      created_at: now,
    };

    return jsonResponse(agentToken);
  } catch (error) {
    console.error('Error generating agent token:', error);
    return errorResponse('Failed to generate agent token', 500);
  }
}

/**
 * DELETE /api/canvases/:id/agent-token/:agentId
 * Revoke an agent token
 */
export async function revokeAgentToken(
  user: User,
  env: Env,
  canvasId: string,
  agentId: string
): Promise<Response> {
  // Check canvas access (owner only)
  const access = await checkCanvasAccess(env, user.id, canvasId, 'owner');
  if (!access.allowed) {
    return errorResponse('Canvas not found or insufficient permissions', 404);
  }

  try {
    await env.DB
      .prepare(`DELETE FROM agent_tokens WHERE canvas_id = ? AND agent_id = ?`)
      .bind(canvasId, agentId)
      .run();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error revoking agent token:', error);
    return errorResponse('Failed to revoke agent token', 500);
  }
}
