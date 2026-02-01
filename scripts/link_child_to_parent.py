#!/usr/bin/env python3
import subprocess
import json

def get_issue_body(issue_num):
    result = subprocess.run(
        ["gh", "issue", "view", str(issue_num), "--json", "body"],
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        data = json.loads(result.stdout)
        return data.get("body", "")
    return ""

def update_issue_body(issue_num, parent_epic, body):
    new_body = f"**Parent Epic:** #{parent_epic}\n\n{body}"
    result = subprocess.run(
        ["gh", "issue", "edit", str(issue_num), "-b", "-"],
        input=new_body,
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        print(f"  Updated #{issue_num}")
    else:
        print(f"  ERROR updating #{issue_num}: {result.stderr}")

# Map issues to parent epics
phase_map = {
    45: [12, 13, 14, 15],           # Phase 0
    46: [16, 17, 18, 19, 20],       # Phase 1
    47: [21, 22, 23, 24, 25],       # Phase 2
    48: [26, 27, 28, 29],           # Phase 3
    49: [30, 31, 32, 33, 34],       # Phase 4
    50: [35, 36, 37, 38],           # Phase 5
}

for epic_num, child_issues in phase_map.items():
    print(f"Linking child issues to epic #{epic_num}...")
    for issue_num in child_issues:
        body = get_issue_body(issue_num)
        update_issue_body(issue_num, epic_num, body)

print("\n✅ All child issues linked to parent epics!")
