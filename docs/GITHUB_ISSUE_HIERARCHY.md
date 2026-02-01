# Milestone → Epic → Issue Creation & Linking (GitHub)

This doc captures a repeatable, low-friction workflow for creating milestones, epics, child issues, and **linking parent/child relationships programmatically** using GitHub’s GraphQL API.

---

## 0) Prereqs

- GitHub CLI installed and authenticated (`gh auth status`).
- Repo context set (run commands from repo root or set `GH_REPO`).
- Labels created ahead of time.

---

## 1) Create Milestones

Create milestones with `gh api`:

```bash
gh api -X POST /repos/{owner}/{repo}/milestones \
  -f title="Phase 0: Prep & Hardening" \
  -f description="Stabilize codebase, improve type safety, add telemetry, prepare for cloud migration."
```

List milestones:

```bash
gh api /repos/{owner}/{repo}/milestones --jq '.[] | {number, title}'
```

---

## 2) Create Epics (Issues tagged as Epics)

Create epics like normal issues, then label them (e.g., `epic`).

```bash
gh api -X POST /repos/{owner}/{repo}/issues \
  -f title="1. Phase 0 - Prep & Hardening" \
  -f body="Epic overview..." \
  -f milestone=<MILESTONE_NUMBER>
```

```bash
gh issue edit <EPIC_NUMBER> --add-label epic
```

---

## 3) Create Child Issues

Create child issues normally, assign milestone + labels:

```bash
gh api -X POST /repos/{owner}/{repo}/issues \
  -f title="Complete Command Pattern Integration" \
  -f body="<Detailed tasks + acceptance criteria>" \
  -f milestone=<MILESTONE_NUMBER>

# Add labels
gh issue edit <ISSUE_NUMBER> --add-label enhancement --add-label priority-high
```

---

## 4) Link Children to Parent Epic (GraphQL)

**Critical:** GitHub’s REST API does *not* support setting parent/child relationships. The UI uses a GraphQL mutation called `addSubIssue`.

### 4.1 Fetch Issue IDs

```bash
gh api graphql -f query='query { repository(owner:"<owner>", name:"<repo>") { issue(number: 45) { id } } }'
```

Repeat for each child issue. You need the **global node ID** (e.g., `I_kwDOPwpDSc7nY-NI`).

### 4.2 Link Parent → Child

Use `addSubIssue` with `issueId` = parent and `subIssueId` = child:

```bash
gh api graphql \
  -f query='mutation AddSubIssue($issueId: ID!, $subIssueId: ID!, $replaceParent: Boolean) { addSubIssue(input: {issueId: $issueId, subIssueId: $subIssueId, replaceParent: $replaceParent}) { subIssue { id parent { number } } } }' \
  -f issueId='<PARENT_ID>' \
  -f subIssueId='<CHILD_ID>' \
  -F replaceParent=true
```

If you get “duplicate sub-issues”, it’s already linked.

---

## 5) Script Template (Bulk Linking)

Use this template to link many issues in one pass:

```python
#!/usr/bin/env python3
import subprocess
import json

REPO = "<owner>/<repo>"

PHASE_MAP = {
    45: [12, 13, 14, 15],
    46: [16, 17, 18, 19, 20],
}

def issue_id(issue_num):
    query = f"""
    query {{
      repository(owner: "<owner>", name: "<repo>") {{
        issue(number: {issue_num}) {{ id }}
      }}
    }}
    """
    out = subprocess.check_output(["gh","api","graphql","-f",f"query={query}"])
    return json.loads(out)["data"]["repository"]["issue"]["id"]

def link(parent_id, child_id):
    mutation = """
    mutation AddSubIssue($issueId: ID!, $subIssueId: ID!, $replaceParent: Boolean) {
      addSubIssue(input: {issueId: $issueId, subIssueId: $subIssueId, replaceParent: $replaceParent}) {
        subIssue { id parent { number } }
      }
    }
    """
    subprocess.check_call([
        "gh", "api", "graphql",
        "-f", f"query={mutation}",
        "-f", f"issueId={parent_id}",
        "-f", f"subIssueId={child_id}",
        "-F", "replaceParent=true",
    ])

for parent, children in PHASE_MAP.items():
    parent_id = issue_id(parent)
    for child in children:
        child_id = issue_id(child)
        link(parent_id, child_id)
        print(f"Linked #{child} → #{parent}")
```

---

## 6) Verify Relationships (GraphQL)

### Check a child’s parent:

```bash
gh api graphql -f query='query { repository(owner:"<owner>", name:"<repo>") { issue(number: 13) { parent { number } } } }'
```

### Check parent’s sub-issues:

```bash
gh api graphql -f query='query { repository(owner:"<owner>", name:"<repo>") { issue(number: 45) { subIssues(first: 50) { nodes { number } } } } }'
```

---

## 7) Gotchas

- **REST API won’t work** for parent/child relationships.
- Use GraphQL `addSubIssue` with **parent as `issueId`** and **child as `subIssueId`**.
- `replaceParent=true` allows reassigning a child to a new epic.
- GitHub UI can lag; verify via GraphQL if needed.

---

## 8) Recommended Order of Operations

1. Create labels
2. Create milestones
3. Create epics (issues with `epic` label)
4. Create child issues
5. Link children via GraphQL `addSubIssue`
6. Verify with GraphQL

---

## 9) Source of Truth

Use this document as the canonical reference for creating and linking issues in future projects.
