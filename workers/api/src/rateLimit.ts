/**
 * Rate limiting middleware for API protection
 * Implements token bucket algorithm per user/IP
 */

import type { Env } from './types';

interface RateLimitConfig {
  /** Maximum requests allowed in the time window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

// Default rate limits
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  // Standard user endpoints
  default: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  
  // More generous for read operations
  read: { maxRequests: 200, windowMs: 60 * 1000 }, // 200 requests per minute
  
  // Stricter for write operations
  write: { maxRequests: 50, windowMs: 60 * 1000 }, // 50 requests per minute
  
  // Very strict for sensitive operations (token generation, invites)
  sensitive: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 requests per minute
};

/**
 * Check if request should be rate limited
 * Uses in-memory storage (note: resets on worker restart, but acceptable for basic protection)
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  userId: string,
  limitType: keyof typeof DEFAULT_LIMITS = 'default'
): { allowed: boolean; error?: string } {
  const config = DEFAULT_LIMITS[limitType];
  const now = Date.now();
  const key = `${userId}:${limitType}`;
  
  const existing = rateLimitStore.get(key);
  
  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }
  
  if (!existing || existing.resetAt < now) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return { allowed: true };
  }
  
  if (existing.count >= config.maxRequests) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return {
      allowed: false,
      error: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
    };
  }
  
  existing.count++;
  return { allowed: true };
}

/**
 * Determine rate limit type based on request method and path
 */
export function getRateLimitType(method: string, path: string): keyof typeof DEFAULT_LIMITS {
  // Sensitive operations
  if (path.includes('/agent-token') || path.includes('/members')) {
    return 'sensitive';
  }
  
  // Write operations
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    return 'write';
  }
  
  // Read operations
  if (method === 'GET') {
    return 'read';
  }
  
  return 'default';
}
