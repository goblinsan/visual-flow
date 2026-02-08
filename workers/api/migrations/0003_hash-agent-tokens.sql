-- Migration 0003: Replace plaintext token column with token_hash
-- The old schema had `token TEXT NOT NULL` storing plaintext tokens.
-- The new schema uses `token_hash TEXT` for SHA-256 hashed tokens.
-- Since SQLite doesn't support DROP COLUMN or ALTER COLUMN,
-- we recreate the table.

-- 1. Create the new table with token_hash instead of token
CREATE TABLE agent_tokens_new (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  token_hash TEXT,
  scope TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- 2. Copy existing data (token_hash will be NULL for legacy rows)
INSERT INTO agent_tokens_new (id, canvas_id, agent_id, token_hash, scope, expires_at, created_at)
  SELECT id, canvas_id, agent_id, token_hash, scope, expires_at, created_at
  FROM agent_tokens;

-- 3. Drop old table and rename
DROP TABLE agent_tokens;
ALTER TABLE agent_tokens_new RENAME TO agent_tokens;

-- 4. Index on token_hash for fast lookups during auth
CREATE INDEX IF NOT EXISTS idx_agent_tokens_hash ON agent_tokens(token_hash);
