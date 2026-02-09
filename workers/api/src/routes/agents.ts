/**
 * Agent Token routes for Phase 4
 */

import type { Env, User } from '../types';
import { generateId, jsonResponse, errorResponse } from '../utils';
import { checkCanvasAccess, checkAgentScope, type AuthResult } from '../auth';
import { generateSecureToken, hashToken } from '../tokenHash';
import {
  validateRequestBody,
  generateAgentTokenSchema,
  connectAgentSchema,
  createLinkCodeSchema,
  exchangeLinkCodeSchema,
} from '../validation';
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

interface AgentTokenSummary {
  id: string;
  canvas_id: string;
  agent_id: string;
  scope: 'read' | 'propose' | 'trusted-propose';
  expires_at: number;
  created_at: number;
  last_used_at: number | null;
}

interface AgentLinkCode {
  id: string;
  canvas_id: string;
  agent_id: string;
  scope: AgentToken['scope'];
  code: string;
  expires_at: number;
  created_at: number;
}

const LINK_CODE_TTL_MS = 10 * 60 * 1000;
const LINK_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface AgentConfigTemplate {
  filename: string;
  content: Record<string, unknown>;
}

interface AgentConnectResponse {
  token: AgentToken;
  api_url: string;
  canvas_id: string;
  configs: {
    mcp_json: AgentConfigTemplate;
    cursor: AgentConfigTemplate;
    vscode: AgentConfigTemplate;
    claude_desktop: AgentConfigTemplate;
  };
}

function buildMcpServerConfig(apiUrl: string, token: string, canvasId: string) {
  return {
    command: 'npx',
    args: ['-y', 'vizail-mcp-server'],
    env: {
      VIZAIL_API_URL: apiUrl,
      VIZAIL_AGENT_TOKEN: token,
      VIZAIL_CANVAS_ID: canvasId,
    },
  };
}

function buildConfigTemplates(apiUrl: string, token: string, canvasId: string): AgentConnectResponse['configs'] {
  const serverConfig = buildMcpServerConfig(apiUrl, token, canvasId);
  const mcpServersConfig = { mcpServers: { 'vizail-canvas': serverConfig } };
  const vscodeConfig = { servers: { 'vizail-canvas': serverConfig } };

  return {
    mcp_json: {
      filename: 'mcp.json',
      content: mcpServersConfig,
    },
    cursor: {
      filename: '.cursor/mcp.json',
      content: mcpServersConfig,
    },
    vscode: {
      filename: '.vscode/mcp.json',
      content: vscodeConfig,
    },
    claude_desktop: {
      filename: 'claude_desktop_config.json',
      content: mcpServersConfig,
    },
  };
}

function generateLinkCode(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = '';
  for (const byte of bytes) {
    code += LINK_CODE_ALPHABET[byte % LINK_CODE_ALPHABET.length];
  }
  return code;
}

async function createUniqueLinkCode(env: Env): Promise<{ code: string; codeHash: string }> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateLinkCode();
    const codeHash = await hashToken(code);
    const existing = await env.DB
      .prepare(`SELECT id FROM agent_link_codes WHERE code_hash = ? AND expires_at > ?`)
      .bind(codeHash, Date.now())
      .first<{ id: string }>();
    if (!existing) {
      return { code, codeHash };
    }
  }

  throw new Error('Unable to generate unique link code');
}

