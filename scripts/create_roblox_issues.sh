#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   REPO="goblinsan/vizail" ./scripts/create_roblox_roadmap_issues.sh
# Optional:
#   PROJECT_OWNER="goblinsan" PROJECT_NUMBER="6" ./scripts/create_roblox_roadmap_issues.sh

REPO="${REPO:-goblinsan/visual-flow}"
PROJECT_OWNER="${PROJECT_OWNER:-goblinsan}"
PROJECT_NUMBER="${PROJECT_NUMBER:-6}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is required. Install from https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: gh is not authenticated. Run: gh auth login" >&2
  exit 1
fi

ensure_label() {
  local name="$1"
  gh label create "$name" --repo "$REPO" --force >/dev/null
}

create_milestone() {
  local title="$1"
  gh api --method POST "repos/$REPO/milestones" -f title="$title" >/dev/null 2>&1 || true
}

create_issue() {
  local title="$1"
  local labels="$2"
  local milestone="$3"
  local body="${4:-}"

  if [[ -z "$body" ]]; then
    body="Tracking issue for: $title"
  fi

  local args=(issue create --repo "$REPO" --title "$title" --body "$body" --label "$labels")
  if [[ -n "$milestone" ]]; then
    args+=(--milestone "$milestone")
  fi

  local issue_url
  issue_url=$(gh "${args[@]}")
  echo "$issue_url"

  if [[ -n "$PROJECT_OWNER" && -n "$PROJECT_NUMBER" ]]; then
    gh project item-add "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --url "$issue_url" >/dev/null 2>&1 || true
  fi
}

echo "Ensuring labels exist..."
for label in epic roblox mvp docs monetization ui payments ai ux growth analytics; do
  ensure_label "$label"
done

echo "Creating milestones (existing ones are skipped)..."
create_milestone "Roblox MVP (Validate Demand)"
create_milestone "Monetization & Gating"
create_milestone "Agent Integration"
create_milestone "Growth & UX Polish"

echo "Creating epic and child issues..."
create_issue "Epic: Roblox UI Mode (Core Product)" "epic,roblox,mvp" "" "Deliver end-to-end Roblox UI design and export in Vizail." >/dev/null
create_issue "Add Choose Design Mode entry screen" "roblox,mvp" "Roblox MVP (Validate Demand)" >/dev/null
create_issue "Create Roblox UI component palette" "roblox,mvp" "Roblox MVP (Validate Demand)" >/dev/null
create_issue "Implement drag/resize constraints for Roblox UI" "roblox,mvp" "Roblox MVP (Validate Demand)" >/dev/null
create_issue "Implement spacing + alignment controls" "roblox,mvp" "Roblox MVP (Validate Demand)" >/dev/null
create_issue "Create Roblox Lua UI exporter" "roblox,mvp" "Roblox MVP (Validate Demand)" >/dev/null
create_issue "Add Export as Roblox UI button" "roblox,mvp" "Roblox MVP (Validate Demand)" >/dev/null
create_issue "Add starter Roblox UI templates" "roblox,mvp" "Roblox MVP (Validate Demand)" >/dev/null
create_issue "Add docs: Vizail for Roblox UI" "roblox,docs" "Roblox MVP (Validate Demand)" >/dev/null

create_issue "Epic: Monetization & Feature Gating" "epic,monetization" "" "Enable Pro plans and gate premium features." >/dev/null
create_issue "Define Free vs Pro feature flags" "monetization" "Monetization & Gating" >/dev/null
create_issue "Gate Roblox export behind Pro" "monetization" "Monetization & Gating" >/dev/null
create_issue "Add pricing UI + upgrade CTA" "monetization,ui" "Monetization & Gating" >/dev/null
create_issue "Add export limits for free users" "monetization" "Monetization & Gating" >/dev/null
create_issue "Integrate Stripe subscription" "monetization,payments" "Monetization & Gating" >/dev/null
create_issue "Add account billing status page" "monetization,ui" "Monetization & Gating" >/dev/null

create_issue "Epic: AI Agent UI Helpers" "epic,ai" "" "Add AI helpers to enhance UI quality and speed." >/dev/null
create_issue "Define agent API contract for UI helpers" "ai" "Agent Integration" >/dev/null
create_issue "Add Suggest Layout Improvements action" "ai,ui" "Agent Integration" >/dev/null
create_issue "Add Generate Theme Variants action" "ai,ui" "Agent Integration" >/dev/null
create_issue "Add component naming helper" "ai,ux" "Agent Integration" >/dev/null

create_issue "Epic: UX, Onboarding, Conversion" "epic,ux,growth" "" "Improve onboarding, activation, and conversion." >/dev/null
create_issue "Replace blank canvas with Choose Mode modal" "ux" "Growth & UX Polish" >/dev/null
create_issue "Add Roblox onboarding tutorial overlay" "ux,roblox" "Growth & UX Polish" >/dev/null
create_issue "Add example projects gallery" "ux" "Growth & UX Polish" >/dev/null
create_issue "Add feedback widget" "ux,growth" "Growth & UX Polish" >/dev/null
create_issue "Add basic analytics events" "growth,analytics" "Growth & UX Polish" >/dev/null

echo "Done: roadmap issues created for $REPO"
