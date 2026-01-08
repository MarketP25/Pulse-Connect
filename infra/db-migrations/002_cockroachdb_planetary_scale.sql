-- Planetary-Scale Database Migration for Trillions of Tasks
-- CockroachDB/YugabyteDB Enhancement for Global Scale

-- Enable necessary extensions for planetary scale
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_partman;

-- Enhanced partitioning strategy for exabyte-scale data
-- Partition by geography (continent), time (hourly), and hash (for even distribution)

-- Create geo-partitioned tables for planetary scale
CREATE TABLE IF NOT EXISTS global_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    priority INTEGER DEFAULT 1,
    region TEXT NOT NULL,
    continent TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    worker_node TEXT,
    execution_time_ms BIGINT,
    error_message TEXT,
    -- Hash partitioning key for even distribution
    task_hash INTEGER GENERATED ALWAYS AS (mod(hashtext(id::text), 1000)) STORED
) PARTITION BY LIST (continent);

-- Create continent-based partitions
CREATE TABLE global_tasks_north_america PARTITION OF global_tasks FOR VALUES IN ('north_america');
CREATE TABLE global_tasks_south_america PARTITION OF global_tasks FOR VALUES IN ('south_america');
CREATE TABLE global_tasks_europe PARTITION OF global_tasks FOR VALUES IN ('europe');
CREATE TABLE global_tasks_africa PARTITION OF global_tasks FOR VALUES IN ('africa');
CREATE TABLE global_tasks_asia PARTITION OF global_tasks FOR VALUES IN ('asia');
CREATE TABLE global_tasks_oceania PARTITION OF global_tasks FOR VALUES IN ('oceania');
CREATE TABLE global_tasks_antartica PARTITION OF global_tasks FOR VALUES IN ('antartica');

-- Sub-partition by time for each continent (hourly partitions)
-- This creates ~17K partitions total (7 continents × 24 hours × rolling window)
CREATE OR REPLACE FUNCTION create_hourly_partitions()
RETURNS VOID AS $$
DECLARE
    continent_list TEXT[] := ARRAY['north_america', 'south_america', 'europe', 'africa', 'asia', 'oceania', 'antartica'];
    continent_name TEXT;
    partition_date DATE;
    partition_name TEXT;
    i INTEGER;
BEGIN
    FOREACH continent_name IN ARRAY continent_list LOOP
        -- Create partitions for next 30 days
        FOR i IN 0..720 LOOP  -- 30 days × 24 hours
            partition_date := CURRENT_DATE + INTERVAL '1 hour' * i;
            partition_name := format('global_tasks_%s_%s', continent_name, to_char(partition_date, 'YYYY_MM_DD_HH24'));

            EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF global_tasks_%I FOR VALUES FROM (%L) TO (%L)',
                partition_name, continent_name,
                format('%s-%s', continent_name, to_char(partition_date, 'YYYY-MM-DD HH24:MI:SS')),
                format('%s-%s', continent_name, to_char(partition_date + INTERVAL '1 hour', 'YYYY-MM-DD HH24:MI:SS'))
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute partition creation
SELECT create_hourly_partitions();

-- Indexes for planetary-scale performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_global_tasks_status_priority_created
    ON global_tasks (status, priority DESC, created_at ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_global_tasks_region_status
    ON global_tasks (region, status) WHERE status IN ('pending', 'running');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_global_tasks_hash_status
    ON global_tasks (task_hash, status) WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_global_tasks_scheduled
    ON global_tasks (scheduled_at) WHERE scheduled_at IS NOT NULL AND status = 'pending';

-- Partial indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_global_tasks_failed
    ON global_tasks (retry_count, created_at) WHERE status = 'failed' AND retry_count < max_retries;

-- Global task queue table for distributed processing
CREATE TABLE IF NOT EXISTS global_task_queue (
    id BIGSERIAL PRIMARY KEY,
    task_id UUID REFERENCES global_tasks(id) ON DELETE CASCADE,
    queue_name TEXT NOT NULL,
    priority INTEGER DEFAULT 1,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    locked_until TIMESTAMPTZ,
    worker_id TEXT,
    region TEXT NOT NULL,
    continent TEXT NOT NULL
) PARTITION BY HASH (queue_name);

-- Create hash partitions for task queue (100 partitions for even distribution)
DO $$
DECLARE
    i INTEGER;
    partition_name TEXT;
BEGIN
    FOR i IN 0..99 LOOP
        partition_name := format('global_task_queue_%s', lpad(i::text, 2, '0'));
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF global_task_queue FOR VALUES WITH (modulus 100, remainder %s)', partition_name, i);
    END LOOP;
END $$;

-- Global metrics table for planetary monitoring
CREATE TABLE IF NOT EXISTS global_system_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    region TEXT NOT NULL,
    continent TEXT NOT NULL,
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    tags JSONB DEFAULT '{}'
) PARTITION BY RANGE (collected_at);

