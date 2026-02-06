# Post-Phase 4 Implementation Plan

**Date:** 2026-02-06
**Scope:** Codebase hardening, immediate feature enhancements, and architectural preparation for Phase 5+
**Source Requirements:** [POST_PHASE4_Requirement_summary.md](./POST_PHASE4_Requirement_summary.md)

---

## Part 1 — Codebase Assessment Summary

### Critical Findings

| # | Severity | Category | Issue |
|---|----------|----------|-------|
| 1 | 🔴 Critical | Security | **No real authentication** — every API request sends hardcoded `your@email.com`; `X-User-Email` header is trivially spoofable |
| 2 | 🔴 Critical | Security | **CORS wildcard** — `Access-Control-Allow-Origin: *` on all responses; `ALLOWED_ORIGINS` env var is never passed to `jsonResponse()` |
| 3 | 🔴 Critical | Architecture | **CanvasStage.tsx is 2,870 lines** — monolithic rendering/interaction/editing component |
| 4 | 🔴 Critical | Architecture | **CanvasApp.tsx is 2,066 lines** — 34 `useState` hooks, 11 `useMemo`, 8 `useEffect` in a single component |
| 5 | 🟠 High | Security | **WebSocket has zero authentication** — any client with a canvas ID can connect and push data |
| 6 | 🟠 High | Security | **Agent tokens stored in plaintext** (no hashing); scope enforcement uses `authenticateUser()` which ignores scope |
| 7 | 🟠 High | Security | **No rate limiting** on API, WebSocket, or token generation |
| 8 | 🟡 Medium | Quality | **No input validation library** — all request body checks are manual if-statements |
| 9 | 🟡 Medium | Quality | **23% test coverage** — the two largest files have zero tests |
| 10 | 🟡 Medium | Deps | `konva`/`react-konva` listed in devDependencies but used at runtime |

### Codebase Metrics

| Metric | Value |
|--------|-------|
| Total source lines (src/) | ~26,400 |
| Total source files | 172 |
| Worker lines | ~3,200 |
| Test files | 40 (23% of source files) |
| `any`/type suppression count | 21 (clean) |
| TODO/FIXME/HACK comments | 1 (clean) |
| Largest file | CanvasStage.tsx — 2,870 lines |
| useState hooks in CanvasApp | 34 |

---

## Part 2 — Implementation Plan

The plan is organized into **5 epics** executed in priority order. Each epic is scoped to deliver independently-shippable value.

### Epic 1: Security Hardening (P0 — Blocks Production Use)

Real users cannot safely use the product until authentication is real and the API is locked down.

| Issue | Description | Labels |
|-------|-------------|--------|
| **1.1 Implement OAuth authentication (Google, Apple, GitHub)** | Replace the hardcoded `your@email.com` header with real OAuth 2.0/OIDC. Use Cloudflare Access or a Workers-native OAuth flow. Issue JWT session tokens. Update the frontend `apiClient` to use session tokens. | auth, priority-high |
| **1.2 Remove `X-User-Email` header authentication** | Delete the spoofable fallback header. All auth must go through OAuth tokens or agent tokens. | auth, priority-high |
| **1.3 Lock down CORS to production origins** | Pass `ALLOWED_ORIGINS` from `wrangler.toml` env vars to `jsonResponse()`. Restrict to `vizail.com` and `*.visual-flow.pages.dev`. Remove wildcard. | auth, api |
| **1.4 Add WebSocket authentication** | Require a short-lived connection token (issued by the API after auth) on WS upgrade. Reject unauthenticated connections. | auth, realtime |
| **1.5 Hash agent tokens at rest** | Store SHA-256 hash of tokens in D1 instead of plaintext. Compare hashes on auth. | auth, agents |
| **1.6 Enforce agent token scope in route handlers** | Switch routes from `authenticateUser()` to `authenticateRequest()`. Reject write operations for `read`-scoped tokens. | auth, agents |
| **1.7 Add API rate limiting** | Per-IP and per-user rate limits using Cloudflare's `request.cf` metadata or a D1 counter. Limit token generation to 10/hour. | api, reliability |
| **1.8 Add request body validation with Zod** | Add `zod` as a dependency. Create schemas for all API request bodies. Return 400 with structured validation errors. | api, data-integrity |
| **1.9 Implement free-plan quota enforcement** | After auth is real, add a `plans` table. Enforce max canvases per free user (e.g., 5). Check on canvas creation. | auth, api |

