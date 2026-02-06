# Vizail Canvas MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that allows any AI agent to collaborate on Vizail canvas designs.

## What This Enables

Any MCP-compatible AI agent (Claude Desktop, Cursor, VS Code Copilot, custom agents) can:

1. **Read** the current canvas design — node tree, positions, styles, hierarchy
2. **Submit proposals** — create/update/delete/move nodes with rationale
3. **Check status** — see if proposals were approved or rejected
4. **Learn the system** — read built-in docs about node types and best practices

## Quick Setup

### 1. Generate an Agent Token

The canvas owner generates a token from the UI (Agent tab → Share with Agent) or via API:

```bash
curl -X POST http://localhost:62587/api/canvases/YOUR_CANVAS_ID/agent-token \
  -H "Content-Type: application/json" \
  -H "CF-Access-Authenticated-User-Email: owner@email.com" \
  -d '{"agentId": "my-agent", "scope": "propose"}'
```

This returns a token like `vz_agent_xxx_yyy` (valid for 24 hours).

### 2. Configure MCP Client

#### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vizail-canvas": {
      "command": "npx",
      "args": ["tsx", "/path/to/visual-flow/workers/mcp/src/index.ts"],
      "env": {
        "VIZAIL_API_URL": "http://localhost:62587/api",
        "VIZAIL_AGENT_TOKEN": "vz_agent_xxx_yyy"
      }
    }
  }
}
```

#### Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "vizail-canvas": {
      "command": "npx",
      "args": ["tsx", "./workers/mcp/src/index.ts"],
      "env": {
        "VIZAIL_API_URL": "http://localhost:62587/api",
        "VIZAIL_AGENT_TOKEN": "vz_agent_xxx_yyy"
      }
    }
  }
}
```

#### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "vizail-canvas": {
      "command": "npx",
      "args": ["tsx", "${workspaceFolder}/workers/mcp/src/index.ts"],
      "env": {
        "VIZAIL_API_URL": "http://localhost:62587/api",
        "VIZAIL_AGENT_TOKEN": "vz_agent_xxx_yyy"
      }
    }
  }
}
```

### 3. Start Using

Once configured, the agent will have these tools available:

| Tool | Description |
|------|-------------|
| `get_canvas` | Read the full canvas design |
| `get_or_create_branch` | Get/create a branch for proposals |
| `submit_proposal` | Submit changes for review |
| `check_proposal_status` | Check if a proposal was approved/rejected |
| `list_proposals` | See all proposals for a canvas |

And these resources (static docs):

| Resource | Description |
|----------|-------------|
| `vizail://docs/node-types` | Complete node type reference |
| `vizail://docs/proposal-guide` | How to write good proposals |
| `vizail://docs/workflow` | Step-by-step agent workflow |

## Alternative: REST API Direct Access

If your agent doesn't support MCP, you can use the REST API directly:

```bash
# Discovery (no auth needed)
curl http://localhost:62587/api/agent/discover

# All other endpoints use agent token auth
curl http://localhost:62587/api/canvases/CANVAS_ID \
  -H "Authorization: Bearer vz_agent_xxx_yyy"
```

The discovery endpoint returns a full OpenAPI 3.1 spec with schemas, examples, and workflow documentation.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VIZAIL_API_URL` | Yes | Base URL of the Vizail API (e.g. `http://localhost:62587/api`) |
| `VIZAIL_AGENT_TOKEN` | Yes | Agent token from the canvas owner |

## Token Scopes

| Scope | Permissions |
|-------|------------|
| `read` | Read canvas, list proposals |
| `propose` | Read + create branches + submit proposals |
| `trusted-propose` | All of propose (reserved for future auto-approve) |

## Development

```bash
cd workers/mcp
npm install
npm run dev  # Uses tsx for hot-reload
```
