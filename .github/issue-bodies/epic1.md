## Epic: Security Hardening

**Priority:** P0 — Blocks production use
**Scope:** Real authentication, CORS lockdown, WebSocket auth, rate limiting, input validation

### Context
The current API accepts a trivially-spoofable X-User-Email header and sends hardcoded your@email.com from the frontend. CORS is wildcard (*). WebSocket has zero auth. No rate limiting exists. These must be resolved before real users can safely use the product.

### Issues
- [ ] 1.1 Implement OAuth authentication (Google, Apple, GitHub)
- [ ] 1.2 Remove X-User-Email header authentication
- [ ] 1.3 Lock down CORS to production origins
- [ ] 1.4 Add WebSocket authentication
- [ ] 1.5 Hash agent tokens at rest
- [ ] 1.6 Enforce agent token scope in route handlers
- [ ] 1.7 Add API rate limiting
- [ ] 1.8 Add request body validation with Zod
- [ ] 1.9 Implement free-plan quota enforcement

### Exit Criteria
- No request accepted without a cryptographically-verified identity
- CORS restricted to vizail.com and *.visual-flow.pages.dev
- Agent scope enforced on all routes
- Rate limits active on all endpoints
