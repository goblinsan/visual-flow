# Vizail Collaboration + AI Agent + Export Roadmap

> Generated: 2026-02-01
> Author: Staff Engineer / Technical PM
> Context: Post refactor-baseline-v1, extends existing ROADMAP.md milestones

---

## 1. Current State Summary

### 1.1 Architecture Overview

**Canvas/Editor Architecture:**
- **Rendering**: Konva.js via `react-konva` — `CanvasStage.tsx` (2600 LOC) handles all stage rendering, interactions, viewport transforms
- **State Model**: `LayoutSpec` tree with `FrameNode` root containing nested `LayoutNode` children (rect, text, image, ellipse, line, curve, group, stack, grid, box)
- **Event Handling**: Inline in `CanvasStage.tsx` with extracted pure helpers for drag/marquee sessions

**Node/Component Model:**
- Schema in [layout-schema.ts](../src/layout-schema.ts) — 11 node types with rich properties
- Nodes have: `id`, `type`, optional `position`, `size`, `children`, visual properties
- Flows: `Flow[]` with `FlowTransition[]` for screen-to-screen prototyping

**Selection/Move/Resize:**
- Selection state managed via `useSelection` hook (simple string[] of IDs)
- Drag: Pure helpers in [interaction/drag.ts](../src/interaction/drag.ts) — threshold-based, position delta tracking
- Resize: Konva Transformer integration, commits via inline handlers
- No soft-lock mechanism exists

**Undo/Redo:**
- Basic implementation in `CanvasApp.tsx` using `historyRef` (past/future arrays of full LayoutSpec snapshots)
- Commands pattern started in [commands/](../src/commands/) — `transformNodes`, `updateNodeProps`, `deleteNodes`, `duplicateNodes`, `groupNodes`, `ungroupNode`
- Command inversion supported but not fully integrated with history stack

**localStorage Persistence:**
- Centralized in [utils/persistence.ts](../src/utils/persistence.ts)
- Keys: `vf_rect_defaults`, `vf_recent_colors`, `vf_design_spec`, `vf_saved_designs`, `vf_current_design_name`
- Hook: [useDesignPersistence.ts](../src/hooks/useDesignPersistence.ts) — debounced autosave, load/reset/clear
- Named designs: `getSavedDesigns()`, `saveNamedDesign()`, `loadNamedDesign()` — all localStorage

**Routing/Pages:**
- None. Single-page app via `main.tsx` → `CanvasApp`
- No client-side router (react-router, etc.)

**Build/Config:**
- Vite + React 19 + TypeScript 5.8
- TailwindCSS v4 via `@tailwindcss/vite`
- Vitest for testing (jsdom environment)
- Storybook 8.6 for component dev

**Backend Hooks:**
- **None exist**. Purely client-side localStorage app.
- No API calls, no WebSocket, no authentication

### 1.2 Key Files Inspected

| Area | File(s) |
|------|---------|
| Entry | `main.tsx`, `index.html` |
| Main App | `CanvasApp.tsx` (1181 LOC) |
| Canvas | `canvas/CanvasStage.tsx` (2601 LOC) |
| Schema | `layout-schema.ts` (218 LOC) |
| Persistence | `utils/persistence.ts`, `hooks/useDesignPersistence.ts` |
| Commands | `commands/types.ts`, `commands/*.ts` |
| Interaction | `interaction/drag.ts`, `interaction/marquee.ts` |
| Selection | `hooks/useSelection.ts` |
| Types | `types/core.ts` |
| Config | `vite.config.ts`, `package.json`, `eslint.config.js` |
| Docs | `docs/ROADMAP.md` |
| Export (legacy) | `roblox/export.ts` (Roblox Lua, uses different DSL) |

---

## 2. Target Architecture

### 2.1 High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge                              │
├─────────────────────────────────────────────────────────────────────┤
│  Pages (UI)  │  Access (Auth)  │  WAF/Rate Limit  │  Workers        │
└──────┬───────┴────────┬────────┴─────────┬────────┴───────┬─────────┘
       │                │                  │                │
       ▼                ▼                  ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌───────────────┐  ┌─────────────────┐
│   React     │  │  REST API   │  │ WebSocket Hub │  │ Durable Objects │
│   SPA       │  │  (Worker)   │  │   (Worker)    │  │   (per-room)    │
└─────────────┘  └─────────────┘  └───────────────┘  └─────────────────┘
                       │                │                    │
                       ▼                ▼                    ▼
              ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐
              │     D1      │  │     KV      │  │   Yjs Doc (CRDT)    │
              │  (metadata) │  │ (rate lim)  │  │ + Awareness (DO)    │
              └─────────────┘  └─────────────┘  └─────────────────────┘
                                                          │
                                                          ▼
                                                  ┌───────────────┐
                                                  │  R2 Snapshots │
                                                  │ (blob backup) │
                                                  └───────────────┘
```

### 2.2 Real-Time Collaboration (Yjs CRDT)

**CRDT Library Choice: Yjs**
- Mature, battle-tested, well-documented
- `y-websocket` provider pattern fits Durable Objects
- Built-in awareness protocol for presence

**LayoutSpec → Yjs Mapping:**

```typescript
// Yjs document structure
const ydoc = new Y.Doc();

