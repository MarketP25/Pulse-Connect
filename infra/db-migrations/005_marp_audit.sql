-- MARP Audit & Bundles Schema Migration
-- Implements audit trails and signed bundles for MARP

-- MARP audit table: Comprehensive audit log for all MARP actions
CREATE TABLE marp_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(100) NOT NULL, -- 'policy_validation', 'firewall_enforce', 'signature_verify', etc.
    action_subtype VARCHAR(100), -- more specific action classification
    subsystem_name VARCHAR(100),
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    request_id VARCHAR(255) NOT NULL,
    client_ip VARCHAR(45),
    user_agent TEXT,
    action_data JSONB NOT NULL, -- detailed action payload
    risk_level VARCHAR(20) NOT NULL DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
    action_result VARCHAR(50) NOT NULL, -- 'success', 'failure', 'blocked', 'escalated'
    error_message TEXT,
    processing_time_ms INTEGER,
    audit_hash VARCHAR(64) NOT NULL UNIQUE,
    prev_hash VARCHAR(64),
    curr_hash VARCHAR(64) NOT NULL UNIQUE,
    pc365_attestation JSONB, -- PC365 guard attestation data
    marp_signature VARCHAR(500), -- MARP signature for the action
    council_notified BOOLEAN NOT NULL DEFAULT false,
    founder_notified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for marp_audit (example for 2024)
CREATE TABLE marp_audit_2024_01 PARTITION OF marp_audit
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE marp_audit_2024_02 PARTITION OF marp_audit
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- Add more partitions as needed...

-- Signed bundles table: Stores signed policy bundles for distribution
CREATE TABLE signed_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_name VARCHAR(255) NOT NULL,
    bundle_version VARCHAR(50) NOT NULL,
    bundle_type VARCHAR(50) NOT NULL, -- 'policy', 'firewall_rules', 'routing_config'
    bundle_content JSONB NOT NULL,
    bundle_hash VARCHAR(64) NOT NULL UNIQUE,
    signature VARCHAR(500) NOT NULL,
    signed_by VARCHAR(255) NOT NULL,
    council_decision_id UUID REFERENCES council_decisions(id),
    distribution_targets JSONB NOT NULL DEFAULT '[]', -- edge nodes, subsystems
    distribution_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'distributing', 'distributed', 'failed'
    verification_count INTEGER NOT NULL DEFAULT 0,
    last_verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bundle_name, bundle_version)
);

-- Indexes for performance
CREATE INDEX idx_marp_audit_type ON marp_audit(action_type);
CREATE INDEX idx_marp_audit_subtype ON marp_audit(action_subtype);
CREATE INDEX idx_marp_audit_subsystem ON marp_audit(subsystem_name);
CREATE INDEX idx_marp_audit_user ON marp_audit(user_id);
CREATE INDEX idx_marp_audit_risk ON marp_audit(risk_level);
CREATE INDEX idx_marp_audit_result ON marp_audit(action_result);
CREATE INDEX idx_marp_audit_hash ON marp_audit(curr_hash);
CREATE INDEX idx_marp_audit_created ON marp_audit(created_at);
CREATE INDEX idx_signed_bundles_type ON signed_bundles(bundle_type);
CREATE INDEX idx_signed_bundles_status ON signed_bundles(distribution_status);
CREATE INDEX idx_signed_bundles_active ON signed_bundles(is_active);
CREATE INDEX idx_signed_bundles_expires ON signed_bundles(expires_at);

-- Hash chain trigger for MARP audit
CREATE OR REPLACE FUNCTION update_marp_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
    prev_record RECORD;
    canonical_data TEXT;
BEGIN
    -- Get the most recent previous record for hash chaining
    SELECT curr_hash INTO prev_record
    FROM marp_audit
    WHERE created_at < NEW.created_at
    ORDER BY created_at DESC
    LIMIT 1;

    -- Create canonical JSON for consistent hashing
    canonical_data := jsonb_build_object(
        'action_type', NEW.action_type,
        'request_id', NEW.request_id,
        'action_data', NEW.action_data,
        'created_at', NEW.created_at
    );

    -- Calculate current hash
    NEW.prev_hash := COALESCE(prev_record.curr_hash, '');
    NEW.curr_hash := encode(sha256((COALESCE(NEW.prev_hash, '') || canonical_data)::bytea), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for MARP audit hash chaining
CREATE TRIGGER marp_audit_hash_trigger
    BEFORE INSERT ON marp_audit
    FOR EACH ROW
    EXECUTE FUNCTION update_marp_audit_hash();

-- Function to validate bundle signature
CREATE OR REPLACE FUNCTION validate_bundle_signature(bundle_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    bundle_record RECORD;
    expected_hash VARCHAR(64);
BEGIN
    SELECT * INTO bundle_record FROM signed_bundles WHERE id = bundle_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Calculate expected hash of bundle content
    expected_hash := encode(sha256(bundle_record.bundle_content::text::bytea), 'hex');

    -- Verify hash matches
    IF expected_hash != bundle_record.bundle_hash THEN
        RETURN FALSE;
    END IF;

    -- Additional signature verification would go here
    -- For now, just check that signature exists
    RETURN bundle_record.signature IS NOT NULL AND length(bundle_record.signature) > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get active policies for a subsystem
CREATE OR REPLACE FUNCTION get_active_policies_for_subsystem(subsystem_name VARCHAR(100))
RETURNS TABLE (
    policy_id UUID,
    policy_name VARCHAR(255),
    policy_content JSONB,
    effective_from TIMESTAMPTZ,
    effective_until TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gp.id,
        gp.policy_name,
        gp.policy_content,
        gp.effective_from,
        gp.effective_until
    FROM governance_policies gp
    WHERE gp.is_active = true
      AND gp.effective_from <= NOW()
      AND (gp.effective_until IS NULL OR gp.effective_until > NOW())
      AND (gp.policy_scope = 'global' OR gp.policy_scope = subsystem_name);
END;
$$ LANGUAGE plpgsql;

-- Insert default audit configuration
INSERT INTO signed_bundles (bundle_name, bundle_version, bundle_type, bundle_content, bundle_hash, signature, signed_by, distribution_targets, distribution_status, is_active) VALUES
('default-audit-config', '1.0.0', 'audit_config', '{
  "audit_levels": {
    "policy_validation": "high",
    "firewall_enforce": "high",
    "signature_verify": "critical",
    "council_decisions": "high",
    "subsystem_routing": "medium"
  },
  "retention_days": 2555,
  "hash_algorithm": "SHA-256",
  "encryption_required": true
}', 'dummy_hash_for_testing', 'dummy_signature_for_testing', 'system', '["all"]', 'distributed', true);
