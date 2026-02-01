# Vizail Roadmap - Issue & Execution Order

> Last updated: 2026-02-01  
> Total Issues: 33 child + 6 epic = 39 total  
> Estimated Timeline: ~18-22 weeks

---

## Quick Reference

### Execution Order

```
Phase 0 (Week 1-3)     [#45 Epic - #12,#13,#14,#15]
    ↓
Phase 1 (Week 4-7)     [#46 Epic - #16,#17,#18,#19,#20]
    ↓
Phase 2 (Week 8-12)    [#47 Epic - #21,#22,#23,#24,#25]
    ↓ ↘
Phase 3 (Week 13-15)   [#48 Epic - #26,#27,#28,#29]
    ↓ ↘ (Phase 5 can start here)
Phase 4 (Week 16-20)   [#49 Epic - #30,#31,#32,#33,#34]
    ↓
Phase 5 (Week 8-22)    [#50 Epic - #35,#36,#37,#38] (parallel after Phase 2)
```

---

## Phase 0: Prep & Hardening
**Epic:** [#45](https://github.com/goblinsan/vizail/issues/45)  
**Duration:** 2-3 weeks  
**Milestone:** [Phase 0: Prep & Hardening](https://github.com/goblinsan/vizail/milestone/1)

### Execution Order Within Phase 0
1. **#15** - Lint & Type Safety Pass
   - First: need clean codebase before making changes
   - Dependencies: None

2. **#12** - Complete Command Pattern Integration
   - Depends on: #15 (type safety)
   - Dependencies: None

3. **#13** - Add Schema Versioning & Migration
   - Depends on: #12 (clean commands)
   - Creates foundation for future schema changes

4. **#14** - Add Error Boundary & Telemetry
   - Depends on: #12, #13 (stable foundation)
   - Last: observability before cloud migration

---

## Phase 1: Cloud Persistence & Sharing
**Epic:** [#46](https://github.com/goblinsan/vizail/issues/46)  
**Duration:** 3-4 weeks  
**Milestone:** [Phase 1: Cloud Persistence + Sharing](https://github.com/goblinsan/vizail/milestone/2)  
**Depends on:** Phase 0 ✓

### Execution Order Within Phase 1
1. **#16** - Set Up Cloudflare Infrastructure
   - First: foundational infrastructure
   - Creates Pages, Workers, D1, wrangler setup
   - Dependencies: None (can start immediately after Phase 0)

2. **#17** - Implement Canvas CRUD API
   - Depends on: #16 (infrastructure)
   - Build REST endpoints for canvas management

3. **#20** - Add Cloudflare Access Integration
   - Depends on: #16, #17
   - Auth before allowing data access

4. **#18** - Create useCloudPersistence Hook
   - Depends on: #17, #20 (API + auth ready)
   - Drop-in replacement for localStorage

5. **#19** - Implement Sharing & Memberships
   - Depends on: #18, #20 (auth established)
   - Role-based access control

---

## Phase 2: Real-Time Collaboration MVP
**Epic:** [#47](https://github.com/goblinsan/vizail/issues/47)  
**Duration:** 4-5 weeks  
**Milestone:** [Phase 2: Real-Time Collaboration MVP](https://github.com/goblinsan/vizail/milestone/3)  
**Depends on:** Phase 1 ✓

### Execution Order Within Phase 2
1. **#21** - Set Up Yjs + Durable Objects
   - First: foundational realtime infrastructure
   - Create DO class, WebSocket handling
   - Dependencies: None (builds on Phase 1 workers)

2. **#22** - Create Yjs-LayoutSpec Conversion Layer
   - Depends on: #21 (have Yjs installed)
   - Core mapping between app state and CRDT

3. **#23** - Build useRealtimeCanvas Hook
   - Depends on: #21, #22 (have conversion layer)
   - React integration for realtime sync

4. **#25** - Add Connection Status Indicator
   - Depends on: #23 (connection management)
   - UI feedback before presence layer

5. **#24** - Implement Presence UI
   - Depends on: #23, #25 (connection stable)
   - Final layer: cursors and selection boxes

---

## Phase 3: Real-Time Polish
**Epic:** [#48](https://github.com/goblinsan/vizail/issues/48)  
**Duration:** 2-3 weeks  
**Milestone:** [Phase 3: Real-Time Polish](https://github.com/goblinsan/vizail/milestone/4)  
**Depends on:** Phase 2 ✓

### Execution Order Within Phase 3
1. **#28** - Implement Checkpoint System
   - First: infrastructure for snapshots
   - Add D1 table, R2 storage, API endpoints
   - Can be started early (somewhat independent)

2. **#26** - Implement Soft Locks
   - Depends on: #28 (checkpoint safety net)
   - Conflict prevention during drag/resize

3. **#27** - Add Conflict Notifications
   - Depends on: #26 (soft locks in place)
   - Non-blocking UX for conflicts

4. **#29** - Real-Time Performance Optimization
   - Last: performance improvements across all realtime features
   - Depends on: #26, #27 (have features to optimize)

---

## Phase 4: Agent Branches & Proposals
**Epic:** [#49](https://github.com/goblinsan/vizail/issues/49)  
**Duration:** 4-5 weeks  
**Milestone:** [Phase 4: Agent Branches + Proposals](https://github.com/goblinsan/vizail/milestone/5)  
**Depends on:** Phase 3 ✓

### Execution Order Within Phase 4
1. **#34** - Agent Token Management
   - First: security foundation for agents
   - Token generation, validation, revocation
   - Dependencies: Phase 3 complete

2. **#30** - Implement Agent Branch System
   - Depends on: #34 (token auth)
   - Fork canvases for agent editing

3. **#31** - Build Proposal Submission Flow
   - Depends on: #30 (branch system)
   - Agent submits proposed changes

4. **#33** - Add Design Rationale Layer
   - Depends on: #31 (have proposals)
   - AI reasoning attached to changes

5. **#32** - Create Proposal Review UI
   - Depends on: #31, #33 (proposals with rationale)
   - Human review and merge interface

---

## Phase 5: Export Pipeline
**Epic:** [#50](https://github.com/goblinsan/vizail/issues/50)  
**Duration:** 2-3 weeks  
**Milestone:** [Phase 5: Export Pipeline](https://github.com/goblinsan/vizail/milestone/6)  
**Can start:** After Phase 2 (runs parallel to Phase 3/4)

### Execution Order Within Phase 5
1. **#35** - Implement JSON Canonical Export
   - First: stable format foundation
   - Define schema, implement exporter
   - Can start after Phase 2 ✓

2. **#37** - Create Design Tokens Extractor
   - Depends on: #35 (have export infrastructure)
   - Token extraction logic

3. **#36** - Build React + Tailwind Exporter
   - Depends on: #35, #37 (tokens available)
   - Code generation for components

4. **#38** - Build Export Dialog UI
   - Last: user-facing interface
   - Depends on: #35, #36, #37 (all exporters ready)

---

## GitHub Links

### Epics (Track Dependencies)
- [#45 Phase 0](https://github.com/goblinsan/vizail/issues/45)
- [#46 Phase 1](https://github.com/goblinsan/vizail/issues/46)
- [#47 Phase 2](https://github.com/goblinsan/vizail/issues/47)
- [#48 Phase 3](https://github.com/goblinsan/vizail/issues/48)
- [#49 Phase 4](https://github.com/goblinsan/vizail/issues/49)
- [#50 Phase 5](https://github.com/goblinsan/vizail/issues/50)

### Milestones
- [All Issues](https://github.com/goblinsan/vizail/issues)
- [Phase 0 Milestone](https://github.com/goblinsan/vizail/milestone/1)
- [Phase 1 Milestone](https://github.com/goblinsan/vizail/milestone/2)
- [Phase 2 Milestone](https://github.com/goblinsan/vizail/milestone/3)
- [Phase 3 Milestone](https://github.com/goblinsan/vizail/milestone/4)
- [Phase 4 Milestone](https://github.com/goblinsan/vizail/milestone/5)
- [Phase 5 Milestone](https://github.com/goblinsan/vizail/milestone/6)

### Project Board
- [Vizail Roadmap Project](https://github.com/goblinsan/vizail/projects/4)

---

## Key Insights

### Critical Path
**Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4**
- Total: ~16 weeks minimum
- Each phase blocks the next due to infrastructure dependencies

### Parallel Opportunity
**Phase 5 can start after Phase 2 completes**
- Export doesn't require realtime features
- Saves ~2 weeks vs. sequential
- Can overlap Phase 3 & 4 if team splits

### Within-Phase Dependencies
Most phases have a natural ordering:
1. Infrastructure/foundations first
2. Core features second
3. Polish/UX last
4. Performance optimization last

### Risks & Mitigations
| Risk | Phase | Mitigation |
|------|-------|-----------|
| Cloudflare learning curve | 1 | Start with docs, simple API first |
| Yjs complexity | 2 | Deep dive on CRDT, test conversion thoroughly |
| Performance bottleneck | 3 | Profile early, optimize iteratively |
| Agent orchestration unclear | 4 | Define API contract before implementation |
| Export completeness | 5 | Clarify semantic hints in Phase 0 |

---

## Estimated Person-Weeks by Phase

| Phase | Tasks | Est. Weeks | Notes |
|-------|-------|-----------|-------|
| 0 | 4 | 2-3 | Foundation work, should be quick |
| 1 | 5 | 3-4 | Infrastructure setup takes time |
| 2 | 5 | 4-5 | Yjs learning curve significant |
| 3 | 4 | 2-3 | Optimization/polish phase |
| 4 | 5 | 4-5 | New territory (agents), may need iteration |
| 5 | 4 | 2-3 | Can parallelize some work |
| **Total** | **27** | **18-22** | **One person or distributed team** |

---

## Usage Tips

1. **For sprint planning**: Copy the "Execution Order Within Phase X" table to your sprint board
2. **To track progress**: Use the [Project Board](https://github.com/goblinsan/vizail/projects/4) to move issues through columns
3. **For dependencies**: Check the Epic issue descriptions for "Depends on" notes
4. **For context**: Read [COLLABORATION_ROADMAP.md](COLLABORATION_ROADMAP.md) for deep technical details
