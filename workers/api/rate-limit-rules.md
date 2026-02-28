# Cloudflare Rate Limiting Rules
#
# These rules should be configured in the Cloudflare dashboard or via
# Terraform/Pulumi under Security → WAF → Rate Limiting Rules.
#
# They replace the in-memory rate limiter formerly in workers/api/src/rateLimit.ts.
# Edge-level rate limiting is globally consistent across all PoPs, does not
# reset on worker restart, and blocks before the Worker even executes.
#
# ──────────────────────────────────────────────────────────────────────
# Rule 1 — General API (per IP, 100 req / 60s)
# ──────────────────────────────────────────────────────────────────────
# Expression:  (http.host eq "vizail.com" and starts_with(http.request.uri.path, "/api/"))
# Counting:    Per IP
# Threshold:   100 requests
# Period:      60 seconds
# Action:      Block (429)
# Mitigation timeout: 60 seconds
#
# ──────────────────────────────────────────────────────────────────────
# Rule 2 — Write operations (per IP, 50 req / 60s)
# ──────────────────────────────────────────────────────────────────────
# Expression:  (http.host eq "vizail.com" and starts_with(http.request.uri.path, "/api/")
#               and http.request.method in {"POST" "PUT" "DELETE"})
# Counting:    Per IP
# Threshold:   50 requests
# Period:      60 seconds
# Action:      Block (429)
# Mitigation timeout: 60 seconds
#
# ──────────────────────────────────────────────────────────────────────
# Rule 3 — Sensitive endpoints (per IP, 10 req / 60s)
# ──────────────────────────────────────────────────────────────────────
# Expression:  (http.host eq "vizail.com"
#               and (http.request.uri.path contains "/agent-token"
#                    or http.request.uri.path contains "/members"
#                    or http.request.uri.path contains "/link-code"))
# Counting:    Per IP
# Threshold:   10 requests
# Period:      60 seconds
# Action:      Block (429)
# Mitigation timeout: 120 seconds
#
# ──────────────────────────────────────────────────────────────────────
# Rule 4 — Image uploads (per IP, 30 req / 60s)
# ──────────────────────────────────────────────────────────────────────
# Expression:  (http.host eq "vizail.com"
#               and http.request.uri.path eq "/api/images"
#               and http.request.method eq "POST")
# Counting:    Per IP
# Threshold:   30 requests
# Period:      60 seconds
# Action:      Block (429)
# Mitigation timeout: 60 seconds
#
# ──────────────────────────────────────────────────────────────────────
# Cloudflare automatically returns these headers on rate-limited responses:
#   429 Too Many Requests
#   Retry-After: <seconds>
#
# The API client (src/api/client.ts) handles 429 with exponential backoff.