// Primary node map: id → node properties (without children)
const yNodes = ydoc.getMap<Y.Map<any>>('nodes');
// Example: yNodes.set('rect-1', new Y.Map([['type', 'rect'], ['fill', '#fff'], ...]));

// Children order: parentId → Y.Array<string> of child IDs
const yChildren = ydoc.getMap<Y.Array<string>>('children');
// Example: yChildren.set('root', Y.Array.from(['rect-1', 'text-1', 'group-1']));

// Root ID (always 'root' by convention, but explicit)
const yMeta = ydoc.getMap<any>('meta');
// yMeta.set('rootId', 'root');
// yMeta.set('version', 1);

// Flows (if we need realtime flow editing)
const yFlows = ydoc.getArray<Y.Map<any>>('flows');
```

**Rationale:**
- Separate `nodes` map prevents entire tree re-sync on deep changes
- `children` as Y.Array preserves z-order with list CRDT semantics
- Node properties as nested Y.Map enable fine-grained property merges

**Presence/Awareness Model:**

```typescript
interface UserAwareness {
  clientId: number;        // Yjs client ID
  userId: string;          // Auth user ID
  displayName: string;
  color: string;           // Assigned cursor color
  cursor?: { x: number; y: number };
  selection: string[];     // Currently selected node IDs
  dragging?: {
    nodeIds: string[];
    ghostPosition: { x: number; y: number };
  };
  isAgent?: boolean;       // True for AI agents
  agentName?: string;
}
```

**Conflict Resolution & Soft Locks:**

| Scenario | Resolution |
|----------|------------|
| Two users edit same property simultaneously | Last-writer-wins at property level (Yjs default) |
| User A drags node while User B edits its fill | Both succeed (different properties) |
| Two users drag same node | Display "User X is dragging" badge; second user's changes apply after first releases |
| Conflicting text edits | Y.Text CRDT handles character-level merge |

**Soft Lock Implementation:**
- When drag begins: broadcast `dragging: { nodeIds, ghostPosition }` via awareness
- Other clients show lock icon on those nodes + ghost outline
- Attempts to select locked nodes show toast: "Node being moved by [User]"
- Lock released on drag end (awareness update)

**Conflict UX:**
- Optimistic local updates (no blocking)
- Visual indicator when remote change affects selected node
- "Undo" only undoes local operations (not remote)

### 2.3 Agent Collaboration

**Agent Branches (Working Copies):**

```typescript
interface AgentBranch {
  id: string;              // UUID
  agentId: string;         // e.g., "claude-agent-abc123"
  ownerId: string;         // Human user who owns this agent
  canvasId: string;        // Parent canvas
  createdAt: number;
  status: 'active' | 'merged' | 'abandoned';
  
  // Branch is a full Yjs doc snapshot + subsequent ops
  baseVersion: number;     // Version number at fork point
  yDocState: Uint8Array;   // Serialized Yjs state vector
}
```

**Proposal Format:**

```typescript
interface AgentProposal {
  id: string;
  branchId: string;
  agentId: string;
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected' | 'superseded';
  
  // Human-readable summary
  title: string;           // "Add navigation header"
  description: string;     // "Added a top nav bar with logo and 3 links..."
  
  // Structured changes
  operations: ProposalOperation[];
  
  // AI reasoning
  rationale: string;       // "Based on the wireframe request, I added..."
  assumptions: string[];   // ["Assumed brand color is #1e293b", ...]
  confidence: number;      // 0.0 - 1.0
  
  // Preview
  previewImageUrl?: string; // R2 URL to rendered preview
}

interface ProposalOperation {
  type: 'create' | 'update' | 'delete' | 'move';
  nodeId: string;
  before?: Partial<LayoutNode>;  // For update/delete (for diff display)
  after?: Partial<LayoutNode>;   // For create/update
  rationale?: string;            // Per-operation explanation
}
```

**Design Rationale Layer:**
- Each operation can have attached `rationale`
- UI shows rationale as tooltips/annotations on affected nodes
- Stored in metadata map: `yMeta.set('rationale:' + nodeId, { text, agentId, timestamp })`

**Agent Permissions Model:**

```typescript
interface AgentPermissions {
  canRead: boolean;           // Always true if granted access
  canCreateBranch: boolean;   // Create working copies
  canSubmitProposals: boolean;// Submit proposals for review
  canMergeOwn: boolean;       // Merge own proposals (trusted agents)
  canMergeOthers: boolean;    // Merge other agents' proposals (never for agents)
  maxNodesPerProposal: number;// Limit blast radius
  maxProposalsPerDay: number; // Rate limit
}

