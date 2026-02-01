# Testing Epic Management Automation

This document provides test scenarios to verify the Epic management automation.

## Prerequisites

1. GitHub repository with the `epic-management.yml` workflow
2. Permissions to create PRs, Issues, and Milestones
3. GitHub CLI (`gh`) installed (optional, for command-line testing)

## Test Scenario 1: Create Epic with Milestone

**Objective**: Verify that an Epic PR is properly linked to a Milestone

**Steps**:
1. Create a new Milestone:
   ```bash
   gh api repos/OWNER/REPO/milestones \
     -f title="Test Milestone v1.0" \
     -f description="Test milestone for Epic automation" \
     -f due_on="2026-12-31T23:59:59Z"
   ```

2. Create a new Pull Request:
   ```bash
   gh pr create \
     --title "Epic: Test Feature" \
     --body "This is a test Epic for automation validation"
   ```

3. Label the PR as Epic:
   ```bash
   gh pr edit <PR_NUMBER> --add-label "Epic"
   ```

4. Assign to Milestone:
   ```bash
   gh pr edit <PR_NUMBER> --milestone "Test Milestone v1.0"
   ```

**Expected Result**:
- Workflow triggers on label addition and milestone assignment
- A comment is added to the PR with Epic tracking information
- Comment includes instructions for linking Issues

**Verification**:
```bash
# Check PR comments
gh pr view <PR_NUMBER> --comments
```

Look for a comment containing:
- "📊 **Epic Tracking**: This Epic is tied to Milestone..."
- Instructions for linking Issues

## Test Scenario 2: Epic without Milestone Warning

**Objective**: Verify that warning is shown when Epic lacks Milestone

**Steps**:
1. Create a new Pull Request:
   ```bash
   gh pr create \
     --title "Epic: Feature Without Milestone" \
     --body "Testing Epic without milestone"
   ```

2. Label it as Epic (without assigning a Milestone):
   ```bash
   gh pr edit <PR_NUMBER> --add-label "Epic"
   ```

**Expected Result**:
- Workflow detects Epic without Milestone
- Warning comment is added to PR

**Verification**:
```bash
gh pr view <PR_NUMBER> --comments
```

Look for a comment containing:
- "⚠️  **Action Required**: This PR is labeled as an Epic but does not have a Milestone assigned"
- Explanation of why Milestones are important

## Test Scenario 3: Link Issue to Epic

**Objective**: Verify that Issues can be linked to an Epic

**Prerequisites**: An Epic PR (from Scenario 1)

**Steps**:
1. Create a new Issue:
   ```bash
   gh issue create \
     --title "Test Task 1" \
     --body "This is a test task"
   ```

2. Add a comment linking to Epic:
   ```bash
   gh issue comment <ISSUE_NUMBER> \
     --body "Part of #<EPIC_PR_NUMBER>"
   ```

**Expected Result**:
- Workflow detects the Epic reference
- Label `epic:<EPIC_PR_NUMBER>` is added to the Issue
- Confirmation comment is added to the Issue

**Verification**:
```bash
# Check issue labels
gh issue view <ISSUE_NUMBER> --json labels

# Check issue comments
gh issue view <ISSUE_NUMBER> --comments
```

Look for:
- Label: `epic:<EPIC_PR_NUMBER>`
- Comment: "🔗 This issue has been linked to Epic #<EPIC_PR_NUMBER>"

## Test Scenario 4: Link Multiple Issues to Epic

**Objective**: Verify multiple Issues can be linked to one Epic

**Prerequisites**: An Epic PR (from Scenario 1)

**Steps**:
1. Create multiple Issues with Epic reference in body:
   ```bash
   gh issue create --title "Task 2" --body "Relates to #<EPIC_PR_NUMBER>"
   gh issue create --title "Task 3" --body "Part of #<EPIC_PR_NUMBER>"
   gh issue create --title "Task 4" --body "Part of #<EPIC_PR_NUMBER>"
   ```

**Expected Result**:
- All Issues get labeled with `epic:<EPIC_PR_NUMBER>`
- Each Issue gets a confirmation comment

**Verification**:
```bash
# List all Issues linked to Epic
gh issue list --label "epic:<EPIC_PR_NUMBER>"
```

Should show all 3 Issues (plus any from Scenario 3).

## Test Scenario 5: Auto-close Issues when Epic Merges

**Objective**: Verify that Issues are auto-closed when Epic is merged

**Prerequisites**:
- Epic PR with linked Issues (from Scenarios 3 & 4)
- Epic PR must be mergeable

**Steps**:
1. Ensure Epic has linked Issues:
   ```bash
   gh issue list --label "epic:<EPIC_PR_NUMBER>" --state open
   ```

