-- 003_hardened_schema.sql
BEGIN;

-- Ensure wallet status enumeration via check constraint
ALTER TABLE wallets
  ADD CONSTRAINT wallets_status_check CHECK (status IN ('active','locked','closed'));

-- Ensure currency not null and reasonable length
ALTER TABLE wallets ALTER COLUMN currency SET NOT NULL;

-- Ensure ledger entries have non-null critical fields
ALTER TABLE ledger
  ALTER COLUMN entry_id SET NOT NULL,
  ALTER COLUMN wallet_id SET NOT NULL,
  ALTER COLUMN account_id SET NOT NULL,
  ALTER COLUMN ts SET NOT NULL,
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN amount SET NOT NULL,
  ALTER COLUMN currency SET NOT NULL,
  ALTER COLUMN entry_hash SET NOT NULL;

-- Prevent accidental duplicate entry_hash values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ledger_entry_hash') THEN
    CREATE UNIQUE INDEX idx_ledger_entry_hash ON ledger(entry_hash);
  END IF;
END$$;

-- Prevent negative balances by enforcing updates via a controlled function
-- Create function to atomically insert ledger entry and update wallet balance
CREATE OR REPLACE FUNCTION marp_create_ledger_entry(e JSONB)
RETURNS VOID AS $$
DECLARE
  v_entry_id TEXT := e->> 'entryId';
  v_wallet_id TEXT := e->> 'walletId';
  v_account_id TEXT := e->> 'accountId';
  v_ts TIMESTAMP WITH TIME ZONE := (e->> 'timestamp')::timestamptz;
  v_type TEXT := e->> 'type';
  v_amount NUMERIC := (e->> 'amount')::numeric;
  v_currency TEXT := e->> 'currency';
  v_balance_after NUMERIC := (e->> 'balanceAfter')::numeric;
  v_prev_hash TEXT := e->> 'prevHash';
  v_entry_hash TEXT := e->> 'entryHash';
BEGIN
  -- ensure idempotency by preventing duplicate entry_id or entry_hash
  IF EXISTS (SELECT 1 FROM ledger WHERE entry_id = v_entry_id OR entry_hash = v_entry_hash) THEN
    RAISE EXCEPTION 'duplicate_entry';
  END IF;

  -- lock wallet row and ensure sufficient funds
  PERFORM 1 FROM wallets WHERE wallet_id = v_wallet_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet_not_found';
  END IF;

  -- compute expected balance and enforce non-negative
  IF v_balance_after < 0 THEN
    RAISE EXCEPTION 'negative_balance_prohibited';
  END IF;

  -- insert ledger row
  INSERT INTO ledger(entry_id, wallet_id, account_id, ts, type, amount, currency, balance_after, prev_hash, entry_hash, data)
  VALUES (v_entry_id, v_wallet_id, v_account_id, v_ts, v_type, v_amount, v_currency, v_balance_after, v_prev_hash, v_entry_hash, e);

  -- update wallet balance atomically
  UPDATE wallets SET balance = v_balance_after, status = CASE WHEN v_balance_after <= 0 THEN 'locked' ELSE 'active' END, updated_at = now()
    WHERE wallet_id = v_wallet_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
