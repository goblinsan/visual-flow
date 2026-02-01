#!/usr/bin/env python3
"""
Link child issues to parent epics using GitHub's PATCH endpoint.
This establishes proper parent-child relationships via the GitHub UI.
"""
import subprocess

# Map: parent epic → child issues
phase_map = {
    45: [12, 13, 14, 15],           # Phase 0
    46: [16, 17, 18, 19, 20],       # Phase 1
    47: [21, 22, 23, 24, 25],       # Phase 2
    48: [26, 27, 28, 29],           # Phase 3
    49: [30, 31, 32, 33, 34],       # Phase 4
    50: [35, 36, 37, 38],           # Phase 5
}

print("Linking child issues to parent epics via PATCH...\n")
for epic_num, child_issues in phase_map.items():
    print(f"Linking to epic #{epic_num}...")
    parent_url = f"https://api.github.com/repos/goblinsan/visual-flow/issues/{epic_num}"
    for child_num in child_issues:
        result = subprocess.run(
            ["gh", "api",
             f"/repos/goblinsan/visual-flow/issues/{child_num}",
             "--method", "PATCH",
             "-f", f"parent_issue_url={parent_url}"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print(f"  ✅ Linked #{child_num} → #{epic_num}")
        else:
            print(f"  ❌ ERROR linking #{child_num}: {result.stderr[:100]}")

print("\n✅ All child issues linked to parent epics!")
