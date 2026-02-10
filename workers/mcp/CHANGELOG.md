# Changelog

All notable changes to the Vizail MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Automated npm publishing via GitHub Actions
- MCP Registry publishing support with `server.json`
- Version reporting in server initialization
- Capability handshake with MCP protocol version
- Changelog for release tracking

### Changed
- Server name updated to `vizail-mcp-server` for consistency
- Improved startup logging with version and capability information
- Enhanced error messages with emojis for better readability

## [0.1.0] - 2026-02-10

### Added
- Initial release of Vizail MCP Server
- MCP protocol implementation with tools and resources
- CLI argument support (`--token`, `--canvas-id`, `--api-url`)
- Environment variable support
- Tools for canvas interaction:
  - `get_canvas` - Read canvas design
  - `get_or_create_branch` - Get/create agent branch
  - `submit_proposal` - Submit design proposals
  - `check_proposal_status` - Check proposal status
  - `list_proposals` - List all proposals
- Resources for documentation:
  - `vizail://docs/node-types` - Node type reference
  - `vizail://docs/proposal-guide` - Proposal writing guide
  - `vizail://docs/workflow` - Agent workflow guide
- npx installation support
- README with setup instructions for Claude Desktop, Cursor, and VS Code
- TypeScript build configuration
- MIT License

[Unreleased]: https://github.com/goblinsan/visual-flow/compare/mcp-v0.1.0...HEAD
[0.1.0]: https://github.com/goblinsan/visual-flow/releases/tag/mcp-v0.1.0
