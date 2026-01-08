-- Initial schema migration for Pulsco Matchmaking
-- Version: 001
-- Description: Create core tables for matchmaking service

-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Fee Policy Registry
CREATE TABLE fee_policy_registry (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    upfront_percent DECIMAL(5,2) NOT NULL CHECK (upfront_percent >= 0 AND upfront_percent <= 100),
    completion_percent DECIMAL(5,2) NOT NULL CHECK (completion_percent >= 0 AND completion_percent <= 100),
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMP WITH TIME ZONE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Users table (extend existing if needed, but create standalone for matchmaking)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE, -- Link to external user system if needed
    role VARCHAR(20) NOT NULL DEFAULT 'provider' CHECK (role IN ('client', 'provider', 'both')),
    skills TEXT[], -- Array of skill tags
    geo_point GEOGRAPHY(POINT, 4326), -- PostGIS point for location
    language_prefs TEXT[], -- Array of language codes
    verification_level VARCHAR(20) NOT NULL DEFAULT 'basic' CHECK (verification_level IN ('basic', 'verified', 'premium')),
    capacity INTEGER DEFAULT 1 CHECK (capacity > 0), -- Max concurrent gigs
    availability BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Gigs
CREATE TABLE gigs (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(15,2) NOT NULL CHECK (base_price > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Briefs
CREATE TABLE briefs (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope TEXT NOT NULL,
    deliverables TEXT,
    budget_min DECIMAL(15,2) CHECK (budget_min > 0),
    budget_max DECIMAL(15,2) CHECK (budget_max > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    required_skills TEXT[], -- Array of required skills
    language VARCHAR(10), -- Primary language requirement
    geo_radius INTEGER, -- Radius in km, NULL for global
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'matched', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT budget_range CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max)
);

-- Proposals
CREATE TABLE proposals (
    id SERIAL PRIMARY KEY,
    brief_id INTEGER NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
    provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pitch TEXT NOT NULL,
    proposed_price DECIMAL(15,2) NOT NULL CHECK (proposed_price > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Contracts
CREATE TABLE contracts (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brief_id INTEGER NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
    proposal_id INTEGER NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'drafted' CHECK (status IN ('drafted', 'active', 'completed', 'cancelled', 'disputed')),
    total_value DECIMAL(15,2) NOT NULL CHECK (total_value > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Milestones
CREATE TABLE milestones (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'funded', 'in_progress', 'completed', 'cancelled', 'disputed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
    milestone_id INTEGER REFERENCES milestones(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('fund', 'release', 'refund', 'fee')),
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    policy_version VARCHAR(50) NOT NULL REFERENCES fee_policy_registry(version),
    trace_id VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ledger Entries (Double-entry accounting)
CREATE TABLE ledger_entries (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('client', 'provider', 'platform', 'tax')),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('debit', 'credit')),
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    balance_after DECIMAL(15,2) NOT NULL,
    policy_version VARCHAR(50) NOT NULL REFERENCES fee_policy_registry(version),
    trace_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Match Logs
CREATE TABLE match_logs (
    id SERIAL PRIMARY KEY,
    brief_id INTEGER NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
    candidate_ids INTEGER[], -- Array of candidate user IDs
    scores_json JSONB, -- Detailed scoring data
    top_signals_json JSONB, -- Array of top signals
    reason TEXT NOT NULL, -- Human-readable reason
    model_version VARCHAR(50) NOT NULL DEFAULT 'v1',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Reputation Events
CREATE TABLE reputation_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
    milestone_id INTEGER REFERENCES milestones(id) ON DELETE SET NULL,
    dimensions VARCHAR(20) NOT NULL CHECK (dimensions IN ('quality', 'timeliness', 'communication')),
    score DECIMAL(3,2) NOT NULL CHECK (score >= 0 AND score <= 5),
    weight DECIMAL(5,4) NOT NULL DEFAULT 1.0 CHECK (weight > 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_skills ON users USING GIN (skills);
CREATE INDEX idx_users_geo_point ON users USING GIST (geo_point);
CREATE INDEX idx_gigs_owner_id ON gigs (owner_id);
CREATE INDEX idx_gigs_status ON gigs (status);
CREATE INDEX idx_briefs_client_id ON briefs (client_id);
CREATE INDEX idx_briefs_status ON briefs (status);
CREATE INDEX idx_briefs_required_skills ON briefs USING GIN (required_skills);
CREATE INDEX idx_proposals_brief_id ON proposals (brief_id);
CREATE INDEX idx_proposals_provider_id ON proposals (provider_id);
CREATE INDEX idx_proposals_status ON proposals (status);
CREATE INDEX idx_contracts_client_id ON contracts (client_id);
CREATE INDEX idx_contracts_provider_id ON contracts (provider_id);
CREATE INDEX idx_contracts_status ON contracts (status);
CREATE INDEX idx_milestones_contract_id ON milestones (contract_id);
CREATE INDEX idx_milestones_status ON milestones (status);
CREATE INDEX idx_transactions_contract_id ON transactions (contract_id);
CREATE INDEX idx_transactions_milestone_id ON transactions (milestone_id);
CREATE INDEX idx_transactions_trace_id ON transactions (trace_id);
CREATE INDEX idx_transactions_policy_version ON transactions (policy_version);
CREATE INDEX idx_ledger_entries_transaction_id ON ledger_entries (transaction_id);
CREATE INDEX idx_ledger_entries_account_type ON ledger_entries (account_type);
CREATE INDEX idx_ledger_entries_trace_id ON ledger_entries (trace_id);
CREATE INDEX idx_match_logs_brief_id ON match_logs (brief_id);
CREATE INDEX idx_reputation_events_user_id ON reputation_events (user_id);
CREATE INDEX idx_reputation_events_contract_id ON reputation_events (contract_id);

-- Unique constraints for idempotency
CREATE UNIQUE INDEX idx_transactions_trace_id_unique ON transactions (trace_id);
CREATE UNIQUE INDEX idx_ledger_entries_id_unique ON ledger_entries (id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fee_policy_registry_updated_at BEFORE UPDATE ON fee_policy_registry FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gigs_updated_at BEFORE UPDATE ON gigs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_briefs_updated_at BEFORE UPDATE ON briefs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