-- Create daily partitions for metrics (rolling 90 days)
CREATE OR REPLACE FUNCTION create_metrics_partitions()
RETURNS VOID AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    i INTEGER;
BEGIN
    FOR i IN 0..90 LOOP
        partition_date := CURRENT_DATE + INTERVAL '1 day' * i;
        partition_name := format('global_system_metrics_%s', to_char(partition_date, 'YYYY_MM_DD'));

        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF global_system_metrics FOR VALUES FROM (%L) TO (%L)',
            partition_name, partition_date, partition_date + INTERVAL '1 day');
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT create_metrics_partitions();

-- Global worker registry for distributed execution
CREATE TABLE IF NOT EXISTS global_workers (
    id TEXT PRIMARY KEY, -- UUID or hostname
    region TEXT NOT NULL,
    continent TEXT NOT NULL,
    capabilities JSONB DEFAULT '[]',
    status TEXT DEFAULT 'active',
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    current_load INTEGER DEFAULT 0,
    max_load INTEGER DEFAULT 100,
    ip_address INET,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    tags JSONB DEFAULT '{}'
);

-- Indexes for worker management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_global_workers_region_status
    ON global_workers (region, status) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_global_workers_capabilities
    ON global_workers USING GIN (capabilities) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_global_workers_load
    ON global_workers (current_load, max_load) WHERE status = 'active';

-- Global circuit breaker table for failure management
CREATE TABLE IF NOT EXISTS global_circuit_breakers (
    id TEXT PRIMARY KEY,
    service_name TEXT NOT NULL,
    region TEXT NOT NULL,
    continent TEXT NOT NULL,
    state TEXT DEFAULT 'closed', -- closed, open, half_open
    failure_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    last_failure_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    next_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to automatically manage partitions (run daily)
CREATE OR REPLACE FUNCTION manage_partitions()
RETURNS VOID AS $$
BEGIN
    -- Drop old partitions (older than 90 days)
    EXECUTE 'DROP TABLE IF EXISTS ' ||
        (SELECT string_agg('global_system_metrics_' || to_char(CURRENT_DATE - INTERVAL '90 days' - INTERVAL '1 day' * generate_series(0, 30), 'YYYY_MM_DD'), ', ')
         FROM generate_series(0, 30) s);

    -- Create future partitions (next 30 days)
    PERFORM create_metrics_partitions();

    -- Rebalance task queue partitions if needed
    -- This would trigger redistribution in a real CockroachDB/YugabyteDB setup
END;
$$ LANGUAGE plpgsql;

-- Create automated maintenance job (would be scheduled externally)
-- This is a placeholder - actual scheduling would be done by external job scheduler
CREATE TABLE IF NOT EXISTS maintenance_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL UNIQUE,
    schedule_cron TEXT NOT NULL,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO maintenance_jobs (job_name, schedule_cron) VALUES
    ('partition_management', '0 2 * * *'), -- Daily at 2 AM
    ('metrics_cleanup', '0 3 * * *'),     -- Daily at 3 AM
    ('worker_health_check', '*/5 * * * *') -- Every 5 minutes
ON CONFLICT (job_name) DO NOTHING;

-- Performance monitoring views
CREATE OR REPLACE VIEW global_task_performance AS
SELECT
    continent,
    region,
    status,
    COUNT(*) as task_count,
    AVG(execution_time_ms) as avg_execution_time,
    MIN(execution_time_ms) as min_execution_time,
    MAX(execution_time_ms) as max_execution_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_execution_time
FROM global_tasks
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY continent, region, status;

CREATE OR REPLACE VIEW global_system_health AS
SELECT
    continent,
    region,
    AVG(metric_value) as avg_load,
    MAX(metric_value) as peak_load,
    COUNT(*) as metric_count
FROM global_system_metrics
WHERE metric_name = 'system_load' AND collected_at >= CURRENT_DATE - INTERVAL '1 hour'
GROUP BY continent, region;

-- Comments for documentation
COMMENT ON TABLE global_tasks IS 'Planetary-scale task storage with geo-temporal partitioning for trillions of tasks';
COMMENT ON TABLE global_task_queue IS 'Distributed task queue with hash partitioning for global load balancing';
COMMENT ON TABLE global_system_metrics IS 'Global system monitoring with time-based partitioning';
COMMENT ON TABLE global_workers IS 'Worker registry for distributed execution across continents';
COMMENT ON TABLE global_circuit_breakers IS 'Circuit breaker pattern implementation for global resilience';

-- Grant permissions for planetary-scale operations
-- These would be adjusted based on actual service account requirements
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO planetary_service;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO planetary_service;
