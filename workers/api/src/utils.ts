/**
 * Utility functions for API responses
 */

export function jsonResponse(data: any, status = 200, env?: { ALLOWED_ORIGINS?: string }): Response {
  // In production, restrict CORS to specific origins
  const allowedOrigin = env?.ALLOWED_ORIGINS || '*';
  
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export function generateId(): string {
  return crypto.randomUUID();
}
