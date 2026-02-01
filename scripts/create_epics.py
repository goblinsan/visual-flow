#!/usr/bin/env python3
import subprocess
import json

REPO = "goblinsan/vizail"

def create_epic(title, body, *labels):
    result = subprocess.run(
        ["gh", "api", "-X", "POST", f"/repos/{REPO}/issues",
         "-f", f"title={title}",
         "-f", f"body={body}"],
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"  ❌ {title}: {result.stderr[:80]}")
        return None
    
    try:
        data = json.loads(result.stdout)
        num = data.get("number")
        print(f"  ✅ Epic #{num}: {title[:40]}")
        
        # Add labels
        for label in labels:
            subprocess.run(["gh", "issue", "edit", str(num), "--add-label", label],
                          capture_output=True)
        return num
    except Exception as e:
        print(f"  ❌ Parse error: {e}")
        return None

print("Creating Epic Issues...\n")

epics = {
    0: create_epic(
        "🎯 Epic: Phase 0 - Prep & Hardening",
        """# Phase 0: Prep & Hardening

**Goal:** Stabilize codebase, improve type safety, add telemetry, prepare for cloud migration.

## Child Issues
- #12: Complete Command Pattern Integration
- #13: Add Schema Versioning & Migration
- #14: Add Error Boundary & Telemetry
- #15: Lint & Type Safety Pass

## Estimated Duration
2-3 weeks

## Acceptance Criteria
- All spec mutations go through command system
- App gracefully handles corrupt localStorage
- LayoutSpec has version field with migration path
- 80%+ test coverage on commands/, persistence.ts
""",
        "epic", "phase-0"
    ),
    
    1: create_epic(
        "🎯 Epic: Phase 1 - Cloud Persistence & Sharing",
        """# Phase 1: Cloud Persistence + Sharing

**Goal:** Replace localStorage with cloud storage, enable canvas sharing with basic roles.

**Depends on:** #39 (Phase 0 epic)

## Child Issues
- #16: Set Up Cloudflare Infrastructure
- #17: Implement Canvas CRUD API
- #18: Create useCloudPersistence Hook
- #19: Implement Sharing & Memberships
- #20: Add Cloudflare Access Integration

## Estimated Duration
3-4 weeks

## Acceptance Criteria
- Existing app works identically with cloud backend
- Can share canvas via email invite
- Viewers cannot edit
- Offline mode: localStorage fallback with sync on reconnect
""",
        "epic", "phase-1"
    ),
    
    2: create_epic(
        "🎯 Epic: Phase 2 - Real-Time Collaboration MVP",
        """# Phase 2: Real-Time Collaboration MVP

**Goal:** Multiple users editing same canvas simultaneously with presence indicators.

**Depends on:** #40 (Phase 1 epic)

## Child Issues
- #21: Set Up Yjs + Durable Objects
- #22: Create Yjs-LayoutSpec Conversion Layer
- #23: Build useRealtimeCanvas Hook
- #24: Implement Presence UI
- #25: Add Connection Status Indicator

## Estimated Duration
4-5 weeks

## Acceptance Criteria
- Two users see each other's changes within 100ms
- Cursor positions visible for all collaborators
- Selection boxes show who has what selected
- Disconnect/reconnect preserves state
""",
        "epic", "phase-2"
    ),
    
    3: create_epic(
        "🎯 Epic: Phase 3 - Real-Time Polish",
        """# Phase 3: Real-Time Polish

**Goal:** Production-quality collaboration with soft locks, conflict UI, and checkpoints.

**Depends on:** #41 (Phase 2 epic)

## Child Issues
- #26: Implement Soft Locks
- #27: Add Conflict Notifications
- #28: Implement Checkpoint System
- #29: Real-Time Performance Optimization

## Estimated Duration
2-3 weeks

## Acceptance Criteria
- Dragging node shows lock to others
- Conflicting edits show non-blocking notification
- Auto-checkpoint every 5 minutes
- Can restore to any checkpoint
- 60fps drag with 5 collaborators
""",
        "epic", "phase-3"
    ),
    
    4: create_epic(
        "🎯 Epic: Phase 4 - Agent Branches & Proposals",
        """# Phase 4: Agent Branches + Proposals

**Goal:** AI agents can create branches, make changes, submit proposals for human review.

**Depends on:** #42 (Phase 3 epic)

## Child Issues
- #30: Implement Agent Branch System
- #31: Build Proposal Submission Flow
- #32: Create Proposal Review UI
- #33: Add Design Rationale Layer
- #34: Agent Token Management

## Estimated Duration
4-5 weeks

## Acceptance Criteria
- Agent can fork canvas into branch
- Agent proposals show clear diff
- Rationale visible per-operation
- Human must approve before merge
- Merged changes appear in main canvas
""",
        "epic", "phase-4"
    ),
    
    5: create_epic(
        "🎯 Epic: Phase 5 - Export Pipeline",
        """# Phase 5: Export Pipeline

**Goal:** Export designs to usable formats for building real applications.

**Can start after:** #41 (Phase 2 epic) - runs in parallel to Phase 4

## Child Issues
- #35: Implement JSON Canonical Export
- #36: Build React + Tailwind Exporter
- #37: Create Design Tokens Extractor
- #38: Build Export Dialog UI

## Estimated Duration
2-3 weeks

## Acceptance Criteria
- JSON export is lossless round-trip
- React export produces runnable components
- Tokens export compatible with style-dictionary
- Export respects node semantic hints
""",
        "epic", "phase-5"
    ),
}

print("\n" + "="*60)
print("✅ Epic issues created!")
print("="*60)
print("\nDependency chain:")
print("  Phase 0 (epic) → Phase 1 (epic) → Phase 2 (epic) → Phase 3 (epic) → Phase 4 (epic)")
print("                                      ↓")
print("                              Phase 5 (epic) [parallel]")
print(f"\nVisit: https://github.com/{REPO}/issues")
