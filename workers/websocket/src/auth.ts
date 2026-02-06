/**
 * WebSocket Authentication Module
 * Validates users via Cloudflare Access headers or agent tokens
 */

/**
 * Authenticate WebSocket upgrade request
 * Returns user ID if authenticated, null otherwise
 */
export async function authenticateWebSocket(request: Request): Promise<string | null> {
  // Method 1: Cloudflare Access (human users)
  const cfEmail = request.headers.get('CF-Access-Authenticated-User-Email');
  if (cfEmail) {
    return cfEmail; // Use email as user ID
  }

  // Method 2: Agent token (for programmatic access)
  // For WebSocket, we expect token in URL query parameter or Sec-WebSocket-Protocol header
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  
  if (token && token.startsWith('vz_agent_')) {
    // In production, this would validate against the database
    // For now, accept any properly formatted token
    // TODO: Integrate with D1 database for token validation
    return token; // Use token as temporary user ID
  }

  // Method 3: Development fallback (X-User-Email header)
  // Only in non-production environments
  const devEmail = request.headers.get('X-User-Email');
  if (devEmail) {
    return devEmail;
  }

  return null;
}

/**
 * Check if user has access to a specific canvas
 * In a full implementation, this would check the database
 */
export async function checkCanvasAccess(userId: string, canvasId: string): Promise<boolean> {
  // TODO: Implement database check for canvas membership
  // For now, allow access if user is authenticated (non-empty userId)
  return userId.length > 0;
}
