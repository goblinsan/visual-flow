/**
 * Canonical OpenAPI spec for the Vizail Canvas API
 *
 * This is the single source of truth for agent discovery.
 */

export const OPENAPI_SPEC = {
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
Supported types: frame, group, stack, grid, text, image, box, rect, ellipse, line, curve, draw, polygon.

## Proposal Operations
Each operation targets a node by ID:
- \`create\` — Add a new node. Provide \`after\` with the full node object (must include \`id\` and \`type\`).
- \`update\` — Modify an existing node. Provide \`nodeId\` and \`after\` with changed properties.
- \`delete\` — Remove a node. Provide \`nodeId\`.
- \`move\`   — Reposition a node. Provide \`nodeId\` and \`after: { position: { x, y } }\`.

**Important**: Operations apply to \`root.children\` only (top-level nodes). To modify nodes inside a group, update the group itself.`,
    },
    'x-vizail-version': '1.0.0',
    'x-vizail-capabilities': [
      'canvas-read',
      'canvas-write',
      'agent-branches',
      'proposals',
      'agent-tokens',
      'agent-link-codes',
    ],
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
        StackNode: {
          allOf: [
            { $ref: '#/components/schemas/NodeBase' },
            {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['stack'] },
                direction: { type: 'string', enum: ['row', 'column'] },
                gap: { type: 'number' },
                padding: { type: 'number' },
                align: { type: 'string', enum: ['start', 'center', 'end', 'stretch'] },
                justify: { type: 'string', enum: ['start', 'center', 'end', 'space-between'] },
                children: { type: 'array', items: { $ref: '#/components/schemas/LayoutNode' } },
              },
              required: ['type', 'children'],
            },
          ],
        },
        GridNode: {
          allOf: [
            { $ref: '#/components/schemas/NodeBase' },
            {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['grid'] },
                columns: { type: 'number' },
                gap: { type: 'number' },
                padding: { type: 'number' },
                children: { type: 'array', items: { $ref: '#/components/schemas/LayoutNode' } },
              },
              required: ['type', 'columns', 'children'],
            },
          ],
        },
        BoxNode: {
          allOf: [
            { $ref: '#/components/schemas/NodeBase' },
            {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['box'] },
                radius: { type: 'number' },
                background: { type: 'string' },
                border: { type: 'string' },
                padding: { type: 'number' },
                children: { type: 'array', items: { $ref: '#/components/schemas/LayoutNode' } },
              },
              required: ['type'],
            },
          ],
        },
        DrawNode: {
          allOf: [
            { $ref: '#/components/schemas/NodeBase' },
            {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['draw'] },
                points: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Flat array of points: [x1, y1, x2, y2, ...]',
                },
                stroke: { type: 'string' },
                strokeWidth: { type: 'number' },
                strokeDash: { type: 'array', items: { type: 'number' } },
                lineCap: { type: 'string', enum: ['butt', 'round', 'square'] },
                lineJoin: { type: 'string', enum: ['miter', 'round', 'bevel'] },
                tension: { type: 'number' },
              },
              required: ['type', 'points'],
            },
          ],
        },
        PolygonNode: {
          allOf: [
            { $ref: '#/components/schemas/NodeBase' },
            {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['polygon'] },
                points: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Flat array of vertices: [x1, y1, x2, y2, ...]',
                },
                fill: { type: 'string' },
                stroke: { type: 'string' },
                strokeWidth: { type: 'number' },
                strokeDash: { type: 'array', items: { type: 'number' } },
                closed: { type: 'boolean' },
                sides: { type: 'number' },
              },
              required: ['type', 'points'],
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
            { $ref: '#/components/schemas/StackNode' },
            { $ref: '#/components/schemas/GridNode' },
            { $ref: '#/components/schemas/BoxNode' },
            { $ref: '#/components/schemas/RectNode' },
            { $ref: '#/components/schemas/EllipseNode' },
            { $ref: '#/components/schemas/TextNode' },
            { $ref: '#/components/schemas/LineNode' },
            { $ref: '#/components/schemas/CurveNode' },
            { $ref: '#/components/schemas/DrawNode' },
            { $ref: '#/components/schemas/PolygonNode' },
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
            user_role: { type: 'string', enum: ['owner', 'editor', 'viewer'] },
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
        Member: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            canvas_id: { type: 'string' },
            user_id: { type: 'string' },
            role: { type: 'string', enum: ['owner', 'editor', 'viewer'] },
            email: { type: 'string' },
            display_name: { type: 'string' },
            invited_by: { type: 'string' },
            created_at: { type: 'integer' },
          },
        },
        AgentToken: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            canvas_id: { type: 'string' },
            agent_id: { type: 'string' },
            token: { type: 'string' },
            scope: { type: 'string', enum: ['read', 'propose', 'trusted-propose'] },
            expires_at: { type: 'integer' },
            created_at: { type: 'integer' },
          },
        },
        AgentTokenSummary: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            canvas_id: { type: 'string' },
            agent_id: { type: 'string' },
            scope: { type: 'string', enum: ['read', 'propose', 'trusted-propose'] },
            expires_at: { type: 'integer' },
            created_at: { type: 'integer' },
            last_used_at: { type: 'integer', nullable: true },
          },
        },
        AgentLinkCode: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            canvas_id: { type: 'string' },
            agent_id: { type: 'string' },
            scope: { type: 'string', enum: ['read', 'propose', 'trusted-propose'] },
            code: { type: 'string' },
            expires_at: { type: 'integer' },
            created_at: { type: 'integer' },
          },
        },
        McpServerConfig: {
          type: 'object',
          properties: {
            command: { type: 'string' },
            args: { type: 'array', items: { type: 'string' } },
            env: { type: 'object', additionalProperties: { type: 'string' } },
          },
          required: ['command', 'args', 'env'],
        },
        McpServersConfig: {
          type: 'object',
          properties: {
            mcpServers: {
              type: 'object',
              additionalProperties: { $ref: '#/components/schemas/McpServerConfig' },
            },
          },
          required: ['mcpServers'],
        },
        VSCodeMcpConfig: {
          type: 'object',
          properties: {
            servers: {
              type: 'object',
              additionalProperties: { $ref: '#/components/schemas/McpServerConfig' },
            },
          },
          required: ['servers'],
        },
        McpConfigTemplate: {
          type: 'object',
          properties: {
            filename: { type: 'string' },
            content: { type: 'object' },
          },
          required: ['filename', 'content'],
        },
        AgentConnectResponse: {
          type: 'object',
          properties: {
            token: { $ref: '#/components/schemas/AgentToken' },
            api_url: { type: 'string' },
            canvas_id: { type: 'string' },
            configs: {
              type: 'object',
              properties: {
                mcp_json: { $ref: '#/components/schemas/McpConfigTemplate' },
                cursor: { $ref: '#/components/schemas/McpConfigTemplate' },
                vscode: { $ref: '#/components/schemas/McpConfigTemplate' },
                claude_desktop: { $ref: '#/components/schemas/McpConfigTemplate' },
              },
              required: ['mcp_json', 'cursor', 'vscode', 'claude_desktop'],
            },
          },
          required: ['token', 'api_url', 'canvas_id', 'configs'],
        },
      },
    },
    paths: {
      '/health': {
        get: {
          operationId: 'health',
          summary: 'Health check',
          description: 'Returns API health status.',
          security: [],
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      timestamp: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/health': {
        get: {
          operationId: 'apiHealth',
          summary: 'Health check (API namespace)',
          description: 'Returns API health status.',
          security: [],
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      timestamp: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/whoami': {
        get: {
          operationId: 'whoami',
          summary: 'Current user info',
          description: 'Returns authenticated user info or nulls for guests.',
          security: [],
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: ['string', 'null'] },
                      email: { type: ['string', 'null'] },
                      display_name: { type: ['string', 'null'] },
                      authenticated: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/user/display-name': {
        post: {
          operationId: 'setDisplayName',
          summary: 'Set display name',
          'x-vizail-scope': 'trusted-propose',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    display_name: { type: 'string' },
                  },
                  required: ['display_name'],
                },
              },
            },
          },
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: { type: 'boolean' },
                      display_name: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        put: {
          operationId: 'updateDisplayName',
          summary: 'Update display name',
          'x-vizail-scope': 'trusted-propose',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    display_name: { type: 'string' },
                  },
                  required: ['display_name'],
                },
              },
            },
          },
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: { type: 'boolean' },
                      display_name: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/canvases': {
        get: {
          operationId: 'listCanvases',
          summary: 'List canvases for the authenticated user',
          description: 'Returns canvases the user is a member of.',
          'x-vizail-scope': 'read',
          responses: {
            '200': {
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Canvas' } } } },
            },
          },
        },
        post: {
          operationId: 'createCanvas',
          summary: 'Create a new canvas',
          description: 'Creates a new canvas and assigns the caller as owner.',
          'x-vizail-scope': 'trusted-propose',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    spec: { $ref: '#/components/schemas/LayoutSpec' },
                  },
                  required: ['name', 'spec'],
                },
              },
            },
          },
          responses: {
            '201': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Canvas' } } },
            },
          },
        },
      },
      '/canvases/{canvasId}': {
        get: {
          operationId: 'getCanvas',
          summary: 'Get the current canvas spec',
          description: 'Returns the full canvas including its node tree. Start here to understand the current state.',
          'x-vizail-scope': 'read',
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
        put: {
          operationId: 'updateCanvas',
          summary: 'Update a canvas',
          'x-vizail-scope': 'trusted-propose',
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
                    name: { type: 'string' },
                    spec: { $ref: '#/components/schemas/LayoutSpec' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Canvas' } } },
            },
          },
        },
        delete: {
          operationId: 'deleteCanvas',
          summary: 'Delete a canvas',
          'x-vizail-scope': 'trusted-propose',
          parameters: [
            { name: 'canvasId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } },
            },
          },
        },
      },
      '/canvases/{canvasId}/members': {
        get: {
          operationId: 'listMembers',
          summary: 'List canvas members',
          'x-vizail-scope': 'read',
          parameters: [
            { name: 'canvasId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Member' } } } },
            },
          },
        },
        post: {
          operationId: 'addMember',
          summary: 'Invite a member to a canvas',
          'x-vizail-scope': 'trusted-propose',
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
                    email: { type: 'string' },
                    role: { type: 'string', enum: ['editor', 'viewer'] },
                  },
                  required: ['email', 'role'],
                },
              },
            },
          },
          responses: {
            '201': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Member' } } },
            },
          },
        },
      },
      '/canvases/{canvasId}/members/{userId}': {
        delete: {
          operationId: 'removeMember',
          summary: 'Remove a member from a canvas',
          'x-vizail-scope': 'trusted-propose',
          parameters: [
            { name: 'canvasId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } },
            },
          },
        },
      },
      '/agent/connect': {
        post: {
          operationId: 'connectAgent',
          summary: 'Create an agent token and config templates',
          description: 'Human users only. Returns a token and prebuilt MCP config templates.',
          'x-vizail-scope': 'trusted-propose',
          'x-vizail-human-only': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    canvasId: { type: 'string' },
                    agentId: { type: 'string' },
                    scope: { type: 'string', enum: ['read', 'propose', 'trusted-propose'] },
                    client: { type: 'string' },
                  },
                  required: ['canvasId'],
                },
              },
            },
          },
          responses: {
            '200': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentConnectResponse' } } },
            },
          },
        },
      },
      '/agent/link-code': {
        post: {
          operationId: 'createLinkCode',
          summary: 'Create a one-time link code for extensions',
          description: 'Human users only. Returns a short-lived link code that can be exchanged for an agent token.',
          'x-vizail-scope': 'trusted-propose',
          'x-vizail-human-only': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    canvasId: { type: 'string' },
                    agentId: { type: 'string' },
                    scope: { type: 'string', enum: ['read', 'propose', 'trusted-propose'] },
                    client: { type: 'string' },
                  },
                  required: ['canvasId'],
                },
              },
            },
          },
          responses: {
            '200': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentLinkCode' } } },
            },
          },
        },
      },
      '/agent/link-code/exchange': {
        post: {
          operationId: 'exchangeLinkCode',
          summary: 'Exchange a link code for an agent token',
          description: 'Public endpoint. Exchanges a one-time code for a token and MCP config templates.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                  },
                  required: ['code'],
                },
              },
            },
          },
          responses: {
            '200': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentConnectResponse' } } },
            },
          },
        },
      },
      '/canvases/{canvasId}/agent-token': {
        post: {
          operationId: 'generateAgentToken',
          summary: 'Generate an agent token',
          description: 'Human users only. Agent tokens cannot generate other tokens.',
          'x-vizail-scope': 'trusted-propose',
          'x-vizail-human-only': true,
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
                    agentId: { type: 'string' },
                    scope: { type: 'string', enum: ['read', 'propose', 'trusted-propose'] },
                  },
                  required: ['agentId', 'scope'],
                },
              },
            },
          },
          responses: {
            '200': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentToken' } } },
            },
          },
        },
      },
      '/canvases/{canvasId}/agent-tokens': {
        get: {
          operationId: 'listAgentTokens',
          summary: 'List agent tokens for a canvas',
          description: 'Human users only. Returns token metadata without secrets.',
          'x-vizail-scope': 'trusted-propose',
          'x-vizail-human-only': true,
          parameters: [
            { name: 'canvasId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/AgentTokenSummary' } } } },
            },
          },
        },
      },
      '/canvases/{canvasId}/agent-token/{agentId}': {
        delete: {
          operationId: 'revokeAgentToken',
          summary: 'Revoke an agent token',
          description: 'Human users only. Agent tokens cannot revoke other tokens.',
          'x-vizail-scope': 'trusted-propose',
          'x-vizail-human-only': true,
          parameters: [
            { name: 'canvasId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'agentId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } },
            },
          },
        },
      },
      '/canvases/{canvasId}/branches': {
        get: {
          operationId: 'listBranches',
          summary: 'List branches for a canvas',
          'x-vizail-scope': 'read',
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
          'x-vizail-scope': 'propose',
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
      '/branches/{branchId}': {
        get: {
          operationId: 'getBranch',
          summary: 'Get a branch by ID',
          'x-vizail-scope': 'read',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Branch' } } },
            },
          },
        },
        delete: {
          operationId: 'deleteBranch',
          summary: 'Delete a branch',
          'x-vizail-scope': 'propose',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } },
            },
          },
        },
      },
      '/canvases/{canvasId}/proposals': {
        get: {
          operationId: 'listProposals',
          summary: 'List all proposals for a canvas',
          description: 'Check the status of your proposals and see what others have proposed.',
          'x-vizail-scope': 'read',
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
          'x-vizail-scope': 'propose',
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
          'x-vizail-scope': 'read',
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
      '/proposals/{proposalId}/approve': {
        post: {
          operationId: 'approveProposal',
          summary: 'Approve a proposal',
          'x-vizail-scope': 'trusted-propose',
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
      '/proposals/{proposalId}/reject': {
        post: {
          operationId: 'rejectProposal',
          summary: 'Reject a proposal',
          'x-vizail-scope': 'trusted-propose',
          parameters: [
            { name: 'proposalId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    reason: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Proposal' } } },
            },
          },
        },
      },
    },
  };
