-- 002_merkle_and_constraints.sql
BEGIN;

-- Add FK constraints and unique indexes to strengthen integrity
ALTER TABLE IF EXISTS ledger
  ADD COLUMN IF NOT EXISTS balance_after NUMERIC,
  ADD COLUMN IF NOT EXISTS prev_hash TEXT;

-- Ensure wallet exists
ALTER TABLE IF EXISTS ledger
  ADD CONSTRAINT IF NOT EXISTS fk_ledger_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(wallet_id) ON DELETE NO ACTION;

-- Enforce unique entry_hash to prevent duplicates and help Merkle computation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ledger_entry_hash') THEN
    CREATE UNIQUE INDEX idx_ledger_entry_hash ON ledger(entry_hash);
  END IF;
END$$;

-- Table to store Merkle roots snapshots for audit
CREATE TABLE IF NOT EXISTS merkle_roots (
  id BIGSERIAL PRIMARY KEY,
  root TEXT NOT NULL,
  ledger_count BIGINT NOT NULL,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMIT;
