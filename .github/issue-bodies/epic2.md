## Epic: Decompose Monolithic Components

**Priority:** P1 — Blocks feature velocity
**Scope:** Break down CanvasApp.tsx (2,066 lines, 34 useState) and CanvasStage.tsx (2,870 lines) into focused modules

### Context
The two largest files in the codebase are untested monoliths. Adding new tools (polygon, arrows, snapping) to the current structure will compound the problem. This decomposition must happen before Epic 3 (Design Tool Enhancements).

### Issues
- [ ] 2.1 Extract CanvasApp state into domain-specific hooks
- [ ] 2.2 Extract CanvasApp toolbar into Toolbar component
- [ ] 2.3 Extract CanvasApp inspector/side panels
- [ ] 2.4 Extract CanvasApp dialogs into DialogManager
- [ ] 2.5 Decompose CanvasStage rendering by node type
- [ ] 2.6 Extract CanvasStage interaction handlers
- [ ] 2.7 Add integration tests for CanvasApp and CanvasStage
- [ ] 2.8 Move konva/react-konva to dependencies

### Exit Criteria
- CanvasApp.tsx under 500 lines
- CanvasStage.tsx under 800 lines
- Each extracted module has tests
- Feature PRs touch focused files, not monoliths
