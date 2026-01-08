-- PAP AI Workflows Table (extends PAP v1)
CREATE TABLE pap_ai_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL DEFAULT 'ai_program_execution',
    program_type VARCHAR(20) NOT NULL CHECK (program_type IN ('basic', 'advanced', 'premium')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'completed')),
    pap_subscription_id VARCHAR(255) NOT NULL,
    consent_validated BOOLEAN NOT NULL DEFAULT false,
    caps_checked BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_respected BOOLEAN NOT NULL DEFAULT false,
    content_safety_passed BOOLEAN NOT NULL DEFAULT false,
    ai_eligibility_checked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Queue Jobs Table (for dual queue system)
CREATE TABLE queue_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_name VARCHAR(50) NOT NULL,
    job_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    priority INTEGER NOT NULL DEFAULT 5,
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    region_code VARCHAR(10) NOT NULL DEFAULT 'US',
    trace_id VARCHAR(255) NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for PAP AI workflows
CREATE INDEX idx_pap_ai_workflows_user_id ON pap_ai_workflows (user_id);
CREATE INDEX idx_pap_ai_workflows_status ON pap_ai_workflows (status);
CREATE INDEX idx_pap_ai_workflows_created_at ON pap_ai_workflows (created_at);

-- Indexes for queue jobs
CREATE INDEX idx_queue_jobs_queue_name ON queue_jobs (queue_name);
CREATE INDEX idx_queue_jobs_status ON queue_jobs (status);
CREATE INDEX idx_queue_jobs_region_code ON queue_jobs (region_code);
CREATE INDEX idx_queue_jobs_created_at ON queue_jobs (created_at);
CREATE INDEX idx_queue_jobs_priority ON queue_jobs (priority DESC);

-- Triggers for updated_at
CREATE TRIGGER update_pap_ai_workflows_updated_at BEFORE UPDATE ON pap_ai_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