// Scope levels
type AgentScope = 'read' | 'propose' | 'trusted-propose';
// read: canRead only
// propose: canRead, canCreateBranch, canSubmitProposals
// trusted-propose: + canMergeOwn (auto-merge after human confirmation prompt)
```

**Friend Agent Authentication:**
- Agents authenticate via short-lived JWT tokens
- Token issued by canvas owner through "Invite Agent" flow
- Token contains: `{ agentId, ownerId, canvasId, scope, exp }`
- Validated at Durable Object connection time

### 2.4 Access Control & Abuse Prevention

**Rollout Phases:**

| Phase | Access Model |
|-------|--------------|
| Phase 1: Friends-only | Cloudflare Access allowlist (email-based) |
| Phase 2: Invite links | Signed invite tokens with expiry |
| Phase 3: Public | In-app auth (email/OAuth) + rate limits |

**Auth Flow (Phase 1 - Cloudflare Access):**
```
User → Pages → CF Access (check email allowlist) → App
                    ↓ (JWT in CF-Access-JWT-Assertion header)
               Worker validates JWT, extracts email
```

**Auth Flow (Phase 2+):**
```
User → App → Auth endpoint → JWT issued
                              ↓
              Stored in cookie, validated per request
```

**Bot Protection Layers:**

| Layer | Protection | Implementation |
|-------|------------|----------------|
| Edge (CF) | IP rate limiting | Transform Rules: 100 req/min/IP |
| Edge (CF) | Bot score filtering | WAF rule: block if `cf.bot_management.score < 30` |
| Edge (CF) | Geo blocking (optional) | Firewall rule for high-abuse regions |
| Worker | Token validation | Check JWT signature + expiry |
| Worker | Per-user rate limit | KV counter: `rate:{userId}:{minute}` |
| Worker | Per-canvas rate limit | KV counter: `rate:canvas:{canvasId}:{minute}` |
| DO | Payload size cap | Reject messages > 100KB |
| DO | Operation rate limit | Max 60 ops/minute/user in room |
| App | Quotas | D1 lookup: canvases/user, nodes/canvas, storage/user |

**Quotas Table:**

| Resource | Free Tier | Paid Tier |
|----------|-----------|-----------|
| Canvases per user | 10 | 100 |
| Nodes per canvas | 500 | 5,000 |
| Storage per user (R2) | 50 MB | 1 GB |
| AI agent calls/day | 20 | 500 |
| Collaborators per canvas | 3 | 25 |

**Kill Switches (Environment Variables):**

```typescript
// Worker environment
READ_ONLY_MODE: boolean;      // Reject all mutations
DISABLE_REALTIME: boolean;    // Close all WebSocket connections
DISABLE_AI: boolean;          // Reject agent connections
DISABLE_EXPORTS: boolean;     // Disable export endpoints
MAINTENANCE_MESSAGE?: string; // Display to users if set
```

**Foreign Bot Traffic Mitigation:**
- Cloudflare WAF blocks requests with `cf.bot_management.verified_bot = false` AND `cf.bot_management.score < 30`
- Known abuse ASNs blocked at firewall level
- Join tokens for WebSocket rooms (not guessable room IDs)
- All mutations require valid JWT (not just cookie)

### 2.5 Hosting & Deployment (Cloudflare)

**Component Mapping:**

| Component | Cloudflare Service | Purpose |
|-----------|-------------------|---------|
| React SPA | Pages | Static hosting, edge cache |
| REST API | Workers | CRUD operations, auth |
| WebSocket Hub | Workers | WebSocket upgrade, routing |
| Realtime Rooms | Durable Objects | Yjs doc per canvas, persistence |
| Metadata DB | D1 | Users, canvases, memberships, proposals |
| Rate Limits | KV | Ephemeral counters with TTL |
| Snapshots/Exports | R2 | Binary blob storage |
| Auth (Phase 1) | Access | Email allowlist |
| Auth (Phase 2+) | Workers + D1 | Custom JWT auth |

**Cost Projection (Small Scale - 10 users, 50 canvases):**

| Service | Estimate | Notes |
|---------|----------|-------|
| Pages | Free | < 500 builds/mo |
| Workers | Free | < 100k req/day |
| Durable Objects | ~$1/mo | < 1M requests |
| D1 | Free | < 5M rows read/day |
| KV | Free | < 100k reads/day |
| R2 | ~$0.50/mo | < 10 GB stored |

**Scaling Considerations:**
- Durable Objects scale per-room (1 DO per canvas)
- D1 has 10GB limit per database (shard by user cohort if needed)
- R2 egress is free (good for exports)
- Monitor: DO CPU time, D1 query latency, R2 storage growth

---

## 3. Data Models

### 3.1 D1 Schema

```sql
-- Users (Phase 2+, when in-app auth)
CREATE TABLE users (
  id TEXT PRIMARY KEY,  -- UUID
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  quota_tier TEXT DEFAULT 'free'  -- 'free' | 'paid'
);

-- Canvases
CREATE TABLE canvases (
  id TEXT PRIMARY KEY,  -- UUID
  owner_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  node_count INTEGER DEFAULT 0,  -- Denormalized for quota check
  current_version INTEGER DEFAULT 0
);

-- Canvas Memberships (collaborators)
CREATE TABLE memberships (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL REFERENCES canvases(id),
  user_id TEXT REFERENCES users(id),
  agent_id TEXT,  -- NULL for humans, set for agents
  role TEXT NOT NULL,  -- 'owner' | 'editor' | 'viewer' | 'agent-propose' | 'agent-trusted'
  invited_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL,
  UNIQUE(canvas_id, user_id),
  UNIQUE(canvas_id, agent_id)
);

