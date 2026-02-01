#!/usr/bin/env python3
"""
Script to create GitHub milestones and issues using GitHub CLI
"""

import json
import subprocess
from typing import Optional

REPO_OWNER = "goblinsan"
REPO_NAME = "visual-flow"

# Phase data extracted from COLLABORATION_ROADMAP.md
PHASES = {
    "Phase 0: Prep & Hardening": {
        "description": "Stabilize codebase, improve type safety, add telemetry, prepare for cloud migration.",
        "duration": "2-3 weeks",
        "issues": [
            {
                "title": "Complete Command Pattern Integration",
                "body": """## Description
Audit all `setSpec` calls in CanvasStage.tsx and ensure all mutations go through the command system.

## Tasks
- Audit all `setSpec` calls in CanvasStage.tsx
- Route transform operations through `createTransformNodesCommand`
- Route property updates through `createUpdateNodePropsCommand`
- Ensure all paths use `setSpec` wrapper with history tracking
- Add tests for any newly routed commands

## Acceptance Criteria
- All spec mutations go through command system
- New tests added for routed commands
- No behavior changes to user-facing functionality

## Labels
enhancement, tech-debt, priority-high""",
            },
            {
                "title": "Add Schema Versioning & Migration",
                "body": """## Description
Add version field to LayoutSpec and create migration infrastructure for future schema changes.

## Tasks
- Add `version: number` field to LayoutSpec interface
- Create `src/utils/migration.ts` with `migrateSpec()` function
- Handle missing version (assume v0)
- Add migration test cases for future schema changes
- Update useDesignPersistence to call migration on load

## Acceptance Criteria
- LayoutSpec has `version` field with migration path
- New localStorage data loads without migration needed
- Old data can be migrated forward

## Labels
enhancement, data-integrity""",
            },
            {
                "title": "Add Error Boundary & Telemetry",
                "body": """## Description
Add error boundary around canvas and basic telemetry hook for observability.

## Tasks
- Create ErrorBoundary component wrapping CanvasStage
- Show friendly error UI with "Reset" option
- Create useTelemetry hook (stub implementation)
- Log: canvas-load, node-create, node-delete, error events
- Add to CanvasApp component tree

## Acceptance Criteria
- App gracefully handles canvas errors
- Telemetry hook integrated in key paths
- Users can recover from errors

## Labels
enhancement, reliability""",
            },
            {
                "title": "Lint & Type Safety Pass",
                "body": """## Description
Eliminate remaining `any` types and improve type safety across the codebase.

## Tasks
- Run `lint:strict` and fix all errors
- Eliminate remaining `any` types in commands/
- Add explicit return types to all public functions
- Document any intentional `any` with `// eslint-disable-next-line`

## Acceptance Criteria
- All errors pass `STRICT_TYPES=1` linting
- No new `any` types introduced without documentation

## Labels
tech-debt, types""",
            },
        ],
    },
    "Phase 1: Cloud Persistence + Sharing": {
        "description": "Replace localStorage with cloud storage, enable canvas sharing with basic roles.",
        "duration": "3-4 weeks",
        "issues": [
            {
                "title": "Set Up Cloudflare Infrastructure",
                "body": """## Description
Initialize Cloudflare Pages and Workers infrastructure for cloud deployment.

## Tasks
- Create Pages project for frontend
- Create Worker project for API (`workers/api/`)
- Set up D1 database with schema
- Configure wrangler.toml for dev/staging/prod
- Set up GitHub Actions for deployment
- Document local dev setup in README

## Acceptance Criteria
- App deployable to Cloudflare Pages
- Worker project scaffolded and configured
- D1 database created with tables
- Deployment automated via GitHub Actions

## Labels
infrastructure, priority-high""",
            },
            {
                "title": "Implement Canvas CRUD API",
                "body": """## Description
Build REST API endpoints for canvas management (create, read, update, delete).

## Endpoints
- POST /api/canvases - Create canvas
- GET /api/canvases - List user's canvases
- GET /api/canvases/:id - Get canvas (metadata + snapshot)
- PUT /api/canvases/:id - Update metadata
- DELETE /api/canvases/:id - Delete canvas

## Tasks
- Implement all CRUD endpoints in Worker
- Add input validation with Zod
- Add error handling middleware
- Add unit tests for each endpoint
- Document API with examples

## Acceptance Criteria
- All endpoints implemented and tested
- Input validation prevents invalid data
- Proper HTTP status codes returned
- Error messages clear and actionable

## Labels
api, priority-high""",
            },
            {
                "title": "Create useCloudPersistence Hook",
                "body": """## Description
Build drop-in replacement for useDesignPersistence that syncs with cloud backend.

## Tasks
- Create useCloudPersistence hook
- Fetch canvas on mount, autosave on change (debounced)
- Handle 401/403 errors with retry logic
- Implement offline detection with localStorage fallback
- Sync on reconnect
- Add loading/saving states

## Acceptance Criteria
- Existing app works identically with cloud backend
- Can save/load canvases from cloud
- Offline mode works with sync on reconnect
- Loading states visible to user

## Labels
frontend, priority-high""",
            },
            {
                "title": "Implement Sharing & Memberships",
                "body": """## Description
Add ability to share canvases with other users with role-based access control.

## Endpoints
- POST /api/canvases/:id/members - Add collaborator
- GET /api/canvases/:id/members - List collaborators
- DELETE /api/canvases/:id/members/:uid - Remove collaborator
- POST /api/canvases/:id/invite-link - Generate invite link

## Tasks
- Build ShareDialog component (email input)
- Implement membership endpoints
- Add role selection (editor/viewer)
- Add role checks to API
- Implement role enforcement in permissions

## Acceptance Criteria
- Users can share canvases via email
- Viewers cannot edit shared canvases
- Owners can manage collaborators
- Invite links work correctly

## Labels
api, frontend""",
            },
            {
                "title": "Add Cloudflare Access Integration",
                "body": """## Description
Implement authentication via Cloudflare Access for Phase 1 (friends-only mode).

## Tasks
- Configure Access application for app domain
- Parse CF-Access-JWT-Assertion header in Worker
- Extract user email for identity
- Create/find user in D1 on first access
- Handle Access allowlist management

## Acceptance Criteria
- Only allowlisted users can access app
- User identity extracted from Access token
- User profile created/updated automatically

## Labels
auth, infrastructure""",
            },
        ],
    },
    "Phase 2: Real-Time Collaboration MVP": {
        "description": "Multiple users editing same canvas simultaneously with presence indicators.",
        "duration": "4-5 weeks",
        "issues": [
            {
                "title": "Set Up Yjs + Durable Objects",
                "body": """## Description
Initialize Yjs CRDT library and create Durable Object infrastructure for realtime rooms.

## Tasks
- Add yjs, y-websocket dependencies
- Create Durable Object class CanvasRoom
- Implement WebSocket upgrade handling
- Store Yjs doc state in DO storage
- Handle join/leave/update messages
- Add connection heartbeat/ping-pong

## Acceptance Criteria
- Yjs integrated with proper types
- Durable Objects can store canvas state
- WebSocket connections work reliably
- State persists across reconnects

## Labels
infrastructure, realtime, priority-high""",
            },
            {
                "title": "Create Yjs-LayoutSpec Conversion Layer",
                "body": """## Description
Build conversion functions between LayoutSpec and Yjs document structures.

## Tasks
- Implement YjsCanvasDoc wrapper class
- Create layoutSpecToYjs(spec, ydoc) function
- Create yjsToLayoutSpec(ydoc) function
- Handle all node types correctly
- Preserve z-order via Y.Array
- Add comprehensive unit tests

## Acceptance Criteria
- Conversion functions handle all node types
- Round-trip conversion is lossless
- Z-order preserved correctly
- All tests passing

## Labels
realtime, data""",
            },
            {
                "title": "Build useRealtimeCanvas Hook",
                "body": """## Description
Create React hook for managing realtime canvas connections and state sync.

## Tasks
- Implement WebSocket connection management
- Sync Yjs doc with provider
- Integrate awareness protocol
- Implement reconnect with exponential backoff
- Handle state merging on reconnect
- Expose API: spec, setSpec (optimistic), presence

## Acceptance Criteria
- Hook provides seamless realtime experience
- Automatic reconnect works smoothly
- State consistent across clients
- No data loss on network issues

## Labels
frontend, realtime""",
            },
            {
                "title": "Implement Presence UI",
                "body": """## Description
Build visual indicators showing other users' cursors and selections.

## Tasks
- Create cursor overlay component
- Create selection box overlay component
- Build user list sidebar showing who's online
- Assign distinct colors to each user
- Show user avatars and names
- Update presence in real-time

## Acceptance Criteria
- Other users' cursors visible
- Other users' selections visible
- User list shows active collaborators
- Colors assigned consistently

## Labels
frontend, realtime""",
            },
            {
                "title": "Add Connection Status Indicator",
                "body": """## Description
Display connection status and sync indicators to users.

## Tasks
- Show connected/connecting/disconnected states
- Add retry button for manual reconnect
- Show offline mode indicator
- Display sync status (saving/saved/error)
- Add helpful error messages

## Acceptance Criteria
- Users know connection state at all times
- Offline mode clearly indicated
- Errors are actionable

## Labels
frontend, ux""",
            },
        ],
    },
    "Phase 3: Real-Time Polish": {
        "description": "Production-quality collaboration with soft locks, conflict UI, and checkpoints.",
        "duration": "2-3 weeks",
        "issues": [
            {
                "title": "Implement Soft Locks",
                "body": """## Description
Add soft lock system to prevent conflicts during drag/resize operations.

## Tasks
- Track dragging state in awareness
- Show lock icon on nodes being dragged
- Prevent selection of locked nodes (with toast)
- Show ghost position preview for locked drags
- Release lock on drag end
- Handle lock timeout on disconnect

## Acceptance Criteria
- Dragging node shows lock to others
- Locked nodes cannot be selected
- Locks release properly on drag end
- No stuck locks from crashed clients

## Labels
realtime, ux""",
            },
            {
                "title": "Add Conflict Notifications",
                "body": """## Description
Show non-blocking notifications when remote changes affect selected nodes.

## Tasks
- Detect when remote change affects selection
- Show non-blocking toast notification
- Display conflicting user's name and action
- Option to undo local pending changes
- Auto-dismiss after timeout

## Acceptance Criteria
- Conflicts detected accurately
- Notifications non-blocking and helpful
- Users can recover from conflicts easily

## Labels
realtime, ux""",
            },
            {
                "title": "Implement Checkpoint System",
                "body": """## Description
Add ability to create and restore snapshots of canvas state.

## Endpoints
- POST /api/canvases/:id/checkpoints - Manual checkpoint
- GET /api/canvases/:id/checkpoints - List checkpoints
- POST /api/checkpoints/:id/restore - Restore from checkpoint

## Tasks
- Implement auto-checkpoint every 5 min
- Create manual checkpoint endpoint
- Store Yjs state in R2
- Build checkpoint list/restore UI
- Add checkpoint labels and descriptions
- Implement garbage collection (keep last 50)

## Acceptance Criteria
- Auto-checkpoints created reliably
- Manual checkpoints can be created
- Restore works without data loss
- Old checkpoints cleaned up

## Labels
api, data-integrity""",
            },
            {
                "title": "Real-Time Performance Optimization",
                "body": """## Description
Optimize performance for multi-user editing scenarios.

## Tasks
- Batch Yjs updates during drag (debounce)
- Throttle remote presence updates (10fps max)
- Optimize re-renders on spec change
- Profile and fix bottlenecks with React DevTools
- Load test with 5+ concurrent users
- Target: 60fps drag with 5 collaborators

## Acceptance Criteria
- Drag maintains 60fps with 5 users
- Presence updates throttled appropriately
- No unnecessary re-renders
- CPU usage acceptable

## Labels
performance, realtime""",
            },
        ],
    },
    "Phase 4: Agent Branches + Proposals": {
        "description": "AI agents can create branches, make changes, and submit proposals for human review.",
        "duration": "4-5 weeks",
        "issues": [
            {
                "title": "Implement Agent Branch System",
                "body": """## Description
Enable agents to fork canvases into isolated branches for experimentation.

## Endpoints
- POST /api/canvases/:id/branches - Create branch
- GET /api/canvases/:id/branches - List branches
- GET /api/branches/:id - Get branch details
- DELETE /api/branches/:id - Delete branch

## Tasks
- Implement branch CRUD endpoints
- Store base version + Yjs state for each branch
- Allow agents to edit branch independently
- Implement garbage collection (7 day expiry)
- Add branch status tracking

## Acceptance Criteria
- Agents can fork canvases to branches
- Branch edits don't affect main canvas
- Branches can be listed and deleted

## Labels
api, agents""",
            },
            {
                "title": "Build Proposal Submission Flow",
                "body": """## Description
Allow agents to submit proposals for merging changes back to main canvas.

## Endpoints
- POST /api/branches/:id/proposals - Submit proposal
- GET /api/canvases/:id/proposals - List proposals
- GET /api/proposals/:id - Get proposal details

## Tasks
- Capture operations, rationale, assumptions, confidence
- Generate preview image (render canvas to image)
- Store in D1 with pending status
- Notify canvas owner via webhook/email
- Track proposal history

## Acceptance Criteria
- Agents can submit proposals
- Proposals include clear rationale
- Canvas owners are notified
- Proposal history maintained

## Labels
api, agents""",
            },
            {
                "title": "Create Proposal Review UI",
                "body": """## Description
Build interface for reviewing and managing agent proposals.

## Tasks
- Build ProposalListPanel component
- Implement ProposalDiffView with visual diff
- Show rationale and assumptions
- Add approve/reject buttons
- Implement merge operation on approve
- Show approval history

## Acceptance Criteria
- Proposals listed with status
- Diff clearly shows changes
- Approve/reject workflows working
- Changes merged correctly

## Labels
frontend, agents""",
            },
            {
                "title": "Add Design Rationale Layer",
                "body": """## Description
Store and display AI reasoning for proposed changes.

## Tasks
- Store rationale in Yjs meta map (keyed by node ID)
- Create RationaleTooltip component
- Show "AI suggested" badge on nodes from proposals
- View full rationale on hover/click
- Display assumptions and confidence score

## Acceptance Criteria
- Rationale visible in canvas
- Tooltips show full AI reasoning
- Confidence scores displayed
- Works across proposal merges

## Labels
frontend, agents""",
            },
            {
                "title": "Agent Token Management",
                "body": """## Description
Implement secure token generation for agent authentication.

## Endpoints
- POST /api/canvases/:id/agent-token - Generate token
- GET /api/agents/tokens - List agent tokens
- DELETE /api/agents/tokens/:id - Revoke token

## Tasks
- Generate JWT tokens with scope/expiry
- Build AgentTokenDialog UI component
- Token includes: scope, expiry, canvasId
- Implement token validation in Worker
- Rate limit tokens separately from users
- Token revocation working

## Acceptance Criteria
- Tokens generated securely
- Tokens include appropriate scopes
- Revocation works immediately
- Rate limits prevent abuse

## Labels
auth, agents""",
            },
        ],
    },
    "Phase 5: Export Pipeline": {
        "description": "Export designs to usable formats for building real applications.",
        "duration": "2-3 weeks",
        "issues": [
            {
                "title": "Implement JSON Canonical Export",
                "body": """## Description
Create stable JSON export format for LayoutSpec designs.

## Endpoints
- POST /api/canvases/:id/export/json

## Tasks
- Define stable export JSON schema with version
- Include metadata (exportedAt, author, title)
- Validate lossless round-trip conversion
- Add export tests
- Document schema

## Acceptance Criteria
- JSON export is lossless
- Round-trip conversion works
- Schema versioned for future changes

## Labels
export, api""",
            },
            {
                "title": "Build React + Tailwind Exporter",
                "body": """## Description
Generate runnable React components with Tailwind CSS from designs.

## Endpoints
- POST /api/canvases/:id/export/react

## Tasks
- Map LayoutSpec nodes to React components
- Generate Tailwind classes for styles
- Handle nested structures
- Output: zip with components + index + package.json
- Add component composition helpers

## Acceptance Criteria
- Exported components are runnable
- Tailwind classes applied correctly
- Nested structures handled properly
- Output is production-ready

## Labels
export, api""",
            },
            {
                "title": "Create Design Tokens Extractor",
                "body": """## Description
Extract design system tokens from designs.

## Endpoints
- POST /api/canvases/:id/export/tokens

## Tasks
- Extract: colors, spacing, typography, radii
- Dedupe and intelligently name tokens
- Generate style-dictionary compatible format
- Add documentation for token usage
- Support multiple output formats

## Acceptance Criteria
- Tokens extracted automatically
- Naming is semantic and consistent
- Output compatible with style-dictionary
- Documentation clear

## Labels
export, api""",
            },
            {
                "title": "Build Export Dialog UI",
                "body": """## Description
Create user interface for exporting designs.

## Tasks
- Build ExportDialog component
- Format selection (JSON/React/Tokens)
- Options per format (component wrapping, naming, etc)
- Download button with progress
- Preview panel (optional)
- Export history

## Acceptance Criteria
- Dialog UX is intuitive
- All formats exportable
- Download works reliably
- Progress visible to user

## Labels
frontend, export""",
            },
        ],
    },
}