**Exit criteria:** No request accepted without a cryptographically-verified identity. CORS restricted. Agent scope enforced. Rate limits active.

---

### Epic 2: Architecture — Decompose Monolithic Components (P1 — Blocks Feature Velocity)

The two largest files must be broken down before adding polygon tool, arrow tool, alignment snapping, and bézier handles. New features will compound the problem if added to the current structure.

| Issue | Description | Labels |
|-------|-------------|--------|
| **2.1 Extract CanvasApp state into domain-specific hooks** | Split the 34 `useState` calls into focused custom hooks: `useCanvasViewport()`, `useToolState()`, `useDialogManager()`, `useAgentPanel()`, `useSelectionState()`, `useNodeEditing()`. Target: CanvasApp.tsx under 500 lines. | tech-debt, frontend |
| **2.2 Extract CanvasApp toolbar into `<Toolbar>` component** | Move toolbar JSX and tool-switching logic into a dedicated component. Pass actions via context or callbacks. | tech-debt, frontend |
| **2.3 Extract CanvasApp inspector/side panels** | Move the Attributes tab and Agent tab panels into self-contained components that receive spec+selection via props or context. | tech-debt, frontend |
| **2.4 Extract CanvasApp dialogs into `<DialogManager>`** | The 8 boolean dialog states (share, token, export, about, etc.) should be a single `openDialog: string | null` state managed by a `<DialogManager>` that renders the correct modal. | tech-debt, frontend |
| **2.5 Decompose CanvasStage rendering by node type** | Extract per-node-type renderers (`RectRenderer`, `TextRenderer`, `EllipseRenderer`, `LineRenderer`, `CurveRenderer`, `ImageRenderer`, `GroupRenderer`) from the monolithic render switch. | tech-debt, frontend |
| **2.6 Extract CanvasStage interaction handlers** | Move keyboard shortcuts, pointer event handlers, and curve editing logic into the existing `canvas/core/` handler classes. Use the `CanvasOrchestrator` pattern already started there. | tech-debt, frontend |
| **2.7 Add integration tests for CanvasApp and CanvasStage** | Now that logic is in hooks/handlers, add tests for: tool switching, node creation, selection, viewport pan/zoom, proposal approve flow. Target: 10+ test cases for each. | tech-debt, frontend |
| **2.8 Move `konva`/`react-konva` to dependencies** | These are runtime imports. Move from `devDependencies` to `dependencies` in package.json. | tech-debt, infrastructure |

**Exit criteria:** CanvasApp.tsx < 500 lines. CanvasStage.tsx < 800 lines. Each extracted module has tests. Feature PRs touch focused files, not monoliths.

---

### Epic 3: Design Tool Enhancements (P2 — User-Facing Features)

Requires Epic 2 to be substantially complete (node-type renderers extracted) so new tools can be added cleanly.

| Issue | Description | Labels |
|-------|-------------|--------|
| **3.1 Polygon tool** | Add `polygon` node type to the schema. Implement `PolygonRenderer`. Add toolbar button. Support regular polygons (3–12 sides) with property panel controls. | enhancement, frontend |
| **3.2 Arrow features on line tool** | Extend the `line` node type with `startArrow`/`endArrow` boolean props and `arrowSize`. Render arrowheads in `LineRenderer`. Add toggle in property panel. | enhancement, frontend |
| **3.3 Alignment & position snapping** | Implement snap-to-edge, snap-to-center, and snap-to-grid guides. Add toggle in toolbar/settings. Show visual guide lines during drag. | enhancement, ux |
| **3.4 Bézier handles on curve tool** | Add control-point handles rendered as draggable circles. Implement smooth/sharp toggle per anchor point. Update `CurveRenderer` and curve editing interaction. | enhancement, frontend |
| **3.5 Component library — Accordion** | Create an `accordion` composite component (collapsible sections). Register in component palette. | enhancement, frontend |
| **3.6 Component library — Carousel** | Create a `carousel` composite component (horizontal scrolling slides). Register in component palette. | enhancement, frontend |

**Exit criteria:** Each tool has: node type in schema, renderer, toolbar integration, property panel controls, and at least 2 test cases.

---

### Epic 4: Starter Templates & Samples (P2 — User-Facing Content)

Independent of Epic 2/3 — templates are data files in `src/samples/`.