-- Agent Branches
CREATE TABLE branches (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL REFERENCES canvases(id),
  agent_id TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'merged' | 'abandoned'
  base_version INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Agent Proposals
CREATE TABLE proposals (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id),
  canvas_id TEXT NOT NULL REFERENCES canvases(id),
  agent_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected' | 'superseded'
  title TEXT NOT NULL,
  description TEXT,
  rationale TEXT,
  assumptions TEXT,  -- JSON array
  confidence REAL,
  operation_count INTEGER NOT NULL,
  preview_url TEXT,
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by TEXT REFERENCES users(id)
);

-- Version Checkpoints (for time travel / recovery)
CREATE TABLE checkpoints (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL REFERENCES canvases(id),
  version INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  created_by TEXT,  -- user_id or agent_id
  label TEXT,  -- Optional user label
  yjs_state_key TEXT NOT NULL,  -- R2 key for serialized Yjs state
  UNIQUE(canvas_id, version)
);

-- Rate limit tracking (supplement to KV for persistent quotas)
CREATE TABLE usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  period TEXT NOT NULL,  -- '2026-02-01' for daily, '2026-02' for monthly
  ai_calls INTEGER DEFAULT 0,
  storage_bytes INTEGER DEFAULT 0,
  UNIQUE(user_id, period)
);

-- Indexes
CREATE INDEX idx_canvases_owner ON canvases(owner_id);
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_canvas ON memberships(canvas_id);
CREATE INDEX idx_branches_canvas ON branches(canvas_id);
CREATE INDEX idx_proposals_canvas ON proposals(canvas_id);
CREATE INDEX idx_proposals_status ON proposals(canvas_id, status);
CREATE INDEX idx_checkpoints_canvas ON checkpoints(canvas_id);
```

### 3.2 Yjs Document Structure

```typescript
// Type-safe Yjs document wrapper
interface YjsCanvasDoc {
  // Node data (excluding children)
  nodes: Y.Map<Y.Map<any>>;  // id → { type, fill, stroke, position, size, ... }
  
  // Parent-child relationships
  children: Y.Map<Y.Array<string>>;  // parentId → [childId1, childId2, ...]
  
  // Metadata
  meta: Y.Map<any>;  // { rootId, version, lastModified, ... }
  
  // Flows for prototyping
  flows: Y.Array<Y.Map<any>>;
  
  // Design rationale (keyed by node ID)
  rationale: Y.Map<Y.Map<any>>;  // nodeId → { text, agentId, timestamp }
}

// Conversion helpers
function layoutSpecToYjs(spec: LayoutSpec, ydoc: Y.Doc): void;
function yjsToLayoutSpec(ydoc: Y.Doc): LayoutSpec;
```

### 3.3 WebSocket Message Types

```typescript
// Client → Server
type ClientMessage =
  | { type: 'join'; token: string; canvasId: string }
  | { type: 'yjs-update'; update: Uint8Array }
  | { type: 'awareness'; state: Uint8Array }
  | { type: 'ping' }
  | { type: 'request-checkpoint'; label?: string };

// Server → Client
type ServerMessage =
  | { type: 'joined'; clientId: number; currentState: Uint8Array; awareness: Uint8Array }
  | { type: 'yjs-update'; update: Uint8Array; from: number }
  | { type: 'awareness'; state: Uint8Array; from: number }
  | { type: 'pong' }
  | { type: 'checkpoint-created'; version: number }
  | { type: 'error'; code: string; message: string }
  | { type: 'user-joined'; userId: string; displayName: string }
  | { type: 'user-left'; userId: string };
```

### 3.4 REST API Endpoints

```typescript
// Auth (Phase 2+)
POST   /api/auth/login       // { email, password } → { token }
POST   /api/auth/register    // { email, password, displayName } → { token }
POST   /api/auth/refresh     // { refreshToken } → { token }

// Canvases
GET    /api/canvases                    // List user's canvases
POST   /api/canvases                    // Create canvas
GET    /api/canvases/:id                // Get canvas metadata
PUT    /api/canvases/:id                // Update canvas metadata
DELETE /api/canvases/:id                // Delete canvas
GET    /api/canvases/:id/snapshot       // Get current Yjs state as LayoutSpec JSON
POST   /api/canvases/:id/import         // Import LayoutSpec JSON

// Memberships
GET    /api/canvases/:id/members        // List collaborators
POST   /api/canvases/:id/members        // Invite collaborator
DELETE /api/canvases/:id/members/:uid   // Remove collaborator
POST   /api/canvases/:id/invite-link    // Generate invite link

// Agent Branches
GET    /api/canvases/:id/branches       // List branches
POST   /api/canvases/:id/branches       // Create branch (agent)
GET    /api/branches/:id                // Get branch state

// Proposals
GET    /api/canvases/:id/proposals      // List proposals
POST   /api/branches/:id/proposals      // Submit proposal
GET    /api/proposals/:id               // Get proposal details
POST   /api/proposals/:id/approve       // Approve & merge
POST   /api/proposals/:id/reject        // Reject

// Checkpoints
GET    /api/canvases/:id/checkpoints    // List checkpoints
POST   /api/canvases/:id/checkpoints    // Create manual checkpoint
GET    /api/checkpoints/:id             // Get checkpoint state

