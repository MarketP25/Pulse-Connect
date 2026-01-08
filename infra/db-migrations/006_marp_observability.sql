-- MARP Observability Schema Migration
-- Implements monitoring, alerting, and metrics collection for planetary governance

-- Alerts table: Stores all system alerts and notifications
CREATE TABLE marp_alerts (
    id VARCHAR(255) PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL, -- 'slo_breach', 'anomaly', 'security', 'system'
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    metric VARCHAR(255) NOT NULL,
    threshold_value JSONB,
    current_value JSONB,
    subsystem_name VARCHAR(100),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by VARCHAR(255),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metrics snapshots table: Stores periodic metrics snapshots
CREATE TABLE metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_type VARCHAR(50) NOT NULL, -- 'quorum_latency', 'firewall_actions', 'subsystem_health'
    snapshot_data JSONB NOT NULL,
    snapshot_period_start TIMESTAMPTZ NOT NULL,
    snapshot_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SLO tracking table: Tracks Service Level Objectives
CREATE TABLE slo_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slo_name VARCHAR(255) NOT NULL,
    slo_description TEXT,
    target_value DECIMAL(10,4) NOT NULL,
    current_value DECIMAL(10,4),
    status VARCHAR(20) NOT NULL, -- 'healthy', 'warning', 'breached'
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User protection status table: Tracks user protection levels
CREATE TABLE user_protection_status (
    user_id VARCHAR(255) PRIMARY KEY,
    protection_level VARCHAR(20) NOT NULL DEFAULT 'standard', -- 'standard', 'enhanced', 'maximum'
    active_rules JSONB NOT NULL DEFAULT '[]',
    risk_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    quarantine_status VARCHAR(20), -- 'active', 'cleared'
    last_assessment TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Governance snapshots table: Stores governance state snapshots
CREATE TABLE governance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_type VARCHAR(50) NOT NULL, -- 'full', 'incremental'
    snapshot_data JSONB NOT NULL,
    snapshot_hash VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_marp_alerts_type_severity ON marp_alerts(alert_type, severity);
CREATE INDEX idx_marp_alerts_created_at ON marp_alerts(created_at DESC);
CREATE INDEX idx_marp_alerts_status ON marp_alerts(acknowledged_at, resolved_at);

CREATE INDEX idx_metrics_snapshots_type_period ON metrics_snapshots(snapshot_type, snapshot_period_start, snapshot_period_end);
CREATE INDEX idx_metrics_snapshots_created_at ON metrics_snapshots(created_at DESC);

CREATE INDEX idx_slo_tracking_name_status ON slo_tracking(slo_name, status);
CREATE INDEX idx_slo_tracking_updated ON slo_tracking(last_updated DESC);

CREATE INDEX idx_user_protection_level ON user_protection_status(protection_level);
CREATE INDEX idx_user_protection_risk ON user_protection_status(risk_score DESC);
CREATE INDEX idx_user_protection_assessment ON user_protection_status(last_assessment DESC);

CREATE INDEX idx_governance_snapshots_active ON governance_snapshots(is_active) WHERE is_active = true;
CREATE INDEX idx_governance_snapshots_created ON governance_snapshots(created_at DESC);

-- Insert default SLO definitions
INSERT INTO slo_tracking (slo_name, slo_description, target_value, status) VALUES
('snapshot_distribution', 'Governance snapshot distribution latency', 5.0, 'healthy'),
('policy_validation', 'Policy validation response time (p95)', 0.5, 'healthy'),
('audit_completeness', 'Audit log completeness percentage', 100.0, 'healthy'),
('signature_verification', 'Signature verification success rate', 100.0, 'healthy'),
('quorum_formation', 'Council quorum formation time', 30.0, 'healthy');

-- Insert default governance snapshot
INSERT INTO governance_snapshots (
    snapshot_type, snapshot_data, snapshot_hash, is_active, created_by
) VALUES (
    'initial',
    '{"councils": [], "policies": [], "firewall_rules": []}'::jsonb,
    'initial_snapshot_hash',
    true,
    'system'
);

-- Create function to update SLO status based on current metrics
CREATE OR REPLACE FUNCTION update_slo_status()
RETURNS void AS $$
DECLARE
    snapshot_age_seconds DECIMAL;
    quorum_avg_latency DECIMAL;
    sig_verification_rate DECIMAL;
BEGIN
    -- Update snapshot distribution SLO
    SELECT EXTRACT(EPOCH FROM (NOW() - MAX(created_at)))
    INTO snapshot_age_seconds
    FROM governance_snapshots WHERE is_active = true;

    UPDATE slo_tracking
    SET current_value = snapshot_age_seconds,
        status = CASE WHEN snapshot_age_seconds <= 5 THEN 'healthy' ELSE 'breached' END,
        last_updated = NOW()
    WHERE slo_name = 'snapshot_distribution';

    -- Update policy validation SLO (simplified)
    SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))
    INTO quorum_avg_latency
    FROM council_decisions
    WHERE status = 'approved' AND created_at >= NOW() - INTERVAL '1 hour';

    UPDATE slo_tracking
    SET current_value = COALESCE(quorum_avg_latency, 0),
        status = CASE WHEN COALESCE(quorum_avg_latency, 0) <= 0.5 THEN 'healthy' ELSE 'breached' END,
        last_updated = NOW()
    WHERE slo_name = 'policy_validation';

    -- Update audit completeness SLO
    UPDATE slo_tracking
    SET current_value = 100.0, -- Assume 100% for now
        status = 'healthy',
        last_updated = NOW()
    WHERE slo_name = 'audit_completeness';

END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update SLO status
CREATE OR REPLACE FUNCTION trigger_update_slo_status()
RETURNS trigger AS $$
BEGIN
    PERFORM update_slo_status();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on relevant tables
CREATE TRIGGER governance_snapshot_slo_trigger
    AFTER INSERT OR UPDATE ON governance_snapshots
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_update_slo_status();

CREATE TRIGGER council_decision_slo_trigger
    AFTER INSERT OR UPDATE ON council_decisions
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_update_slo_status();
