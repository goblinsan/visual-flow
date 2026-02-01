#!/usr/bin/env python3
import subprocess
import json

REPO = "goblinsan/visual-flow"

def run_gh(*args):
    result = subprocess.run(
        ["gh"] + list(args),
        capture_output=True,
        text=True
    )
    return result.stdout.strip(), result.stderr.strip(), result.returncode

def create_milestone(title, description):
    # Milestones already exist, just get the number
    stdout, stderr, code = run_gh(
        "api", "/repos/{REPO}/milestones".format(REPO=REPO),
        "-q", ".[].number", "-q", ".[].title"
    )
    # Parse the milestones and find the matching one
    milestones_out, _, _ = run_gh(
        "api", "/repos/{REPO}/milestones".format(REPO=REPO)
    )
    try:
        milestones = json.loads(milestones_out)
        for m in milestones:
            if m.get("title") == title:
                print(f"📌 Using existing milestone: {title} (#{m['number']})")
                return m["number"]
    except:
        pass
    return None

def create_issue(title, body, milestone_num, *labels):
    print(f"    📋 Creating issue: {title[:50]}...")
    cmd = [
        "api", "-X", "POST",
        f"/repos/{REPO}/issues",
        "-f", f"title={title}",
        "-f", f"body={body}",
    ]
    if milestone_num:
        cmd.extend(["-f", f"milestone={milestone_num}"])
    
    stdout, stderr, code = run_gh(*cmd)
    if code != 0:
        print(f"    Error: {stderr[:80]}")
        return None
    try:
        data = json.loads(stdout)
        num = data.get("number")
        print(f"    ✅ Issue #{num}")
        
        # Add labels separately
        if labels:
            labels_list = list(labels)
            for label in labels_list:
                run_gh("issue", "edit", str(num), "--add-label", label)
        
        return num
    except:
        return None

# Phase 0
print("\n=== PHASE 0: Prep & Hardening ===")
m0 = create_milestone("Phase 0: Prep & Hardening", "Stabilize codebase, improve type safety, add telemetry, prepare for cloud migration.")
if m0:
    create_issue("Complete Command Pattern Integration", "Audit all setSpec calls in CanvasStage.tsx and route through command system.", m0, "enhancement", "tech-debt", "priority-high")
    create_issue("Add Schema Versioning & Migration", "Add version field to LayoutSpec and create migration infrastructure for future schema changes.", m0, "enhancement", "data-integrity")
    create_issue("Add Error Boundary & Telemetry", "Add error boundary around canvas and basic telemetry hook for observability.", m0, "enhancement", "reliability")
    create_issue("Lint & Type Safety Pass", "Eliminate remaining any types and improve type safety across the codebase.", m0, "tech-debt", "types")

# Phase 1
print("\n=== PHASE 1: Cloud Persistence + Sharing ===")
m1 = create_milestone("Phase 1: Cloud Persistence + Sharing", "Replace localStorage with cloud storage, enable canvas sharing with basic roles.")
if m1:
    create_issue("Set Up Cloudflare Infrastructure", "Initialize Cloudflare Pages and Workers infrastructure for cloud deployment.", m1, "infrastructure", "priority-high")
    create_issue("Implement Canvas CRUD API", "Build REST API endpoints for canvas management (create, read, update, delete).", m1, "api", "priority-high")
    create_issue("Create useCloudPersistence Hook", "Build drop-in replacement for useDesignPersistence that syncs with cloud backend.", m1, "frontend", "priority-high")
    create_issue("Implement Sharing & Memberships", "Add ability to share canvases with other users with role-based access control.", m1, "api", "frontend")
    create_issue("Add Cloudflare Access Integration", "Implement authentication via Cloudflare Access for Phase 1 (friends-only mode).", m1, "auth", "infrastructure")

# Phase 2
print("\n=== PHASE 2: Real-Time Collaboration MVP ===")
m2 = create_milestone("Phase 2: Real-Time Collaboration MVP", "Multiple users editing same canvas simultaneously with presence indicators.")
if m2:
    create_issue("Set Up Yjs + Durable Objects", "Initialize Yjs CRDT library and create Durable Object infrastructure for realtime rooms.", m2, "infrastructure", "realtime", "priority-high")
    create_issue("Create Yjs-LayoutSpec Conversion Layer", "Build conversion functions between LayoutSpec and Yjs document structures.", m2, "realtime", "data")
    create_issue("Build useRealtimeCanvas Hook", "Create React hook for managing realtime canvas connections and state sync.", m2, "frontend", "realtime")
    create_issue("Implement Presence UI", "Build visual indicators showing other users' cursors and selections.", m2, "frontend", "realtime")
    create_issue("Add Connection Status Indicator", "Display connection status and sync indicators to users.", m2, "frontend", "ux")

# Phase 3
print("\n=== PHASE 3: Real-Time Polish ===")
m3 = create_milestone("Phase 3: Real-Time Polish", "Production-quality collaboration with soft locks, conflict UI, and checkpoints.")
if m3:
    create_issue("Implement Soft Locks", "Add soft lock system to prevent conflicts during drag/resize operations.", m3, "realtime", "ux")
    create_issue("Add Conflict Notifications", "Show non-blocking notifications when remote changes affect selected nodes.", m3, "realtime", "ux")
    create_issue("Implement Checkpoint System", "Add ability to create and restore snapshots of canvas state.", m3, "api", "data-integrity")
    create_issue("Real-Time Performance Optimization", "Optimize performance for multi-user editing scenarios.", m3, "performance", "realtime")

# Phase 4
print("\n=== PHASE 4: Agent Branches + Proposals ===")
m4 = create_milestone("Phase 4: Agent Branches + Proposals", "AI agents can create branches, make changes, and submit proposals for human review.")
if m4:
    create_issue("Implement Agent Branch System", "Enable agents to fork canvases into isolated branches for experimentation.", m4, "api", "agents")
    create_issue("Build Proposal Submission Flow", "Allow agents to submit proposals for merging changes back to main canvas.", m4, "api", "agents")
    create_issue("Create Proposal Review UI", "Build interface for reviewing and managing agent proposals.", m4, "frontend", "agents")
    create_issue("Add Design Rationale Layer", "Store and display AI reasoning for proposed changes.", m4, "frontend", "agents")
    create_issue("Agent Token Management", "Implement secure token generation for agent authentication.", m4, "auth", "agents")

# Phase 5
print("\n=== PHASE 5: Export Pipeline ===")
m5 = create_milestone("Phase 5: Export Pipeline", "Export designs to usable formats for building real applications.")
if m5:
    create_issue("Implement JSON Canonical Export", "Create stable JSON export format for LayoutSpec designs.", m5, "export", "api")
    create_issue("Build React + Tailwind Exporter", "Generate runnable React components with Tailwind CSS from designs.", m5, "export", "api")
    create_issue("Create Design Tokens Extractor", "Extract design system tokens from designs.", m5, "export", "api")
    create_issue("Build Export Dialog UI", "Create user interface for exporting designs.", m5, "frontend", "export")

print("\n" + "="*60)
print("✨ Done! All milestones and issues created.")
print("📊 Visit: https://github.com/goblinsan/visual-flow/issues")
