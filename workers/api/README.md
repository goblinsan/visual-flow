# Vizail API Worker

Cloudflare Worker providing REST API for canvas persistence and sharing.

## Security

**Production-ready security features:**
- ✅ Cloudflare Access authentication (OAuth via Google, GitHub, etc.)
- ✅ CORS restricted to vizail.com and *.visual-flow.pages.dev
- ✅ Agent tokens hashed at rest (SHA-256)
- ✅ Rate limiting on all endpoints (tiered: read/write/sensitive)
- ✅ Request body validation with Zod
- ✅ Free-plan quota enforcement
- ✅ Agent scope enforcement (read/propose/trusted-propose)
- ✅ WebSocket authentication

📖 **See [SECURITY.md](../../docs/SECURITY.md) for complete security documentation**

## Features

- Canvas CRUD operations (Create, Read, Update, Delete)
- User management via Cloudflare Access
- Canvas sharing with role-based access control (owner, editor, viewer)
- Membership management (invite, remove)
- D1 database for persistent storage

## API Endpoints

### Canvas Operations

- `GET /api/canvases` - List all canvases for authenticated user
- `POST /api/canvases` - Create a new canvas
- `GET /api/canvases/:id` - Get a specific canvas
- `PUT /api/canvases/:id` - Update a canvas (requires editor or owner)
- `DELETE /api/canvases/:id` - Delete a canvas (requires owner)

### Membership Operations

- `GET /api/canvases/:id/members` - List members of a canvas
- `POST /api/canvases/:id/members` - Add a member (invite)
- `DELETE /api/canvases/:id/members/:userId` - Remove a member (owner only)

### Health Check

- `GET /health` or `GET /api/health` - Health check endpoint

## Authentication

**Production:** Uses Cloudflare Access for OAuth authentication (Google, GitHub, Apple).

**Development:** Accepts `X-User-Email` header for local testing.

**Agent Tokens:** Programmatic access via `Authorization: Bearer vz_agent_...` tokens with scoped permissions.

See [SECURITY.md](../../docs/SECURITY.md) for details on authentication, rate limiting, and quotas.

## Development

```bash
# Install dependencies
npm install

# Run locally with Wrangler
npm run dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

## Database Schema

See `schema.sql` for the complete D1 database schema.

Tables:
- `users` - User accounts
- `canvases` - Canvas documents
- `memberships` - Canvas sharing and access control

## Environment Setup

1. Create D1 database: `wrangler d1 create vizail-db`
2. Update `database_id` in `wrangler.toml`
3. Apply schema: `wrangler d1 execute vizail-db --file=schema.sql`
4. Deploy: `npm run deploy`

## Role-Based Access Control

- **Owner**: Full control (edit, delete, manage members, generate tokens)
- **Editor**: Can edit canvas, can invite viewers
- **Viewer**: Read-only access

## Agent Token Scopes

- **read**: Read-only access to canvas data
- **propose**: Can create proposals (requires human approval)
- **trusted-propose**: Can auto-approve certain proposals

## CORS

**Production:** CORS restricted to:
- `https://vizail.com`
- `https://www.vizail.com`  
- `https://*.visual-flow.pages.dev`

**Development:** Allows `localhost` and `127.0.0.1`
