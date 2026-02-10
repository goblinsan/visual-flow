# Agent Integration Plan: MCP Server Distribution & Update Pipeline

**Date:** 2026-02-10  
**Epic:** MCP Server Distribution & Update Pipeline  
**Status:** In Progress  

## Overview

This plan details the implementation of a complete distribution and update pipeline for the `vizail-mcp-server` package, including automated npm releases, MCP Registry publishing, version management, and compatibility testing.

## Objectives

1. **Automate npm releases** for vizail-mcp-server
2. **Publish to MCP Registry** for discoverability
3. **Implement capability/version handshake** for compatibility
4. **Create compatibility tests** for MCP + OpenAPI alignment

## Background

The Vizail MCP server (`workers/mcp/`) enables AI agents to interact with canvas designs via the Model Context Protocol. Currently:
- Manual npm publishing process
- Not listed in MCP Registry
- No automated version management
- Limited compatibility testing

This creates friction for users discovering and installing the server.

## Scope

### In Scope
- GitHub Actions workflow for automated npm publishing
- MCP Registry metadata and publishing
- Version negotiation in MCP server
- Automated compatibility testing
- CI/CD integration

### Out of Scope
- Breaking changes to existing MCP server functionality
- Changes to the core API endpoints
- UI changes for agent panel (completed in Epic 5)

## Implementation Plan

### 1. Automate npm Releases

**Goal:** Publish `vizail-mcp-server` to npm automatically on version tags

**Tasks:**
1. Create `.github/workflows/publish-mcp-server.yml` workflow
2. Configure npm authentication using `NPM_TOKEN` secret
3. Trigger on version tags (e.g., `mcp-v0.1.0`)
4. Run tests before publishing
5. Build TypeScript to dist/
6. Publish to npm registry
7. Create GitHub release with changelog

**Acceptance Criteria:**
- ✅ Workflow triggers on `mcp-v*` tags
- ✅ Tests pass before publishing
- ✅ Package published to npm automatically
- ✅ GitHub release created with notes

**Implementation:**
```yaml
# .github/workflows/publish-mcp-server.yml
name: Publish MCP Server to npm

on:
  push:
    tags:
      - 'mcp-v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - name: Install dependencies
        working-directory: workers/mcp
        run: npm ci
      - name: Run tests
        working-directory: workers/mcp
        run: npm test
      - name: Build
        working-directory: workers/mcp
        run: npm run build
      - name: Publish to npm
        working-directory: workers/mcp
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 2. Publish to MCP Registry

**Goal:** Make vizail-mcp-server discoverable in the official MCP Registry

**Tasks:**
1. Create `workers/mcp/server.json` with registry metadata
2. Install `mcp-publisher` CLI tool
3. Configure GitHub namespace: `io.github.goblinsan/vizail-mcp-server`
4. Validate server.json schema
5. Authenticate with GitHub
6. Publish to registry
7. Verify listing at https://registry.modelcontextprotocol.io/

**Acceptance Criteria:**
- ✅ `server.json` created with correct metadata
- ✅ Server published to MCP Registry
- ✅ Server searchable in registry
- ✅ Documentation links correct

**Implementation:**

`workers/mcp/server.json`:
```json
{
  "name": "io.github.goblinsan/vizail-mcp-server",
  "description": "MCP server for Vizail Canvas — allows any AI agent to interact with canvas designs",
  "version": "0.1.0",
  "homepage": "https://github.com/goblinsan/visual-flow/tree/main/workers/mcp",
  "license": "MIT",
  "packages": [
    {
      "type": "npm",
      "name": "vizail-mcp-server"
    }
  ],
  "capabilities": {
    "resources": true,
    "tools": true,
    "prompts": false
  },
  "tags": [
    "canvas",
    "design",
    "collaboration",
    "visual-editor"
  ]
}
```

Publishing steps:
```bash
cd workers/mcp
npm install -g @modelcontextprotocol/mcp-publisher
mcp-publisher init  # Creates server.json
mcp-publisher validate
mcp-publisher publish
```

### 3. Capability/Version Handshake

**Goal:** Enable version negotiation between MCP server and clients

**Tasks:**
1. Add server version to MCP initialization
2. Expose capability information
3. Add `/version` endpoint for HTTP clients
4. Document compatibility matrix
5. Implement graceful degradation for older clients

**Acceptance Criteria:**
- ✅ Server reports version on initialization
- ✅ Capabilities exposed via MCP protocol
- ✅ Version endpoint returns semver + features
- ✅ Backward compatibility maintained

**Implementation:**

`workers/mcp/src/index.ts`:
```typescript
const serverInfo = {
  name: "vizail-mcp-server",
  version: "0.1.0", // From package.json
  protocolVersion: "2024-11-05",
  capabilities: {
    resources: {
      list: true,
      get: true
    },
    tools: {
      list: true,
      call: true
    }
  }
};

server.setRequestHandler(InitializeRequestSchema, async (request) => {
  return {
    ...serverInfo,
    serverInfo: {
      name: serverInfo.name,
      version: serverInfo.version
    }
  };
});
```

### 4. Compatibility Tests for MCP + OpenAPI Alignment

**Goal:** Ensure MCP server tools align with REST API endpoints

**Tasks:**
1. Create test suite comparing MCP tools to OpenAPI spec
2. Validate request/response schemas match
3. Test all MCP tools against live API
4. Add CI workflow for compatibility tests
5. Document breaking changes process

**Acceptance Criteria:**
- ✅ Test suite validates all MCP tools
- ✅ Schema alignment verified automatically
- ✅ Tests run in CI on every PR
- ✅ 100% MCP/API parity

**Implementation:**

`workers/mcp/src/__tests__/compatibility.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { server } from '../index';
import { openApiSpec } from '../../../workers/api/openapi-spec';

