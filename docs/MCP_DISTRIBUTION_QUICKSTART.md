# MCP Distribution Pipeline - Quick Reference

## What Was Implemented

✅ **Automated npm Publishing** - GitHub Actions workflow triggers on `mcp-v*` tags  
✅ **MCP Registry Support** - server.json ready for registry publishing  
✅ **Version Handshake** - Dynamic version reporting with MCP protocol 2024-11-05  
✅ **Compatibility Tests** - 24 tests validating MCP/API alignment  

## File Overview

```
.github/workflows/
├── publish-mcp-server.yml    # Automated npm publishing
└── ci.yml                     # MCP compatibility testing

workers/mcp/
├── server.json                # MCP Registry metadata
├── CHANGELOG.md               # Version history
├── MCP_REGISTRY_PUBLISHING.md # Registry guide
├── RELEASE_PROCESS.md         # Release instructions
├── vitest.config.ts           # Test configuration
└── src/__tests__/
    └── compatibility.test.ts  # 24 compatibility tests

docs/
├── AGENT_INTEGRATION_PLAN.md         # Epic implementation plan
└── EPIC_MCP_DISTRIBUTION_SUMMARY.md  # Complete summary
```

## How to Publish First Release

### One-Time Setup (Required)

1. **Set npm token:**
   - Visit: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Create "Automation" token
   - Add to GitHub: Settings → Secrets → New secret → `NPM_TOKEN`

2. **Authenticate with MCP Registry:**
   ```bash
   npm install -g @modelcontextprotocol/mcp-publisher
   cd workers/mcp
   mcp-publisher auth  # Opens GitHub OAuth
   ```

### Publishing a Release

```bash
# 1. Tag the release
git tag mcp-v0.1.0
git push --tags

# 2. Wait for GitHub Actions (~2-3 min)
# https://github.com/goblinsan/visual-flow/actions

# 3. Verify npm
npm view vizail-mcp-server

# 4. Publish to MCP Registry
cd workers/mcp
mcp-publisher publish

# 5. Verify registry
# https://registry.modelcontextprotocol.io/
```

### Publishing Future Releases

```bash
cd workers/mcp

# Bump version
npm version patch  # or minor, major

# Update CHANGELOG.md (add entry)

# Tag and push
git add .
git commit -m "chore: bump version to X.Y.Z"
git tag mcp-vX.Y.Z
git push && git push --tags

# Done! GitHub Actions handles the rest
```

## Test Commands

```bash
cd workers/mcp

npm test           # Run all 24 compatibility tests
npm run build      # Build TypeScript to dist/
npm run dev        # Run with hot-reload (development)
```

## Workflow Triggers

- **Automated:** Push tag matching `mcp-v*`
- **Manual:** GitHub Actions → publish-mcp-server → Run workflow

## What Gets Published

**To npm:**
- `dist/` directory (built TypeScript)
- `README.md`
- `CHANGELOG.md`
- `package.json`

**To MCP Registry:**
- Server metadata from `server.json`
- Links to npm package and GitHub repo
- Capability declarations
- Feature descriptions

## Troubleshooting

**"npm publish failed"**
→ Check `NPM_TOKEN` secret is set correctly

**"Tests failed in CI"**
→ Run `npm test` locally first

**"mcp-publisher auth failed"**
→ Ensure GitHub account owns `goblinsan` org

**"Version already exists"**
→ Bump version with `npm version patch`

## Key Metrics

- **24 tests** - All passing
- **0 vulnerabilities** - CodeQL verified
- **23 pages** - Documentation
- **5 tools + 3 resources** - MCP capabilities

## Documentation Links

📖 Full Epic Plan: `/docs/AGENT_INTEGRATION_PLAN.md`  
📊 Summary & Metrics: `/docs/EPIC_MCP_DISTRIBUTION_SUMMARY.md`  
🚀 Release Process: `/workers/mcp/RELEASE_PROCESS.md`  
📦 Registry Publishing: `/workers/mcp/MCP_REGISTRY_PUBLISHING.md`  
📝 Changelog: `/workers/mcp/CHANGELOG.md`  

## Status

🎉 **Ready for Production**

All acceptance criteria met. Manual setup steps documented above.

---

*Last Updated: 2026-02-10*
