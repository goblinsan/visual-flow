-- Migration number: 0004  2026-02-09
CREATE TABLE agent_link_codes (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  consumed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_agent_link_codes_hash ON agent_link_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_agent_link_codes_canvas ON agent_link_codes(canvas_id);