| Issue | Description | Labels |
|-------|-------------|--------|
| **4.1 Game map templates — square grid & hex grid** | Add `squareGridMap` and `hexGridMap` sample specs. Use the existing grid layout type. Include terrain color variations. | enhancement, ux |
| **4.2 Game inventory template** | Add `gameInventory` sample with grid slots, item icons, and stat bars. Extend the existing inventory samples. | enhancement, ux |
| **4.3 Social login buttons template** | Add `socialLoginButtons` sample spec showing Google/Apple/GitHub styled button layouts. | enhancement, ux |
| **4.4 Payment cart template** | Add `paymentCart` sample spec with product rows, price columns, totals, and a checkout button layout. | enhancement, ux |
| **4.5 Game UI template — mini-map, health bar, inventory** | Add `gameHUD` sample spec composing a mini-map frame, health/mana bars, and a compact inventory strip. | enhancement, ux |
| **4.6 Template browser in the UI** | Add a "New from Template" dialog/panel that lists available templates with thumbnails. Load the selected template as the initial spec. | enhancement, ux |

**Exit criteria:** Each template loads cleanly in the canvas. Template browser accessible from File menu.

---

### Epic 5: Agent Workflow Enhancement (P2 — Builds on Phase 4)

Requires Epic 1 (auth) for token generation to be production-safe.

| Issue | Description | Labels |
|-------|-------------|--------|
| **5.1 "Connect to ChatGPT" flow in Agent panel** | Add a guided setup in the Agent tab: generate token → show OpenAPI URL → link to Custom GPT creation. Include copy-to-clipboard for token, canvas ID, and API schema URL. | agents, ux |
| **5.2 One-click agent token generation** | Simplify the token dialog: single "Generate Token" button with sensible defaults (scope: propose, expiry: 24h). Show the token in a copiable field. | agents, ux |
| **5.3 MCP server npm packaging** | Package `workers/mcp/` for `npx` installation. Add `bin` entry to package.json. Support `npx vizail-mcp --token=... --canvas=...` for easy Claude Desktop / Cursor setup. | agents, infrastructure |
| **5.4 Agent activity feed** | Show a real-time log of agent actions in the Agent tab: "copilot-agent created branch", "chatgpt-designer submitted proposal", etc. Poll the branches and proposals APIs. | agents, ux |
| **5.5 Multi-agent canvas support** | Allow multiple agents to have active branches simultaneously. Show per-agent branch status and proposal counts in the Agent tab. | agents, enhancement |

**Exit criteria:** A user can connect ChatGPT to their canvas in under 2 minutes from the UI. MCP server installable via npx.

---

## Part 3 — Execution Order & Dependencies

```
Week 1-2:  Epic 1 (Security) — issues 1.1-1.3 first (auth + CORS)
Week 2-3:  Epic 1 continued (1.4-1.9) + Epic 2 starts (2.1-2.4: CanvasApp decomp)
Week 3-4:  Epic 2 continued (2.5-2.8: CanvasStage decomp + tests)
Week 4-5:  Epic 3 (Design tools) + Epic 4 (Templates) in parallel
Week 5-6:  Epic 5 (Agent workflow) + Epic 3 continued
```

**Dependency graph:**
- Epic 3 (tools) depends on Epic 2.5 (node renderers extracted)
- Epic 5 (agent workflow) depends on Epic 1.1 (real auth) and 1.9 (quotas)
- Epic 4 (templates) is independent — can start anytime
- Epic 1 is the universal blocker for any production usage

---

## Part 4 — Positioning for Phase 5 and Beyond

### Phase 5: Export Workflow

The decomposition in Epic 2 directly enables export by:
- **Per-node-type renderers** (2.5) provide the mapping surface for code generation — each renderer knows its node's properties, which maps to HTML/CSS/SwiftUI/Roblox output
- **Clean schema types** (`types/core.ts`) become the single source of truth for all export targets
- **Recommended prep:** Add a `nodeToCode(node, target)` interface alongside each renderer during Epic 2.5

### Longer-Term Readiness

| Future Feature | What to build now |
|---------------|-------------------|
| 3D support | Keep node schema extensible — use discriminated unions, not fixed interfaces. Add `z` to Position type as optional. |
| Plugin extensions | Epic 2 decomposition creates the plugin surface — node renderers, toolbar items, and panel tabs become extension points. |
| CAD / architecture | The polygon tool (3.1) and snapping system (3.3) are prerequisites. Ensure measurement units are abstracted (not hardcoded to px). |
| 3D print / CNC | Export workflow (Phase 5) should be format-agnostic. Design the export pipeline as: `spec → AST → target-specific emitter`. |
