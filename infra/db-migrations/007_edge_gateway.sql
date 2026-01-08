-- Edge Gateway Database Schema Migration
-- Implements the global execution surface under MARP governance

-- Edge audit table: Immutable audit log for all Edge decisions
CREATE TABLE edge_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(36) NOT NULL,
    subsystem VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    user_id VARCHAR(255),
    region_code VARCHAR(50),
    decision VARCHAR(20) NOT NULL, -- 'allow', 'block', 'quarantine'
    risk_score DECIMAL(3,2) NOT NULL,
    policy_version VARCHAR(50) NOT NULL,
    execution_time INTEGER NOT NULL, -- milliseconds
    rationale TEXT,
    quarantine_reason TEXT,
    quarantine_duration BIGINT,
    escalation_required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Edge telemetry table: Telemetry data sent to MARP
CREATE TABLE edge_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(36) NOT NULL,
    subsystem VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    decision VARCHAR(20) NOT NULL,
    risk_score DECIMAL(3,2) NOT NULL,
    policy_version VARCHAR(50) NOT NULL,
    execution_time INTEGER NOT NULL,
    hash VARCHAR(64) NOT NULL,
    original_request JSONB,
    policy_snapshot_id UUID,
    region_code VARCHAR(50),
    instance_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Edge anomalies table: Anomalies detected and reported
CREATE TABLE edge_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anomaly_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    request_id VARCHAR(36),
    subsystem VARCHAR(50),
    description TEXT NOT NULL,
    context JSONB,
    reported_to_marp BOOLEAN DEFAULT false,
    marp_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Edge policy snapshots table: Cached policy snapshots per region
CREATE TABLE edge_policy_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subsystem VARCHAR(50) NOT NULL,
    region_code VARCHAR(50) NOT NULL,
    version VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    hash VARCHAR(64) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subsystem, region_code, version)
);

-- Edge subsystem adapters registry: Tracks available adapters
CREATE TABLE edge_adapter_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subsystem VARCHAR(50) UNIQUE NOT NULL,
    adapter_name VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL,
    capabilities JSONB NOT NULL,
    health_status VARCHAR(20) DEFAULT 'healthy',
    last_health_check TIMESTAMPTZ DEFAULT NOW(),
    config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extended tables for new subsystems

-- Matchmaking events
CREATE TABLE edge_matchmaking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id VARCHAR(36) NOT NULL,
    user_ids TEXT[] NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    policy_version VARCHAR(50) NOT NULL,
    region_code VARCHAR(50),
    rationale TEXT,
    anomaly_flags JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Programs runs
CREATE TABLE edge_ai_program_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id VARCHAR(36) NOT NULL,
    version VARCHAR(20) NOT NULL,
    context_hash VARCHAR(64) NOT NULL,
    subsystem VARCHAR(50) NOT NULL,
    allow_block_state VARCHAR(20) NOT NULL,
    execution_result JSONB,
    safety_checks JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chatbot logs
CREATE TABLE edge_chatbot_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    prompt_hash VARCHAR(64) NOT NULL,
    response_hash VARCHAR(64) NOT NULL,
    safety_flags JSONB,
    intent_classification VARCHAR(50),
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketing deliveries
CREATE TABLE edge_marketing_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id VARCHAR(36) NOT NULL,
    audience_id VARCHAR(36) NOT NULL,
    region_code VARCHAR(50),
    status VARCHAR(20) NOT NULL,
    consent_state BOOLEAN DEFAULT true,
    delivery_channel VARCHAR(20),
    content_hash VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geocoding logs
CREATE TABLE edge_geocoding_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(36) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    query TEXT NOT NULL,
    accuracy DECIMAL(5,2),
    region_code VARCHAR(50),
    response_time INTEGER,
    cache_hit BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_edge_audit_request_id ON edge_audit(request_id);
CREATE INDEX idx_edge_audit_subsystem_decision ON edge_audit(subsystem, decision);
CREATE INDEX idx_edge_audit_created_at ON edge_audit(created_at DESC);
CREATE INDEX idx_edge_audit_user_id ON edge_audit(user_id);

