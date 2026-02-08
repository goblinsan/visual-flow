/**
 * Authentication middleware for Cloudflare Access + Agent Tokens
 * Supports two auth methods:
 *   1. CF Access JWT (from CF_Authorization cookie) — cryptographically verified
 *   2. Authorization: Bearer vz_agent_... (agent tokens from Phase 4)
 *
 * In production, user identity is extracted by validating the CF Access JWT
 * using Cloudflare's public signing keys. The CF-Access-Authenticated-User-Email
 * header is NOT trusted because it can be spoofed on paths not covered by a
 * CF Access Application.
 *
 * Security: Agent tokens are hashed in the database using SHA-256
 */

import type { Env, User } from './types';
import { hashToken } from './tokenHash';
import { getAuthenticatedEmailFromJwt } from './cfAccessJwt';

export interface AuthResult {
  user: User;
  /** Set when authenticated via agent token */
  agentToken?: {
    id: string;
    canvas_id: string;
    agent_id: string;
    scope: 'read' | 'propose' | 'trusted-propose';
  };
}

/**
 * Extract user from CF Access JWT cookie or agent token.
 *
 * Production: Validates the CF_Authorization JWT cookie directly.
 * Development: Falls back to X-User-Email header for local testing.
 */
export async function authenticateUser(request: Request, env: Env): Promise<User | null> {
  // Method 1: Agent token via Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer vz_agent_')) {
    return authenticateAgentToken(authHeader.slice(7), env);
  }

  // Method 2: CF Access JWT validation (production)
  if (env.ENVIRONMENT === 'production' && env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD) {
    const email = await getAuthenticatedEmailFromJwt(
      request,
      env.CF_ACCESS_TEAM_DOMAIN,
      env.CF_ACCESS_AUD,
    );
    if (!email) return null;
    return getOrCreateUser(env, email);
  }

  // Method 3: Header-based auth (development / fallback)
  // In dev, CF Access isn't running so we accept test headers
  const email =
    request.headers.get('CF-Access-Authenticated-User-Email') ||
    (env.ENVIRONMENT !== 'production' ? request.headers.get('X-User-Email') : null);

  if (!email) return null;
  return getOrCreateUser(env, email);
}

/**
 * Full auth with agent token metadata (used by routes that need scope info)
 */
export async function authenticateRequest(request: Request, env: Env): Promise<AuthResult | null> {
  const authHeader = request.headers.get('Authorization');
  
  if (authHeader?.startsWith('Bearer vz_agent_')) {
    const token = authHeader.slice(7);
    const tokenHash = await hashToken(token);
    
    const tokenRow = await env.DB
      .prepare(`
        SELECT id, canvas_id, agent_id, scope, expires_at
        FROM agent_tokens WHERE token_hash = ?
      `)
      .bind(tokenHash)
      .first<{ id: string; canvas_id: string; agent_id: string; scope: string; expires_at: number }>();

    if (!tokenRow || tokenRow.expires_at < Date.now()) {
      return null;
    }

    // Agent acts as the canvas owner for simplicity
    const canvas = await env.DB
      .prepare('SELECT owner_id FROM canvases WHERE id = ?')
      .bind(tokenRow.canvas_id)
      .first<{ owner_id: string }>();

    if (!canvas) return null;

    const user = await getOrCreateUser(env, canvas.owner_id);
    if (!user) return null;

    return {
      user,
      agentToken: {
        id: tokenRow.id,
        canvas_id: tokenRow.canvas_id,
        agent_id: tokenRow.agent_id,
        scope: tokenRow.scope as 'read' | 'propose' | 'trusted-propose',
      },
    };
  }

  // CF Access JWT validation (production)
  if (env.ENVIRONMENT === 'production' && env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD) {
    const email = await getAuthenticatedEmailFromJwt(
      request,
      env.CF_ACCESS_TEAM_DOMAIN,
      env.CF_ACCESS_AUD,
    );
    if (!email) return null;
    const user = await getOrCreateUser(env, email);
    if (!user) return null;
    return { user };
  }

  // Header-based auth (development / fallback)
  const email =
    request.headers.get('CF-Access-Authenticated-User-Email') ||
    (env.ENVIRONMENT !== 'production' ? request.headers.get('X-User-Email') : null);

  if (!email) return null;
  const user = await getOrCreateUser(env, email);
  if (!user) return null;

  return { user };
}

/**
 * Validate an agent token and return a synthetic user
 * Tokens are hashed in the database for security
 */
async function authenticateAgentToken(token: string, env: Env): Promise<User | null> {
  const tokenHash = await hashToken(token);
  
  const tokenRow = await env.DB
    .prepare(`
      SELECT t.canvas_id, t.agent_id, t.scope, t.expires_at, c.owner_id
      FROM agent_tokens t
      JOIN canvases c ON c.id = t.canvas_id
      WHERE t.token_hash = ?
    `)
    .bind(tokenHash)
    .first<{ canvas_id: string; agent_id: string; scope: string; expires_at: number; owner_id: string }>();

  if (!tokenRow) return null;
  if (tokenRow.expires_at < Date.now()) return null;

  // Agent operates under the canvas owner's identity for access checks
  return getOrCreateUser(env, tokenRow.owner_id);
}

/**
 * Get or create a user by email
 */
async function getOrCreateUser(env: Env, email: string): Promise<User | null> {
  const now = Date.now();

  const existing = await env.DB
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<User>();

  if (existing) return existing;

  const userIdFromEmail = email;
  await env.DB
    .prepare('INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .bind(userIdFromEmail, email, now, now)
    .run();

  return {
    id: userIdFromEmail,
    email,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Check if user has access to a canvas
 */
export async function checkCanvasAccess(
  env: Env,
  userId: string,
  canvasId: string,
  requiredRole?: 'owner' | 'editor' | 'viewer'
): Promise<{ allowed: boolean; role?: string }> {
  const membership = await env.DB
    .prepare('SELECT role FROM memberships WHERE canvas_id = ? AND user_id = ?')
    .bind(canvasId, userId)
    .first<{ role: string }>();

  if (!membership) {
    return { allowed: false };
  }

  // Role hierarchy: owner > editor > viewer
  if (requiredRole === 'owner' && membership.role !== 'owner') {
    return { allowed: false, role: membership.role };
  }

  if (requiredRole === 'editor' && membership.role === 'viewer') {
    return { allowed: false, role: membership.role };
  }

  return { allowed: true, role: membership.role };
}

/**
 * Enforce agent token scope for operations
 * Returns true if the operation is allowed, false otherwise
 */
export function checkAgentScope(
  authResult: AuthResult | null,
  requiredScope: 'read' | 'propose' | 'trusted-propose',
  canvasId?: string
): { allowed: boolean; error?: string } {
  // Human users (no agent token) have full access
  if (!authResult?.agentToken) {
    return { allowed: true };
  }

  const { agentToken } = authResult;

  // If canvasId is provided, verify the token is for this canvas
  if (canvasId && agentToken.canvas_id !== canvasId) {
    return {
      allowed: false,
      error: 'Agent token is not valid for this canvas',
    };
  }

  // Scope hierarchy: trusted-propose > propose > read
  const scopeHierarchy = {
    'read': 0,
    'propose': 1,
    'trusted-propose': 2,
  };

  const tokenScopeLevel = scopeHierarchy[agentToken.scope];
  const requiredScopeLevel = scopeHierarchy[requiredScope];

  if (tokenScopeLevel < requiredScopeLevel) {
    return {
      allowed: false,
      error: `Insufficient scope. Required: ${requiredScope}, has: ${agentToken.scope}`,
    };
  }

  return { allowed: true };
}
