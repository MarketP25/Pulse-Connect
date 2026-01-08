-- 003_kyc_schema.sql
-- Create KYC and compliance tables, and add seller columns required by ComplianceService

-- Ensure gen_random_uuid() is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- KYC verifications table
CREATE TABLE IF NOT EXISTS kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','under_review','verified','rejected','expired')),
  verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN ('basic','enhanced','premium')),
  documents JSONB,
  personal_info JSONB,
  business_info JSONB,
  risk_score DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (risk_score >= 0 AND risk_score <= 100),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by VARCHAR(255),
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ,
  trace_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_verifications_seller_id ON kyc_verifications (seller_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_status ON kyc_verifications (status);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_trace_id ON kyc_verifications (trace_id);

-- Compliance events table (audit/log)
CREATE TABLE IF NOT EXISTS compliance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id VARCHAR(255),
  event_type VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_events_seller_id ON compliance_events (seller_id);

-- Compliance audit log used by AIComplianceService
CREATE TABLE IF NOT EXISTS compliance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  content_type VARCHAR(20),
  ai_program_run_id UUID,
  risk_score DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (risk_score >= 0 AND risk_score <= 100),
  restricted_content_detected BOOLEAN DEFAULT FALSE,
  restricted_categories TEXT[] DEFAULT '{}',
  compliance_action VARCHAR(20) NOT NULL CHECK (compliance_action IN ('allow','block','flag','quarantine')),
  metadata JSONB DEFAULT '{}'::jsonb,
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_audit_log_trace_id ON compliance_audit_log (trace_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_log_user_id ON compliance_audit_log (user_id);

-- Add columns on sellers table if they exist
ALTER TABLE IF EXISTS sellers
  ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'unverified' CHECK (kyc_status IN ('unverified','pending','under_review','verified','rejected','expired')),
  ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS risk_score DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (risk_score >= 0 AND risk_score <= 100);

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_kyc_verifications_updated_at BEFORE UPDATE ON kyc_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_audit_log_updated_at BEFORE UPDATE ON compliance_audit_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_events_updated_at BEFORE UPDATE ON compliance_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
