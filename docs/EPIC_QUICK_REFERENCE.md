# Epic Management Quick Reference

## Creating Hierarchy

```
Milestone (Q1 2026 Release)
  ├── Epic #10 (PR with "Epic" label)
  │   ├── Issue #20
  │   ├── Issue #21
  │   └── Issue #22
  └── Epic #11 (PR with "Epic" label)
      ├── Issue #23
      └── Issue #24
```

## Quick Commands

### Create an Epic
```bash
# 1. Create PR
gh pr create --title "Epic: Feature Name" --body "Epic description"

# 2. Label as Epic
gh pr edit <PR_NUMBER> --add-label "Epic"

# 3. Assign to Milestone
gh pr edit <PR_NUMBER> --milestone "Milestone Name"
```

### Link Issue to Epic
```bash
# Option 1: In issue body
gh issue create --title "Task name" --body "Part of #<EPIC_PR_NUMBER>"

# Option 2: Add comment
gh issue comment <ISSUE_NUMBER> --body "Relates to #<EPIC_PR_NUMBER>"
```

### View Epic Status
```bash
# See all Issues linked to Epic
gh issue list --label "epic:<EPIC_PR_NUMBER>"

# See all Epics in Milestone
gh pr list --milestone "Milestone Name" --label "Epic"
```

### Complete Epic
```bash
# Merge Epic PR - linked Issues auto-close
gh pr merge <EPIC_PR_NUMBER>
```

## Automation Behavior

| Event | Action |
|-------|--------|
| PR labeled "Epic" + has Milestone | Adds tracking comment to PR |
| PR labeled "Epic" without Milestone | Adds warning comment |
| Issue comment with "Part of #123" | Adds `epic:123` label to Issue |
| Epic PR merged | Auto-closes all linked Issues |

## Keywords

Link an Issue to Epic using these phrases in Issue comments or body:
- `Relates to #<EPIC_NUMBER>`
- `Part of #<EPIC_NUMBER>`

## Labels

- `Epic` - Marks a PR as an Epic
- `epic:<NUMBER>` - Auto-added to Issues linked to Epic #NUMBER

## Best Practices

✅ DO:
- Assign Milestones to Epics
- Link Issues to Epics early
- Keep Epic scope focused
- Document Epic goals clearly

❌ DON'T:
- Create Epics without Milestones
- Link one Issue to multiple Epics
- Merge Epic before critical Issues are resolved
- Forget to document Epic-Issue relationships

## Example

```bash
# 1. Create Milestone
gh api repos/OWNER/REPO/milestones \
  -f title="v1.0 Release" \
  -f due_on="2026-03-31T23:59:59Z"

# 2. Create Epic
gh pr create \
  --title "Epic: User Authentication" \
  --label "Epic" \
  --milestone "v1.0 Release"
# Returns: Created pull request #10

# 3. Create Issues
gh issue create \
  --title "Implement login form" \
  --body "Part of #10"

gh issue create \
  --title "Add password reset" \
  --body "Part of #10"

gh issue create \
  --title "Setup OAuth" \
  --body "Part of #10"

# 4. Work on Issues and Epic...

# 5. Merge Epic when ready
gh pr merge 10
# Result: Issues auto-close with confirmation comment
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Issue not linked | Check comment format: exact "Part of #123" |
| Epic warning about Milestone | Assign Milestone: `gh pr edit X --milestone "NAME"` |
| Issues not auto-closed | Verify `epic:NUMBER` label exists |
| Workflow not running | Check GitHub Actions logs |

## See Also

- [Full Documentation](./EPIC_MANAGEMENT.md)
- [GitHub Actions Workflow](../.github/workflows/epic-management.yml)
