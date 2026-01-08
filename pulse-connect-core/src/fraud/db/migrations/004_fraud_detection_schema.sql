-- Global Fraud Detection, Prevention & Alert System Migration
-- Version: 004
-- Description: Enterprise fraud detection schema with multi-region support

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Fraud Events Table (core fraud detection events)
CREATE TABLE fraud_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'user', 'device', 'payment', 'ai_program'
    entity_id VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    risk_score DECIMAL(5,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    rule_id VARCHAR(255),
    rule_version VARCHAR(50),
    detection_engine VARCHAR(50) NOT NULL, -- 'behavioral', 'geolocation', 'network', 'graph', 'ml'
    region_code VARCHAR(10) NOT NULL DEFAULT 'US',
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    geo_point GEOGRAPHY(POINT, 4326),
    raw_data JSONB NOT NULL DEFAULT '{}',
    processed_at TIMESTAMP WITH TIME ZONE,
    trace_id VARCHAR(255) NOT NULL,
    policy_version VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for fraud_events (current + 3 months ahead)
CREATE TABLE fraud_events_2024_01 PARTITION OF fraud_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE fraud_events_2024_02 PARTITION OF fraud_events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE fraud_events_2024_03 PARTITION OF fraud_events
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE fraud_events_2024_04 PARTITION OF fraud_events
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');

-- Fraud Rules Table (versioned rule engine)
CREATE TABLE fraud_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(255) NOT NULL UNIQUE,
    version VARCHAR(50) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'velocity', 'geolocation', 'device', 'network', 'content', 'ml'
    severity VARCHAR(20) NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    conditions JSONB NOT NULL, -- Rule conditions in JSON format
    actions JSONB NOT NULL, -- Auto-actions to take when rule triggers
    enabled BOOLEAN NOT NULL DEFAULT true,
    region_overrides JSONB DEFAULT '{}', -- Region-specific overrides
    rollout_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    a_b_test_group VARCHAR(50), -- A/B testing group
    ml_model_id VARCHAR(255), -- Associated ML model
    created_by VARCHAR(255) NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Fraud Cases Table (investigation management)
CREATE TABLE fraud_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'escalated', 'closed', 'dismissed')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assigned_to VARCHAR(255),
    assigned_at TIMESTAMP WITH TIME ZONE,
    severity VARCHAR(20) NOT NULL DEFAULT 'warning',
    risk_amount_usd DECIMAL(15,2),
    affected_entities JSONB NOT NULL DEFAULT '[]', -- Array of affected entity IDs
    evidence JSONB NOT NULL DEFAULT '[]', -- Evidence timeline
    resolution_notes TEXT,
    resolution_action VARCHAR(100), -- 'block', 'monitor', 'allow', 'escalate'
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by VARCHAR(255),
    region_code VARCHAR(10) NOT NULL DEFAULT 'US',
    trace_id VARCHAR(255) NOT NULL,
    policy_version VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Device Fingerprints Table (device tracking)
CREATE TABLE device_fingerprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fingerprint_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info JSONB NOT NULL, -- Browser, OS, screen, plugins, etc.
    first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_count INTEGER NOT NULL DEFAULT 1,
    risk_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    blocked BOOLEAN NOT NULL DEFAULT false,
    block_reason TEXT,
    region_code VARCHAR(10) NOT NULL DEFAULT 'US',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Network Reputation Table (IP/domain reputation)
CREATE TABLE network_reputation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network_type VARCHAR(20) NOT NULL, -- 'ip', 'domain', 'asn'
    network_value VARCHAR(255) NOT NULL,
    reputation_score DECIMAL(5,2) NOT NULL CHECK (reputation_score >= 0 AND reputation_score <= 100),
    risk_category VARCHAR(50), -- 'clean', 'suspicious', 'malicious', 'tor', 'vpn'
    data_sources JSONB NOT NULL DEFAULT '[]', -- Sources of reputation data
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    region_code VARCHAR(10) NOT NULL DEFAULT 'US',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Fraud Lists Table (blacklists/whitelists)
CREATE TABLE fraud_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_type VARCHAR(20) NOT NULL, -- 'blacklist', 'whitelist', 'watchlist'
    entity_type VARCHAR(50) NOT NULL, -- 'user', 'device', 'ip', 'email', 'payment_method'
    entity_value VARCHAR(500) NOT NULL,
    reason TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'warning',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(255) NOT NULL,
    evidence JSONB NOT NULL DEFAULT '[]',
    region_code VARCHAR(10) NOT NULL DEFAULT 'US',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ML Models Table (model governance)
