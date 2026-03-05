-- 009_billing_engine_initial_schema.sql

-- Subscription Tiers Enum
CREATE TYPE subscription_tier AS ENUM (
    'Public Explorer',
    'Verified Citizen',
    'Premium Member',
    'Enterprise'
);

-- Subscriptions Table
-- Stores user subscriptions and their current status.
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tier subscription_tier NOT NULL,
    status STRING NOT NULL, -- e.g., 'active', 'cancelled', 'past_due'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Constraint to ensure a user has only one active subscription at a time
    UNIQUE (user_id, status) WHERE status = 'active'
);

-- Billing Activity Type Enum
CREATE TYPE billing_activity_type AS ENUM (
    'SUBSCRIPTION',
    'COMMUNICATION',
    'MATCHMAKING_CLIENT',
    'MATCHMAKING_PERFORMER',
    'ECOMMERCE_SELLER',
    'ECOMMERCE_BUYER',
    'LOCALIZATION',
    'PLACES_VENUE',
    'PLACES_BOOKER',
    'INFRASTRUCTURE'
    'PAP_V1'
);

-- Billing Ledger Table (Append-Only)
-- Records every single financial event in the system for auditing and transparency.
CREATE TABLE billing_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    activity_type billing_activity_type NOT NULL,
    amount_usd DECIMAL(12, 4) NOT NULL,
    description STRING NOT NULL,
    -- JSONB allows for storing structured data about the specific event
    metadata JSONB,
    -- MARP policy version that authorized this transaction
    marp_policy_version STRING NOT NULL,
    -- Hash of the previous ledger entry for this user to form a chain
    previous_entry_hash BYTES,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Ensures data integrity; entries cannot be altered after insertion
    -- (This is conceptually enforced by the append-only design and hash-chaining)
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index for efficient querying of user-specific transactions
CREATE INDEX ON billing_ledger (user_id, created_at DESC);

-- Promotions & Discounts Table
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name STRING NOT NULL UNIQUE,
    description STRING,
    discount_percentage DECIMAL(5, 2) NOT NULL,
    -- e.g., 'SUBSCRIPTION', 'ALL'
    applicable_to STRING NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Promotions Table
-- Tracks which users have claimed which promotions.
CREATE TABLE user_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    promotion_id UUID NOT NULL,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_promotion FOREIGN KEY (promotion_id) REFERENCES promotions(id),
    UNIQUE (user_id, promotion_id)
);

-- Initialize default promotions from the spec
INSERT INTO promotions (name, description, discount_percentage, applicable_to, is_active)
VALUES
    ('Founders Launch Discount', '20% off subscriptions for the first 500 premium users', 20.00, 'SUBSCRIPTION', true),
    ('Pulsco Global Pulse Hours', '2% discount across all services during weekly event', 2.00, 'ALL', true);
