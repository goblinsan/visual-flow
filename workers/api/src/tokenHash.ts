/**
 * Token hashing utilities for secure storage
 * Uses SHA-256 to hash agent tokens before storing in database
 */

/**
 * Hash a token using SHA-256
 * @param token - The plaintext token to hash
 * @returns Hex-encoded hash
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Generate a secure random token
 * Format: vz_agent_{uuid1}_{uuid2}
 */
export function generateSecureToken(): string {
  return `vz_agent_${crypto.randomUUID()}_${crypto.randomUUID()}`;
}

/**
 * Verify a token against its hash
 */
export async function verifyToken(token: string, hash: string): Promise<boolean> {
  const tokenHash = await hashToken(token);
  return tokenHash === hash;
}
