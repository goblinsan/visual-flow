# Security Hardening Documentation

This document describes the security features implemented in the Vizail API as part of the P0 Security Hardening epic.

## Overview

The Vizail API has been hardened with multiple security layers to ensure safe production use:

1. **Authentication** - Cryptographically verified identities via Cloudflare Access
2. **CORS Lockdown** - Restricted origins (vizail.com, *.visual-flow.pages.dev)
3. **Token Hashing** - Agent tokens hashed at rest using SHA-256
4. **Rate Limiting** - Tiered rate limits on all endpoints
5. **Request Validation** - Zod schemas validate all request bodies
6. **Quota Enforcement** - Free plan limits on resources
7. **Agent Scope Enforcement** - Token permissions verified on all operations
8. **WebSocket Authentication** - Real-time connections require authentication

## Authentication

### Production Environment

In production, authentication is handled exclusively through **Cloudflare Access**:

- Requests must include the `CF-Access-Authenticated-User-Email` header
- This header is set by Cloudflare Access after successful OAuth authentication
- No requests are accepted without this header in production

### Development Environment

For local development and testing:

- The `X-User-Email` header is accepted as a fallback
- This allows direct API testing without Cloudflare Access
- **Never use this in production** - it's disabled when `ENVIRONMENT=production`

### Agent Tokens

Programmatic access via AI agents uses bearer tokens:

```
Authorization: Bearer vz_agent_{uuid}_{uuid}
```

**Security features:**
- Tokens are hashed using SHA-256 before storage (never stored in plaintext)
- Each token has a defined scope: `read`, `propose`, or `trusted-propose`
- Tokens expire after 365 days (suitable for long-running automation)
- Tokens can be manually revoked at any time
- Scope is enforced on every operation

## CORS (Cross-Origin Resource Sharing)

### Allowed Origins

**Production:**
- `https://vizail.com`
- `https://www.vizail.com`
- `https://*.visual-flow.pages.dev` (Cloudflare Pages preview deployments)

**Development:**
- `http://localhost:*` (any port)
- `http://127.0.0.1:*` (any port)

### Implementation

```typescript
// Production - only allowed origins receive CORS headers
if (!isOriginAllowed(origin, env)) {
  // No Access-Control-Allow-Origin header = CORS rejection
}
```

Rejected origins receive a response **without** the `Access-Control-Allow-Origin` header, causing browsers to block the request.

## Rate Limiting

Rate limits protect against abuse and ensure fair resource distribution.

### Rate Limit Tiers

| Tier | Requests/Minute | Applied To |
|------|-----------------|------------|
| **Read** | 200 | GET requests |
| **Write** | 50 | POST, PUT, DELETE |
| **Sensitive** | 10 | Token generation, member invites |

### Implementation

- Token bucket algorithm per user ID
- In-memory storage (resets on worker restart)
- Returns `429 Too Many Requests` with `Retry-After` header when exceeded

Example response:
```json
{
  "error": "Rate limit exceeded. Try again in 45 seconds."
}
```

## Request Body Validation

All request bodies are validated using **Zod** schemas before processing.

### Example Schemas

```typescript
// Canvas creation
const createCanvasSchema = z.object({
  name: z.string().min(1).max(255),
  spec: z.record(z.unknown()),
});

// Agent token generation
const generateAgentTokenSchema = z.object({
  agentId: z.string().min(1).max(255),
  scope: z.enum(['read', 'propose', 'trusted-propose']),
});
```

### Validation Errors

Invalid requests return `400 Bad Request` with detailed error messages:

```json
{
  "error": "Validation failed: agentId: Required, scope: Invalid enum value"
}
```

## Quota Enforcement (Free Plan)

Free plan users are subject to resource quotas to ensure fair usage.

### Quota Limits

| Resource | Free Plan Limit |
|----------|----------------|
| Canvases per user | 10 |
| Members per canvas | 5 |
| Agent tokens per canvas | 3 |
| Active branches per canvas | 10 |
| Proposals per canvas | 50 |

### Quota Errors

When a quota is exceeded, the API returns `403 Forbidden`:

```json
{
  "error": "Canvas quota exceeded. Free plan limit: 10 canvases",
  "current": 10,
  "limit": 10
}
```

## Agent Token Scopes

Agent tokens have hierarchical scopes that control their permissions.

### Scope Hierarchy

1. **read** - Read-only access to canvas data
2. **propose** - Can create proposals (requires human approval)
3. **trusted-propose** - Can auto-approve certain proposals

### Scope Enforcement

```typescript
// Example: Creating a proposal requires 'propose' or higher
const scopeCheck = checkAgentScope(authResult, 'propose', canvasId);
if (!scopeCheck.allowed) {
  return errorResponse(scopeCheck.error, 403);
}
```

### Scope Validation

- Verified on **every** request that modifies data
- Canvas ID is validated to ensure token is for the correct canvas
- Human users (authenticated via Cloudflare Access) have unlimited scope

## WebSocket Authentication

Real-time collaboration via WebSockets requires authentication.

### Authentication Methods

