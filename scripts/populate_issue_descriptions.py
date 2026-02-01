#!/usr/bin/env python3
"""
Populate GitHub issues with detailed descriptions from COLLABORATION_ROADMAP.md
"""
import subprocess
import json

REPO = "goblinsan/vizail"

# Map issue number to detailed description
ISSUE_DETAILS = {
    12: """## Complete Command Pattern Integration

### Tasks:
- Audit all `setSpec` calls in CanvasStage.tsx
- Route transform operations through `createTransformNodesCommand`
- Route property updates through `createUpdateNodePropsCommand`
- Ensure all paths use `setSpec` wrapper with history tracking
- Add tests for any newly routed commands

### Acceptance Criteria:
- All spec mutations routed through command system
- Existing functionality preserved
- All tests passing

**Parent Epic:** #45""",

    13: """## Add Schema Versioning & Migration

### Tasks:
- Add `version: number` field to LayoutSpec interface
- Create `src/utils/migration.ts` with `migrateSpec()` function
- Handle missing version (assume v0)
- Add migration test cases for future schema changes
- Update useDesignPersistence to call migration on load

### Acceptance Criteria:
- LayoutSpec includes version field
- Migration function handles v0 → current version
- Backward compatible with existing designs

**Parent Epic:** #45""",

    14: """## Add Error Boundary & Telemetry

### Tasks:
- Create ErrorBoundary component wrapping CanvasStage
- Show friendly error UI with "Reset" option
- Create useTelemetry hook (stub implementation)
- Log: canvas-load, node-create, node-delete, error events
- Add to CanvasApp component tree

### Acceptance Criteria:
- Errors don't crash entire app
- Users see recovery option
- Key events logged to console

**Parent Epic:** #45""",

    15: """## Lint & Type Safety Pass

### Tasks:
- Run `lint:strict` and fix all errors
- Eliminate remaining `any` types in commands/
- Add explicit return types to all public functions
- Document any intentional `any` with `// eslint-disable-next-line`

### Acceptance Criteria:
- Zero lint errors
- No `any` types except documented cases
- All tests passing

**Parent Epic:** #45""",

    16: """## Set Up Cloudflare Infrastructure

### Tasks:
- Create Pages project for frontend
- Create Worker project for API (`workers/api/`)
- Set up D1 database
- Configure wrangler.toml for dev/staging/prod
- Set up GitHub Actions for deployment
- Document local dev setup in README

### Acceptance Criteria:
- Pages deployment successful
- Worker project scaffolded
- D1 accessible via wrangler
- Documented setup instructions

**Parent Epic:** #46""",

    17: """## Implement Canvas CRUD API

### Tasks:
- POST /api/canvases - Create canvas
- GET /api/canvases - List user's canvases
- GET /api/canvases/:id - Get canvas (metadata + snapshot)
- PUT /api/canvases/:id - Update metadata
- DELETE /api/canvases/:id - Delete canvas
- Add input validation with Zod
- Add error handling middleware

### Acceptance Criteria:
- All endpoints working
- Proper error handling
- Input validation enforced
- Tests for all endpoints

**Parent Epic:** #46""",

    18: """## Create useCloudPersistence Hook

### Tasks:
- Drop-in replacement for useDesignPersistence
- Fetch canvas on mount, autosave on change (debounced)
- Handle 401/403 errors
- Offline detection with localStorage fallback
- Sync on reconnect
- Add loading/saving states

### Acceptance Criteria:
- Hook works identically to localStorage version
- Cloud sync working
- Offline mode graceful
- Auto-save debounced (1s)

**Parent Epic:** #46""",

    19: """## Implement Sharing & Memberships

### Tasks:
- POST /api/canvases/:id/members - Add collaborator
- GET /api/canvases/:id/members - List collaborators
- DELETE /api/canvases/:id/members/:uid - Remove
- Build ShareDialog component (email input)
- Role selection (editor/viewer)

### Acceptance Criteria:
- Can invite by email
- Role-based access enforced
- UI intuitive and responsive

**Parent Epic:** #46""",

    20: """## Add Cloudflare Access Integration

### Tasks:
- Configure Access application for app domain
- Parse CF-Access-JWT-Assertion header in Worker
- Extract user email for identity
- Create/find user in D1 on first access

### Acceptance Criteria:
- Access-protected domain working
- User identity extracted correctly
- User created in D1 on first login

**Parent Epic:** #46""",

    21: """## Set Up Yjs + Durable Objects

### Tasks:
- Add yjs, y-websocket dependencies
- Create Durable Object class CanvasRoom
- Implement WebSocket upgrade handling
- Store Yjs doc state in DO storage
- Handle join/leave/update messages

### Acceptance Criteria:
- Yjs doc persisted in DO
- WebSocket messages flowing
- Multiple clients can connect
- State survives reconnects

**Parent Epic:** #47""",

    22: """## Create Yjs-LayoutSpec Conversion Layer

### Tasks:
- Implement YjsCanvasDoc wrapper class
- layoutSpecToYjs(spec, ydoc) function
- yjsToLayoutSpec(ydoc) function
- Handle all node types
- Preserve z-order via Y.Array
- Add unit tests for round-trip

### Acceptance Criteria:
- Conversion functions working
- Round-trip lossless
- All node types supported
- Tests passing

**Parent Epic:** #47""",

    23: """## Build useRealtimeCanvas Hook

### Tasks:
- WebSocket connection management
- Yjs doc sync with provider
- Awareness protocol integration
- Reconnect with exponential backoff
- Expose: spec, setSpec (local optimistic), presence

### Acceptance Criteria:
- Hook connects to DO
- Changes sync <100ms
- Auto-reconnect working
- Local optimistic updates

**Parent Epic:** #47""",

    24: """## Implement Presence UI

### Tasks:
- Cursor overlay showing other users' positions
- Selection box overlay for other users' selections
- User list sidebar showing who's online
- Color assignment for each user

### Acceptance Criteria:
- Cursors visible for other users
- Selection indicators clear
- User list accurate
- 30fps+ cursor updates

**Parent Epic:** #47""",

    25: """## Add Connection Status Indicator

### Tasks:
- Show connected/connecting/disconnected states
- Retry button for manual reconnect
- Offline mode indicator
- Sync status (saving/saved/error)

### Acceptance Criteria:
- Status indicator visible
- Reconnect button works
- Users informed of state
- Clear error messages

**Parent Epic:** #47""",

    26: """## Implement Soft Locks

### Tasks:
- Track dragging state in awareness
- Show lock icon on nodes being dragged by others
- Prevent selection of locked nodes (with toast)
- Ghost position preview for locked drags
- Release lock on drag end

### Acceptance Criteria:
- Lock indicators visible
- Users cannot select locked nodes
- Ghost preview accurate
- Lock released on drag end

**Parent Epic:** #48""",

    27: """## Add Conflict Notifications

### Tasks:
- Detect when remote change affects selected node
- Show non-blocking toast notification
- "Your selection was modified by [User]"
- Option to undo local pending changes

### Acceptance Criteria:
- Conflicts detected
- Toast shows user name
- Non-blocking UX
- Undo option works

**Parent Epic:** #48""",

    28: """## Implement Checkpoint System

### Tasks:
- Auto-checkpoint every 5 min (if changed)
- POST /api/canvases/:id/checkpoints - Manual checkpoint
- GET /api/canvases/:id/checkpoints - List checkpoints
- Store Yjs state in R2
- Build checkpoint restore UI

### Acceptance Criteria:
- Auto-checkpoint working
- Manual checkpoint on demand
- Restore to any checkpoint
- No data loss

**Parent Epic:** #48""",

    29: """## Real-Time Performance Optimization

### Tasks:
- Batch Yjs updates during drag (debounce)
- Throttle remote presence updates (10fps max)
- Optimize re-renders on spec change
- Profile and fix bottlenecks
- Target: 60fps drag with 5 users

### Acceptance Criteria:
- 60fps drag performance
- Updates batched efficiently
- Presence updates throttled
- Profiling data collected

**Parent Epic:** #48""",

    30: """## Implement Agent Branch System

### Tasks:
- POST /api/canvases/:id/branches - Fork to branch
- GET /api/canvases/:id/branches - List branches
- Branch stores: base version + Yjs state
- Agent can edit branch independently
- Garbage collect abandoned branches (7 days)

### Acceptance Criteria:
- Can create branches
- Branches isolated from main
- Agents can edit branches
- Old branches cleaned up

**Parent Epic:** #49""",

    31: """## Build Proposal Submission Flow

### Tasks:
- POST /api/branches/:id/proposals - Submit proposal
- Capture: operations, rationale, assumptions, confidence
- Generate preview image (optional)
- Store in D1 with pending status
- Notify canvas owner

### Acceptance Criteria:
- Proposals submitted
- All metadata captured
- Owner notified
- Status tracked in D1

**Parent Epic:** #49""",

    32: """## Create Proposal Review UI

### Tasks:
- ProposalListPanel: show pending proposals
- ProposalDiffView: visual diff of changes
- Show rationale and assumptions
- Approve/Reject buttons
- Merge operation on approve

### Acceptance Criteria:
- Proposals visible in UI
- Diff clear and readable
- Approve/reject working
- Merge updates main canvas

**Parent Epic:** #49""",

    33: """## Add Design Rationale Layer

### Tasks:
- Store rationale in Yjs meta map
- Create RationaleTooltip component
- Show "AI suggested" badge on nodes
- View full rationale on hover/click

### Acceptance Criteria:
- Rationale stored with operations
- Badges visible on affected nodes
- Tooltips showing rationale
- Clear AI attribution

**Parent Epic:** #49""",

    34: """## Agent Token Management

### Tasks:
- POST /api/canvases/:id/agent-token - Generate token
- AgentTokenDialog UI component
- Token includes: scope, expiry, canvasId
- Revoke tokens from settings
- Rate limit tokens separately

### Acceptance Criteria:
- Tokens generated with expiry
- Dialog user-friendly
- Revoke working
- Rate limits enforced

**Parent Epic:** #49""",

    35: """## Implement JSON Canonical Export

### Tasks:
- POST /api/canvases/:id/export/json
- Stable schema with version field
- Include metadata (exportedAt, author)
- Validate lossless round-trip
- Document schema

### Acceptance Criteria:
- JSON export working
- Schema documented
- Round-trip lossless
- Metadata included

**Parent Epic:** #50""",

    36: """## Build React + Tailwind Exporter

### Tasks:
- POST /api/canvases/:id/export/react
- Map LayoutSpec nodes to React components
- Generate Tailwind classes for styles
- Handle nested structures
- Output: zip with components + index

### Acceptance Criteria:
- React export working
- Generated code runnable
- Tailwind classes accurate
- Zip file structure clean

**Parent Epic:** #50""",

    37: """## Create Design Tokens Extractor

### Tasks:
- POST /api/canvases/:id/export/tokens
- Extract: colors, spacing, typography, radii
- Dedupe and name tokens intelligently
- Style-dictionary compatible format

### Acceptance Criteria:
- Tokens extracted
- Named intelligently
- Compatible with style-dictionary
- Format documented

**Parent Epic:** #50""",

    38: """## Build Export Dialog UI

### Tasks:
- ExportDialog component
- Format selection (JSON/React/Tokens)
- Options per format
- Download button
- Preview panel (optional)

### Acceptance Criteria:
- Dialog user-friendly
- Formats selectable
- Download working
- Options clear

**Parent Epic:** #50""",
}

def update_issue_body(issue_num, body):
    """Update an issue's body via REST API"""
    result = subprocess.run(
        ["gh", "api",
         f"/repos/{REPO}/issues/{issue_num}",
         "-X", "PATCH",
         "-f", f"body={body}"],
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        print(f"✅ Updated #{issue_num}")
        return True
    else:
        print(f"❌ Error updating #{issue_num}: {result.stderr[:100]}")
        return False

print("Populating issues with detailed descriptions...\n")
for issue_num in sorted(ISSUE_DETAILS.keys()):
    update_issue_body(issue_num, ISSUE_DETAILS[issue_num])

print("\n✅ All issues populated with descriptions!")
