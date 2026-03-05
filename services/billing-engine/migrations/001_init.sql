-- 001_init.sql
-- Creates core tables for billing engine with audit fields and indexes

BEGIN;

CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL,
  version TEXT NOT NULL,
  signed_by TEXT,
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
  effective_until TIMESTAMP WITH TIME ZONE,
  scope TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_policies_policyid ON policies(policy_id);

CREATE TABLE IF NOT EXISTS offers (
  offer_id TEXT PRIMARY KEY,
  policy_id TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_offers_policyid ON offers((data->>'policyId'));

CREATE TABLE IF NOT EXISTS wallets (
  wallet_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'locked',
  data JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallets_account ON wallets(account_id);

CREATE TABLE IF NOT EXISTS ledger (
  entry_id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  balance_after NUMERIC NOT NULL,
  prev_hash TEXT,
  entry_hash TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_wallet_ts ON ledger(wallet_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_account_ts ON ledger(account_id, ts DESC);

-- Audit trail table for schema-level events (policy changes, rollbacks)
CREATE TABLE IF NOT EXISTS audit_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  reference_id TEXT,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMIT;