CREATE TABLE fraud_ml_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    model_type VARCHAR(50) NOT NULL, -- 'isolation_forest', 'supervised_classifier', etc.
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('training', 'active', 'deprecated', 'retired')),
    accuracy_score DECIMAL(5,4),
    precision_score DECIMAL(5,4),
    recall_score DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    drift_score DECIMAL(5,4),
    training_data_info JSONB,
    model_artifact_path TEXT,
    deployed_at TIMESTAMP WITH TIME ZONE,
    deprecated_at TIMESTAMP WITH TIME ZONE,
    region_code VARCHAR(10) NOT NULL DEFAULT 'US',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(model_name, version)
);

-- Extend existing pap_audit_log with fraud fields (non-breaking)
ALTER TABLE pap_audit_log ADD COLUMN IF NOT EXISTS fraud_flag BOOLEAN DEFAULT false;
ALTER TABLE pap_audit_log ADD COLUMN IF NOT EXISTS fraud_severity VARCHAR(20);
ALTER TABLE pap_audit_log ADD COLUMN IF NOT EXISTS fraud_reason_codes TEXT[];
ALTER TABLE pap_audit_log ADD COLUMN IF NOT EXISTS fraud_case_id UUID REFERENCES fraud_cases(id);

-- Extend existing compliance_audit_log with fraud fields
ALTER TABLE compliance_audit_log ADD COLUMN IF NOT EXISTS fraud_related BOOLEAN DEFAULT false;
ALTER TABLE compliance_audit_log ADD COLUMN IF NOT EXISTS fraud_event_id UUID REFERENCES fraud_events(id);

-- Indexes for performance
CREATE INDEX idx_fraud_events_entity_type_id ON fraud_events (entity_type, entity_id);
CREATE INDEX idx_fraud_events_severity ON fraud_events (severity);
CREATE INDEX idx_fraud_events_region_code ON fraud_events (region_code);
CREATE INDEX idx_fraud_events_created_at ON fraud_events (created_at);
CREATE INDEX idx_fraud_events_detection_engine ON fraud_events (detection_engine);
CREATE INDEX idx_fraud_events_risk_score ON fraud_events (risk_score);

CREATE INDEX idx_fraud_rules_enabled ON fraud_rules (enabled);
CREATE INDEX idx_fraud_rules_rule_type ON fraud_rules (rule_type);
CREATE INDEX idx_fraud_rules_effective_from_to ON fraud_rules (effective_from, effective_to);

CREATE INDEX idx_fraud_cases_status ON fraud_cases (status);
CREATE INDEX idx_fraud_cases_priority ON fraud_cases (priority);
CREATE INDEX idx_fraud_cases_assigned_to ON fraud_cases (assigned_to);
CREATE INDEX idx_fraud_cases_region_code ON fraud_cases (region_code);

CREATE INDEX idx_device_fingerprints_hash ON device_fingerprints (fingerprint_hash);
CREATE INDEX idx_device_fingerprints_risk_score ON device_fingerprints (risk_score);
CREATE INDEX idx_device_fingerprints_blocked ON device_fingerprints (blocked);

CREATE INDEX idx_network_reputation_type_value ON network_reputation (network_type, network_value);
CREATE INDEX idx_network_reputation_score ON network_reputation (reputation_score);

CREATE INDEX idx_fraud_lists_type_entity ON fraud_lists (list_type, entity_type, entity_value);
CREATE INDEX idx_fraud_lists_active ON fraud_lists (active);
CREATE INDEX idx_fraud_lists_expires_at ON fraud_lists (expires_at);

CREATE INDEX idx_fraud_ml_models_status ON fraud_ml_models (status);
CREATE INDEX idx_fraud_ml_models_type ON fraud_ml_models (model_type);

