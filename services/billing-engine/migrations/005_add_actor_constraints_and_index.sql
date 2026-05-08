-- Migration 005: Add NOT NULL constraints and index for actor_id and actor_role
-- Enhances data integrity and query performance for ledger entries.

-- Add NOT NULL constraints to actor_id and actor_role
ALTER TABLE ledger_entries ALTER COLUMN actor_id SET NOT NULL;
ALTER TABLE ledger_entries ALTER COLUMN actor_role SET NOT NULL;

-- Create a composite index for faster lookups based on actor
-- This will speed up queries like "Show me all transactions performed by Admins in the last 24 hours"
CREATE INDEX IF NOT EXISTS idx_ledger_entries_actor ON ledger_entries(actor_id, actor_role);