def run_gh_command(cmd: list) -> Optional[str]:
    """Run a GitHub CLI command and return output."""
    try:
        result = subprocess.run(
            ["gh"] + cmd,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            print(f"Error running command: {' '.join(cmd)}")
            print(f"stderr: {result.stderr}")
            return None
        return result.stdout.strip()
    except Exception as e:
        print(f"Exception running command: {e}")
        return None

def create_milestone(title: str, description: str, duration: str) -> Optional[str]:
    """Create a GitHub milestone and return its number."""
    print(f"📌 Creating milestone: {title}")
    
    output = run_gh_command([
        "milestone",
        "create",
        "--repo",
        REPO,
        "--title",
        title,
        "--description",
        f"{description}\n\nEstimated Duration: {duration}",
    ])
    
    if output:
        # Extract milestone number from response
        # gh returns JSON with "number" field
        try:
            result = json.loads(output)
            milestone_num = result.get("number")
            print(f"✅ Created milestone #{milestone_num}: {title}")
            return milestone_num
        except:
            print(f"⚠️  Could not parse milestone response: {output}")
            return None
    return None

def create_epic(milestone_num: str, title: str) -> Optional[str]:
    """Create an epic (labeled PR) and return its number."""
    print(f"  📋 Creating epic: {title}")
    
    body = f"""## Epic Overview

This Epic is part of Milestone: {milestone_num}

## Goals

- [ ] Implement all related issues
- [ ] All related Issues are resolved
- [ ] Tests pass
- [ ] Documentation updated

## Acceptance Criteria

- [ ] All planned tasks completed
- [ ] Tests pass
- [ ] Documentation updated

---

**To link issues to this Epic:**
Add a comment on the Issue with: `Part of #{issue_number}`
Or reference in issue body: `Relates to #{issue_number}`
"""
    
    output = run_gh_command([
        "issue",
        "create",
        "--repo",
        REPO,
        "--title",
        f"[{milestone_num}] Epic: {title}",
        "--body",
        body,
        "--label",
        "Epic",
        "--milestone",
        str(milestone_num),
    ])
    
    if output:
        try:
            result = json.loads(output)
            epic_num = result.get("number")
            print(f"✅ Created epic #{epic_num}: {title}")
            return epic_num
        except:
            print(f"⚠️  Could not parse epic response: {output}")
            return None
    return None

def create_issue(milestone_num: str, epic_num: str, title: str, body: str) -> Optional[str]:
    """Create an issue linked to an epic and return its number."""
    # Add epic reference to body
    full_body = f"{body}\n\n---\n\nPart of Epic #{epic_num}"
    
    output = run_gh_command([
        "issue",
        "create",
        "--repo",
        REPO,
        "--title",
        title,
        "--body",
        full_body,
        "--milestone",
        str(milestone_num),
    ])
    
    if output:
        try:
            result = json.loads(output)
            issue_num = result.get("number")
            print(f"✅ Created issue #{issue_num}: {title}")
            return issue_num
        except:
            print(f"⚠️  Could not parse issue response: {output}")
            return None
    return None

def main():
    print("🚀 Creating GitHub Milestones, Epics, and Issues")
    print("=" * 60)
    
    for phase_name, phase_data in PHASES.items():
        print(f"\n{phase_name}")
        print("-" * 60)
        
        # Create milestone
        milestone_num = create_milestone(
            phase_name,
            phase_data["description"],
            phase_data["duration"],
        )
        
        if not milestone_num:
            print(f"❌ Failed to create milestone for {phase_name}")
            continue
        
        # Create epic
        epic_num = create_epic(milestone_num, phase_name.replace("Phase X: ", "").replace("Phase ", ""))
        
        if not epic_num:
            print(f"❌ Failed to create epic for {phase_name}")
            continue
        
        # Create issues
        for issue in phase_data["issues"]:
            issue_num = create_issue(
                milestone_num,
                epic_num,
                issue["title"],
                issue["body"],
            )
            if not issue_num:
                print(f"⚠️  Failed to create issue: {issue['title']}")
    
    print("\n" + "=" * 60)
    print("✨ Done! All milestones, epics, and issues created.")
    print("📊 Visit the Issues tab to see your roadmap!")

if __name__ == "__main__":
    main()
