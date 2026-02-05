-- Migration number: 0001 	 2026-02-05T17:14:58.160Z
CREATE TABLE agent_tokens (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  token TEXT NOT NULL,
  scope TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE agent_branches (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  base_version INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE agent_proposals (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  canvas_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  operations TEXT NOT NULL, -- JSON
  rationale TEXT NOT NULL,
  assumptions TEXT NOT NULL, -- JSON
  confidence REAL NOT NULL,
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by TEXT
);