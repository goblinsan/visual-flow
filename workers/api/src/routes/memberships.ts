/**
 * Membership (sharing) routes
 */

import type { Env, User, Membership } from '../types';
import { generateId, jsonResponse, errorResponse } from '../utils';
import { checkCanvasAccess } from '../auth';

/**
 * GET /api/canvases/:id/members
 * List members of a canvas
 */
export async function listMembers(user: User, env: Env, canvasId: string): Promise<Response> {
  try {
    // Check access to canvas
    const access = await checkCanvasAccess(env, user.id, canvasId);
    if (!access.allowed) {
      return errorResponse('Canvas not found or access denied', 404);
    }

    const result = await env.DB
      .prepare(`
        SELECT m.*, u.email, u.display_name
        FROM memberships m
        INNER JOIN users u ON m.user_id = u.id
        WHERE m.canvas_id = ?
        ORDER BY m.created_at ASC
      `)
      .bind(canvasId)
      .all();

    return jsonResponse(result.results || []);
  } catch (error) {
    console.error('Error listing members:', error);
    return errorResponse('Failed to list members', 500);
  }
}

/**
 * POST /api/canvases/:id/members
 * Add a member to a canvas (invite)
 */
export async function addMember(
  user: User,
  env: Env,
  canvasId: string,
  request: Request
): Promise<Response> {
  try {
    // Check owner or editor access
    const access = await checkCanvasAccess(env, user.id, canvasId, 'editor');
    if (!access.allowed) {
      return errorResponse('Access denied - editor or owner role required', 403);
    }

    const body = await request.json() as { email: string; role: 'editor' | 'viewer' };
    
    if (!body.email || !body.role) {
      return errorResponse('Missing required fields: email, role');
    }

    if (!['editor', 'viewer'].includes(body.role)) {
      return errorResponse('Invalid role - must be editor or viewer');
    }

    // Get or create the invited user
    const now = Date.now();
    let invitedUser = await env.DB
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(body.email)
      .first<User>();

    if (!invitedUser) {
      // Create placeholder user (will be filled in when they first access)
      // Phase 1: Use email as ID for simplicity (will migrate to UUIDs in Phase 2)
      const userIdFromEmail = body.email;
      await env.DB
        .prepare('INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)')
        .bind(userIdFromEmail, body.email, now, now)
        .run();
      
      invitedUser = { id: userIdFromEmail, email: body.email, created_at: now, updated_at: now };
    }

    // Check if membership already exists
    const existing = await env.DB
      .prepare('SELECT * FROM memberships WHERE canvas_id = ? AND user_id = ?')
      .bind(canvasId, invitedUser.id)
      .first();

    if (existing) {
      return errorResponse('User is already a member of this canvas', 409);
    }

    // Create membership
    const membershipId = generateId();
    await env.DB
      .prepare(`
        INSERT INTO memberships (id, canvas_id, user_id, role, invited_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(membershipId, canvasId, invitedUser.id, body.role, user.id, now)
      .run();

    const membership: Membership = {
      id: membershipId,
      canvas_id: canvasId,
      user_id: invitedUser.id,
      role: body.role,
      invited_by: user.id,
      created_at: now,
    };

    return jsonResponse(membership, 201);
  } catch (error) {
    console.error('Error adding member:', error);
    return errorResponse('Failed to add member', 500);
  }
}

/**
 * DELETE /api/canvases/:id/members/:userId
 * Remove a member from a canvas
 */
export async function removeMember(
  user: User,
  env: Env,
  canvasId: string,
  targetUserId: string
): Promise<Response> {
  try {
    // Check owner access (only owners can remove members)
    const access = await checkCanvasAccess(env, user.id, canvasId, 'owner');
    if (!access.allowed) {
      return errorResponse('Access denied - owner role required', 403);
    }

    // Can't remove the owner
    const targetMembership = await env.DB
      .prepare('SELECT role FROM memberships WHERE canvas_id = ? AND user_id = ?')
      .bind(canvasId, targetUserId)
      .first<{ role: string }>();

    if (!targetMembership) {
      return errorResponse('Member not found', 404);
    }

    if (targetMembership.role === 'owner') {
      return errorResponse('Cannot remove canvas owner', 403);
    }

    await env.DB
      .prepare('DELETE FROM memberships WHERE canvas_id = ? AND user_id = ?')
      .bind(canvasId, targetUserId)
      .run();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return errorResponse('Failed to remove member', 500);
  }
}
