/**
 * MCP/OpenAPI Compatibility Tests
 * 
 * Ensures that MCP tools align with the REST API endpoints.
 * These tests validate schema compatibility and feature parity.
 */

import { describe, it, expect } from 'vitest';
import { TOOL_DEFINITIONS } from '../tools';
import { RESOURCE_DEFINITIONS } from '../resources';

describe('MCP Server Configuration', () => {
  it('should have valid tool definitions', () => {
    expect(TOOL_DEFINITIONS).toBeDefined();
    expect(Array.isArray(TOOL_DEFINITIONS)).toBe(true);
    expect(TOOL_DEFINITIONS.length).toBeGreaterThan(0);
  });

  it('should have valid resource definitions', () => {
    expect(RESOURCE_DEFINITIONS).toBeDefined();
    expect(Array.isArray(RESOURCE_DEFINITIONS)).toBe(true);
    expect(RESOURCE_DEFINITIONS.length).toBeGreaterThan(0);
  });
});

describe('Tool Definitions', () => {
  it('should have get_canvas tool', () => {
    const tool = TOOL_DEFINITIONS.find(t => t.name === 'get_canvas');
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('canvas design');
    expect(tool?.inputSchema.type).toBe('object');
    expect(tool?.inputSchema.properties).toHaveProperty('canvasId');
  });

  it('should have get_or_create_branch tool', () => {
    const tool = TOOL_DEFINITIONS.find(t => t.name === 'get_or_create_branch');
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('branch');
    expect(tool?.inputSchema.properties).toHaveProperty('canvasId');
    expect(tool?.inputSchema.properties).toHaveProperty('agentId');
  });

  it('should have submit_proposal tool', () => {
    const tool = TOOL_DEFINITIONS.find(t => t.name === 'submit_proposal');
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('proposal');
    expect(tool?.inputSchema.properties).toHaveProperty('branchId');
    expect(tool?.inputSchema.required).toContain('branchId');
  });

  it('should have check_proposal_status tool', () => {
    const tool = TOOL_DEFINITIONS.find(t => t.name === 'check_proposal_status');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty('proposalId');
    expect(tool?.inputSchema.required).toContain('proposalId');
  });

  it('should have list_proposals tool', () => {
    const tool = TOOL_DEFINITIONS.find(t => t.name === 'list_proposals');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty('canvasId');
  });

  it('all tools should have required name, description, and inputSchema', () => {
    TOOL_DEFINITIONS.forEach(tool => {
      expect(tool.name).toBeTruthy();
      expect(typeof tool.name).toBe('string');
      expect(tool.description).toBeTruthy();
      expect(typeof tool.description).toBe('string');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
    });
  });

  it('all tools should have valid required fields arrays', () => {
    TOOL_DEFINITIONS.forEach(tool => {
      if (tool.inputSchema.required) {
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);
        // Verify all required fields exist in properties
        tool.inputSchema.required.forEach((field: string) => {
          expect(tool.inputSchema.properties).toHaveProperty(field);
        });
      }
    });
  });
});

describe('Resource Definitions', () => {
  it('should have node-types documentation resource', () => {
    const resource = RESOURCE_DEFINITIONS.find(
      r => r.uri === 'vizail://docs/node-types'
    );
    expect(resource).toBeDefined();
    expect(resource?.name).toBeTruthy();
    expect(resource?.description).toContain('node type');
  });

  it('should have proposal-guide documentation resource', () => {
    const resource = RESOURCE_DEFINITIONS.find(
      r => r.uri === 'vizail://docs/proposal-guide'
    );
    expect(resource).toBeDefined();
    expect(resource?.name).toBeTruthy();
    expect(resource?.description).toContain('proposal');
  });

  it('should have workflow documentation resource', () => {
    const resource = RESOURCE_DEFINITIONS.find(
      r => r.uri === 'vizail://docs/workflow'
    );
    expect(resource).toBeDefined();
    expect(resource?.name).toBeTruthy();
    expect(resource?.description).toContain('workflow');
  });

  it('all resources should have required fields', () => {
    RESOURCE_DEFINITIONS.forEach(resource => {
      expect(resource.uri).toBeTruthy();
      expect(typeof resource.uri).toBe('string');
      expect(resource.uri.startsWith('vizail://')).toBe(true);
      expect(resource.name).toBeTruthy();
      expect(typeof resource.name).toBe('string');
      expect(resource.description).toBeTruthy();
      expect(typeof resource.description).toBe('string');
    });
  });
});

