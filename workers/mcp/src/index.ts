/**
 * Vizail Canvas MCP Server
 * 
 * Provides tools for any MCP-compatible AI agent to:
 * - Read canvas designs (node tree, positions, styles)
 * - Submit proposals to modify the canvas
 * - Check proposal status
 * - Understand the node type system
 * 
 * Usage:
 *   VIZAIL_API_URL=http://localhost:62587/api \
 *   VIZAIL_AGENT_TOKEN=vz_agent_xxx \
 *   npx vizail-mcp
 * 
 * Or configure in Claude Desktop / Cursor / VS Code MCP settings.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { VizailApiClient } from './api-client.js';
import { TOOL_DEFINITIONS, handleToolCall } from './tools.js';
import { RESOURCE_DEFINITIONS, handleResourceRead } from './resources.js';

const API_URL = process.env.VIZAIL_API_URL || 'http://localhost:62587/api';
const AGENT_TOKEN = process.env.VIZAIL_AGENT_TOKEN || '';

if (!AGENT_TOKEN) {
  console.error('⚠️  VIZAIL_AGENT_TOKEN is not set. Get a token from the canvas owner.');
  console.error('   Set it via: export VIZAIL_AGENT_TOKEN=vz_agent_...');
}

const apiClient = new VizailApiClient(API_URL, AGENT_TOKEN);

const server = new Server(
  {
    name: 'vizail-canvas',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// --- Tool handlers ---

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOL_DEFINITIONS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return handleToolCall(apiClient, request.params.name, request.params.arguments ?? {});
});

// --- Resource handlers ---

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: RESOURCE_DEFINITIONS,
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => ({
  contents: await handleResourceRead(request.params.uri),
}));

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Vizail MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
