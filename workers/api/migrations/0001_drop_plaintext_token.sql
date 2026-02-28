-- Migration: Remove plaintext token column from agent_tokens
-- The token_hash column is now the sole authentication mechanism.
--
-- Pre-flight: Verify all rows have a token_hash before running
--   SELECT COUNT(*) FROM agent_tokens WHERE token_hash IS NULL;
--
-- D1 (SQLite) does not support ALTER TABLE DROP COLUMN directly.
-- Recreate the table without the plaintext `token` column.

BEGIN;

CREATE TABLE agent_tokens_new (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  scope TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

INSERT INTO agent_tokens_new (id, canvas_id, agent_id, token_hash, scope, expires_at, created_at)
  SELECT id, canvas_id, agent_id, token_hash, scope, expires_at, created_at
  FROM agent_tokens
  WHERE token_hash IS NOT NULL;

DROP TABLE agent_tokens;
ALTER TABLE agent_tokens_new RENAME TO agent_tokens;

CREATE INDEX IF NOT EXISTS idx_agent_tokens_hash ON agent_tokens(token_hash);

COMMIT;
