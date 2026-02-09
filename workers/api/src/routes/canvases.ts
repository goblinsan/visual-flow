/**
 * Canvas CRUD routes
 */

import type { Env, User, Canvas } from '../types';
import type { LayoutSpec } from '../../src/layout-schema';
import { generateId, jsonResponse, errorResponse } from '../utils';
import { checkCanvasAccess, checkAgentScope, type AuthResult } from '../auth';
import { checkCanvasQuota } from '../quota';
import { validateRequestBody, createCanvasSchema, updateCanvasSchema } from '../validation';

function isLayoutSpec(value: unknown): value is LayoutSpec {
  return (
    typeof value === 'object' &&
    value !== null &&
    'root' in value &&
    typeof (value as { root?: unknown }).root === 'object' &&
    (value as { root?: unknown }).root !== null
  );
}

function normalizeSpec(value: string | LayoutSpec): LayoutSpec {
  return typeof value === 'string' ? (JSON.parse(value) as LayoutSpec) : value;
}

/**
 * GET /api/canvases
 * List all canvases where user is a member
 */
export async function listCanvases(
  user: User,
  env: Env,
  authResult?: AuthResult
): Promise<Response> {
  const scope = checkAgentScope(authResult ?? null, 'read');
  if (!scope.allowed) {
    return errorResponse(scope.error || 'Insufficient scope', 403);
  }

  try {
    const result = await env.DB
      .prepare(`
        SELECT c.* FROM canvases c
        INNER JOIN memberships m ON c.id = m.canvas_id
        WHERE m.user_id = ?
        ORDER BY c.updated_at DESC
      `)
      .bind(user.id)
      .all<Canvas>();

    // Parse spec JSON for each canvas
    const canvases = result.results?.map(c => ({
      ...c,
      spec: normalizeSpec(c.spec as string | LayoutSpec),
    })) || [];

    return jsonResponse(canvases);
  } catch (error) {
    console.error('Error listing canvases:', error);
    return errorResponse('Failed to list canvases', 500);
  }
}

/**
 * POST /api/canvases
 * Create a new canvas
 */
export async function createCanvas(
  user: User,
  env: Env,
  request: Request,
  authResult?: AuthResult
): Promise<Response> {
  const scope = checkAgentScope(authResult ?? null, 'trusted-propose');
  if (!scope.allowed) {
    return errorResponse(scope.error || 'Insufficient scope', 403);
  }

  // Check quota before creating
  const quota = await checkCanvasQuota(env, user.id);
  if (!quota.allowed) {
    return errorResponse(quota.error || 'Canvas quota exceeded', 403);
  }

  const validation = await validateRequestBody(request, createCanvasSchema);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  const { name, spec } = validation.data;
  if (!isLayoutSpec(spec)) {
    return errorResponse('Invalid spec: missing root node', 400);
  }

  try {
    const now = Date.now();
    const canvasId = generateId();
    const membershipId = generateId();

    // Start transaction
    const batch = [
      // Create canvas
      env.DB.prepare(`
        INSERT INTO canvases (id, owner_id, name, spec, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(canvasId, user.id, name, JSON.stringify(spec), now, now),
      
      // Create owner membership
      env.DB.prepare(`
        INSERT INTO memberships (id, canvas_id, user_id, role, created_at)
        VALUES (?, ?, ?, 'owner', ?)
      `).bind(membershipId, canvasId, user.id, now),
    ];

    await env.DB.batch(batch);

    const canvas: Canvas = {
      id: canvasId,
      owner_id: user.id,
      name,
      spec,
      created_at: now,
      updated_at: now,
    };

    return jsonResponse(canvas, 201);
  } catch (error) {
    console.error('Error creating canvas:', error);
    return errorResponse('Failed to create canvas', 500);
  }
}

/**
 * GET /api/canvases/:id
 * Get a specific canvas
 */
export async function getCanvas(
  user: User,
  env: Env,
  canvasId: string,
  authResult?: AuthResult
): Promise<Response> {
  const scope = checkAgentScope(authResult ?? null, 'read', canvasId);
  if (!scope.allowed) {
    return errorResponse(scope.error || 'Insufficient scope', 403);
  }

  try {
    // Check access
    const access = await checkCanvasAccess(env, user.id, canvasId);
    if (!access.allowed) {
      return errorResponse('Canvas not found or access denied', 404);
    }

    const canvas = await env.DB
      .prepare('SELECT * FROM canvases WHERE id = ?')
      .bind(canvasId)
      .first<Canvas>();

    if (!canvas) {
      return errorResponse('Canvas not found', 404);
    }

    return jsonResponse({
      ...canvas,
      spec: normalizeSpec(canvas.spec as string | LayoutSpec),
      user_role: access.role,
    });
  } catch (error) {
    console.error('Error getting canvas:', error);
    return errorResponse('Failed to get canvas', 500);
  }
}

/**
 * PUT /api/canvases/:id
 * Update a canvas
 */
export async function updateCanvas(
  user: User,
  env: Env,
  canvasId: string,
  request: Request,
  authResult?: AuthResult
): Promise<Response> {
  const scope = checkAgentScope(authResult ?? null, 'trusted-propose', canvasId);
  if (!scope.allowed) {
    return errorResponse(scope.error || 'Insufficient scope', 403);
  }

  try {
    // Check editor or owner access
    const access = await checkCanvasAccess(env, user.id, canvasId, 'editor');
    if (!access.allowed) {
      return errorResponse('Access denied - editor or owner role required', 403);
    }

    const validation = await validateRequestBody(request, updateCanvasSchema);
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }

    const { name, spec } = validation.data;
    if (spec !== undefined && !isLayoutSpec(spec)) {
      return errorResponse('Invalid spec: missing root node', 400);
    }

    const updates: string[] = [];
    const values: Array<string | number> = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (spec !== undefined) {
      updates.push('spec = ?');
      values.push(JSON.stringify(spec));
    }

    updates.push('updated_at = ?');
    values.push(Date.now());

    values.push(canvasId);

    await env.DB
      .prepare(`UPDATE canvases SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    // Fetch updated canvas
    const canvas = await env.DB
      .prepare('SELECT * FROM canvases WHERE id = ?')
      .bind(canvasId)
      .first<Canvas>();

    if (!canvas) {
      return errorResponse('Canvas not found', 404);
    }

    return jsonResponse({
      ...canvas,
      spec: normalizeSpec(canvas.spec as string | LayoutSpec),
    });
  } catch (error) {
    console.error('Error updating canvas:', error);
    return errorResponse('Failed to update canvas', 500);
  }
}

/**
 * DELETE /api/canvases/:id
 * Delete a canvas
 */
export async function deleteCanvas(
  user: User,
  env: Env,
  canvasId: string,
  authResult?: AuthResult
): Promise<Response> {
  const scope = checkAgentScope(authResult ?? null, 'trusted-propose', canvasId);
  if (!scope.allowed) {
    return errorResponse(scope.error || 'Insufficient scope', 403);
  }

  try {
    // Check owner access
    const access = await checkCanvasAccess(env, user.id, canvasId, 'owner');
    if (!access.allowed) {
      return errorResponse('Access denied - owner role required', 403);
    }

    await env.DB
      .prepare('DELETE FROM canvases WHERE id = ?')
      .bind(canvasId)
      .run();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error deleting canvas:', error);
    return errorResponse('Failed to delete canvas', 500);
  }
}
