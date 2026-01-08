-- MARP Firewall Schema Migration
-- Implements firewall rules and subsystem registry for MARP

-- Firewall rules table: Stores all firewall rules
CREATE TABLE firewall_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(255) NOT NULL UNIQUE,
    rule_type VARCHAR(50) NOT NULL, -- 'allow', 'block', 'quarantine', 'escalate'
    direction VARCHAR(20) NOT NULL, -- 'inbound', 'outbound'
    subsystem_scope VARCHAR(100), -- NULL for global, specific subsystem name
    source_pattern VARCHAR(500), -- regex pattern for source matching
    destination_pattern VARCHAR(500), -- regex pattern for destination matching
    conditions JSONB NOT NULL DEFAULT '{}', -- additional rule conditions
    actions JSONB NOT NULL DEFAULT '{}', -- actions to take when rule matches
    priority INTEGER NOT NULL DEFAULT 100, -- lower number = higher priority
    is_active BOOLEAN NOT NULL DEFAULT false,
    council_decision_id UUID REFERENCES council_decisions(id),
    created_by VARCHAR(255) NOT NULL,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subsystem registry table: Tracks all registered subsystems
CREATE TABLE subsystem_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subsystem_name VARCHAR(100) NOT NULL UNIQUE,
    subsystem_type VARCHAR(50) NOT NULL, -- 'ecommerce', 'fraud', 'communication', etc.
    api_endpoints JSONB NOT NULL DEFAULT '[]',
    required_permissions JSONB NOT NULL DEFAULT '[]',
    routing_rules JSONB NOT NULL DEFAULT '{}',
    health_check_url VARCHAR(500),
    is_registered BOOLEAN NOT NULL DEFAULT false,
    registration_token VARCHAR(255) UNIQUE,
    registered_at TIMESTAMPTZ,
    last_heartbeat TIMESTAMPTZ,
    heartbeat_interval_seconds INTEGER NOT NULL DEFAULT 300,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conflict logs table: Records conflicts and escalations
CREATE TABLE conflict_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_type VARCHAR(100) NOT NULL, -- 'policy_violation', 'security_breach', 'compliance_issue'
    severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    subsystem_name VARCHAR(100),
    conflict_data JSONB NOT NULL,
    conflict_hash VARCHAR(64) NOT NULL UNIQUE,
    prev_hash VARCHAR(64),
    curr_hash VARCHAR(64) NOT NULL UNIQUE,
    resolution_status VARCHAR(50) NOT NULL DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'escalated'
    assigned_to VARCHAR(255),
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMPTZ,
    escalation_level INTEGER NOT NULL DEFAULT 1,
    council_notified BOOLEAN NOT NULL DEFAULT false,
    founder_notified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for conflict_logs (example for 2024)
CREATE TABLE conflict_logs_2024_01 PARTITION OF conflict_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE conflict_logs_2024_02 PARTITION OF conflict_logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- Add more partitions as needed...

-- Indexes for performance
CREATE INDEX idx_firewall_rules_type ON firewall_rules(rule_type);
CREATE INDEX idx_firewall_rules_direction ON firewall_rules(direction);
CREATE INDEX idx_firewall_rules_subsystem ON firewall_rules(subsystem_scope);
CREATE INDEX idx_firewall_rules_active ON firewall_rules(is_active);
CREATE INDEX idx_firewall_rules_priority ON firewall_rules(priority);
CREATE INDEX idx_subsystem_registry_type ON subsystem_registry(subsystem_type);
CREATE INDEX idx_subsystem_registry_registered ON subsystem_registry(is_registered);
CREATE INDEX idx_subsystem_registry_heartbeat ON subsystem_registry(last_heartbeat);
CREATE INDEX idx_conflict_logs_type ON conflict_logs(conflict_type);
CREATE INDEX idx_conflict_logs_severity ON conflict_logs(severity);
CREATE INDEX idx_conflict_logs_status ON conflict_logs(resolution_status);
CREATE INDEX idx_conflict_logs_hash ON conflict_logs(curr_hash);

-- Hash chain trigger for conflict logs
CREATE OR REPLACE FUNCTION update_conflict_log_hash()
RETURNS TRIGGER AS $$
DECLARE
    prev_record RECORD;
    canonical_data TEXT;
BEGIN
    -- Get the most recent previous record for hash chaining
    SELECT curr_hash INTO prev_record
    FROM conflict_logs
    WHERE created_at < NEW.created_at
    ORDER BY created_at DESC
    LIMIT 1;

    -- Create canonical JSON for consistent hashing
    canonical_data := jsonb_build_object(
        'conflict_type', NEW.conflict_type,
        'severity', NEW.severity,
        'subsystem_name', NEW.subsystem_name,
        'conflict_data', NEW.conflict_data,
        'created_at', NEW.created_at
    );

    -- Calculate current hash
    NEW.prev_hash := COALESCE(prev_record.curr_hash, '');
    NEW.curr_hash := encode(sha256((COALESCE(NEW.prev_hash, '') || canonical_data)::bytea), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for conflict log hash chaining
CREATE TRIGGER conflict_log_hash_trigger
    BEFORE INSERT ON conflict_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_conflict_log_hash();

-- Insert default subsystems
INSERT INTO subsystem_registry (subsystem_name, subsystem_type, api_endpoints, required_permissions, routing_rules) VALUES
('Ecommerce Subsystem', 'ecommerce', '["/api/ecommerce/*"]', '["read_products", "write_orders"]', '{"enforce_pricing": true, "consent_required": true}'),
('Fraud Detection', 'fraud', '["/api/fraud/*"]', '["read_transactions", "write_alerts"]', '{"quarantine_risk": true, "escalate_high_risk": true}'),
('Proximity Services', 'proximity', '["/api/proximity/*"]', '["read_location", "write_geocodes"]', '{"validate_regional_compliance": true}'),
('Communication Platform', 'communication', '["/api/communication/*"]', '["send_messages", "read_contacts"]', '{"enforce_consent": true, "cap_limits": true}'),
('Payment Processing', 'payments', '["/api/payments/*"]', '["process_payments", "read_accounts"]', '{"founder_approval_required": true}'),
('Marketing Engine', 'marketing', '["/api/marketing/*"]', '["send_campaigns", "read_analytics"]', '{"consent_required": true, "opt_out_respected": true}'),
('Reporting & Analytics', 'reporting', '["/api/reporting/*"]', '["read_reports", "export_data"]', '{"anonymize_sensitive": true}'),
('AI Engine', 'ai', '["/api/ai/*"]', '["run_models", "read_insights"]', '{"ethical_constraints": true}'),
('Global Speed Layer', 'speed', '["/api/speed/*"]', '["read_cache", "write_cache"]', '{"performance_optimized": true}'),
('Founder Communications', 'communications', '["/api/founder/*"]', '["founder_only"]', '{"dual_control": true}');
