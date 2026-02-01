# Epic and Milestone Management Guide

This repository uses GitHub's built-in features (Milestones, Labels, and Pull Requests) to implement a hierarchical project management system where:

- **Milestones** represent high-level release goals or project phases
- **Epics** (labeled PRs) represent major features or initiatives tied to Milestones
- **Issues** represent individual tasks tied to Epics

When an Epic is merged, all associated Issues are automatically marked as Done (closed).

## Setup and Usage

### 1. Creating an Epic

An Epic is a Pull Request that represents a major feature or initiative.

**Steps:**
1. Create a Pull Request for your Epic
2. Add the `Epic` label to the PR
3. Assign the PR to a Milestone
4. The automation will add a comment explaining how to link issues to this Epic

**Example:**
```bash
# Create a PR
gh pr create --title "Epic: New User Dashboard" --body "Implements new dashboard features"

# Label it as an Epic
gh pr edit 123 --add-label "Epic"

# Assign to a Milestone
gh pr edit 123 --milestone "Q1 2026 Release"
```

### 2. Linking Issues to Epics

Once you have an Epic PR, you can link Issues to it.

**Method 1: Add a comment to the Issue**

Add a comment on the Issue with either format:
- `Relates to #123` (where 123 is the Epic PR number)
- `Part of #123` (where 123 is the Epic PR number)

The automation will:
- Verify that the referenced PR is an Epic
- Add a label `epic:123` to the Issue
- Add a confirmation comment

**Method 2: Reference in Issue body**

When creating or editing an Issue, include the Epic reference in the body:
```markdown
## Description
This issue implements user profile editing.

Relates to #123
```

**Example:**
```bash
# Create an issue
gh issue create --title "Add user profile edit form" --body "Relates to #123"

# Or add a comment to existing issue
gh issue comment 456 --body "Part of #123"
```

### 3. Tracking Epic Progress

**View all Issues linked to an Epic:**
```bash
gh issue list --label "epic:123"
```

**Check Epic status:**
- Open the Epic PR to see all linked issues
- Check the Milestone to see all Epics in that release
- Use GitHub Projects to visualize the hierarchy

### 4. Completing an Epic

When an Epic is ready and all work is complete:

1. Get the Epic PR reviewed and approved
2. Merge the Epic PR
3. **Automatic actions occur:**
   - All Issues linked to the Epic are automatically closed
   - Each closed Issue receives a comment: "✅ Automatically closed because Epic #123 was merged and completed."

## Architecture

### Workflow Triggers

The `epic-management.yml` workflow triggers on:
- **Pull Requests**: opened, labeled, unlabeled, closed, edited, synchronize
- **Issues**: opened, labeled, unlabeled, edited, closed
- **Issue Comments**: created, edited

### Jobs and Steps

1. **Check if PR is an Epic**: Detects if PR has the `Epic` label
2. **Link Epic to Milestone**: Documents the Epic-Milestone relationship
3. **Close related Issues when Epic is merged**: Auto-closes all linked Issues
4. **Track Issue-Epic relationship**: Creates links when Issues reference Epics
5. **Ensure Epic has Milestone**: Warns if an Epic doesn't have a Milestone

### Epic-Issue Link Detection

The workflow finds linked Issues by:
- Searching for Issues with `epic:NUMBER` labels
- Searching Issue comments for "Relates to #NUMBER" or "Part of #NUMBER"
- Checking GitHub's cross-reference timeline events

## Best Practices

### For Epics

- **Always assign a Milestone**: Epics should be tied to release goals
- **Keep Epics focused**: An Epic should represent one major feature or initiative
- **Document scope**: Clearly describe what the Epic includes in the PR description
- **Link Issues early**: Link related Issues as soon as they're created
- **Review before merging**: Ensure all critical Issues are resolved before merging the Epic

### For Issues

- **Link to Epics**: Always link Issues to their parent Epic
- **One Epic per Issue**: Each Issue should belong to only one Epic
- **Update status**: Keep Issue status current (open/in-progress/blocked)
- **Close manually if needed**: You can close Issues manually before the Epic is merged

### For Milestones

- **Set clear goals**: Define what "done" means for the Milestone
- **Track progress**: Use Milestone view to see overall progress
- **Set due dates**: Assign target completion dates
- **Group related Epics**: Use Milestones to organize related Epics

## Example Workflow

### Scenario: Q1 2026 Dashboard Redesign