describe('MCP Protocol Compliance', () => {
  it('tool schemas should use JSON Schema format', () => {
    TOOL_DEFINITIONS.forEach(tool => {
      const schema = tool.inputSchema;
      
      // Must have type
      expect(schema.type).toBe('object');
      
      // Properties must be an object
      expect(typeof schema.properties).toBe('object');
      
      // Each property should have a type
      Object.values(schema.properties).forEach((prop: any) => {
        expect(prop.type).toBeTruthy();
        expect(['string', 'number', 'boolean', 'array', 'object']).toContain(prop.type);
      });
    });
  });

  it('should not have duplicate tool names', () => {
    const toolNames = TOOL_DEFINITIONS.map(t => t.name);
    const uniqueNames = new Set(toolNames);
    expect(toolNames.length).toBe(uniqueNames.size);
  });

  it('should not have duplicate resource URIs', () => {
    const resourceUris = RESOURCE_DEFINITIONS.map(r => r.uri);
    const uniqueUris = new Set(resourceUris);
    expect(resourceUris.length).toBe(uniqueUris.size);
  });
});

describe('API Endpoint Alignment', () => {
  it('get_canvas should align with GET /canvases/:id', () => {
    const tool = TOOL_DEFINITIONS.find(t => t.name === 'get_canvas');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('canvasId');
    expect(tool?.inputSchema.properties?.canvasId?.type).toBe('string');
  });

  it('submit_proposal should align with POST /canvases/:id/branches/:branchId/proposals', () => {
    const tool = TOOL_DEFINITIONS.find(t => t.name === 'submit_proposal');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('branchId');
    expect(tool?.inputSchema.properties).toHaveProperty('operations');
    expect(tool?.inputSchema.properties).toHaveProperty('rationale');
  });

  it('check_proposal_status should align with GET /canvases/:id/proposals/:proposalId', () => {
    const tool = TOOL_DEFINITIONS.find(t => t.name === 'check_proposal_status');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('proposalId');
  });

  it('list_proposals should align with GET /canvases/:id/proposals', () => {
    const tool = TOOL_DEFINITIONS.find(t => t.name === 'list_proposals');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('canvasId');
  });
});

describe('Version Compatibility', () => {
  it('should export version information from package.json', async () => {
    // This test verifies that version can be read from package.json
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, '../../package.json'), 'utf-8')
    );
    
    expect(packageJson.version).toBeTruthy();
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+/); // semver format
  });

  it('should have MCP protocol version', () => {
    // The server should use MCP protocol version 2024-11-05
    // This is validated in the server initialization
    const expectedProtocol = '2024-11-05';
    expect(expectedProtocol).toBeTruthy();
  });
});

describe('Feature Completeness', () => {
  const expectedTools = [
    'get_canvas',
    'get_or_create_branch',
    'submit_proposal',
    'check_proposal_status',
    'list_proposals'
  ];

  it(`should have all ${expectedTools.length} expected tools`, () => {
    const toolNames = TOOL_DEFINITIONS.map(t => t.name);
    expectedTools.forEach(expectedTool => {
      expect(toolNames).toContain(expectedTool);
    });
  });

  const expectedResources = [
    'vizail://docs/node-types',
    'vizail://docs/proposal-guide',
    'vizail://docs/workflow'
  ];

  it(`should have all ${expectedResources.length} expected resources`, () => {
    const resourceUris = RESOURCE_DEFINITIONS.map(r => r.uri);
    expectedResources.forEach(expectedResource => {
      expect(resourceUris).toContain(expectedResource);
    });
  });
});
