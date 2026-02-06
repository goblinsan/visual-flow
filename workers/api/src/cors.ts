/**
 * CORS configuration for production security
 * Restricts origins to vizail.com and *.visual-flow.pages.dev
 */

import type { Env } from './types';

/**
 * Production allowed origins
 */
const PRODUCTION_ORIGINS = [
  'https://vizail.com',
  'https://www.vizail.com',
];

/**
 * Check if an origin matches the *.visual-flow.pages.dev pattern
 */
function isVisualFlowPagesDev(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname.endsWith('.visual-flow.pages.dev') && url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if origin is allowed based on environment
 */
export function isOriginAllowed(origin: string | null, env: Env): boolean {
  if (!origin) return false;
  
  // Development mode - allow localhost
  if (env.ENVIRONMENT !== 'production') {
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return true;
    }
  }
  
  // Check production origins
  if (PRODUCTION_ORIGINS.includes(origin)) {
    return true;
  }
  
  // Check *.visual-flow.pages.dev
  if (isVisualFlowPagesDev(origin)) {
    return true;
  }
  
  return false;
}

/**
 * Get CORS headers based on request origin and environment
 * Returns headers with proper origin or rejects with error
 */
export function getCorsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowedOrigin = isOriginAllowed(origin, env) ? origin! : '';
  
  // If origin is not allowed, return minimal headers (don't set Access-Control-Allow-Origin)
  if (!allowedOrigin) {
    return {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}
