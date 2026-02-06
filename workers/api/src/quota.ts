/**
 * Quota enforcement for free-plan users
 * Limits: canvases, members, agent tokens, etc.
 */

import type { Env, User } from './types';

/**
 * Free plan quotas
 */
export const FREE_PLAN_QUOTAS = {
  maxCanvases: 10,
  maxMembersPerCanvas: 5,
  maxAgentTokensPerCanvas: 3,
  maxBranchesPerCanvas: 10,
  maxProposalsPerCanvas: 50,
};

/**
 * Check if user has reached their canvas quota
 */
export async function checkCanvasQuota(
  env: Env,
  userId: string
): Promise<{ allowed: boolean; error?: string; current?: number; limit?: number }> {
  const result = await env.DB
    .prepare(`
      SELECT COUNT(*) as count FROM memberships
      WHERE user_id = ? AND role = 'owner'
    `)
    .bind(userId)
    .first<{ count: number }>();

  const current = result?.count || 0;

  if (current >= FREE_PLAN_QUOTAS.maxCanvases) {
    return {
      allowed: false,
      error: `Canvas quota exceeded. Free plan limit: ${FREE_PLAN_QUOTAS.maxCanvases} canvases`,
      current,
      limit: FREE_PLAN_QUOTAS.maxCanvases,
    };
  }

  return { allowed: true, current, limit: FREE_PLAN_QUOTAS.maxCanvases };
}

/**
 * Check if canvas has reached member quota
 */
export async function checkMemberQuota(
  env: Env,
  canvasId: string
): Promise<{ allowed: boolean; error?: string; current?: number; limit?: number }> {
  const result = await env.DB
    .prepare(`
      SELECT COUNT(*) as count FROM memberships
      WHERE canvas_id = ?
    `)
    .bind(canvasId)
    .first<{ count: number }>();

  const current = result?.count || 0;

  if (current >= FREE_PLAN_QUOTAS.maxMembersPerCanvas) {
    return {
      allowed: false,
      error: `Member quota exceeded. Free plan limit: ${FREE_PLAN_QUOTAS.maxMembersPerCanvas} members per canvas`,
      current,
      limit: FREE_PLAN_QUOTAS.maxMembersPerCanvas,
    };
  }

  return { allowed: true, current, limit: FREE_PLAN_QUOTAS.maxMembersPerCanvas };
}

/**
 * Check if canvas has reached agent token quota
 */
export async function checkAgentTokenQuota(
  env: Env,
  canvasId: string
): Promise<{ allowed: boolean; error?: string; current?: number; limit?: number }> {
  const result = await env.DB
    .prepare(`
      SELECT COUNT(*) as count FROM agent_tokens
      WHERE canvas_id = ? AND expires_at > ?
    `)
    .bind(canvasId, Date.now())
    .first<{ count: number }>();

  const current = result?.count || 0;

  if (current >= FREE_PLAN_QUOTAS.maxAgentTokensPerCanvas) {
    return {
      allowed: false,
      error: `Agent token quota exceeded. Free plan limit: ${FREE_PLAN_QUOTAS.maxAgentTokensPerCanvas} tokens per canvas`,
      current,
      limit: FREE_PLAN_QUOTAS.maxAgentTokensPerCanvas,
    };
  }

  return { allowed: true, current, limit: FREE_PLAN_QUOTAS.maxAgentTokensPerCanvas };
}

/**
 * Check if canvas has reached branch quota
 */
export async function checkBranchQuota(
  env: Env,
  canvasId: string
): Promise<{ allowed: boolean; error?: string; current?: number; limit?: number }> {
  const result = await env.DB
    .prepare(`
      SELECT COUNT(*) as count FROM agent_branches
      WHERE canvas_id = ? AND status = 'active'
    `)
    .bind(canvasId)
    .first<{ count: number }>();

  const current = result?.count || 0;

  if (current >= FREE_PLAN_QUOTAS.maxBranchesPerCanvas) {
    return {
      allowed: false,
      error: `Branch quota exceeded. Free plan limit: ${FREE_PLAN_QUOTAS.maxBranchesPerCanvas} active branches per canvas`,
      current,
      limit: FREE_PLAN_QUOTAS.maxBranchesPerCanvas,
    };
  }

  return { allowed: true, current, limit: FREE_PLAN_QUOTAS.maxBranchesPerCanvas };
}
