/**
 * Agent Token routes for Phase 4
 */

import type { Env, User } from '../types';
import { generateId, jsonResponse, errorResponse } from '../utils';
import { checkCanvasAccess } from '../auth';
import { generateSecureToken, hashToken } from '../tokenHash';
import { validateRequestBody, generateAgentTokenSchema } from '../validation';
import { checkAgentTokenQuota } from '../quota';

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

  // Check quota before generating token
  const quota = await checkAgentTokenQuota(env, canvasId);
  if (!quota.allowed) {
    return errorResponse(quota.error || 'Agent token quota exceeded', 403);
  }

  // Validate request body
  const validation = await validateRequestBody(request, generateAgentTokenSchema);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  const { agentId, scope } = validation.data;

  try {
    const now = Date.now();
    const tokenId = generateId();
    const token = generateSecureToken(); // Generate secure token
    const tokenHash = await hashToken(token); // Hash before storing
    // Token expires in 365 days - long expiration suitable for agent automation
    // Agents typically run continuously and token rotation can be disruptive
    // Tokens can be manually revoked if compromised
    const expiresAt = now + (365 * 24 * 60 * 60 * 1000);

    await env.DB
      .prepare(`
        INSERT INTO agent_tokens (id, canvas_id, agent_id, token_hash, scope, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(tokenId, canvasId, agentId, tokenHash, scope, expiresAt, now)
      .run();

    const agentToken: AgentToken = {
      id: tokenId,
      canvas_id: canvasId,
      agent_id: agentId,
      token, // Return plaintext token only once
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
