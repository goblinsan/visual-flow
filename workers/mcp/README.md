# Vizail Canvas MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that allows any AI agent to collaborate on Vizail canvas designs.

## What This Enables

Any MCP-compatible AI agent (Claude Desktop, Cursor, VS Code Copilot, custom agents) can:

1. **Read** the current canvas design — node tree, positions, styles, hierarchy
2. **Submit proposals** — create/update/delete/move nodes with rationale
3. **Check status** — see if proposals were approved or rejected
4. **Learn the system** — read built-in docs about node types and best practices

## Quick Setup (Under 2 Minutes!)

### Option 1: npx (Easiest)

```bash
npx vizail-mcp-server --token=YOUR_TOKEN --canvas-id=YOUR_CANVAS_ID
```

This will start the MCP server immediately without installation.

### Option 2: Install Globally

```bash
npm install -g vizail-mcp-server
vizail-mcp --token=YOUR_TOKEN --canvas-id=YOUR_CANVAS_ID
```

### 1. Generate an Agent Token

The canvas owner generates a token from the UI (Agent tab → "🤖 Generate Token for ChatGPT") or via API:

```bash
curl -X POST http://localhost:62587/api/canvases/YOUR_CANVAS_ID/agent-token \
  -H "Content-Type: application/json" \
  -H "CF-Access-Authenticated-User-Email: owner@email.com" \
  -d '{"agentId": "my-agent", "scope": "propose"}'
```

This returns a token like `vz_agent_xxx_yyy` (valid for 24 hours).

### 2. Configure MCP Client

#### Quick Start with npx

For one-time use or testing:

```bash
npx vizail-mcp-server --token=vz_agent_xxx --canvas-id=canvas_123 --api-url=http://localhost:62587/api
```

#### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vizail-canvas": {
      "command": "npx",
      "args": ["-y", "vizail-mcp-server", "--token=vz_agent_xxx", "--canvas-id=canvas_123"],
      "env": {
        "VIZAIL_API_URL": "http://localhost:62587/api"
      }
    }
  }
}
```

Or using environment variables:

```json
{
  "mcpServers": {
    "vizail-canvas": {
      "command": "npx",
      "args": ["-y", "vizail-mcp-server"],
      "env": {
        "VIZAIL_API_URL": "http://localhost:62587/api",
        "VIZAIL_AGENT_TOKEN": "vz_agent_xxx_yyy",
        "VIZAIL_CANVAS_ID": "canvas_123"
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
      "args": ["-y", "vizail-mcp-server"],
      "env": {
        "VIZAIL_API_URL": "http://localhost:62587/api",
        "VIZAIL_AGENT_TOKEN": "vz_agent_xxx_yyy",
        "VIZAIL_CANVAS_ID": "canvas_123"
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
      "args": ["-y", "vizail-mcp-server"],
      "env": {
        "VIZAIL_API_URL": "http://localhost:62587/api",
        "VIZAIL_AGENT_TOKEN": "vz_agent_xxx_yyy",
        "VIZAIL_CANVAS_ID": "canvas_123"
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

## Environment Variables / CLI Arguments

The server supports both environment variables and CLI arguments:

| Config | CLI Argument | Environment Variable | Required | Description |
|--------|--------------|---------------------|----------|-------------|
| API URL | `--api-url` | `VIZAIL_API_URL` | No | Base URL of the Vizail API (default: `http://localhost:62587/api`) |
| Token | `--token` | `VIZAIL_AGENT_TOKEN` | Yes | Agent token from the canvas owner |
| Canvas ID | `--canvas-id` | `VIZAIL_CANVAS_ID` | No | Optional default canvas ID for tools |

**Note:** CLI arguments take precedence over environment variables.

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