1. **Create Milestone**
   ```bash
   gh api repos/$OWNER/$REPO/milestones \
     -f title="Q1 2026 Dashboard Redesign" \
     -f description="Complete redesign of user dashboard" \
     -f due_on="2026-03-31T23:59:59Z"
   ```

2. **Create Epic PRs**
   ```bash
   # Epic 1: User Profile
   gh pr create --title "Epic: User Profile Dashboard" --label "Epic" --milestone "Q1 2026 Dashboard Redesign"
   
   # Epic 2: Analytics
   gh pr create --title "Epic: Analytics Dashboard" --label "Epic" --milestone "Q1 2026 Dashboard Redesign"
   ```

3. **Create and Link Issues**
   ```bash
   # Issues for Epic 1 (PR #10)
   gh issue create --title "Design user profile layout" --body "Part of #10"
   gh issue create --title "Implement profile edit form" --body "Part of #10"
   gh issue create --title "Add profile photo upload" --body "Part of #10"
   
   # Issues for Epic 2 (PR #11)
   gh issue create --title "Design analytics charts" --body "Part of #11"
   gh issue create --title "Implement data aggregation" --body "Part of #11"
   ```

4. **Work and Complete**
   - Developers work on Issues
   - Close Issues as they're completed (or leave open for auto-close)
   - When Epic work is done, merge Epic PR
   - All remaining open Issues linked to Epic are auto-closed

5. **Track Progress**
   ```bash
   # See all Epics in Milestone
   gh pr list --milestone "Q1 2026 Dashboard Redesign" --label "Epic"
   
   # See all Issues for an Epic
   gh issue list --label "epic:10"
   ```

## Troubleshooting

### Issue not linking to Epic

**Problem**: Added comment "Relates to #123" but Issue wasn't linked

**Solutions**:
- Verify the PR number is correct
- Ensure the PR has the `Epic` label
- Check that the comment format is exact: `Relates to #123` or `Part of #123`
- Wait a few seconds for the workflow to run

### Epic merged but Issues not closed

**Problem**: Epic was merged but linked Issues are still open

**Solutions**:
- Check if Issues had the `epic:NUMBER` label
- Verify Issue comments contained the Epic reference
- Check GitHub Actions logs for workflow errors
- Manually close any missed Issues

### Epic without Milestone

**Problem**: Created Epic but forgot to assign Milestone

**Solutions**:
- The workflow will add a reminder comment
- Assign a Milestone as soon as possible: `gh pr edit 123 --milestone "Q1 2026"`
- Good practice: Create Milestones before Epics

## Advanced Usage

### GitHub Projects Integration

You can visualize this hierarchy using GitHub Projects (v2):

1. Create a new Project
2. Add custom fields:
   - "Type" (Issue/Epic/Milestone)
   - "Epic" (links to Epic PR)
   - "Milestone" (links to Milestone)
3. Add automation:
   - Move Issues to "Done" when Epic is merged
   - Update Epic progress based on linked Issues

### Custom Labels

You can extend this system with additional labels:
- `epic:123` - Automatically added when Issue is linked to Epic #123
- `priority:high` - Mark critical Issues
- `blocked` - Track blocked Issues
- `needs-review` - Issues waiting for review

### GraphQL Queries

Query Epic relationships programmatically:

```graphql
query($owner: String!, $repo: String!, $epicNumber: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $epicNumber) {
      title
      milestone {
        title
        dueOn
      }
      timelineItems(first: 100, itemTypes: [CROSS_REFERENCED_EVENT]) {
        nodes {
          ... on CrossReferencedEvent {
            source {
              ... on Issue {
                number
                title
                state
              }
            }
          }
        }
      }
    }
  }
}
```

## Migration from Other Systems

If you're migrating from Jira, Azure DevOps, or other project management tools:

- **Jira Epics** → GitHub Epic PRs
- **Jira Stories** → GitHub Issues
- **Jira Releases** → GitHub Milestones
- **Epic Links** → Issue comments with "Part of #123"

## Contributing

When contributing to this repository:

1. Check existing Milestones for your work
2. If creating a new major feature, create an Epic PR
3. Link your Issues to the Epic
4. Keep Epic and Issue descriptions up-to-date

## References

- [GitHub Milestones Documentation](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-milestones)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub GraphQL API](https://docs.github.com/en/graphql)
- [GitHub Projects Documentation](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
