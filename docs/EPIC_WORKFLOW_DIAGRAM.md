# Epic Management Workflow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        PROJECT HIERARCHY                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Milestone: "Q1 2026 Release"                                        │
│  │                                                                    │
│  ├─► Epic #10 (PR + "Epic" label)                                   │
│  │   │                                                               │
│  │   ├─► Issue #20 (labeled "epic:10")                              │
│  │   ├─► Issue #21 (labeled "epic:10")                              │
│  │   └─► Issue #22 (labeled "epic:10")                              │
│  │                                                                    │
│  ├─► Epic #11 (PR + "Epic" label)                                   │
│  │   │                                                               │
│  │   ├─► Issue #23 (labeled "epic:11")                              │
│  │   ├─► Issue #24 (labeled "epic:11")                              │
│  │   └─► Issue #25 (labeled "epic:11")                              │
│  │                                                                    │
│  └─► Epic #12 (PR + "Epic" label)                                   │
│      │                                                                │
│      ├─► Issue #26 (labeled "epic:12")                              │
│      └─► Issue #27 (labeled "epic:12")                              │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Workflow Automation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    1. CREATE EPIC                                    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │  Create PR          │
                    │  Add "Epic" label   │
                    │  Assign Milestone   │
                    └─────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │  Workflow Triggers  │
                    │  on: pull_request   │
                    │  type: labeled      │
                    └─────────────────────┘
                                │
                                ▼
                ┌───────────────────────────────┐
                │  Check if Epic has Milestone  │
                └───────────────────────────────┘
                    │                      │
            Yes     │                      │  No
                    ▼                      ▼
        ┌──────────────────┐    ┌──────────────────┐
        │ Add tracking     │    │ Add warning      │
        │ comment to PR    │    │ comment to PR    │
        └──────────────────┘    └──────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    2. LINK ISSUE TO EPIC                             │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │  Create Issue       │
                    │  Add comment:       │
                    │  "Part of #10"      │
                    └─────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │  Workflow Triggers  │
                    │  on: issue_comment  │
                    │  type: created      │
                    └─────────────────────┘
                                │
                                ▼
                ┌────────────────────────────────┐
                │  Parse comment for Epic refs   │
                │  Search for "Part of #N" or    │
                │  "Relates to #N"               │
                └────────────────────────────────┘
                                │
                    Found       │          Not Found
                                ▼
                    ┌─────────────────────┐
                    │  Check if PR #N     │
                    │  has "Epic" label   │
                    └─────────────────────┘
                        │              │
                Yes     │              │  No
                        ▼              ▼
            ┌──────────────┐   ┌──────────────┐
            │ Add label    │   │ Add warning  │
            │ "epic:N"     │   │ comment      │
            │              │   └──────────────┘
            │ Add confirm  │
            │ comment      │
            └──────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    3. MERGE EPIC                                     │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │  Merge Epic PR #10  │
                    └─────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │  Workflow Triggers  │
                    │  on: pull_request   │
                    │  type: closed       │
                    │  merged: true       │
                    └─────────────────────┘
                                │
                                ▼
                ┌────────────────────────────────┐
                │  Check if PR has "Epic" label  │
                └────────────────────────────────┘
                                │
                        Yes     │
                                ▼
                ┌────────────────────────────────┐
                │  Find all linked Issues:       │
                │  1. Search for "epic:10" label │
                │  2. Search in comments         │
                │  3. Check cross-references     │
                └────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │  For each Issue:    │
                    └─────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │  Close Issue        │
                    │  Add comment:       │
                    │  "✅ Closed because  │
                    │  Epic #10 merged"   │
                    └─────────────────────┘
```

## Event Triggers

```
┌────────────────────────────────────────────────────────────┐
│                    WORKFLOW TRIGGERS                        │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  pull_request:                                             │
│    ├─ opened          → Check Epic/Milestone               │
│    ├─ labeled         → Check Epic/Milestone               │
│    ├─ unlabeled       → Remove Epic tracking               │
│    ├─ closed          → Auto-close linked Issues (if merged)│
│    ├─ edited          → Update Epic info                   │
│    └─ synchronize     → Update status                      │
│                                                             │
│  issues:                                                    │
│    ├─ opened          → (Reserved for future use)          │
│    ├─ labeled         → (Reserved for future use)          │
│    ├─ unlabeled       → (Reserved for future use)          │
│    ├─ edited          → (Reserved for future use)          │
│    └─ closed          → (Reserved for future use)          │
│                                                             │
│  issue_comment:                                            │
│    ├─ created         → Link Issue to Epic                 │
│    └─ edited          → Update Epic link                   │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## State Transitions

```
Issue Lifecycle with Epic

┌─────────────┐
│   Created   │  Issue created
└─────────────┘
      │
      │  Comment: "Part of #10"
      ▼
┌─────────────┐
│   Linked    │  Label "epic:10" added
└─────────────┘  Confirmation comment added
      │
      │  Work in progress
      ▼
┌─────────────┐
│ In Progress │  (Optional: manual status update)
└─────────────┘
      │
      │  Epic #10 merged
      ▼
┌─────────────┐
│   Closed    │  Automatically closed
└─────────────┘  Comment: "✅ Closed because Epic #10 merged"


Epic Lifecycle with Milestone

┌─────────────┐
│ PR Created  │  Pull request created
└─────────────┘
      │
      │  Add "Epic" label
      ▼
┌─────────────┐
│   Is Epic   │  Workflow checks for Milestone
└─────────────┘
      │
      ├─► No Milestone  → Warning comment added
      │
      └─► Has Milestone → Tracking comment added
            │
            │  Issues link to Epic
            ▼
      ┌─────────────┐
      │ Epic Active │  Work progresses on linked Issues
      └─────────────┘
            │
            │  All work complete
            ▼
      ┌─────────────┐
      │   Merged    │  Linked Issues auto-close
      └─────────────┘
```

## Permissions Required

```
┌──────────────────────────────────────────────────────────┐
│                  GITHUB PERMISSIONS                       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  REQUIRED:                                               │
│    ✓ contents: read       → Read repository data        │
│    ✓ issues: write        → Close Issues, add labels    │
│    ✓ pull-requests: write → Add comments to PRs         │
│                                                           │
│  OPTIONAL (Future):                                      │
│    ○ projects: write      → Update GitHub Projects      │
│    ○ repository-projects  → Read/write Projects v2      │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│              GITHUB API INTEGRATION                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  REST API:                                                  │
│    • POST /repos/{owner}/{repo}/issues/{number}/comments   │
│    • POST /repos/{owner}/{repo}/issues/{number}/labels     │
│    • PATCH /repos/{owner}/{repo}/issues/{number}           │
│                                                              │
│  GraphQL API:                                               │
│    • query: repository.pullRequest.timelineItems           │
│    • query: search (type: ISSUE)                           │
│                                                              │
│  GitHub CLI (gh):                                           │
│    • gh pr view/edit/comment                               │
│    • gh issue view/edit/comment/close                      │
│    • gh api (for direct API calls)                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Legend

```
Symbol Meanings:

  ┌─────┐
  │ Box │    = Process or State
  └─────┘

     │
     ▼         = Flow Direction

  ├─►          = Conditional Branch

  ✓            = Enabled/Required
  ○            = Optional
  
  #10          = Pull Request number
  #20          = Issue number
```