1. **Cloudflare Access** - `CF-Access-Authenticated-User-Email` header
2. **Agent Tokens** - Query parameter: `?token=vz_agent_...`
3. **Development** - `X-User-Email` header (dev only)

### Connection Flow

```
1. Client initiates WebSocket upgrade
2. Worker authenticates request
3. If valid: Accept connection
4. If invalid: Return 401 Unauthorized
```

### Canvas Access Check

After authentication, the worker verifies the user has access to the requested canvas:

```
GET wss://vizail-websocket.workers.dev/{canvasId}
```

If the user is not a member of the canvas, the connection is rejected with `403 Forbidden`.

## Token Hashing

Agent tokens are **never stored in plaintext** in the database.

### Hashing Algorithm

- **SHA-256** via Web Crypto API
- Hex-encoded output (64 characters)
- One-way hash (cannot be reversed)

### Database Schema

```sql
CREATE TABLE agent_tokens (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,  -- SHA-256 hash
  scope TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_agent_tokens_hash ON agent_tokens(token_hash);
```

### Token Lifecycle

1. **Generation**: Secure random token created
2. **Hashing**: Token hashed with SHA-256
3. **Storage**: Only hash is stored in database
4. **Return**: Plaintext token returned **once** to user
5. **Authentication**: User sends token, API hashes and compares

**Important**: The plaintext token is shown only once during generation. It cannot be recovered later.

## Migration from Insecure State

### Database Migration

The migration `0003_hash-agent-tokens.sql` adds the `token_hash` column:

```sql
-- Add token_hash column
ALTER TABLE agent_tokens ADD COLUMN token_hash TEXT;

-- Create index for fast lookups
CREATE INDEX idx_agent_tokens_hash ON agent_tokens(token_hash);
```

### Gradual Rollout Strategy

1. Deploy code with both `token` and `token_hash` column support
2. Hash all existing tokens and populate `token_hash`
3. Verify all tokens work with hashed lookup
4. Remove plaintext `token` column in follow-up migration

## Security Best Practices

### For API Operators

1. **Always deploy with `ENVIRONMENT=production`** in production
2. **Use Cloudflare Access** for all human user authentication
3. **Rotate compromised tokens immediately** using the revoke endpoint
4. **Monitor rate limit violations** for abuse patterns
5. **Review quota usage** to detect unusual activity

### For API Consumers

1. **Store agent tokens securely** (use environment variables, never commit to git)
2. **Use the minimum required scope** for each token
3. **Rotate tokens periodically** (they expire after 365 days)
4. **Don't share tokens** between agents or environments
5. **Revoke unused tokens** to reduce attack surface

## API Endpoints for Security Management

### Generate Agent Token

```http
POST /api/canvases/{id}/agent-token
Content-Type: application/json
Authorization: {CF-Access or existing token}

{
  "agentId": "my-automation-agent",
  "scope": "propose"
}
```

Response (plaintext token shown only once):
```json
{
  "id": "token-uuid",
  "canvas_id": "canvas-uuid",
  "agent_id": "my-automation-agent",
  "token": "vz_agent_{uuid}_{uuid}",
  "scope": "propose",
  "expires_at": 1735689600000,
  "created_at": 1704153600000
}
```

### Revoke Agent Token

```http
DELETE /api/canvases/{canvasId}/agent-token/{agentId}
Authorization: {CF-Access or owner token}
```

Response:
```json
{
  "success": true
}
```

## Future Enhancements

The following security features are planned for future releases:

1. **OAuth Support** - Direct OAuth with Google, Apple, GitHub (tracked separately)
2. **Token Refresh** - Short-lived tokens with refresh mechanism
3. **Audit Logging** - Track all security-sensitive operations
4. **IP Allowlisting** - Restrict API access by IP range
5. **Two-Factor Authentication** - Additional security for token generation
6. **Advanced Rate Limiting** - Per-endpoint and per-operation limits
7. **Paid Plans** - Higher quotas and premium features

## Testing Security Features

### Rate Limiting Test

```bash
# Trigger rate limit (sensitive tier = 10 req/min)
for i in {1..15}; do
  curl -X POST https://api.vizail.com/api/canvases/{id}/agent-token \
    -H "Authorization: Bearer {token}" \
    -d '{"agentId":"test","scope":"read"}'
done
```

Expected: First 10 succeed, next 5 return `429 Too Many Requests`

### CORS Test

```bash
# From disallowed origin
curl -H "Origin: https://evil.com" \
  https://api.vizail.com/api/canvases

# Expected: No Access-Control-Allow-Origin header in response
```

### Quota Test

```bash
# Create 11 canvases (quota = 10)
for i in {1..11}; do
  curl -X POST https://api.vizail.com/api/canvases \
    -H "Authorization: Bearer {token}" \
    -d '{"name":"Canvas '$i'","spec":{}}'
done
```

Expected: First 10 succeed, 11th returns `403 Canvas quota exceeded`

## Security Contact

For security issues or vulnerability reports, please contact: security@vizail.com

**Do not file public GitHub issues for security vulnerabilities.**
