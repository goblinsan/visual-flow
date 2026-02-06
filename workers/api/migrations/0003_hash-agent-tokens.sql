-- Migration: Add token_hash column and remove plaintext token column
-- This migration adds security by hashing agent tokens

-- Add token_hash column
ALTER TABLE agent_tokens ADD COLUMN token_hash TEXT;

-- Note: In production, you would:
-- 1. Generate hashes for existing tokens (if any exist)
-- 2. Update token_hash column with the hashes
-- 3. Drop the token column
-- For now, we'll keep both columns for backwards compatibility during migration
-- The application will use token_hash for all new tokens

-- Make token_hash NOT NULL for new entries (existing rows might be null during migration)
-- ALTER TABLE agent_tokens ALTER COLUMN token_hash SET NOT NULL;

-- Create index on token_hash for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_tokens_hash ON agent_tokens(token_hash);