// Exports
POST   /api/canvases/:id/export/json    // Export as LayoutSpec JSON
POST   /api/canvases/:id/export/react   // Export as React/Tailwind
POST   /api/canvases/:id/export/tokens  // Export design tokens

// Agents
POST   /api/canvases/:id/agent-token    // Generate agent access token
```

---

## 4. Roadmap: Phased Implementation

### Phase 0: Prep & Hardening (2-3 weeks)

**Goal:** Stabilize codebase, improve type safety, add telemetry, prepare for cloud migration.

**Deliverables:**
- [ ] Complete command pattern integration
- [ ] Error boundaries around canvas
- [ ] Basic telemetry hook (console for now)
- [ ] Schema versioning for LayoutSpec
- [ ] Comprehensive test coverage for persistence

**Acceptance Criteria:**
- All spec mutations go through command system
- App gracefully handles corrupt localStorage
- LayoutSpec has `version` field with migration path
- 80%+ test coverage on `commands/`, `persistence.ts`

**Risks/Unknowns:**
- History stack may grow memory on large docs (mitigate: max depth already in ROADMAP.md)
- Some inline handlers in CanvasStage bypass commands (audit needed)

**Tasks:**
1. [ ] Audit all `setSpec` calls in CanvasStage, route through commands
2. [ ] Add `version: number` to LayoutSpec schema
3. [ ] Create migration function `migrateSpec(raw: any): LayoutSpec`
4. [ ] Add ErrorBoundary component wrapping CanvasStage
5. [ ] Create `useTelemetry` hook (stub: console.log events)
6. [ ] Add tests for edge cases in useDesignPersistence
7. [ ] Lint pass: eliminate remaining `any` types in commands/

**File/Folder Changes:**
- Modify: `layout-schema.ts` (add version)
- Create: `src/utils/migration.ts`
- Create: `src/components/ErrorBoundary.tsx`
- Create: `src/hooks/useTelemetry.ts`
- Modify: `canvas/CanvasStage.tsx` (route mutations)

---

### Phase 1: Cloud Persistence + Sharing (3-4 weeks)

**Goal:** Replace localStorage with cloud storage, enable canvas sharing with basic roles.

**Deliverables:**
- [ ] Backend Worker + D1 setup
- [ ] Canvas CRUD API
- [ ] useCloudPersistence hook (drop-in replacement)
- [ ] Basic share UI (invite by email)
- [ ] Role enforcement (owner/editor/viewer)

**Acceptance Criteria:**
- Existing app works identically with cloud backend
- Can share canvas via email invite
- Viewers cannot edit
- Offline mode: localStorage fallback with sync on reconnect

**Risks/Unknowns:**
- Need to handle auth (start with Cloudflare Access)
- Migration of existing localStorage designs

**Tasks:**
1. [ ] Set up Cloudflare Pages deployment
2. [ ] Create Worker project (`workers/api/`)
3. [ ] Set up D1 database with schema
4. [ ] Implement canvas CRUD endpoints
5. [ ] Create useCloudPersistence hook
6. [ ] Add Cloudflare Access integration
7. [ ] Build share dialog UI
8. [ ] Implement membership endpoints
9. [ ] Add role checks to API
10. [ ] Create "Import from local" migration flow
11. [ ] Add offline detection + localStorage fallback

**API Endpoints (Phase 1):**
```typescript
GET    /api/canvases
POST   /api/canvases
GET    /api/canvases/:id
PUT    /api/canvases/:id
DELETE /api/canvases/:id
GET    /api/canvases/:id/members
POST   /api/canvases/:id/members
DELETE /api/canvases/:id/members/:uid
```

**File/Folder Changes:**
- Create: `workers/api/` (new Worker project)
- Create: `workers/api/src/index.ts`
- Create: `workers/api/src/routes/`
- Create: `workers/api/schema.sql`
- Create: `src/hooks/useCloudPersistence.ts`
- Create: `src/components/ShareDialog.tsx`
- Modify: `src/CanvasApp.tsx` (swap persistence hook)

---

### Phase 2: Real-Time Collaboration MVP (4-5 weeks)

**Goal:** Multiple users editing same canvas simultaneously with presence indicators.

**Deliverables:**
- [ ] Durable Object for realtime rooms
- [ ] Yjs integration with LayoutSpec
- [ ] Presence UI (cursors, selection boxes)
- [ ] WebSocket connection management
- [ ] Auto-reconnect with state sync

**Acceptance Criteria:**
- Two users see each other's changes within 100ms
- Cursor positions visible for all collaborators
- Selection boxes show who has what selected
- Disconnect/reconnect preserves state

**Risks/Unknowns:**
- Yjs learning curve
- Mapping complex LayoutSpec to CRDT efficiently
- Performance with large docs (>1000 nodes)

**Tasks:**
1. [ ] Add yjs dependency
2. [ ] Create YjsCanvasDoc wrapper class
3. [ ] Implement layoutSpecToYjs / yjsToLayoutSpec
4. [ ] Create Durable Object class for rooms
5. [ ] Implement WebSocket message handling
6. [ ] Create useRealtimeCanvas hook
7. [ ] Add awareness protocol for presence
8. [ ] Build cursor overlay component
9. [ ] Build selection box overlay component
10. [ ] Implement reconnect logic with state merge
11. [ ] Add connection status indicator UI
12. [ ] Performance test with 1000+ nodes

**File/Folder Changes:**
- Create: `workers/realtime/` (DO worker)
- Create: `src/realtime/YjsCanvasDoc.ts`
- Create: `src/realtime/conversions.ts`
- Create: `src/hooks/useRealtimeCanvas.ts`
- Create: `src/components/PresenceOverlay.tsx`
- Create: `src/components/ConnectionStatus.tsx`
- Modify: `canvas/CanvasStage.tsx` (add presence layer)

---

### Phase 3: Real-Time Polish (2-3 weeks)

**Goal:** Production-quality collaboration with soft locks, conflict UI, checkpoints.

**Deliverables:**
- [ ] Soft lock system during drag/resize
- [ ] Conflict notification toasts
- [ ] Manual + auto checkpoints
- [ ] Checkpoint restore UI
- [ ] Performance optimizations

**Acceptance Criteria:**
- Dragging node shows lock to others
- Conflicting edits show non-blocking notification
- Auto-checkpoint every 5 minutes (if changed)
- Can restore to any checkpoint
- 60fps drag even with 5 collaborators

**Tasks:**
1. [ ] Extend awareness with `dragging` state
2. [ ] Add lock badge component
3. [ ] Implement conflict detection hooks
4. [ ] Create toast notification for conflicts
5. [ ] Add checkpoint creation endpoint
6. [ ] Implement auto-checkpoint timer
7. [ ] Build checkpoint list/restore UI
8. [ ] Optimize Yjs updates (batching)
9. [ ] Add render throttling for remote updates

**File/Folder Changes:**
- Create: `src/components/LockBadge.tsx`
- Create: `src/components/ConflictToast.tsx`
- Create: `src/components/CheckpointPanel.tsx`
- Modify: `workers/realtime/` (checkpoint logic)
- Modify: `src/hooks/useRealtimeCanvas.ts` (soft locks)

---

### Phase 4: Agent Branches + Proposals (4-5 weeks)

**Goal:** AI agents can create branches, make changes, submit proposals for human review.

**Deliverables:**
- [ ] Branch creation/management API
- [ ] Proposal submission/review API
- [ ] Agent token generation UI
- [ ] Proposal review UI (diff view)
- [ ] Rationale display in canvas
- [ ] Merge/reject workflow

**Acceptance Criteria:**
- Agent can fork canvas into branch
- Agent proposals show clear diff
- Rationale visible per-operation
- Human must approve before merge
- Merged changes appear in main canvas

**Tasks:**
1. [ ] Implement branch CRUD endpoints
2. [ ] Implement proposal endpoints
3. [ ] Create AgentTokenDialog component
4. [ ] Build ProposalListPanel component
5. [ ] Build ProposalDiffView component
6. [ ] Implement diff algorithm for LayoutSpec
7. [ ] Add rationale storage in Yjs meta
8. [ ] Create RationaleTooltip component
9. [ ] Implement merge operation
10. [ ] Add proposal status notifications
11. [ ] Agent SDK/example (TypeScript client)

**File/Folder Changes:**
- Create: `workers/api/src/routes/branches.ts`
- Create: `workers/api/src/routes/proposals.ts`
- Create: `src/components/AgentTokenDialog.tsx`
- Create: `src/components/ProposalListPanel.tsx`
- Create: `src/components/ProposalDiffView.tsx`
- Create: `src/components/RationaleTooltip.tsx`
- Create: `src/utils/specDiff.ts`
- Create: `packages/agent-sdk/` (optional)

---

### Phase 5: Export Pipeline (2-3 weeks)

**Goal:** Export designs to usable formats for building real applications.

**Deliverables:**
- [ ] JSON canonical export (stable schema)
- [ ] Ops/diff export (for replay)
- [ ] React + Tailwind export
- [ ] Design tokens export
- [ ] Export UI with options

**Acceptance Criteria:**
- JSON export is lossless round-trip
- React export produces runnable components
- Tokens export compatible with style-dictionary
- Export respects node semantic hints (if present)

**Tasks:**
1. [ ] Define stable export JSON schema
2. [ ] Implement JSON export endpoint
3. [ ] Create ops/history export format
4. [ ] Build React code generator
5. [ ] Implement Tailwind class mapping
6. [ ] Create design tokens extractor
7. [ ] Build ExportDialog UI
8. [ ] Add semantic type hints to schema (button, input, etc.)
9. [ ] Documentation for export formats

**Export Formats:**

```typescript
// 1. Canonical JSON (matches LayoutSpec)
interface CanonicalExport {
  version: number;
  exportedAt: string;
  spec: LayoutSpec;
}

