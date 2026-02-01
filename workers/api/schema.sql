-- Visual Flow Database Schema
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