async function createAgentTokenRecord(
  env: Env,
  canvasId: string,
  agentId: string,
  scope: AgentToken['scope']
): Promise<AgentToken> {
  const now = Date.now();
  const tokenId = generateId();
  const token = generateSecureToken();
  const tokenHash = await hashToken(token);
  const expiresAt = now + (365 * 24 * 60 * 60 * 1000);

  await env.DB
    .prepare(`
        INSERT INTO agent_tokens (id, canvas_id, agent_id, token_hash, scope, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
    .bind(tokenId, canvasId, agentId, tokenHash, scope, expiresAt, now)
    .run();

  return {
    id: tokenId,
    canvas_id: canvasId,
    agent_id: agentId,
    token,
    scope,
    expires_at: expiresAt,
    created_at: now,
  };
}

/**
 * POST /api/canvases/:id/agent-token
 * Generate an agent token
 */
export async function generateAgentToken(
  user: User,
  env: Env,
  canvasId: string,
  request: Request,
  authResult?: AuthResult
): Promise<Response> {
  if (authResult?.agentToken) {
    return errorResponse('Agent tokens cannot manage other tokens', 403);
  }

  const scope = checkAgentScope(authResult ?? null, 'trusted-propose', canvasId);
  if (!scope.allowed) {
    return errorResponse(scope.error || 'Insufficient scope', 403);
  }

  try {
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

    const agentToken = await createAgentTokenRecord(env, canvasId, agentId, scope as AgentToken['scope']);

    return jsonResponse(agentToken);
  } catch (error) {
    console.error('Error generating agent token:', error);
    return errorResponse(`Failed to generate agent token: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
}

/**
 * GET /api/canvases/:id/agent-tokens
 * List agent tokens for a canvas
 */
export async function listAgentTokens(
  user: User,
  env: Env,
  canvasId: string,
  authResult?: AuthResult
): Promise<Response> {
  if (authResult?.agentToken) {
    return errorResponse('Agent tokens cannot manage other tokens', 403);
  }

  const scope = checkAgentScope(authResult ?? null, 'trusted-propose', canvasId);
  if (!scope.allowed) {
    return errorResponse(scope.error || 'Insufficient scope', 403);
  }

  const access = await checkCanvasAccess(env, user.id, canvasId, 'owner');
  if (!access.allowed) {
    return errorResponse('Canvas not found or insufficient permissions', 404);
  }

  try {
    const tokens = await env.DB
      .prepare(`
        SELECT id, canvas_id, agent_id, scope, expires_at, created_at, NULL as last_used_at
        FROM agent_tokens
        WHERE canvas_id = ? AND expires_at > ?
        ORDER BY created_at DESC
      `)
      .bind(canvasId, Date.now())
      .all<AgentTokenSummary>();

    return jsonResponse(tokens.results || []);
  } catch (error) {
    console.error('Error listing agent tokens:', error);
    return errorResponse('Failed to list agent tokens', 500);
  }
}

/**
 * POST /api/agent/connect
 * Generate an agent token plus MCP config templates
 */
export async function connectAgent(
  user: User,
  env: Env,
  request: Request,
  authResult?: AuthResult
): Promise<Response> {
  if (authResult?.agentToken) {
    return errorResponse('Agent tokens cannot manage other tokens', 403);
  }

  const validation = await validateRequestBody(request, connectAgentSchema);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  const { canvasId } = validation.data;
  const agentId = validation.data.agentId || validation.data.client || 'vizail-agent';
  const scope = (validation.data.scope || 'propose') as AgentToken['scope'];

  const scopeCheck = checkAgentScope(authResult ?? null, 'trusted-propose', canvasId);
  if (!scopeCheck.allowed) {
    return errorResponse(scopeCheck.error || 'Insufficient scope', 403);
  }

  try {
    const access = await checkCanvasAccess(env, user.id, canvasId, 'owner');
    if (!access.allowed) {
      return errorResponse('Canvas not found or insufficient permissions', 404);
    }

    const quota = await checkAgentTokenQuota(env, canvasId);
    if (!quota.allowed) {
      return errorResponse(quota.error || 'Agent token quota exceeded', 403);
    }

    const token = await createAgentTokenRecord(env, canvasId, agentId, scope);
    const url = new URL(request.url);
    const apiUrl = `${url.origin}/api`;

    const responseBody: AgentConnectResponse = {
      token,
      api_url: apiUrl,
      canvas_id: canvasId,
      configs: buildConfigTemplates(apiUrl, token.token, canvasId),
    };

    return jsonResponse(responseBody);
  } catch (error) {
    console.error('Error connecting agent:', error);
    return errorResponse(`Failed to connect agent: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
}

/**
 * POST /api/agent/link-code
 * Create a one-time link code for extensions/skills
 */
export async function createLinkCode(
  user: User,
  env: Env,
  request: Request,
  authResult?: AuthResult
): Promise<Response> {
  if (authResult?.agentToken) {
    return errorResponse('Agent tokens cannot manage other tokens', 403);
  }

  const validation = await validateRequestBody(request, createLinkCodeSchema);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  const { canvasId } = validation.data;
  const agentId = validation.data.agentId || validation.data.client || 'vizail-agent';
  const scope = (validation.data.scope || 'propose') as AgentToken['scope'];

  const scopeCheck = checkAgentScope(authResult ?? null, 'trusted-propose', canvasId);
  if (!scopeCheck.allowed) {
    return errorResponse(scopeCheck.error || 'Insufficient scope', 403);
  }

  try {
    const access = await checkCanvasAccess(env, user.id, canvasId, 'owner');
    if (!access.allowed) {
      return errorResponse('Canvas not found or insufficient permissions', 404);
    }

    const quota = await checkAgentTokenQuota(env, canvasId);
    if (!quota.allowed) {
      return errorResponse(quota.error || 'Agent token quota exceeded', 403);
    }

    const { code, codeHash } = await createUniqueLinkCode(env);
    const now = Date.now();
    const expiresAt = now + LINK_CODE_TTL_MS;
    const id = generateId();

    await env.DB
      .prepare(`
        INSERT INTO agent_link_codes (id, canvas_id, agent_id, scope, code_hash, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(id, canvasId, agentId, scope, codeHash, expiresAt, now)
      .run();

    const responseBody: AgentLinkCode = {
      id,
      canvas_id: canvasId,
      agent_id: agentId,
      scope,
      code,
      expires_at: expiresAt,
      created_at: now,
    };

    return jsonResponse(responseBody);
  } catch (error) {
    console.error('Error creating link code:', error);
    return errorResponse(`Failed to create link code: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
}

/**
 * POST /api/agent/link-code/exchange
 * Exchange a link code for an agent token (public)
 */
export async function exchangeLinkCode(
  env: Env,
  request: Request
): Promise<Response> {
  const validation = await validateRequestBody(request, exchangeLinkCodeSchema);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  try {
    const { code } = validation.data;
    const codeHash = await hashToken(code);
    const now = Date.now();

    const linkCode = await env.DB
      .prepare(`
        SELECT id, canvas_id, agent_id, scope, expires_at
        FROM agent_link_codes
        WHERE code_hash = ? AND expires_at > ? AND consumed_at IS NULL
      `)
      .bind(codeHash, now)
      .first<{ id: string; canvas_id: string; agent_id: string; scope: AgentToken['scope']; expires_at: number }>();

    if (!linkCode) {
      return errorResponse('Link code invalid or expired', 404);
    }

    const quota = await checkAgentTokenQuota(env, linkCode.canvas_id);
    if (!quota.allowed) {
      return errorResponse(quota.error || 'Agent token quota exceeded', 403);
    }

    const token = await createAgentTokenRecord(env, linkCode.canvas_id, linkCode.agent_id, linkCode.scope);
    await env.DB
      .prepare(`UPDATE agent_link_codes SET consumed_at = ? WHERE id = ?`)
      .bind(now, linkCode.id)
      .run();

    const url = new URL(request.url);
    const apiUrl = `${url.origin}/api`;

    const responseBody: AgentConnectResponse = {
      token,
      api_url: apiUrl,
      canvas_id: linkCode.canvas_id,
      configs: buildConfigTemplates(apiUrl, token.token, linkCode.canvas_id),
    };

    return jsonResponse(responseBody);
  } catch (error) {
    console.error('Error exchanging link code:', error);
    return errorResponse(`Failed to exchange link code: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
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
  agentId: string,
  authResult?: AuthResult
): Promise<Response> {
  if (authResult?.agentToken) {
    return errorResponse('Agent tokens cannot manage other tokens', 403);
  }

  const scope = checkAgentScope(authResult ?? null, 'trusted-propose', canvasId);
  if (!scope.allowed) {
    return errorResponse(scope.error || 'Insufficient scope', 403);
  }

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
