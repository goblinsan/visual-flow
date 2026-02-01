# Getting Started with Epic Management

## 5-Minute Quick Start

This guide will help you start using the Epic management system in 5 minutes.

## Step 1: Create a Milestone (30 seconds)

```bash
gh api repos/OWNER/REPO/milestones \
  -f title="v1.0 Release" \
  -f due_on="2026-12-31T23:59:59Z"
```

Or use the GitHub UI:
1. Go to Issues → Milestones → New milestone
2. Enter title, description, and due date
3. Click "Create milestone"

## Step 2: Create Your First Epic (1 minute)

```bash
# Create PR
gh pr create \
  --title "Epic: User Authentication" \
  --body "Implement complete user authentication system"

# Add Epic label
gh pr edit <PR_NUMBER> --add-label "Epic"

# Assign to Milestone
gh pr edit <PR_NUMBER> --milestone "v1.0 Release"
```

**Result**: The workflow will add a tracking comment to your PR explaining how to link Issues.

## Step 3: Create and Link Issues (2 minutes)

```bash
# Create Issues with Epic reference in body
gh issue create \
  --title "Design login form" \
  --body "Part of #<EPIC_PR_NUMBER>"

gh issue create \
  --title "Implement OAuth" \
  --body "Part of #<EPIC_PR_NUMBER>"

gh issue create \
  --title "Add password reset" \
  --body "Part of #<EPIC_PR_NUMBER>"
```

**Result**: Each Issue will automatically get labeled with `epic:<NUMBER>` and receive a confirmation comment.

## Step 4: Verify Everything Works (1 minute)

```bash
# Check Epic PR comments
gh pr view <EPIC_PR_NUMBER> --comments

# List all Issues linked to Epic
gh issue list --label "epic:<EPIC_PR_NUMBER>"

# View a specific Issue
gh issue view <ISSUE_NUMBER>
```

You should see:
- Epic PR has tracking comment
- All Issues have `epic:<NUMBER>` label
- All Issues have confirmation comments

## Step 5: Complete the Epic (30 seconds)

When your Epic work is done:

```bash
# Merge the Epic PR
gh pr merge <EPIC_PR_NUMBER>
```

**Result**: All linked Issues will be automatically closed with a confirmation comment!

## Verify Auto-Closure

```bash
# Check that Issues are closed
gh issue list --label "epic:<EPIC_PR_NUMBER>" --state closed

# View auto-close comment
gh issue view <ISSUE_NUMBER> --comments
```

You should see:
- All Issues are now closed
- Each has comment: "✅ Automatically closed because Epic #N was merged and completed."

## What You Learned

✅ How to create Milestones  
✅ How to create Epics  
✅ How to link Issues to Epics  
✅ How to verify the automation  
✅ How Epic merging auto-closes Issues

## Next Steps

### Learn More
- Read the [Full Guide](EPIC_MANAGEMENT.md) for advanced features
- Check [Quick Reference](EPIC_QUICK_REFERENCE.md) for all commands
- Review [Workflow Diagrams](EPIC_WORKFLOW_DIAGRAM.md) for visual understanding

### Best Practices
- Always assign Milestones to Epics
- Link Issues to Epics early in development
- Keep Epic scope focused and clear
- Review linked Issues before merging Epic
- Document Epic goals and acceptance criteria

### Common Commands

**View all Epics in a Milestone:**
```bash
gh pr list --milestone "v1.0 Release" --label "Epic"
```

**View all Issues for an Epic:**
```bash
gh issue list --label "epic:10"
```

**Check Epic status:**
```bash
gh pr view <EPIC_NUMBER>
```

**Manually link existing Issue to Epic:**
```bash
gh issue comment <ISSUE_NUMBER> --body "Relates to #<EPIC_NUMBER>"
```

## Troubleshooting

### Issue not linking to Epic
- Verify comment format: exact "Part of #123" or "Relates to #123"
- Check that PR #123 has "Epic" label
- Wait 30 seconds for workflow to run

### Epic shows warning about Milestone
- Assign a Milestone: `gh pr edit <NUMBER> --milestone "NAME"`

### Issues didn't auto-close
- Verify Issues had `epic:<NUMBER>` label before merge
- Check workflow logs in Actions tab
- Manually close any missed Issues

## Need Help?

- 📖 [Full Documentation](EPIC_MANAGEMENT.md)
- 🧪 [Testing Guide](EPIC_TESTING.md)
- 📊 [Workflow Diagrams](EPIC_WORKFLOW_DIAGRAM.md)
- 💡 [Implementation Summary](EPIC_IMPLEMENTATION_SUMMARY.md)

## Example Project Structure

```
Milestone: v1.0 Release
├── Epic #10: User Authentication
│   ├── Issue #20: Design login form ✅
│   ├── Issue #21: Implement OAuth ✅
│   └── Issue #22: Password reset ✅
├── Epic #11: Dashboard
│   ├── Issue #23: Dashboard UI ⬜
│   └── Issue #24: Data widgets ⬜
└── Epic #12: Reports
    └── Issue #25: Report generator ⬜
```

When Epic #10 is merged, Issues #20, #21, and #22 are automatically closed!

---

**Congratulations!** You're now using automated Epic management. 🎉

Start organizing your project with Milestones, Epics, and Issues today!