// 2. Ops export (for replay/audit)
interface OpsExport {
  version: number;
  baseSpec: LayoutSpec;
  operations: ProposalOperation[];
}

// 3. React export
interface ReactExport {
  components: {
    name: string;       // "HeroSection"
    jsx: string;        // React component code
    styles: string;     // Tailwind or CSS
  }[];
  tokens: DesignTokens;
}

// 4. Design tokens
interface DesignTokens {
  colors: Record<string, string>;
  spacing: Record<string, number>;
  typography: {
    fontFamilies: string[];
    fontSizes: Record<string, number>;
  };
  radii: Record<string, number>;
}
```

**File/Folder Changes:**
- Create: `workers/api/src/routes/export.ts`
- Create: `src/export/jsonExporter.ts`
- Create: `src/export/reactExporter.ts`
- Create: `src/export/tokenExtractor.ts`
- Create: `src/components/ExportDialog.tsx`
- Modify: `layout-schema.ts` (semantic hints)

---

## 5. GitHub Issues Breakdown

### Milestone: Phase 0 - Prep & Hardening

**Issue: Complete Command Pattern Integration**
- Audit all `setSpec` calls in CanvasStage.tsx
- Route transform operations through `createTransformNodesCommand`
- Route property updates through `createUpdateNodePropsCommand`
- Ensure all paths use `setSpec` wrapper with history tracking
- Add tests for any newly routed commands
- Labels: `enhancement`, `tech-debt`, `priority-high`

**Issue: Add Schema Versioning & Migration**
- Add `version: number` field to LayoutSpec interface
- Create `src/utils/migration.ts` with `migrateSpec()` function
- Handle missing version (assume v0)
- Add migration test cases for future schema changes
- Update useDesignPersistence to call migration on load
- Labels: `enhancement`, `data-integrity`

**Issue: Add Error Boundary & Telemetry**
- Create ErrorBoundary component wrapping CanvasStage
- Show friendly error UI with "Reset" option
- Create useTelemetry hook (stub implementation)
- Log: canvas-load, node-create, node-delete, error events
- Add to CanvasApp component tree
- Labels: `enhancement`, `reliability`

**Issue: Lint & Type Safety Pass**
- Run `lint:strict` and fix all errors
- Eliminate remaining `any` types in commands/
- Add explicit return types to all public functions
- Document any intentional `any` with `// eslint-disable-next-line`
- Labels: `tech-debt`, `types`

