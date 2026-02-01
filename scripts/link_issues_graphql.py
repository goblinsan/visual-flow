#!/usr/bin/env python3
"""
Link child issues to parent epics using GraphQL addSubIssue mutation.
"""
import subprocess
import json

REPO = "goblinsan/vizail"

# Map: parent epic → child issues
phase_map = {
    45: [12, 13, 14, 15],           # Phase 0
    46: [16, 17, 18, 19, 20],       # Phase 1
    47: [21, 22, 23, 24, 25],       # Phase 2
    48: [26, 27, 28, 29],           # Phase 3
    49: [30, 31, 32, 33, 34],       # Phase 4
    50: [35, 36, 37, 38],           # Phase 5
}

def get_issue_id(issue_num):
    """Get the global ID for an issue number"""
    query = f"""
    query {{
    repository(owner: "goblinsan", name: "vizail") {{
        issue(number: {issue_num}) {{
          id
        }}
      }}
    }}
    """
    result = subprocess.run(
        ["gh", "api", "graphql", "-f", f"query={query}"],
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        data = json.loads(result.stdout)
        return data["data"]["repository"]["issue"]["id"]
    return None

def link_sub_issue(parent_id, sub_issue_id):
        """Link a sub-issue to a parent using GraphQL"""
        mutation = """
        mutation AddSubIssue($issueId: ID!, $subIssueId: ID!, $replaceParent: Boolean) {
            addSubIssue(input: {issueId: $issueId, subIssueId: $subIssueId, replaceParent: $replaceParent}) {
                subIssue {
                    id
                    number: number
                    parent { number }
                }
            }
        }
        """
        result = subprocess.run(
                ["gh", "api", "graphql",
                 "-f", f"query={mutation}",
                 "-f", f"issueId={parent_id}",
                 "-f", f"subIssueId={sub_issue_id}",
                 "-F", "replaceParent=true"],
                capture_output=True,
                text=True
        )
        return result.returncode == 0, result.stderr

print("Fetching issue IDs...\n")
issue_ids = {}

# Get all parent IDs
for epic_num in phase_map.keys():
    issue_ids[epic_num] = get_issue_id(epic_num)
    print(f"  Epic #{epic_num}: {issue_ids[epic_num]}")

# Get all child IDs
for child_nums in phase_map.values():
    for child_num in child_nums:
        if child_num not in issue_ids:
            issue_ids[child_num] = get_issue_id(child_num)

print(f"\nLinking {sum(len(v) for v in phase_map.values())} child issues to parent epics...\n")

for epic_num, child_issues in phase_map.items():
    parent_id = issue_ids.get(epic_num)
    if not parent_id:
        print(f"❌ Could not get ID for epic #{epic_num}")
        continue
    
    print(f"Linking to epic #{epic_num}...")
    for child_num in child_issues:
        child_id = issue_ids.get(child_num)
        if not child_id:
            print(f"  ❌ Could not get ID for issue #{child_num}")
            continue
        
        success, err = link_sub_issue(parent_id, child_id)
        if success:
            print(f"  ✅ Linked #{child_num} → #{epic_num}")
        else:
            print(f"  ❌ ERROR linking #{child_num}: {err[:100]}")

print("\n✅ All child issues linked to parent epics!")
