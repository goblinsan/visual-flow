# Vizail API Worker

Cloudflare Worker providing REST API for canvas persistence and sharing.

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

Phase 1 uses Cloudflare Access for authentication. The worker extracts the user email from the `CF-Access-Authenticated-User-Email` header.

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

- **Owner**: Full control (edit, delete, manage members)
- **Editor**: Can edit canvas, can invite viewers
- **Viewer**: Read-only access

## CORS

The API includes CORS headers to allow cross-origin requests. In production, configure `Access-Control-Allow-Origin` to specific domains.
