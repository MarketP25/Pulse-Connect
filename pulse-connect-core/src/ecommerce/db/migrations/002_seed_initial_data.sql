-- Seed initial fee policy data for Pulsco E-Commerce Platform

-- Insert initial fee policy v1.0.0
INSERT INTO fee_policy_registry (
    version,
    effective_at,
    tiers,
    transaction_fee_percent,
    notes,
    is_active
) VALUES (
    'v1.0.0',
    '2025-12-01T00:00:00Z',
    '[
        {"name": "starter", "max_listings": 25, "weekly_fee_usd": 5},
        {"name": "growth", "max_listings": 50, "weekly_fee_usd": 150},
        {"name": "enterprise", "max_listings": 250, "weekly_fee_usd": 450}
    ]'::jsonb,
    5.00,
    'USD anchored listing tiers and transaction fee',
    TRUE
);

-- Insert example transaction for testing
INSERT INTO transactions (
    id,
    gross_usd,
    fee_usd,
    net_usd,
    fx_rate,
    policy_version,
    trace_id,
    type,
    status,
    created_at
) VALUES (
    'uuid-1234-5678-9012-3456'::uuid,
    100.00,
    5.00,
    95.00,
    1.0,
    'v1.0.0',
    'trace-0001-1234-5678-9012'::uuid,
    'sale',
    'completed',
    '2025-12-05T12:00:00Z'
);

-- Insert corresponding ledger entries for double-entry accounting
INSERT INTO ledger_entries (
    id,
    transaction_id,
    account_type,
    direction,
    amount_usd,
    balance_after_usd,
    policy_version,
    trace_id
) VALUES
(
    gen_random_uuid(),
    'uuid-1234-5678-9012-3456'::uuid,
    'seller',
    'credit',
    93.00,
    93.00,
    'v1.0.0',
    'trace-0001-1234-5678-9012'::uuid
),
(
    gen_random_uuid(),
    'uuid-1234-5678-9012-3456'::uuid,
    'platform',
    'credit',
    7.00,
    7.00,
    'v1.0.0',
    'trace-0001-1234-5678-9012'::uuid
),
(
    gen_random_uuid(),
    'uuid-1234-5678-9012-3456'::uuid,
    'buyer',
    'debit',
    100.00,
    -100.00,
    'v1.0.0',
    'trace-0001-1234-5678-9012'::uuid
);
