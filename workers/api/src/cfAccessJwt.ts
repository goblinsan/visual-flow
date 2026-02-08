/**
 * Cloudflare Access JWT Verification
 *
 * Validates the CF_Authorization cookie (JWT) to extract the authenticated
 * user's email. This is cryptographically signed by Cloudflare and cannot
 * be forged, unlike the CF-Access-Authenticated-User-Email header which
 * is only set on paths covered by a CF Access Application.
 *
 * See: https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 */

interface JWK {
  kty: string;
  n: string;
  e: string;
  kid: string;
  alg: string;
  use?: string;
}

interface CertsResponse {
  keys: JWK[];
  public_cert: { kid: string; cert: string }[];
  public_certs: { kid: string; cert: string }[];
}

interface JWTHeader {
  alg: string;
  kid: string;
  typ?: string;
}

interface JWTPayload {
  aud: string[];
  email: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  type: string;
  identity_nonce?: string;
  custom?: Record<string, unknown>;
}

// Module-level cache for public keys (persists within a Worker isolate)
let cachedKeys: JWK[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch Cloudflare Access public signing keys
 */
async function getPublicKeys(teamDomain: string): Promise<JWK[]> {
  const now = Date.now();
  if (cachedKeys && now < cacheExpiry) {
    return cachedKeys;
  }

  const certsUrl = `https://${teamDomain}/cdn-cgi/access/certs`;
  const response = await fetch(certsUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch CF Access certs: ${response.status}`);
  }

  const data = (await response.json()) as CertsResponse;
  cachedKeys = data.keys;
  cacheExpiry = now + CACHE_TTL_MS;
  return data.keys;
}

/**
 * Decode a base64url-encoded string to Uint8Array
 */
function base64UrlDecode(str: string): Uint8Array {
  // Convert base64url → base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Parse a cookie header string and return the value for a given name
 */
function getCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

/**
 * Verify a CF Access JWT and return the payload if valid.
 *
 * @param token The raw JWT string (from CF_Authorization cookie)
 * @param teamDomain The Cloudflare Access team domain (e.g., "myteam.cloudflareaccess.com")
 * @param aud The expected audience tag (Application Audience from Access settings)
 * @returns The decoded payload if valid, or null
 */
export async function verifyCfAccessJwt(
  token: string,
  teamDomain: string,
  aud: string,
): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode header and payload
    const header: JWTHeader = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(parts[0])),
    );
    const payload: JWTPayload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(parts[1])),
    );

    // Check algorithm
    if (header.alg !== 'RS256') return null;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    // Check audience
    if (!payload.aud || !payload.aud.includes(aud)) return null;

    // Fetch signing keys and find the one matching the JWT's key ID
    const keys = await getPublicKeys(teamDomain);
    const key = keys.find((k) => k.kid === header.kid);
    if (!key) return null;

    // Import the RSA public key
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      { kty: key.kty, n: key.n, e: key.e },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    // Verify the signature
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = base64UrlDecode(parts[2]);
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signature,
      data,
    );

    if (!valid) return null;

    return payload;
  } catch {
    // Any parsing / crypto error → treat as invalid
    return null;
  }
}

/**
 * Extract the CF Access JWT from a request's cookies and verify it.
 *
 * @returns The verified email, or null if not authenticated
 */
export async function getAuthenticatedEmailFromJwt(
  request: Request,
  teamDomain: string,
  aud: string,
): Promise<string | null> {
  const cookieHeader = request.headers.get('Cookie');
  const token = getCookie(cookieHeader, 'CF_Authorization');
  if (!token) return null;

  const payload = await verifyCfAccessJwt(token, teamDomain, aud);
  if (!payload?.email) return null;

  return payload.email;
}