describe('MCP/OpenAPI Compatibility', () => {
  it('should have matching tools for each API endpoint', () => {
    const mcpTools = server.listTools();
    const apiPaths = Object.keys(openApiSpec.paths);
    
    // Validate tools exist for API operations
    expect(mcpTools).toContainEqual(
      expect.objectContaining({ name: 'get_canvas' })
    );
    expect(mcpTools).toContainEqual(
      expect.objectContaining({ name: 'submit_proposal' })
    );
  });

  it('should have matching schemas', () => {
    const getCanvasTool = server.tools.find(t => t.name === 'get_canvas');
    const apiSchema = openApiSpec.paths['/canvases/{canvasId}'].get;
    
    // Compare parameter schemas
    expect(getCanvasTool.inputSchema.properties.canvasId.type)
      .toBe(apiSchema.parameters[0].schema.type);
  });
});
```

CI workflow:
```yaml
# Add to .github/workflows/ci.yml
- name: Run MCP compatibility tests
  working-directory: workers/mcp
  run: npm test -- --run compatibility.test.ts
```

## Dependencies

### External Dependencies
- npm account with publishing rights
- GitHub token for MCP Registry authentication
- MCP Registry account (GitHub-based)

### Internal Dependencies
- Existing MCP server code (workers/mcp/)
- OpenAPI specification (workers/api/)
- CI/CD infrastructure

### Secrets Required
- `NPM_TOKEN` - npm publishing token
- `GITHUB_TOKEN` - Already available in Actions

## Versioning Strategy

**Semantic Versioning (semver):**
- `MAJOR.MINOR.PATCH`
- Example: `0.1.0` → `0.2.0` (new features) → `1.0.0` (stable API)

**Release Process:**
1. Update version in `workers/mcp/package.json`
2. Update CHANGELOG.md
3. Commit: `git commit -m "chore(mcp): bump version to 0.2.0"`
4. Tag: `git tag mcp-v0.2.0`
5. Push: `git push && git push --tags`
6. GitHub Actions automatically publishes to npm
7. Manually publish to MCP Registry (or automate in future)

**Compatibility Matrix:**

| MCP Server Version | API Version | MCP Protocol | Node.js |
|--------------------|-------------|--------------|---------|
| 0.1.0              | v1          | 2024-11-05   | ≥18     |
| 0.2.0              | v1          | 2024-11-05   | ≥18     |
| 1.0.0 (future)     | v1          | 2024-11-05   | ≥18     |

## Testing Strategy

### Unit Tests
- Tool parameter validation
- Resource URI parsing
- API client error handling

### Integration Tests
- Full MCP protocol handshake
- Tool execution against mock API
- Resource fetching

### Compatibility Tests
- Schema alignment (MCP ↔ OpenAPI)
- Version negotiation
- Backward compatibility

### Manual Testing
- npx installation
- Claude Desktop integration
- Cursor integration
- VS Code integration

## Rollout Plan

### Phase 1: Preparation (Week 1)
- [x] Document plan
- [ ] Set up npm account access
- [ ] Create GitHub Actions workflow
- [ ] Add tests

### Phase 2: npm Automation (Week 1)
- [ ] Test workflow in staging
- [ ] First automated release (0.1.1)
- [ ] Verify npm package
- [ ] Test npx installation

### Phase 3: MCP Registry (Week 2)
- [ ] Create server.json
- [ ] Validate metadata
- [ ] Publish to registry
- [ ] Verify discoverability

### Phase 4: Versioning & Tests (Week 2)
- [ ] Implement version handshake
- [ ] Add compatibility test suite
- [ ] Integrate with CI
- [ ] Document versioning

### Phase 5: Validation (Week 3)
- [ ] End-to-end testing
- [ ] User acceptance testing
- [ ] Update documentation
- [ ] Announce to users

## Success Metrics

1. **Automation:**
   - ✅ Zero manual steps for npm release
   - ✅ Release time < 5 minutes
   - ✅ 100% CI success rate

2. **Discoverability:**
   - ✅ Listed in MCP Registry
   - ✅ Searchable by keywords
   - ✅ Installation < 30 seconds

3. **Compatibility:**
   - ✅ 100% test coverage for tool/API parity
   - ✅ Zero breaking changes
   - ✅ Version handshake works

4. **User Experience:**
   - ✅ One command installation: `npx vizail-mcp-server`
   - ✅ Auto-update via npm
   - ✅ Clear version documentation

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| npm token exposure | High | Use GitHub encrypted secrets |
| Breaking changes | High | Automated compatibility tests |
| Registry downtime | Medium | Keep npm as primary distribution |
| Version conflicts | Medium | Clear compatibility matrix |
| CI failures | Low | Fail-safe: manual publishing still works |

## Future Enhancements

- Automated registry publishing in CI
- Changelog generation from commits
- Pre-release channels (beta, alpha)
- Automated dependency updates
- Download metrics dashboard
- Server analytics/telemetry (opt-in)

## Acceptance Criteria

This epic is complete when:

1. ✅ Tagging `mcp-v*` automatically publishes to npm
2. ✅ Package is discoverable in MCP Registry
3. ✅ Server reports version and capabilities
4. ✅ Compatibility tests pass in CI
5. ✅ Documentation updated with new process
6. ✅ At least one successful automated release

## References

- [MCP Registry Publishing Guide](https://modelcontextprotocol.io/registry/quickstart)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [npm Publishing Documentation](https://docs.npmjs.com/cli/publish)
- [GitHub Actions npm Publishing](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)
- [Semantic Versioning](https://semver.org/)