---

### Milestone: Phase 1 - Cloud Persistence

**Issue: Set Up Cloudflare Infrastructure**
- Create Pages project for frontend
- Create Worker project for API (`workers/api/`)
- Set up D1 database
- Configure wrangler.toml for dev/staging/prod
- Set up GitHub Actions for deployment
- Document local dev setup in README
- Labels: `infrastructure`, `priority-high`

**Issue: Implement Canvas CRUD API**
- POST /api/canvases - Create canvas
- GET /api/canvases - List user's canvases
- GET /api/canvases/:id - Get canvas (metadata + snapshot)
- PUT /api/canvases/:id - Update metadata
- DELETE /api/canvases/:id - Delete canvas
- Add input validation with Zod
- Add error handling middleware
- Labels: `api`, `priority-high`

**Issue: Create useCloudPersistence Hook**
- Drop-in replacement for useDesignPersistence
- Fetch canvas on mount, autosave on change (debounced)
- Handle 401/403 errors
- Offline detection with localStorage fallback
- Sync on reconnect
- Add loading/saving states
- Labels: `frontend`, `priority-high`

**Issue: Implement Sharing & Memberships**
- POST /api/canvases/:id/members - Add collaborator
- GET /api/canvases/:id/members - List collaborators
- DELETE /api/canvases/:id/members/:uid - Remove
- Build ShareDialog component (email input)
- Role selection (editor/viewer)
- Labels: `api`, `frontend`

**Issue: Add Cloudflare Access Integration**
- Configure Access application for app domain
- Parse CF-Access-JWT-Assertion header in Worker
- Extract user email for identity
- Create/find user in D1 on first access
- Labels: `auth`, `infrastructure`

---

### Milestone: Phase 2 - Real-Time MVP

**Issue: Set Up Yjs + Durable Objects**
- Add yjs, y-websocket dependencies
- Create Durable Object class CanvasRoom
- Implement WebSocket upgrade handling
- Store Yjs doc state in DO storage
- Handle join/leave/update messages
- Labels: `infrastructure`, `realtime`, `priority-high`

**Issue: Create Yjs-LayoutSpec Conversion Layer**
- Implement YjsCanvasDoc wrapper class
- layoutSpecToYjs(spec, ydoc) function
- yjsToLayoutSpec(ydoc) function
- Handle all node types
- Preserve z-order via Y.Array
- Add unit tests for round-trip
- Labels: `realtime`, `data`

**Issue: Build useRealtimeCanvas Hook**
- WebSocket connection management
- Yjs doc sync with provider
- Awareness protocol integration
- Reconnect with exponential backoff
- Expose: spec, setSpec (local optimistic), presence
- Labels: `frontend`, `realtime`

**Issue: Implement Presence UI**
- Cursor overlay showing other users' positions
- Selection box overlay for other users' selections
- User list sidebar showing who's online
- Color assignment for each user
- Labels: `frontend`, `realtime`

**Issue: Add Connection Status Indicator**
- Show connected/connecting/disconnected states
- Retry button for manual reconnect
- Offline mode indicator
- Sync status (saving/saved/error)
- Labels: `frontend`, `ux`

