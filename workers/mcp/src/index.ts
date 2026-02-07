#!/usr/bin/env node
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
 *   npx vizail-mcp --token=vz_agent_xxx --canvas-id=canvas_123
 * 
 * Or via environment variables:
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

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {};
  
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const equalIndex = arg.indexOf('=');
      if (equalIndex === -1) {
        console.error(`⚠️  Warning: Argument '${arg}' is missing a value. Use format: --key=value`);
        continue;
      }
      const key = arg.slice(2, equalIndex);
      const value = arg.slice(equalIndex + 1);
      if (!key || !value) {
        console.error(`⚠️  Warning: Invalid argument format '${arg}'. Use format: --key=value`);
        continue;
      }
      result[key] = value;
    } else {
      console.error(`⚠️  Warning: Unknown argument '${arg}'. Arguments must start with --`);
    }
  }
  
  return result;
}

const cliArgs = parseArgs();

// Support both CLI args and environment variables
const API_URL = cliArgs['api-url'] || process.env.VIZAIL_API_URL || 'http://localhost:62587/api';
const AGENT_TOKEN = cliArgs.token || process.env.VIZAIL_AGENT_TOKEN || '';
const CANVAS_ID = cliArgs['canvas-id'] || process.env.VIZAIL_CANVAS_ID;

if (!AGENT_TOKEN) {
  console.error('⚠️  VIZAIL_AGENT_TOKEN is not set. Get a token from the canvas owner.');
  console.error('   Usage: npx vizail-mcp --token=vz_agent_xxx --canvas-id=canvas_123');
  console.error('   Or set: export VIZAIL_AGENT_TOKEN=vz_agent_...');
}

if (CANVAS_ID) {
  console.error(`📋 Canvas ID: ${CANVAS_ID}`);
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
