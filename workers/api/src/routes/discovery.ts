/**
 * Agent Discovery & OpenAPI endpoint
 * Returns machine-readable API documentation for AI agents
 * 
 * GET /api/agent/discover — public, no auth required
 */

export function agentDiscoveryResponse(): Response {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Vizail Canvas API',
      version: '1.0.0',
      description: `API for AI agents to collaborate on visual canvas designs.

## Authentication
Include your agent token in the Authorization header:
\`Authorization: Bearer vz_agent_<your_token>\`

## Workflow
1. **Get the canvas** — \`GET /api/canvases/{canvasId}\` to read the current spec
2. **Get or create a branch** — \`GET /api/canvases/{canvasId}/branches\` or \`POST\`
3. **Submit a proposal** — \`POST /api/branches/{branchId}/proposals\` with operations
4. **Wait for review** — The human reviews and approves/rejects your proposal
5. **Check status** — \`GET /api/proposals/{proposalId}\` to see if approved

## Node Types
The canvas spec uses a tree of typed nodes. The root is always a \`frame\` node.
Supported types: frame, group, stack, grid, text, image, box, rect, ellipse, line, curve.

## Proposal Operations
Each operation targets a node by ID:
- \`create\` — Add a new node. Provide \`after\` with the full node object (must include \`id\` and \`type\`).
- \`update\` — Modify an existing node. Provide \`nodeId\` and \`after\` with changed properties.
- \`delete\` — Remove a node. Provide \`nodeId\`.
- \`move\`   — Reposition a node. Provide \`nodeId\` and \`after: { position: { x, y } }\`.

**Important**: Operations apply to \`root.children\` only (top-level nodes). To modify nodes inside a group, update the group itself.`,
    },
    servers: [
      { url: 'https://vizail-api.coghlanjames.workers.dev/api', description: 'Production' },
      { url: 'http://localhost:62587/api', description: 'Local development' },
    ],
    security: [{ agentToken: [] }],
    components: {
      securitySchemes: {
        agentToken: {
          type: 'http',
          scheme: 'bearer',
          description: 'Agent token in format vz_agent_<id>_<secret>',
        },
      },
      schemas: {
        Position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
          },
          required: ['x', 'y'],
        },
        Size: {
          type: 'object',
          properties: {
            width: { type: 'number' },
            height: { type: 'number' },
          },
          required: ['width', 'height'],
        },
        NodeBase: {
          type: 'object',
          description: 'Common properties for all node types',
          properties: {
            id: { type: 'string', description: 'Unique node identifier' },
            name: { type: 'string' },
            visible: { type: 'boolean', default: true },
            locked: { type: 'boolean', default: false },
            rotation: { type: 'number', description: 'Degrees' },
            opacity: { type: 'number', minimum: 0, maximum: 1 },
            position: { $ref: '#/components/schemas/Position' },
            size: { $ref: '#/components/schemas/Size' },
          },
          required: ['id'],
        },
        RectNode: {
          allOf: [
            { $ref: '#/components/schemas/NodeBase' },
            {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['rect'] },
                fill: { type: 'string', description: 'CSS color, e.g. #ff0000' },
                stroke: { type: 'string' },
                strokeWidth: { type: 'number' },
                cornerRadius: { type: 'number' },
              },
              required: ['type'],
            },
          ],
        },
        EllipseNode: {
          allOf: [
            { $ref: '#/components/schemas/NodeBase' },
            {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['ellipse'] },
                fill: { type: 'string' },
                stroke: { type: 'string' },
                strokeWidth: { type: 'number' },
              },
              required: ['type'],
            },
          ],
        },
        TextNode: {
          allOf: [
            { $ref: '#/components/schemas/NodeBase' },
            {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['text'] },
                text: { type: 'string' },
                fontSize: { type: 'number' },
                fontFamily: { type: 'string' },
                fontWeight: { type: 'string' },
                fontStyle: { type: 'string' },
                fill: { type: 'string' },
                align: { type: 'string', enum: ['left', 'center', 'right'] },
              },
              required: ['type', 'text'],
            },
          ],
        },
        LineNode: {
          allOf: [
            { $ref: '#/components/schemas/NodeBase' },
            {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['line'] },
                points: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Flat array: [x1, y1, x2, y2]',
                },
                stroke: { type: 'string' },
                strokeWidth: { type: 'number' },
              },
              required: ['type', 'points'],
            },
          ],
        },
        CurveNode: {
          allOf: [
            { $ref: '#/components/schemas/NodeBase' },
            {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['curve'] },
                points: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Bezier control points: [x1,y1, cx1,cy1, cx2,cy2, x2,y2]',
                },
                stroke: { type: 'string' },
                strokeWidth: { type: 'number' },
                tension: { type: 'number' },
                lineCap: { type: 'string', enum: ['butt', 'round', 'square'] },
              },
              required: ['type', 'points'],
            },
          ],
        },
        ImageNode: {
          allOf: [
            { $ref: '#/components/schemas/NodeBase' },
            {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['image'] },
                src: { type: 'string', description: 'Image URL' },
              },
              required: ['type', 'src'],
            },
          ],
        },
        GroupNode: {
          allOf: [
            { $ref: '#/components/schemas/NodeBase' },
            {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['group'] },
                children: { type: 'array', items: { $ref: '#/components/schemas/LayoutNode' } },
              },
              required: ['type', 'children'],
            },
          ],
        },
        FrameNode: {
          allOf: [
            { $ref: '#/components/schemas/NodeBase' },
            {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['frame'] },
                fill: { type: 'string' },
                children: { type: 'array', items: { $ref: '#/components/schemas/LayoutNode' } },
              },
              required: ['type', 'size', 'children'],
            },
          ],
        },
        LayoutNode: {
          oneOf: [
            { $ref: '#/components/schemas/FrameNode' },
            { $ref: '#/components/schemas/GroupNode' },
            { $ref: '#/components/schemas/RectNode' },
            { $ref: '#/components/schemas/EllipseNode' },
            { $ref: '#/components/schemas/TextNode' },
            { $ref: '#/components/schemas/LineNode' },
            { $ref: '#/components/schemas/CurveNode' },
            { $ref: '#/components/schemas/ImageNode' },
          ],
          discriminator: { propertyName: 'type' },
        },
        LayoutSpec: {
          type: 'object',
          properties: {
            version: { type: 'string' },
            root: { $ref: '#/components/schemas/FrameNode' },
          },
          required: ['root'],
        },
        ProposalOperation: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['create', 'update', 'delete', 'move'] },
            nodeId: { type: 'string', description: 'Target node ID (for create, use the new node ID)' },
            before: { description: 'Previous node state (optional, for diffing)' },
            after: { description: 'Desired node state. For create: full node object. For update: partial properties.' },
            rationale: { type: 'string', description: 'Why this operation is needed' },
          },
          required: ['type', 'nodeId'],
        },
        Proposal: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            branch_id: { type: 'string' },
            canvas_id: { type: 'string' },
            agent_id: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'superseded'] },
            title: { type: 'string' },
            description: { type: 'string' },
            operations: { type: 'array', items: { $ref: '#/components/schemas/ProposalOperation' } },
            rationale: { type: 'string' },
            assumptions: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            created_at: { type: 'integer' },
            reviewed_at: { type: 'integer' },
            reviewed_by: { type: 'string' },
          },
        },
        Canvas: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            owner_id: { type: 'string' },
            name: { type: 'string' },
            spec: { $ref: '#/components/schemas/LayoutSpec' },
            created_at: { type: 'integer' },
            updated_at: { type: 'integer' },
          },
        },
        Branch: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            canvas_id: { type: 'string' },
            agent_id: { type: 'string' },
            base_version: { type: 'integer' },
            status: { type: 'string', enum: ['active', 'merged', 'abandoned'] },
            created_at: { type: 'integer' },
          },
        },
      },
    },
    paths: {
      '/canvases/{canvasId}': {
        get: {
          operationId: 'getCanvas',
          summary: 'Get the current canvas spec',
          description: 'Returns the full canvas including its node tree. Start here to understand the current state.',
          parameters: [
            { name: 'canvasId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Canvas with full spec',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Canvas' } } },
            },
          },
        },
      },
      '/canvases/{canvasId}/branches': {
        get: {
          operationId: 'listBranches',
          summary: 'List branches for a canvas',
          parameters: [
            { name: 'canvasId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Branch' } } } },
            },
          },
        },
        post: {
          operationId: 'createBranch',
          summary: 'Create a new branch for your agent',
          parameters: [
            { name: 'canvasId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agentId: { type: 'string', description: 'Your agent identifier' },
                    baseVersion: { type: 'integer', default: 1 },
                  },
                  required: ['agentId', 'baseVersion'],
                },
              },
            },
          },
          responses: {
            '201': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Branch' } } },
            },
          },
        },
      },
      '/canvases/{canvasId}/proposals': {
        get: {
          operationId: 'listProposals',
          summary: 'List all proposals for a canvas',
          description: 'Check the status of your proposals and see what others have proposed.',
          parameters: [
            { name: 'canvasId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Proposal' } } } },
            },
          },
        },
      },
      '/branches/{branchId}/proposals': {
        post: {
          operationId: 'createProposal',
          summary: 'Submit a proposal with canvas changes',
          description: `Submit a set of operations that modify the canvas. The human owner will review and approve or reject.
          
Each operation must include:
- \`type\`: create, update, delete, or move
- \`nodeId\`: the target node ID
- \`after\`: the desired state (for create/update/move)

For \`create\` operations, \`after\` must be a complete node object with at minimum \`id\` and \`type\`.

Example creating a red rectangle:
\`\`\`json
{
  "type": "create",
  "nodeId": "my-rect-1",
  "after": {
    "id": "my-rect-1",
    "type": "rect",
    "position": { "x": 100, "y": 200 },
    "size": { "width": 300, "height": 150 },
    "fill": "#ef4444",
    "cornerRadius": 8
  }
}
\`\`\``,
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Short title for the proposal' },
                    description: { type: 'string', description: 'What changes are being made and why' },
                    operations: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ProposalOperation' },
                      description: 'The list of node operations to apply',
                    },
                    rationale: { type: 'string', description: 'Overall reasoning for these changes' },
                    assumptions: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'List any assumptions made about the design intent',
                    },
                    confidence: {
                      type: 'number',
                      minimum: 0,
                      maximum: 1,
                      description: 'How confident you are in this proposal (0.0 to 1.0)',
                    },
                  },
                  required: ['title', 'description', 'operations', 'rationale', 'assumptions', 'confidence'],
                },
              },
            },
          },
          responses: {
            '201': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Proposal' } } },
            },
          },
        },
      },
      '/proposals/{proposalId}': {
        get: {
          operationId: 'getProposal',
          summary: 'Get proposal status and details',
          parameters: [
            { name: 'proposalId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Proposal' } } },
            },
          },
        },
      },
    },
  };

  return new Response(JSON.stringify(spec, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
