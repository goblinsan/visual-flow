/**
 * MCP Resources for Vizail Canvas
 * 
 * Resources provide static reference documentation that agents
 * can read to understand the canvas system without making API calls.
 */

export const RESOURCE_DEFINITIONS = [
  {
    uri: 'vizail://docs/node-types',
    name: 'Canvas Node Type Reference',
    description: 'Complete reference for all canvas node types, their properties, and usage examples',
    mimeType: 'text/markdown',
  },
  {
    uri: 'vizail://docs/proposal-guide',
    name: 'Proposal Writing Guide',
    description: 'Best practices for writing effective canvas proposals that get approved',
    mimeType: 'text/markdown',
  },
  {
    uri: 'vizail://docs/workflow',
    name: 'Agent Workflow Guide',
    description: 'Step-by-step guide for the agent collaboration workflow',
    mimeType: 'text/markdown',
  },
];

const NODE_TYPE_DOCS = `# Vizail Canvas Node Types

## Overview
A canvas is a tree of typed nodes. The root is always a \`frame\` node.
New nodes from proposals are added to \`root.children\` (top level).

## Common Properties (all nodes)
| Property | Type | Description |
|----------|------|-------------|
| id | string | **Required.** Unique identifier |
| type | string | **Required.** Node type name |
| name | string? | Optional display name |
| position | {x, y} | Position relative to parent |
| size | {width, height} | Explicit dimensions |
| rotation | number? | Degrees |
| opacity | number? | 0.0 to 1.0 |
| visible | boolean? | Default true |
| locked | boolean? | Default false |

## Node Types

### rect
Rectangle shape. Most common building block.
\`\`\`json
{
  "id": "my-rect",
  "type": "rect",
  "position": { "x": 100, "y": 200 },
  "size": { "width": 300, "height": 150 },
  "fill": "#ef4444",
  "stroke": "#000000",
  "strokeWidth": 2,
  "cornerRadius": 8
}
\`\`\`

### ellipse
Oval/circle shape.
\`\`\`json
{
  "id": "my-circle",
  "type": "ellipse",
  "position": { "x": 100, "y": 100 },
  "size": { "width": 100, "height": 100 },
  "fill": "#3b82f6"
}
\`\`\`

### text
Text label with font controls.
\`\`\`json
{
  "id": "my-label",
  "type": "text",
  "position": { "x": 100, "y": 50 },
  "text": "Hello World",
  "fontSize": 24,
  "fontFamily": "Inter",
  "fontWeight": "bold",
  "fill": "#1e293b",
  "align": "center"
}
\`\`\`

### line
Straight line between two points.
\`\`\`json
{
  "id": "my-line",
  "type": "line",
  "position": { "x": 0, "y": 0 },
  "points": [50, 50, 300, 200],
  "stroke": "#000000",
  "strokeWidth": 2,
  "lineCap": "round"
}
\`\`\`

### curve
Bezier curve with control points. Great for organic shapes.
\`\`\`json
{
  "id": "my-curve",
  "type": "curve",
  "position": { "x": 0, "y": 0 },
  "points": [50, 50, 150, 100, 250, 50, 350, 150],
  "stroke": "#2563eb",
  "strokeWidth": 4,
  "tension": 0.4,
  "lineCap": "round"
}
\`\`\`
Points format: [startX, startY, cp1X, cp1Y, cp2X, cp2Y, endX, endY]

### image
Image from URL.
\`\`\`json
{
  "id": "my-image",
  "type": "image",
  "position": { "x": 100, "y": 100 },
  "size": { "width": 400, "height": 300 },
  "src": "https://example.com/photo.jpg"
}
\`\`\`

### group
Groups children together with a shared transform.
\`\`\`json
{
  "id": "my-group",
  "type": "group",
  "position": { "x": 50, "y": 50 },
  "children": [
    { "id": "child-1", "type": "rect", ... },
    { "id": "child-2", "type": "text", ... }
  ]
}
\`\`\`
Children positions are relative to the group's position.

### frame
Container with explicit size. The root node is always a frame.
\`\`\`json
{
  "id": "root",
  "type": "frame",
  "size": { "width": 1920, "height": 1080 },
  "fill": "#ffffff",
  "children": [...]
}
\`\`\`

### stack
Auto-layout container (like CSS flexbox).
- \`direction\`: "horizontal" | "vertical"
- \`gap\`: spacing between children
- \`padding\`: inner padding
- \`alignment\`: "start" | "center" | "end" | "stretch"

### grid
Grid layout container.
- \`columns\`: number of columns
- \`gap\`: spacing between cells
- Children can have \`gridArea\` for placement.
`;

