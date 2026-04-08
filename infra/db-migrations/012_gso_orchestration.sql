-- Global System Orchestrator (GSO) schema
-- Planetary routing, failover, emergency containment, telemetry, and immutable orchestration logs.

CREATE TABLE IF NOT EXISTS gso_network_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id VARCHAR(96) NOT NULL UNIQUE,
    node_type VARCHAR(32) NOT NULL CHECK (node_type IN ('cloud_region', 'edge_node', 'external_network')),
    provider VARCHAR(64) NOT NULL,
    region_code VARCHAR(32) NOT NULL,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    latency_score NUMERIC(7, 3) NOT NULL DEFAULT 999.000,
    health_status VARCHAR(16) NOT NULL DEFAULT 'degraded'
        CHECK (health_status IN ('healthy', 'degraded', 'critical', 'offline')),
    capacity_total INTEGER NOT NULL DEFAULT 0,
    capacity_available INTEGER NOT NULL DEFAULT 0,
    congestion_score NUMERIC(7, 3) NOT NULL DEFAULT 1.000,
    risk_score NUMERIC(7, 3) NOT NULL DEFAULT 0.500,
    last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gso_network_nodes_region_health
    ON gso_network_nodes(region_code, health_status, is_active);

CREATE INDEX IF NOT EXISTS idx_gso_network_nodes_type_provider
    ON gso_network_nodes(node_type, provider);

CREATE INDEX IF NOT EXISTS idx_gso_network_nodes_risk_latency
    ON gso_network_nodes(risk_score, latency_score);

