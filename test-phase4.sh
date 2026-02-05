#!/bin/bash

# Phase 4 Testing Script
# This script tests the complete agent workflow: token → branch → proposal → approval

set -e  # Exit on error

# Configuration
CANVAS_ID="c5ac2c60-b82b-46e5-afc6-97c04b11e8f1"
BASE_URL="http://localhost:62587"
EMAIL="your@email.com"

echo "🚀 Testing Phase 4 Agent Workflow"
echo "=================================="
echo ""

# Step 1: Generate Agent Token
echo "📝 Step 1: Generating agent token..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/canvases/$CANVAS_ID/agent-token" \
  -H "Content-Type: application/json" \
  -H "CF-Access-Authenticated-User-Email: $EMAIL" \
  -d '{
    "agentId": "design-assistant",
    "scope": "propose"
  }')

echo "$TOKEN_RESPONSE" | jq '.'
AGENT_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.token')
AGENT_ID=$(echo "$TOKEN_RESPONSE" | jq -r '.agentId')

if [ "$AGENT_TOKEN" = "null" ]; then
  echo "❌ Failed to generate token"
  exit 1
fi

echo "✅ Token generated: ${AGENT_TOKEN:0:20}..."
echo ""

# Step 2: Create Branch
echo "🌿 Step 2: Creating agent branch..."
BRANCH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/canvases/$CANVAS_ID/branches" \
  -H "Content-Type: application/json" \
  -H "CF-Access-Authenticated-User-Email: $EMAIL" \
  -d "{
    \"agentId\": \"$AGENT_ID\",
    \"baseVersion\": 1
  }")

echo "$BRANCH_RESPONSE" | jq '.'
BRANCH_ID=$(echo "$BRANCH_RESPONSE" | jq -r '.id')

if [ "$BRANCH_ID" = "null" ]; then
  echo "❌ Failed to create branch"
  exit 1
fi

echo "✅ Branch created: $BRANCH_ID"
echo ""

# Step 3: Submit Proposal
echo "💡 Step 3: Submitting proposal..."
PROPOSAL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/branches/$BRANCH_ID/proposals" \
  -H "Content-Type: application/json" \
  -H "CF-Access-Authenticated-User-Email: $EMAIL" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -d '{
    "title": "Add Navigation Header",
    "description": "Added a navigation header based on design requirements",
    "operations": [
      {
        "type": "create",
        "nodeId": "header-nav-1",
        "after": {
          "id": "header-nav-1",
          "type": "rect",
          "position": {"x": 0, "y": 0},
          "size": {"width": 1920, "height": 80},
          "fill": "#1e293b"
        },
        "rationale": "Created header container with brand color"
      }
    ],
    "rationale": "Navigation is essential for user wayfinding",
    "assumptions": [
      "Header should span full width",
      "Brand color is #1e293b",
      "Height follows 80px standard"
    ],
    "confidence": 0.85
  }')

echo "$PROPOSAL_RESPONSE" | jq '.'
PROPOSAL_ID=$(echo "$PROPOSAL_RESPONSE" | jq -r '.id')

if [ "$PROPOSAL_ID" = "null" ]; then
  echo "❌ Failed to create proposal"
  exit 1
fi

echo "✅ Proposal submitted: $PROPOSAL_ID"
echo ""

# Step 4: List All Proposals
echo "📋 Step 4: Listing all proposals..."
curl -s "$BASE_URL/api/canvases/$CANVAS_ID/proposals" \
  -H "CF-Access-Authenticated-User-Email: $EMAIL" | jq '.'
echo ""

# Step 5: Approve Proposal
echo "✅ Step 5: Approving proposal..."
APPROVE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/proposals/$PROPOSAL_ID/approve" \
  -H "CF-Access-Authenticated-User-Email: $EMAIL")

echo "$APPROVE_RESPONSE" | jq '.'
echo ""

echo "🎉 Workflow completed successfully!"
echo ""
echo "Summary:"
echo "--------"
echo "Agent ID:    $AGENT_ID"
echo "Token:       ${AGENT_TOKEN:0:20}..."
echo "Branch ID:   $BRANCH_ID"
echo "Proposal ID: $PROPOSAL_ID"
echo ""
echo "To test rejection instead, run:"
echo "  curl -X POST $BASE_URL/api/proposals/$PROPOSAL_ID/reject \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -H 'CF-Access-Authenticated-User-Email: $EMAIL' \\"
echo "    -d '{\"reason\": \"Does not meet requirements\"}'"