CREATE INDEX idx_edge_telemetry_request_id ON edge_telemetry(request_id);
CREATE INDEX idx_edge_telemetry_subsystem ON edge_telemetry(subsystem);
CREATE INDEX idx_edge_telemetry_created_at ON edge_telemetry(created_at DESC);

CREATE INDEX idx_edge_anomalies_type_severity ON edge_anomalies(anomaly_type, severity);
CREATE INDEX idx_edge_anomalies_created_at ON edge_anomalies(created_at DESC);

CREATE INDEX idx_edge_policy_snapshots_subsystem_region ON edge_policy_snapshots(subsystem, region_code);
CREATE INDEX idx_edge_policy_snapshots_active ON edge_policy_snapshots(is_active) WHERE is_active = true;

CREATE INDEX idx_edge_adapter_registry_subsystem ON edge_adapter_registry(subsystem);

-- Extended subsystem indexes
CREATE INDEX idx_matchmaking_events_match_id ON edge_matchmaking_events(match_id);
CREATE INDEX idx_matchmaking_events_region ON edge_matchmaking_events(region_code);

CREATE INDEX idx_ai_program_runs_program_id ON edge_ai_program_runs(program_id);
CREATE INDEX idx_ai_program_runs_subsystem ON edge_ai_program_runs(subsystem);

CREATE INDEX idx_chatbot_logs_session_id ON edge_chatbot_logs(session_id);
CREATE INDEX idx_chatbot_logs_user_id ON edge_chatbot_logs(user_id);

CREATE INDEX idx_marketing_deliveries_campaign ON edge_marketing_deliveries(campaign_id);
CREATE INDEX idx_marketing_deliveries_region ON edge_marketing_deliveries(region_code);

CREATE INDEX idx_geocoding_logs_request_id ON edge_geocoding_logs(request_id);
CREATE INDEX idx_geocoding_logs_provider ON edge_geocoding_logs(provider);

-- Insert default adapter registry entries
INSERT INTO edge_adapter_registry (subsystem, adapter_name, version, capabilities) VALUES
('ecommerce', 'ecommerce-adapter', '1.0.0', '{"consent": true, "fraud": true, "compliance": true}'),
('payments', 'payments-adapter', '1.0.0', '{"reversible": true, "escrow": true, "safety": true}'),
('fraud', 'fraud-adapter', '1.0.0', '{"detection": true, "prevention": true, "monitoring": true}'),
('matchmaking', 'matchmaking-adapter', '1.0.0', '{"scoring": true, "eligibility": true, "anti-manipulation": true}'),
('ai-programs', 'ai-programs-adapter', '1.0.0', '{"execution": true, "safety": true, "monitoring": true}'),
('ai-engine-chatbot', 'chatbot-adapter', '1.0.0', '{"intent-filtering": true, "safety": true, "throttling": true}'),
('proximity-geocoding', 'geocoding-adapter', '1.0.0', '{"polygon": true, "boundary": true, "caching": true}'),
('communication', 'communication-adapter', '1.0.0', '{"consent": true, "quiet-hours": true, "throttling": true}'),
('automated-marketing', 'marketing-adapter', '1.0.0', '{"consent": true, "frequency": true, "segmentation": true}'),
('places-venues', 'places-adapter', '1.0.0', '{"geofencing": true, "hours": true, "classification": true}');

-- Insert initial policy snapshot
INSERT INTO edge_policy_snapshots (
    subsystem, region_code, version, content, hash, effective_from
) VALUES (
    'global',
    'ALL',
    '1.0.0',
    '{
      "rules": [
        {
          "id": "default-deny",
          "action": "block",
          "rationale": "Default deny for unverified requests",
          "conditions": []
        }
      ],
      "riskThreshold": 0.7,
      "defaultAction": "allow"
    }'::jsonb,
    'initial_policy_hash',
    NOW()
);