const PROPOSAL_GUIDE = `# Writing Effective Canvas Proposals

## Structure
Every proposal needs:
- **title**: Short (3-8 words), descriptive
- **description**: What changes are being made and the visual outcome
- **operations**: Array of node operations (create/update/delete/move)
- **rationale**: Why these changes make sense
- **assumptions**: Things you assumed about the design intent
- **confidence**: 0.0 (total guess) to 1.0 (absolutely certain)

## Operation Best Practices

### Creating Nodes
- Always include \`id\` and \`type\` in the \`after\` object
- Use descriptive IDs: \`header-title\`, \`nav-bar\`, \`hero-bg\` (not \`node-1\`)
- Include \`position\` and \`size\` — nodes without them may not be visible
- Specify colors as hex strings: \`"#ef4444"\` not \`"red"\`

### Updating Nodes
- Only include changed properties in \`after\`
- Reference the existing \`nodeId\` exactly as it appears in the canvas spec
- Include the current \`before\` state if known (helps with review)

### Positioning
- The root frame starts at (0, 0)
- Group children are positioned relative to the group
- Proposals add nodes to \`root.children\` (top-level), not inside groups
- To overlay existing elements, match their absolute coordinates:
  - Absolute position = group.position + child.position (within that group)

## Confidence Guidelines
| Score | Meaning |
|-------|---------|
| 0.9+ | You have clear instructions and exact specs |
| 0.7-0.9 | Reasonable interpretation with some assumptions |
| 0.5-0.7 | Best guess, reviewer should verify details |
| < 0.5 | Experimental, asking for feedback |

## Common Mistakes
1. **Missing position/size** — node won't be visible
2. **Wrong coordinate space** — forgetting group offsets
3. **Duplicate IDs** — each node ID must be unique across the canvas
4. **Too many operations** — keep proposals focused; split large changes
5. **No rationale** — reviewer needs to understand WHY
`;

const WORKFLOW_GUIDE = `# Agent Collaboration Workflow

## Overview
You are an AI agent collaborating on a visual canvas design. A human owns the canvas
and reviews your changes. You propose, they approve or reject.

## Step-by-Step

### 1. Read the Canvas
\`\`\`
Tool: get_canvas
Input: { canvasId: "<provided by user>" }
\`\`\`
Study the node tree. Understand what's already there — positions, sizes, colors,
grouping structure. Note the root frame dimensions.

### 2. Get a Branch
\`\`\`
Tool: get_or_create_branch  
Input: { canvasId: "...", agentId: "your-agent-name" }
\`\`\`
You'll get a branch ID. Use the same agentId consistently.

### 3. Plan Your Changes
Before submitting, plan:
- Which existing nodes to modify?
- What new nodes to create?
- What's the visual outcome?
- What assumptions are you making?

### 4. Submit a Proposal
\`\`\`
Tool: submit_proposal
Input: {
  branchId: "...",
  title: "Add blue header bar",
  description: "Creates a header rectangle...",
  operations: [...],
  rationale: "The canvas has no header...",
  assumptions: ["Brand color is blue", ...],
  confidence: 0.8
}
\`\`\`

### 5. Wait for Review
The human will see your proposal in their Agent panel. They can:
- Preview the changes overlaid on the current canvas
- Read your rationale and assumptions
- **Approve** → changes are merged into the canvas
- **Reject** → you can submit a revised proposal

### 6. Check Status
\`\`\`
Tool: check_proposal_status
Input: { proposalId: "..." }
\`\`\`

### 7. Iterate
If rejected, read the canvas again (it may have changed), adjust your approach,
and submit a new proposal addressing the feedback.

## Key Rules
- **Never assume** — always read the canvas first
- **One concern per proposal** — don't bundle unrelated changes
- **Be transparent** — list assumptions and set confidence honestly
- **Respect the owner** — they have final say on all changes
`;

/**
 * Handle reading a resource by URI
 */
export async function handleResourceRead(
  uri: string
): Promise<Array<{ uri: string; mimeType: string; text: string }>> {
  switch (uri) {
    case 'vizail://docs/node-types':
      return [{ uri, mimeType: 'text/markdown', text: NODE_TYPE_DOCS }];
    case 'vizail://docs/proposal-guide':
      return [{ uri, mimeType: 'text/markdown', text: PROPOSAL_GUIDE }];
    case 'vizail://docs/workflow':
      return [{ uri, mimeType: 'text/markdown', text: WORKFLOW_GUIDE }];
    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}
