/**
 * Authentication middleware for Cloudflare Access
 * Phase 1: Uses CF-Access-Authenticated-User-Email header
 */

import type { Env, User } from './types';

/**
 * Extract user from Cloudflare Access headers
 * In Phase 1, CF Access provides the authenticated user email
 */
export async function authenticateUser(request: Request, env: Env): Promise<User | null> {
  // In Phase 1, Cloudflare Access provides the email in a header
  const email = request.headers.get('CF-Access-Authenticated-User-Email');
  
  if (!email) {
    return null;
  }

  // Get or create user in database
  const now = Date.now();
  
  // Try to get existing user
  const existing = await env.DB
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<User>();

  if (existing) {
    return existing;
  }

  // Create new user
  const userId = email; // Use email as ID in Phase 1
  await env.DB
    .prepare('INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .bind(userId, email, now, now)
    .run();

  return {
    id: userId,
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