-- GIN indexes for JSONB fields
CREATE INDEX idx_fraud_events_raw_data ON fraud_events USING GIN (raw_data);
CREATE INDEX idx_fraud_rules_conditions ON fraud_rules USING GIN (conditions);
CREATE INDEX idx_fraud_rules_actions ON fraud_rules USING GIN (actions);
CREATE INDEX idx_fraud_cases_affected_entities ON fraud_cases USING GIN (affected_entities);
CREATE INDEX idx_fraud_cases_evidence ON fraud_cases USING GIN (evidence);
CREATE INDEX idx_device_fingerprints_device_info ON device_fingerprints USING GIN (device_info);
CREATE INDEX idx_fraud_lists_evidence ON fraud_lists USING GIN (evidence);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fraud_rules_updated_at BEFORE UPDATE ON fraud_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fraud_cases_updated_at BEFORE UPDATE ON fraud_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_device_fingerprints_updated_at BEFORE UPDATE ON device_fingerprints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fraud_lists_updated_at BEFORE UPDATE ON fraud_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fraud_ml_models_updated_at BEFORE UPDATE ON fraud_ml_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed initial fraud rules
INSERT INTO fraud_rules (rule_name, version, rule_type, severity, conditions, actions, created_by) VALUES
('velocity_login_high', '1.0.0', 'velocity', 'warning', '{
  "time_window_minutes": 60,
  "max_attempts": 5,
  "distinct_ips": 3
}', '{
  "notify_user": true,
  "require_2fa": true,
  "log_event": true
}', 'system'),

('geolocation_mismatch', '1.0.0', 'geolocation', 'warning', '{
  "ip_country_mismatch": true,
  "payment_country_mismatch": true,
  "time_zone_drift_hours": 3
}', '{
  "flag_transaction": true,
  "require_verification": true,
  "escalate_if_high_value": true
}', 'system'),

('device_fingerprint_collision', '1.0.0', 'device', 'critical', '{
  "shared_fingerprint_users": 3,
  "different_accounts": true
}', '{
  "block_accounts": true,
  "create_case": true,
  "notify_investigators": true
}', 'system'),

('network_tor_usage', '1.0.0', 'network', 'critical', '{
  "tor_exit_node": true,
  "vpn_detected": true
}', '{
  "block_transaction": true,
  "flag_permanent": true,
  "escalate_immediately": true
}', 'system'),

('content_phishing_patterns', '1.0.0', 'content', 'critical', '{
  "phishing_keywords": ["urgent", "verify account", "suspicious activity"],
  "suspicious_links": true,
  "ai_generated_content": true
}', '{
  "block_content": true,
  "flag_user": true,
  "create_case": true
}', 'system');

-- Seed initial ML models
INSERT INTO fraud_ml_models (model_name, version, model_type, status, accuracy_score, precision_score, recall_score, deployed_at) VALUES
('isolation_forest_v1', '1.0.0', 'isolation_forest', 'active', 0.945, 0.923, 0.967, NOW()),
('supervised_classifier_v1', '1.0.0', 'supervised_classifier', 'active', 0.938, 0.915, 0.961, NOW());

-- Seed initial network reputation data
INSERT INTO network_reputation (network_type, network_value, reputation_score, risk_category, data_sources) VALUES
('ip', '127.0.0.1', 0.00, 'clean', '["internal"]'),
('domain', 'localhost', 0.00, 'clean', '["internal"]');

-- Create views for common queries
CREATE VIEW fraud_alerts_summary AS
SELECT
    region_code,
    severity,
    detection_engine,
    COUNT(*) as event_count,
    AVG(risk_score) as avg_risk_score,
    MAX(created_at) as latest_event
FROM fraud_events
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY region_code, severity, detection_engine;

CREATE VIEW fraud_cases_summary AS
SELECT
    status,
    priority,
    severity,
    COUNT(*) as case_count,
    AVG(EXTRACT(EPOCH FROM (COALESCE(closed_at, NOW()) - created_at))/3600) as avg_resolution_hours
FROM fraud_cases
GROUP BY status, priority, severity;

-- Comments for documentation
COMMENT ON TABLE fraud_events IS 'Core fraud detection events with partitioning for performance';
COMMENT ON TABLE fraud_rules IS 'Versioned fraud detection rules with A/B testing support';
COMMENT ON TABLE fraud_cases IS 'Fraud investigation cases with evidence tracking';
COMMENT ON TABLE device_fingerprints IS 'Device fingerprinting for multi-account detection';
COMMENT ON TABLE network_reputation IS 'IP/domain reputation scoring';
COMMENT ON TABLE fraud_lists IS 'Blacklist/whitelist management with expiration';
COMMENT ON TABLE fraud_ml_models IS 'ML model governance and versioning';
