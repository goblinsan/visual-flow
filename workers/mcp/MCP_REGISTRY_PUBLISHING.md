# MCP Registry Publishing Guide

This guide explains how to publish the `vizail-mcp-server` to the official MCP Registry.

## Prerequisites

1. **npm account** with publishing rights to `vizail-mcp-server`
2. **GitHub account** (for registry authentication)
3. **mcp-publisher** CLI tool
4. **Published npm package** (automated via GitHub Actions)

## One-Time Setup

### 1. Install mcp-publisher CLI

```bash
npm install -g @modelcontextprotocol/mcp-publisher
```

### 2. Prepare server.json

The `server.json` file is already created in `workers/mcp/server.json` with:
- Namespace: `io.github.goblinsan/vizail-mcp-server`
- Package reference: npm package `vizail-mcp-server`
- Capabilities: resources and tools
- Documentation links

## Publishing Process

### Step 1: Ensure npm Package is Published

The GitHub Actions workflow automatically publishes to npm when you push a tag:

```bash
# From repository root
cd workers/mcp

# Update version in package.json if needed
npm version patch  # or minor, major

# Commit and tag
git add package.json
git commit -m "chore(mcp): bump version to X.Y.Z"
git tag mcp-vX.Y.Z
git push && git push --tags
```

Wait for the GitHub Action to complete and verify the package on npm:
https://www.npmjs.com/package/vizail-mcp-server

### Step 2: Validate server.json

```bash
cd workers/mcp
mcp-publisher validate
```

This will check:
- Schema compliance
- Required fields
- Package existence on npm
- Documentation links

### Step 3: Authenticate with GitHub

```bash
mcp-publisher auth
```

This will:
1. Open GitHub OAuth flow in your browser
2. Request permission to verify `io.github.goblinsan` namespace
3. Store authentication token locally

### Step 4: Publish to Registry

```bash
cd workers/mcp
mcp-publisher publish
```

This will:
1. Upload `server.json` to the registry
2. Validate ownership of the GitHub namespace
3. Verify the npm package exists
4. Index the server for discovery

### Step 5: Verify Listing

Visit the MCP Registry and search for "vizail":
https://registry.modelcontextprotocol.io/

You should see:
- **Name:** Vizail MCP Server
- **Description:** MCP server for Vizail Canvas
- **Package:** npm - vizail-mcp-server
- **Tags:** canvas, design, collaboration, visual-editor

## Updating the Registry Entry

When you publish a new version to npm:

1. Update `version` in `workers/mcp/server.json`
2. Run `mcp-publisher publish` again

The registry will:
- Update the version number
- Re-validate the package
- Refresh documentation links

## Troubleshooting

### "Package not found on npm"

Wait a few minutes for npm's CDN to propagate. The registry validates package existence.

### "Namespace verification failed"

Ensure you're authenticated with the GitHub account that owns the `goblinsan` organization.

### "Schema validation failed"

Run `mcp-publisher validate` to see specific errors. Common issues:
- Missing required fields
- Invalid URLs
- Version mismatch

## Registry Metadata

The `server.json` includes:

- **name**: Unique reverse-DNS identifier
- **description**: Search-friendly description
- **version**: Matches npm package version
- **capabilities**: What the server provides
- **features**: User-facing functionality list
- **tags**: Discoverability keywords
- **documentation**: Setup guides and API docs

## Future Automation

Consider automating registry publishing in GitHub Actions:

```yaml
# In .github/workflows/publish-mcp-server.yml
- name: Publish to MCP Registry
  run: |
    npm install -g @modelcontextprotocol/mcp-publisher
    cd workers/mcp
    mcp-publisher publish --token=${{ secrets.MCP_REGISTRY_TOKEN }}
```

This requires:
1. Generating a long-lived registry token
2. Storing it as a GitHub secret
3. Testing the automated flow

## Resources

- [MCP Registry Documentation](https://modelcontextprotocol.io/registry/quickstart)
- [Publishing Workflow](https://deepwiki.com/modelcontextprotocol/registry/6.3-publishing-workflow)
- [Official Registry](https://registry.modelcontextprotocol.io/)
- [npm Package](https://www.npmjs.com/package/vizail-mcp-server)
