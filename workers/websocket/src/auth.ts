/**
 * WebSocket Authentication Module
 * Validates users via Cloudflare Access headers or agent tokens (hashed, checked against D1)
 */

interface WsEnv {
  DB: D1Database;
  ENVIRONMENT?: string;
}

/**
 * Hash a token using SHA-256 (mirrors workers/api/src/tokenHash.ts)
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Authenticate WebSocket upgrade request
 * Returns user ID if authenticated, null otherwise
 */
export async function authenticateWebSocket(request: Request, env: WsEnv): Promise<string | null> {
  // Method 1: Cloudflare Access (human users)
  const cfEmail = request.headers.get('CF-Access-Authenticated-User-Email');
  if (cfEmail) {
    return cfEmail;
  }

  // Method 2: Agent token (for programmatic access)
  // Validate against D1 database using hashed token lookup
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (token && token.startsWith('vz_agent_')) {
    const tokenHash = await hashToken(token);
    const row = await env.DB
      .prepare('SELECT canvas_id, expires_at FROM agent_tokens WHERE token_hash = ?')
      .bind(tokenHash)
      .first<{ canvas_id: string; expires_at: number }>();

    if (!row) return null;
    if (row.expires_at < Date.now()) return null;

    // Return a prefixed identifier so we can distinguish agent connections
    return `agent:${token}`;
  }

  // Method 3: Development fallback (X-User-Email header)
  // ONLY in non-production environments
  if (env.ENVIRONMENT !== 'production') {
    const devEmail = request.headers.get('X-User-Email');
    if (devEmail) {
      return devEmail;
    }
  }

  return null;
}

/**
 * Check if user has access to a specific canvas via D1 membership table
 */
export async function checkCanvasAccess(env: WsEnv, userId: string, canvasId: string): Promise<boolean> {
  // Agent tokens: verify the token was issued for this specific canvas
  if (userId.startsWith('agent:')) {
    const token = userId.slice('agent:'.length);
    const tokenHash = await hashToken(token);
    const row = await env.DB
      .prepare('SELECT canvas_id FROM agent_tokens WHERE token_hash = ? AND canvas_id = ?')
      .bind(tokenHash, canvasId)
      .first<{ canvas_id: string }>();
    return !!row;
  }

  // Human users: check membership table
  const membership = await env.DB
    .prepare('SELECT role FROM memberships WHERE canvas_id = ? AND user_id = ?')
    .bind(canvasId, userId)
    .first<{ role: string }>();

  return !!membership;
}
