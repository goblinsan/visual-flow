/**
 * Utility functions for API responses
 */

import { getCorsHeaders } from './cors';
import type { Env } from './types';

export function jsonResponse(data: unknown, status = 200, env?: Env, origin: string | null = null): Response {
  const corsHeaders = env ? getCorsHeaders(origin, env) : {
    // When env is not available, do NOT fall back to wildcard '*'.
    // Omit CORS headers entirely — the main fetch handler already sets
    // corsHeaders on the top-level response for routes that need it.
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

export function errorResponse(message: string, status = 400, env?: Env, origin: string | null = null): Response {
  return jsonResponse({ error: message }, status, env, origin);
}

export function generateId(): string {
  return crypto.randomUUID();
}
