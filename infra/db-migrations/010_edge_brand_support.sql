-- Edge Brand Support & Planetary Icon Routing
-- Backend storage for universal branding config + firewall-gated support telemetry.

CREATE TABLE IF NOT EXISTS edge_brand_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(64) NOT NULL,
    config_json JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_edge_brand_profiles_version
    ON edge_brand_profiles(version);

CREATE UNIQUE INDEX IF NOT EXISTS idx_edge_brand_profiles_active
    ON edge_brand_profiles(is_active)
    WHERE is_active = true;

CREATE TABLE IF NOT EXISTS edge_brand_distribution_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(64) NOT NULL,
    source_app VARCHAR(255) NOT NULL,
    region_code VARCHAR(64) NOT NULL,
    selected_origin TEXT,
    icon_version VARCHAR(64) NOT NULL,
    served_via_firewall BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edge_brand_distribution_events_created_at
    ON edge_brand_distribution_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_edge_brand_distribution_events_region_source
    ON edge_brand_distribution_events(region_code, source_app);

CREATE TABLE IF NOT EXISTS edge_brand_support_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(64) NOT NULL,
    source_app VARCHAR(255) NOT NULL,
    region_code VARCHAR(64) NOT NULL,
    event_name VARCHAR(64) NOT NULL,
    event_ts TIMESTAMPTZ NOT NULL,
    event_path VARCHAR(256),
    event_meta JSONB DEFAULT '{}'::jsonb,
    reason_code VARCHAR(64) NOT NULL,
    firewall_status VARCHAR(64) NOT NULL DEFAULT 'queued',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edge_brand_support_events_request_id
    ON edge_brand_support_events(request_id);

CREATE INDEX IF NOT EXISTS idx_edge_brand_support_events_firewall_status
    ON edge_brand_support_events(firewall_status);

CREATE INDEX IF NOT EXISTS idx_edge_brand_support_events_created_at
    ON edge_brand_support_events(created_at DESC);

INSERT INTO edge_brand_profiles (version, config_json, is_active)
VALUES (
    'pulsco-icons-v2026.02',
    '{
      "themeColor": "#0A1428",
      "backgroundColor": "#0F1929",
      "origins": []
    }'::jsonb,
    true
)
ON CONFLICT (version) DO UPDATE
SET config_json = EXCLUDED.config_json,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