2. Merge the Epic PR:
   ```bash
   gh pr merge <EPIC_PR_NUMBER> --squash
   ```

3. Wait for workflow to complete (check Actions tab)

**Expected Result**:
- All linked Issues are closed automatically
- Each closed Issue has a comment: "✅ Automatically closed because Epic #<EPIC_PR_NUMBER> was merged and completed."

**Verification**:
```bash
# Check if Issues are closed
gh issue list --label "epic:<EPIC_PR_NUMBER>" --state closed

# View individual Issue comments
gh issue view <ISSUE_NUMBER> --comments
```

All Issues should be closed with auto-close comment.

## Test Scenario 6: Reference Non-Epic PR

**Objective**: Verify that only Epic PRs trigger the automation

**Steps**:
1. Create a regular (non-Epic) PR:
   ```bash
   gh pr create --title "Regular PR" --body "Not an Epic"
   ```

2. Create an Issue referencing this PR:
   ```bash
   gh issue create \
     --title "Test Issue" \
     --body "Part of #<NON_EPIC_PR_NUMBER>"
   ```

**Expected Result**:
- No `epic:` label is added
- No Epic confirmation comment
- Warning comment indicating PR is not an Epic

**Verification**:
```bash
gh issue view <ISSUE_NUMBER> --json labels
gh issue view <ISSUE_NUMBER> --comments
```

Should NOT have `epic:` label and should have a warning comment.

## Test Scenario 7: Alternative Link Syntax

**Objective**: Verify both "Relates to" and "Part of" syntax work

**Prerequisites**: An Epic PR

**Steps**:
1. Test "Relates to" syntax:
   ```bash
   gh issue create \
     --title "Task with Relates" \
     --body "Relates to #<EPIC_PR_NUMBER>"
   ```

2. Test "Part of" syntax:
   ```bash
   gh issue create \
     --title "Task with Part of" \
     --body "Part of #<EPIC_PR_NUMBER>"
   ```

3. Test case-insensitive:
   ```bash
   gh issue create \
     --title "Task with lowercase" \
     --body "relates to #<EPIC_PR_NUMBER>"
   ```

**Expected Result**:
- All three Issues are linked correctly
- All get `epic:<EPIC_PR_NUMBER>` label

**Verification**:
```bash
gh issue list --label "epic:<EPIC_PR_NUMBER>"
```

Should show all three Issues.

## Troubleshooting

### Workflow Not Triggering

**Check**:
```bash
# View workflow runs
gh run list --workflow=epic-management.yml

# View specific run logs
gh run view <RUN_ID> --log
```

**Common Issues**:
- Workflow file has syntax errors
- Insufficient permissions
- Event type not in trigger list

### Label Not Added

**Check**:
- Comment format is exact: `Relates to #123` or `Part of #123`
- Referenced PR has `Epic` label
- PR number is correct
- Workflow has `issues: write` permission

### Issues Not Auto-Closed

**Check**:
- Issues have `epic:<NUMBER>` label
- Epic PR was merged (not just closed)
- Workflow has `issues: write` permission
- Check workflow logs for errors

### Manual Cleanup

If automation fails, manually close Issues:
```bash
# Close a specific Issue
gh issue close <ISSUE_NUMBER> \
  --comment "Manually closed - related to Epic #<EPIC_PR_NUMBER>"

# Close multiple Issues
for issue in 10 11 12; do
  gh issue close $issue
done
```

## Validation Checklist

After running tests, verify:

- [ ] Epic with Milestone shows tracking comment
- [ ] Epic without Milestone shows warning comment
- [ ] Issue linked with "Part of" gets labeled
- [ ] Issue linked with "Relates to" gets labeled
- [ ] Multiple Issues can link to one Epic
- [ ] Issues auto-close when Epic merges
- [ ] Closed Issues have auto-close comment
- [ ] Non-Epic PRs don't trigger automation
- [ ] Case-insensitive linking works
- [ ] Workflow logs are clean (no errors)

## Performance Considerations

- **API Rate Limits**: Be aware of GitHub API rate limits (5000 requests/hour for authenticated users)
- **Large Epics**: For Epics with 100+ Issues, consider batching or manual closure
- **GraphQL Pagination**: The workflow uses `first: 100` which may miss Issues if there are more than 100 cross-references

## Next Steps

After successful testing:
1. Document any issues found
2. Update workflow if needed
3. Create real Milestones for project
4. Migrate existing work to Epic/Issue structure
5. Train team on new process

## Support

For issues or questions:
- Check workflow logs: `gh run view <RUN_ID> --log`
- Review documentation: `docs/EPIC_MANAGEMENT.md`
- Check GitHub Actions status page
