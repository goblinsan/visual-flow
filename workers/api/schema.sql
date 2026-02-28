-- Vizail Database Schema
-- Phase 1: Cloud Persistence & Sharing

-- Users table (Phase 1 uses Cloudflare Access, but we store basic info)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,  -- Email from Cloudflare Access in Phase 1
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Canvases table
CREATE TABLE IF NOT EXISTS canvases (
  id TEXT PRIMARY KEY,  -- UUID
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  spec TEXT NOT NULL,  -- JSON serialized LayoutSpec
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Canvas memberships (collaborators)
CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner', 'editor', 'viewer')),
  invited_by TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(canvas_id, user_id),
  FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_canvases_owner ON canvases(owner_id);
CREATE INDEX IF NOT EXISTS idx_memberships_canvas ON memberships(canvas_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);

-- Agent tokens (hashed — plaintext token never stored)
CREATE TABLE IF NOT EXISTS agent_tokens (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  scope TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_tokens_hash ON agent_tokens(token_hash);

-- Agent branches
CREATE TABLE IF NOT EXISTS agent_branches (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  base_version INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Agent proposals
CREATE TABLE IF NOT EXISTS agent_proposals (
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

-- Agent link codes
CREATE TABLE IF NOT EXISTS agent_link_codes (
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
