-- Migration 003: Hardened Ledger Implementation
-- Adds the atomic marp_create_ledger_entry function for transaction integrity.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure core tables exist with hardened constraints
CREATE TABLE IF NOT EXISTS wallets (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id TEXT NOT NULL,
    wallet_id TEXT NOT NULL REFERENCES wallets(id),
    amount NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL,
    idempotency_key TEXT NOT NULL,
    actor_id TEXT,
    actor_role TEXT,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, idempotency_key)
);

-- The Hardened Atomic Ledger Function
-- Returns a JSONB object containing status, ledger_id, and final balance.
CREATE OR REPLACE FUNCTION marp_create_ledger_entry(
    p_account_id TEXT,
    p_wallet_id TEXT,
    p_amount NUMERIC,
    p_idempotency_key TEXT,
    p_actor_id TEXT,
    p_actor_role TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
    v_ledger_id UUID;
    v_ledger_balance_after NUMERIC;
BEGIN
    -- 1. Idempotency Check
    -- Return existing entry if this specific key was already processed for the account.
    SELECT id, balance_after INTO v_ledger_id, v_ledger_balance_after
    FROM ledger_entries
    WHERE account_id = p_account_id AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'status', 'idempotent_ok',
            'ledger_id', v_ledger_id,
            'balance_after', v_ledger_balance_after
        );
    END IF;

    -- 2. Concurrency Lock
    -- SELECT FOR UPDATE prevents other transactions from modifying this wallet until we commit.
    SELECT balance INTO v_current_balance
    FROM wallets
    WHERE id = p_wallet_id AND account_id = p_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'WALLET_NOT_FOUND: Wallet % for account %', p_wallet_id, p_account_id;
    END IF;

    -- 3. Overdraft Prevention
    v_new_balance := v_current_balance + p_amount;
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'INSUFFICIENT_FUNDS: Current balance %, requested %', v_current_balance, p_amount;
    END IF;

    -- 4. Atomic Updates
    UPDATE wallets SET balance = v_new_balance, updated_at = NOW() WHERE id = p_wallet_id;

    INSERT INTO ledger_entries (
        account_id, wallet_id, amount, balance_after, idempotency_key, actor_id, actor_role, description, metadata
    ) VALUES (
        p_account_id, p_wallet_id, p_amount, v_new_balance, p_idempotency_key, p_actor_id, p_actor_role, p_description, p_metadata
    ) RETURNING id INTO v_ledger_id;

    RETURN jsonb_build_object(
        'status', 'success',
        'ledger_id', v_ledger_id,
        'balance_after', v_new_balance
    );
END;
$$ LANGUAGE plpgsql;