CREATE TABLE IF NOT EXISTS gso_vault_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_collection VARCHAR(64) NOT NULL,
    document_key VARCHAR(128),
    region_code VARCHAR(32),
    node_id VARCHAR(96),
    payload JSONB NOT NULL,
    payload_checksum CHAR(64) NOT NULL,
    encryption_mode VARCHAR(32) NOT NULL DEFAULT 'aes-256-gcm',
    pc365_verified BOOLEAN NOT NULL DEFAULT false,
    founder_approved BOOLEAN NOT NULL DEFAULT false,
    created_by VARCHAR(128) NOT NULL DEFAULT 'system',
    created_role VARCHAR(64) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gso_vault_documents_collection_created
    ON gso_vault_documents(vault_collection, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gso_vault_documents_region
    ON gso_vault_documents(region_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gso_vault_documents_document_key
    ON gso_vault_documents(document_key);

CREATE TABLE IF NOT EXISTS gso_vault_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(96),
    vault_document_id UUID REFERENCES gso_vault_documents(id) ON DELETE SET NULL,
    vault_collection VARCHAR(64) NOT NULL,
    operation VARCHAR(16) NOT NULL CHECK (operation IN ('read', 'write', 'update', 'delete')),
    actor_id VARCHAR(128) NOT NULL DEFAULT 'system',
    actor_role VARCHAR(64) NOT NULL DEFAULT 'system',
    pc365_verified BOOLEAN NOT NULL DEFAULT false,
    founder_approved BOOLEAN NOT NULL DEFAULT false,
    success BOOLEAN NOT NULL DEFAULT true,
    detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gso_vault_audit_logs_request
    ON gso_vault_audit_logs(request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gso_vault_audit_logs_collection
    ON gso_vault_audit_logs(vault_collection, created_at DESC);

CREATE TABLE IF NOT EXISTS gso_session_routes (
    session_key VARCHAR(160) PRIMARY KEY,
    active_node_id VARCHAR(96) NOT NULL,
    failover_node_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    continuity_token VARCHAR(128) NOT NULL,
    sticky_until TIMESTAMPTZ,
    last_switch_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gso_session_routes_active_node
    ON gso_session_routes(active_node_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS gso_routing_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(96) NOT NULL,
    session_key VARCHAR(160),
    user_hash VARCHAR(160),
    source_region VARCHAR(32),
    selected_node_id VARCHAR(96) NOT NULL,
    failover_node_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    decision_score NUMERIC(9, 6) NOT NULL,
    decision_vector JSONB NOT NULL DEFAULT '{}'::jsonb,
    decision_reason TEXT NOT NULL,
    decision_time_ms INTEGER NOT NULL DEFAULT 0,
    routing_mode VARCHAR(24) NOT NULL DEFAULT 'normal',
    csi_signal_id UUID REFERENCES gso_vault_documents(id) ON DELETE SET NULL,
    continuity_token VARCHAR(128),
    execution_status VARCHAR(24) NOT NULL DEFAULT 'applied'
        CHECK (execution_status IN ('applied', 'degraded', 'queued', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gso_routing_decisions_created
    ON gso_routing_decisions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gso_routing_decisions_region_node
    ON gso_routing_decisions(source_region, selected_node_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gso_routing_decisions_request
    ON gso_routing_decisions(request_id);

CREATE TABLE IF NOT EXISTS gso_emergency_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id VARCHAR(96) NOT NULL UNIQUE,
    level SMALLINT NOT NULL CHECK (level IN (1, 2, 3)),
    status VARCHAR(24) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'resolved', 'expired')),
    region_code VARCHAR(32),
    reason TEXT NOT NULL,
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    csi_signal_id UUID REFERENCES gso_vault_documents(id) ON DELETE SET NULL,
    founder_approval_ref VARCHAR(160),
    pc365_verified BOOLEAN NOT NULL DEFAULT false,
    marp_logged BOOLEAN NOT NULL DEFAULT false,
    created_by VARCHAR(128) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gso_emergency_incidents_status_level
    ON gso_emergency_incidents(status, level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gso_emergency_incidents_region
    ON gso_emergency_incidents(region_code, created_at DESC);

CREATE TABLE IF NOT EXISTS gso_region_isolations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_code VARCHAR(32) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT false,
    emergency_level SMALLINT CHECK (emergency_level IN (1, 2, 3)),
    reason TEXT,
    blocked_ip_ranges JSONB NOT NULL DEFAULT '[]'::jsonb,
    restrict_data_sync BOOLEAN NOT NULL DEFAULT true,
    isolate_to_local_reads BOOLEAN NOT NULL DEFAULT true,
    activated_at TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gso_region_isolations_active
    ON gso_region_isolations(is_active, region_code);

CREATE TABLE IF NOT EXISTS gso_degraded_tx_queue (
    seq_id BIGSERIAL PRIMARY KEY,
    tx_id UUID NOT NULL DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(160) NOT NULL UNIQUE,
    payload_encrypted TEXT NOT NULL,
    payload_checksum CHAR(64) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'replayed', 'failed', 'discarded')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_attempt_at TIMESTAMPTZ,
    replayed_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_gso_degraded_tx_queue_status_seq
    ON gso_degraded_tx_queue(status, seq_id ASC);

CREATE INDEX IF NOT EXISTS idx_gso_degraded_tx_queue_next_attempt
    ON gso_degraded_tx_queue(next_attempt_at ASC)
    WHERE status IN ('queued', 'failed');

CREATE TABLE IF NOT EXISTS gso_device_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(96),
    anonymized_device_id VARCHAR(160) NOT NULL,
    region_code VARCHAR(32),
    latency_ms INTEGER,
    gps_drift_meters NUMERIC(10, 3),
    failed_requests INTEGER NOT NULL DEFAULT 0,
    network_quality NUMERIC(6, 3),
    payload_encrypted TEXT NOT NULL,
    payload_iv VARCHAR(64) NOT NULL,
    ingestion_hash CHAR(64) NOT NULL,
    rate_limited BOOLEAN NOT NULL DEFAULT false,
    csi_dispatched BOOLEAN NOT NULL DEFAULT false,
    vault_document_id UUID REFERENCES gso_vault_documents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gso_device_signals_device_created
    ON gso_device_signals(anonymized_device_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gso_device_signals_region_created
    ON gso_device_signals(region_code, created_at DESC);

CREATE TABLE IF NOT EXISTS gso_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(96),
    action_type VARCHAR(64) NOT NULL,
    actor_id VARCHAR(128) NOT NULL DEFAULT 'system',
    actor_role VARCHAR(64) NOT NULL DEFAULT 'system',
    region_code VARCHAR(32),
    node_id VARCHAR(96),
    outcome VARCHAR(24) NOT NULL CHECK (outcome IN ('success', 'blocked', 'failed', 'queued')),
    detail JSONB NOT NULL DEFAULT '{}'::jsonb,
    marp_dispatched BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gso_action_logs_created
    ON gso_action_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gso_action_logs_request
    ON gso_action_logs(request_id, created_at DESC);

INSERT INTO gso_network_nodes (
    node_id, node_type, provider, region_code, latitude, longitude,
    latency_score, health_status, capacity_total, capacity_available, congestion_score, risk_score, metadata
) VALUES
    (
      'aws-us-east-1',
      'cloud_region',
      'aws',
      'US-EAST',
      39.0438,
      -77.4874,
      42.000,
      'healthy',
      100000,
      78000,
      0.220,
      0.140,
      '{"tier":"primary","supportsTransactions":true}'::jsonb
    ),
    (
      'gcp-europe-west1',
      'cloud_region',
      'gcp',
      'EU-WEST',
      50.8503,
      4.3517,
      55.000,
      'healthy',
      90000,
      64000,
      0.260,
      0.180,
      '{"tier":"primary","supportsTransactions":true}'::jsonb
    ),
    (
      'azure-east-africa',
      'cloud_region',
      'azure',
      'AF-EAST',
      -1.2921,
      36.8219,
      67.000,
      'healthy',
      65000,
      42000,
      0.310,
      0.210,
      '{"tier":"secondary","supportsTransactions":true}'::jsonb
    ),
    (
      'cdn-edge-global-01',
      'edge_node',
      'cloudflare',
      'GLOBAL',
      0.0000,
      0.0000,
      18.000,
      'healthy',
      120000,
      99000,
      0.180,
      0.120,
      '{"edgeCache":true,"compute":true}'::jsonb
    ),
    (
      'external-network-provider-01',
      'external_network',
      'hybrid-isp',
      'GLOBAL',
      0.0000,
      0.0000,
      95.000,
      'degraded',
      30000,
      25000,
      0.450,
      0.330,
      '{"backupRoute":true}'::jsonb
    )
ON CONFLICT (node_id) DO UPDATE
SET node_type = EXCLUDED.node_type,
    provider = EXCLUDED.provider,
    region_code = EXCLUDED.region_code,
    latency_score = EXCLUDED.latency_score,
    health_status = EXCLUDED.health_status,
    capacity_total = EXCLUDED.capacity_total,
    capacity_available = EXCLUDED.capacity_available,
    congestion_score = EXCLUDED.congestion_score,
    risk_score = EXCLUDED.risk_score,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();