---

### Milestone: Phase 3 - Real-Time Polish

**Issue: Implement Soft Locks**
- Track dragging state in awareness
- Show lock icon on nodes being dragged by others
- Prevent selection of locked nodes (with toast)
- Ghost position preview for locked drags
- Release lock on drag end
- Labels: `realtime`, `ux`

**Issue: Add Conflict Notifications**
- Detect when remote change affects selected node
- Show non-blocking toast notification
- "Your selection was modified by [User]"
- Option to undo local pending changes
- Labels: `realtime`, `ux`

**Issue: Implement Checkpoint System**
- Auto-checkpoint every 5 min (if changed)
- POST /api/canvases/:id/checkpoints - Manual checkpoint
- GET /api/canvases/:id/checkpoints - List checkpoints
- Store Yjs state in R2
- Build checkpoint restore UI
- Labels: `api`, `data-integrity`

**Issue: Real-Time Performance Optimization**
- Batch Yjs updates during drag (debounce)
- Throttle remote presence updates (10fps max)
- Optimize re-renders on spec change
- Profile and fix bottlenecks
- Target: 60fps drag with 5 users
- Labels: `performance`, `realtime`

---

### Milestone: Phase 4 - Agent Collaboration

**Issue: Implement Agent Branch System**
- POST /api/canvases/:id/branches - Fork to branch
- GET /api/canvases/:id/branches - List branches
- Branch stores: base version + Yjs state
- Agent can edit branch independently
- Garbage collect abandoned branches (7 days)
- Labels: `api`, `agents`

**Issue: Build Proposal Submission Flow**
- POST /api/branches/:id/proposals - Submit proposal
- Capture: operations, rationale, assumptions, confidence
- Generate preview image (optional)
- Store in D1 with pending status
- Notify canvas owner
- Labels: `api`, `agents`

**Issue: Create Proposal Review UI**
- ProposalListPanel: show pending proposals
- ProposalDiffView: visual diff of changes
- Show rationale and assumptions
- Approve/Reject buttons
- Merge operation on approve
- Labels: `frontend`, `agents`

**Issue: Add Design Rationale Layer**
- Store rationale in Yjs meta map
- Create RationaleTooltip component
- Show "AI suggested" badge on nodes
- View full rationale on hover/click
- Labels: `frontend`, `agents`

**Issue: Agent Token Management**
- POST /api/canvases/:id/agent-token - Generate token
- AgentTokenDialog UI component
- Token includes: scope, expiry, canvasId
- Revoke tokens from settings
- Rate limit tokens separately
- Labels: `auth`, `agents`

---

### Milestone: Phase 5 - Export Pipeline

**Issue: Implement JSON Canonical Export**
- POST /api/canvases/:id/export/json
- Stable schema with version field
- Include metadata (exportedAt, author)
- Validate lossless round-trip
- Document schema
- Labels: `export`, `api`

**Issue: Build React + Tailwind Exporter**
- POST /api/canvases/:id/export/react
- Map LayoutSpec nodes to React components
- Generate Tailwind classes for styles
- Handle nested structures
- Output: zip with components + index
- Labels: `export`, `api`

**Issue: Create Design Tokens Extractor**
- POST /api/canvases/:id/export/tokens
- Extract: colors, spacing, typography, radii
- Dedupe and name tokens intelligently
- Style-dictionary compatible format
- Labels: `export`, `api`

**Issue: Build Export Dialog UI**
- ExportDialog component
- Format selection (JSON/React/Tokens)
- Options per format
- Download button
- Preview panel (optional)
- Labels: `frontend`, `export`

---

## 6. Open Questions

1. **Auth provider for Phase 2+**: Continue with Cloudflare Access or migrate to custom auth? Custom provides more control but more work.

2. **Agent orchestration**: How do agents discover what to work on? Polling API? Webhook on events? Real-time subscription?

3. **Semantic hints**: Should nodes have explicit `semanticType` (button, input, link) or infer from properties? Explicit is more reliable for export.

4. **Multi-page/artboard support**: Current LayoutSpec has single root. Multi-page would require schema change. Defer to Phase 5+?

5. **Figma import**: Is this a priority? Would require significant schema mapping work.

6. **Pricing model**: Free tier limits defined, but when/how to implement billing?

---

## 7. Files Inspected

```
src/
├── main.tsx
├── CanvasApp.tsx
├── layout-schema.ts
├── canvas/
│   ├── CanvasStage.tsx
│   └── editing.ts
├── commands/
│   ├── types.ts
│   ├── transformNodes.ts
│   ├── updateNodeProps.ts
│   ├── deleteNodes.ts
│   ├── duplicateNodes.ts
│   ├── groupNodes.ts
│   └── ungroupNode.ts
├── hooks/
│   ├── useDesignPersistence.ts
│   └── useSelection.ts
├── interaction/
│   ├── drag.ts
│   └── marquee.ts
├── utils/
│   ├── persistence.ts
│   └── specUtils.ts
├── types/
│   └── core.ts
├── roblox/
│   └── export.ts
docs/
└── ROADMAP.md
vite.config.ts
package.json
eslint.config.js
index.html
```
