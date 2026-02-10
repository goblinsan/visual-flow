# Release Process for vizail-mcp-server

This document describes the complete release process for publishing new versions of the Vizail MCP Server.

## Overview

The release process involves:
1. Updating version numbers
2. Updating CHANGELOG.md
3. Creating and pushing a git tag
4. Automated npm publishing via GitHub Actions
5. Manual MCP Registry update (optional)

## Step-by-Step Release

### 1. Pre-Release Checks

Before starting a release, ensure:

```bash
cd workers/mcp

# Run tests
npm test

# Build successfully
npm run build

# Check for uncommitted changes
git status
```

All tests should pass and there should be no uncommitted changes.

### 2. Update Version

Use npm's version command to update version in package.json:

```bash
# For bug fixes (0.1.0 → 0.1.1)
npm version patch

# For new features (0.1.0 → 0.2.0)
npm version minor

# For breaking changes (0.1.0 → 1.0.0)
npm version major
```

This will:
- Update `package.json` version
- Create a git commit with message "0.X.Y"
- Create a git tag `v0.X.Y`

### 3. Update CHANGELOG.md

Edit `workers/mcp/CHANGELOG.md`:

```markdown
## [0.X.Y] - YYYY-MM-DD

### Added
- New features

### Changed
- Modified functionality

### Fixed
- Bug fixes

### Deprecated
- Features to be removed

### Removed
- Deleted features

### Security
- Security improvements
```

Commit the changelog:

```bash
git add CHANGELOG.md
git commit --amend --no-edit
```

### 4. Update server.json (if needed)

If publishing to MCP Registry, update version in `server.json`:

```json
{
  "version": "0.X.Y",
  "packages": [
    {
      "type": "npm",
      "name": "vizail-mcp-server",
      "version": "0.X.Y"
    }
  ]
}
```

```bash
git add server.json
git commit --amend --no-edit
```

### 5. Create Release Tag

Create a tag with the `mcp-v` prefix to trigger the publish workflow:

```bash
# Delete the npm-created tag
git tag -d v0.X.Y

# Create the MCP-specific tag
git tag mcp-v0.X.Y

# Or directly:
git tag mcp-v0.X.Y HEAD
```

### 6. Push to GitHub

Push the commits and tag:

```bash
# Push from repository root
cd ../..

git push
git push --tags
```

### 7. Monitor GitHub Actions

The `publish-mcp-server` workflow will automatically:

1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Run tests (`npm test`)
5. Build TypeScript (`npm run build`)
6. Publish to npm (`npm publish --access public`)
7. Create GitHub release

Monitor progress at:
https://github.com/goblinsan/visual-flow/actions

### 8. Verify npm Publication

Check that the package was published:

```bash
npm view vizail-mcp-server version
npm view vizail-mcp-server

# Or visit:
# https://www.npmjs.com/package/vizail-mcp-server
```

Test installation:

```bash
npx vizail-mcp-server@0.X.Y --help
```

### 9. Update MCP Registry (Optional)

If the server is listed in the MCP Registry:

```bash
cd workers/mcp
mcp-publisher publish
```

See [MCP_REGISTRY_PUBLISHING.md](./MCP_REGISTRY_PUBLISHING.md) for details.

### 10. Announce Release

Consider announcing on:
- GitHub Discussions
- Project Discord/Slack
- Social media
- Documentation site

## Rollback Procedure

If a release has issues:

### For npm

You can deprecate (not unpublish) a version:

```bash
npm deprecate vizail-mcp-server@0.X.Y "This version has issues. Use 0.X.Z instead."
```

Then publish a patch version with fixes.

### For MCP Registry

Update the registry with a new version that supersedes the problematic one.

### For GitHub Releases

1. Edit the release to mark it as a pre-release
2. Add a warning in the description
3. Create a new release with the fix

## Troubleshooting

### "npm publish failed"

**Cause:** No NPM_TOKEN secret or token is invalid

**Fix:** 
1. Generate npm token: https://www.npmjs.com/settings/your-username/tokens
2. Add to GitHub secrets as `NPM_TOKEN`

### "Tests failed in CI"

**Cause:** Tests pass locally but fail in CI

**Fix:**
1. Check Node.js version match (should be 20)
2. Check for missing dependencies
3. Run `npm ci` locally to replicate CI environment

### "Version already exists"

**Cause:** Trying to publish a version that's already on npm

**Fix:**
1. Delete the local tag: `git tag -d mcp-v0.X.Y`
2. Bump version: `npm version patch`
3. Create new tag and push

### "GitHub Release creation failed"

**Cause:** Usually permissions or deprecated action

**Fix:**
1. Check that `GITHUB_TOKEN` has write permissions
2. Update `actions/create-release` to latest version
3. Or manually create release from GitHub UI

## Automated Checks

The CI workflow runs these checks on every PR:

- ✅ TypeScript compilation
- ✅ Unit tests (24 tests)
- ✅ MCP protocol compatibility
- ✅ Tool/Resource schema validation
- ✅ Version string format

## Version Compatibility Matrix

| MCP Server | Node.js | MCP Protocol | Vizail API |
|------------|---------|--------------|------------|
| 0.1.x      | ≥18     | 2024-11-05   | v1         |
| 0.2.x      | ≥18     | 2024-11-05   | v1         |

## Release Schedule

- **Patch releases**: As needed for bug fixes
- **Minor releases**: Monthly for new features
- **Major releases**: When breaking changes are necessary

## Security Releases

For security vulnerabilities:

1. Fix the issue in a private branch
2. Release as a patch version ASAP
3. Deprecate vulnerable versions
4. Announce on GitHub Security Advisories
5. Credit reporter (if external)

## Post-Release Checklist

After each release:

- [ ] npm package published
- [ ] GitHub release created
- [ ] CHANGELOG.md updated
- [ ] Tests passing in CI
- [ ] Documentation updated
- [ ] MCP Registry updated (if applicable)
- [ ] Announced to users
- [ ] Closed related issues/PRs

## Resources

- [npm Publishing Guide](https://docs.npmjs.com/cli/publish)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [GitHub Actions Workflow](../../.github/workflows/publish-mcp-server.yml)
- [MCP Registry Publishing](./MCP_REGISTRY_PUBLISHING.md)
