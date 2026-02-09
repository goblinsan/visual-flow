# Agent Integrations & Distribution Plan

**Date:** 2026-02-08  
**Owner:** Vizail / Visual-Flow  
**Scope:** Reduce friction for connecting AI agents, publish integrations (VS Code + Claude), and harden the public API contract.

---

## Goals

1. **Frictionless onboarding** for agents (under 2 minutes from UI or IDE).
2. **Well-defined, versioned API contract** that stays in sync with MCP tools and docs.
3. **Marketplace distribution + updates** for VS Code and Claude skills with reliable release automation.

## Non-Goals (for this plan)

- New design tools or export pipelines (covered in separate epics).
- Large UI redesigns unrelated to agent onboarding.

---

## Workstreams / Epics

### Epic 1 — Agent API Contract & Discovery Hardening
**Outcome:** Single source of truth for agent APIs; docs/tools generated from it; scope enforcement and validation are consistent.

**Child issues**
1. **Define canonical OpenAPI spec + versioning**  
   - Add a checked-in `openapi.yaml` as the contract of record.  
   - Add `x-vizail-capabilities` and `x-vizail-version` fields.
2. **Generate discovery response from the spec**  
   - Serve `/api/openapi.json` from the canonical spec.  
   - Remove duplicated JSON spec in code.
3. **Align documentation + MCP tools with the spec**  
   - Fix token expiry mismatch, node-type mismatches, and missing endpoints.  
   - Ensure README and MCP docs match reality.
4. **Enforce request validation on all endpoints**  
   - Apply Zod schemas to canvases, branches, proposals, memberships.
5. **Enforce agent scope for branch/proposal operations**  
   - Require `propose` scope for branch + proposal creation.
6. **Fix API routing bug in user-info handlers**  
   - Ensure `path` / `method` are defined before use.

---

### Epic 2 — Frictionless Agent Connect Flow
**Outcome:** A single endpoint + UI flow produces a token and ready-to-use configs for MCP clients and extensions.

**Child issues**
1. **Create `POST /api/agent/connect`**  
   - Returns token + prebuilt config templates (VS Code, Claude, Cursor, MCP JSON).
2. **Add device/link-code exchange for extensions/skills**  
   - One-time link code → token exchange with expiry.
3. **Token management UI**  
   - List, revoke, rotate tokens; show last-used timestamp if available.
4. **AgentPanel config generator**  
   - One-click copy + download for `.vscode/mcp.json` and Claude Desktop config.
5. **Security guidance + defaults**  
   - Minimal-scope recommendations; storage guidance surfaced in UI.

---

### Epic 3 — MCP Server Distribution & Update Pipeline
**Outcome:** MCP server is always current across npm + MCP registry with compatibility checks.

**Child issues**
1. **Automate npm releases**  
   - GitHub Actions publish on version tag with changelog.
2. **Publish to MCP Registry**  
   - Add registry manifest + automate updates on release.
3. **Capability/version handshake**  
   - MCP server verifies API capabilities; warns on mismatch.
4. **Compatibility tests**  
   - CI that validates MCP tools align with OpenAPI and work with dev API.

---

### Epic 4 — VS Code Extension + Marketplace
**Outcome:** A published extension that connects to Vizail and configures MCP in one click.

**Child issues**
1. **Scaffold VS Code extension**  
   - Commands: connect, select canvas, write MCP config, open dashboard.
2. **Implement link-code auth flow**  
   - Browser-based sign-in + link-code exchange.
3. **Auto-manage `.vscode/mcp.json`**  
   - Create/update config; detect drift; offer one-click fix.
4. **Publish to VS Code Marketplace + Open VSX**  
   - CI pipeline for `vsce publish` and `ovsx publish`.

---

### Epic 5 — Claude Skill Packaging + Release
**Outcome:** A consumable skill package with automated releases and clear installation path.

**Child issues**
1. **Create Claude skill package**  
   - `SKILL.md` + scripts/assets for connecting to Vizail via MCP.
2. **Add packaging + release workflow**  
   - Build zip assets and attach to GitHub Releases.
3. **Install + update documentation**  
   - Step-by-step guides and compatibility notes.

---

## Success Metrics

- <2 minutes from token generation to working MCP connection.
- OpenAPI + MCP tools drift detected in CI, not in production.
- VS Code extension and Claude skill updated within 24 hours of API/tool changes.

## Dependencies

- GitHub Actions access for npm/vsce/ovsx releases.
- API endpoints for link-code exchange.
- Branding + listing assets for marketplace submissions.
