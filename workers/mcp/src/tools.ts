/**
 * MCP Tool definitions for Vizail Canvas
 * 
 * These tools expose the canvas API to any MCP-compatible agent.
 * Tools are designed to guide agents through the proposal workflow.
 */

import type { VizailApiClient } from './api-client.js';

export const TOOL_DEFINITIONS = [
  {
    name: 'get_canvas',
    description: `Read the current canvas design. Returns the full node tree including positions, sizes, styles, and hierarchy.

The canvas uses a tree of typed nodes:
- **frame**: Root container with fixed size and children
- **group**: Logical grouping of children with shared transform  
- **rect**: Rectangle with fill, stroke, cornerRadius
- **ellipse**: Oval shape with fill, stroke
- **text**: Text label with font properties
- **line**: Straight line between two points [x1,y1,x2,y2]
- **curve**: Bezier curve with control points and tension
- **image**: Image from a URL with optional sizing
- **stack/grid/box**: Layout containers

Start here to understand what's on the canvas before making changes.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        canvasId: {
          type: 'string',
          description: 'The canvas ID (provided by the canvas owner)',
        },
      },
      required: ['canvasId'],
    },
  },

  {
    name: 'get_or_create_branch',
    description: `Get an existing branch for your agent, or create a new one. A branch is required before submitting proposals. Each agent should have one active branch per canvas.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        canvasId: {
          type: 'string',
          description: 'The canvas ID',
        },
        agentId: {
          type: 'string',
          description: 'Your unique agent identifier (e.g. "design-assistant", "layout-optimizer")',
        },
      },
      required: ['canvasId', 'agentId'],
    },
  },

  {
    name: 'submit_proposal',
    description: `Submit a proposal to modify the canvas. The human owner will review and approve or reject it.

**Operations** modify nodes in root.children (top-level only):

- **create**: Add a new node. \`after\` must include \`id\` and \`type\` at minimum.
  Example: { type: "create", nodeId: "my-rect", after: { id: "my-rect", type: "rect", position: { x: 100, y: 200 }, size: { width: 300, height: 150 }, fill: "#ef4444" } }

- **update**: Modify properties of an existing node. \`after\` contains only the changed fields.
  Example: { type: "update", nodeId: "existing-rect", after: { fill: "#3b82f6" } }

- **delete**: Remove a node by ID.
  Example: { type: "delete", nodeId: "node-to-remove" }

- **move**: Reposition a node.
  Example: { type: "move", nodeId: "existing-rect", after: { position: { x: 200, y: 300 } } }

**Tips:**
- Always read the canvas first to understand existing nodes
- Use descriptive node IDs (not random strings)
- Include rationale for each operation to help the reviewer
- Set confidence lower if you're uncertain about positioning or style choices
- List your assumptions explicitly so the reviewer can correct them`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        branchId: {
          type: 'string',
          description: 'Branch ID (from get_or_create_branch)',
        },
        title: {
          type: 'string',
          description: 'Short descriptive title (e.g. "Add navigation header")',
        },
        description: {
          type: 'string',
          description: 'Detailed description of what changes are being made and why',
        },
        operations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['create', 'update', 'delete', 'move'] },
              nodeId: { type: 'string' },
              after: {
                type: 'object',
                description: 'The desired node state. For create: full node object. For update: partial.',
              },
              rationale: { type: 'string', description: 'Why this specific operation is needed' },
            },
            required: ['type', 'nodeId'],
          },
          description: 'List of node operations to apply',
        },
        rationale: {
          type: 'string',
          description: 'Overall reasoning for the proposal',
        },
        assumptions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Assumptions about design intent, brand, layout, etc.',
        },
        confidence: {
          type: 'number',
          description: 'Confidence score from 0.0 (guessing) to 1.0 (certain)',
        },
      },
      required: ['branchId', 'title', 'description', 'operations', 'rationale', 'assumptions', 'confidence'],
    },
  },

  {
    name: 'check_proposal_status',
    description: `Check the status of a previously submitted proposal.
Status values:
- **pending**: Waiting for human review
- **approved**: Changes have been merged into the canvas
- **rejected**: Changes were declined (submit a revised proposal if needed)
- **superseded**: A newer proposal replaced this one`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        proposalId: {
          type: 'string',
          description: 'The proposal ID returned from submit_proposal',
        },
      },
      required: ['proposalId'],
    },
  },

  {
    name: 'list_proposals',
    description: `List all proposals for a canvas, including their statuses. Useful to see what changes have been proposed or approved previously.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        canvasId: {
          type: 'string',
          description: 'The canvas ID',
        },
      },
      required: ['canvasId'],
    },
  },
];

/**
 * Handle a tool call from an MCP client
 */
export async function handleToolCall(
  api: VizailApiClient,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    switch (toolName) {
      case 'get_canvas': {
        const canvas = await api.getCanvas(args.canvasId as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(canvas, null, 2),
            },
          ],
        };
      }

      case 'get_or_create_branch': {
        const canvasId = args.canvasId as string;
        const agentId = args.agentId as string;

        // Try to find existing active branch for this agent
        const branches = await api.listBranches(canvasId);
        const existing = branches.find(
          (b) => b.agent_id === agentId && b.status === 'active'
        );

        if (existing) {
          return {
            content: [
              {
                type: 'text',
                text: `Found existing branch: ${existing.id}\n\n${JSON.stringify(existing, null, 2)}`,
              },
            ],
          };
        }

        // Create new branch
        const branch = await api.createBranch(canvasId, agentId);
        return {
          content: [
            {
              type: 'text',
              text: `Created new branch: ${branch.id}\n\n${JSON.stringify(branch, null, 2)}`,
            },
          ],
        };
      }

      case 'submit_proposal': {
        const proposal = await api.createProposal(args.branchId as string, {
          title: args.title as string,
          description: args.description as string,
          operations: args.operations as any[],
          rationale: args.rationale as string,
          assumptions: args.assumptions as string[],
          confidence: args.confidence as number,
        });
        return {
          content: [
            {
              type: 'text',
              text: `Proposal submitted successfully!\n\nID: ${proposal.id}\nStatus: ${proposal.status}\nTitle: ${proposal.title}\n\nThe canvas owner will review this proposal. Use check_proposal_status to see if it was approved or rejected.`,
            },
          ],
        };
      }

      case 'check_proposal_status': {
        const proposal = await api.getProposal(args.proposalId as string);
        const statusEmoji =
          proposal.status === 'approved'
            ? '✅'
            : proposal.status === 'rejected'
              ? '❌'
              : proposal.status === 'pending'
                ? '⏳'
                : '🔄';

        return {
          content: [
            {
              type: 'text',
              text: `${statusEmoji} Proposal "${proposal.title}"\n\nStatus: ${proposal.status}${
                proposal.reviewed_at
                  ? `\nReviewed at: ${new Date(proposal.reviewed_at).toISOString()}`
                  : ''
              }${proposal.reviewed_by ? `\nReviewed by: ${proposal.reviewed_by}` : ''}\n\nOperations: ${proposal.operations.length}`,
            },
          ],
        };
      }

      case 'list_proposals': {
        const proposals = await api.listProposals(args.canvasId as string);
        if (proposals.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No proposals found for this canvas.',
              },
            ],
          };
        }

        const summary = proposals
          .map((p) => {
            const status =
              p.status === 'approved'
                ? '✅'
                : p.status === 'rejected'
                  ? '❌'
                  : p.status === 'pending'
                    ? '⏳'
                    : '🔄';
            return `${status} [${p.id}] "${p.title}" — ${p.status} (${p.operations.length} ops, confidence: ${p.confidence})`;
          })
          .join('\n');

        return {
          content: [{ type: 'text', text: `${proposals.length} proposals:\n\n${summary}` }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}
