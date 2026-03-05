-- 011_identity_onboarding.sql
-- Planetary-scale identity onboarding schema for Pulse Identity Service.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname='pgcrypto') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    EXCEPTION WHEN others THEN
      -- ignore if extension cannot be created in this runtime
    END;
  END IF;
END
$$;

-- Shared updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION trigger_identity_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Protect immutable records (consent + audit)
CREATE OR REPLACE FUNCTION trigger_block_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'immutable table: mutations are not allowed';
END;
$$ LANGUAGE plpgsql;

-- Core users table extension for onboarding
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_verification';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_user_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_uuid_v7 UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pulsco_internal_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_route TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic';
ALTER TABLE users ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- user_roles (existing table may already be present from initial RBAC schema)
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS user_locale (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_language TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  currency TEXT NOT NULL,
  compliance_profile TEXT NOT NULL,
  translation_context TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_locale_user_id ON user_locale(user_id);

CREATE TABLE IF NOT EXISTS user_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_device_fingerprint TEXT NOT NULL,
  encrypted_last_ip_address TEXT NOT NULL,
  encrypted_last_user_agent TEXT NOT NULL,
  verification_token_hash TEXT,
  verification_token_expiry TIMESTAMPTZ,
  verification_token_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_security_user_id ON user_security(user_id);

CREATE TABLE IF NOT EXISTS user_trust_score (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL,
  components JSONB NOT NULL DEFAULT '{}'::jsonb,
  initialized_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_trust_score_user_id ON user_trust_score(user_id);

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  accepted BOOLEAN NOT NULL,
  version TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_type_version ON consent_records(consent_type, version);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  referral_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

CREATE TABLE IF NOT EXISTS kyc_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'verified', 'rejected', 'not_required')),
  level TEXT NOT NULL CHECK (level IN ('none', 'basic', 'enhanced', 'full')),
  provider_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kyc_status_user_id ON kyc_status(user_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

CREATE TABLE IF NOT EXISTS login_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  encrypted_device_fingerprint TEXT NOT NULL,
  encrypted_ip_address TEXT NOT NULL,
  encrypted_user_agent TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_sessions_user_id ON login_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_expires_at ON login_sessions(expires_at);

-- updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_user_locale') THEN
    CREATE TRIGGER set_updated_at_user_locale
    BEFORE UPDATE ON user_locale
    FOR EACH ROW EXECUTE FUNCTION trigger_identity_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_user_security') THEN
    CREATE TRIGGER set_updated_at_user_security
    BEFORE UPDATE ON user_security
    FOR EACH ROW EXECUTE FUNCTION trigger_identity_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_user_trust_score') THEN
    CREATE TRIGGER set_updated_at_user_trust_score
    BEFORE UPDATE ON user_trust_score
    FOR EACH ROW EXECUTE FUNCTION trigger_identity_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_referrals') THEN
    CREATE TRIGGER set_updated_at_referrals
    BEFORE UPDATE ON referrals
    FOR EACH ROW EXECUTE FUNCTION trigger_identity_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_kyc_status') THEN
    CREATE TRIGGER set_updated_at_kyc_status
    BEFORE UPDATE ON kyc_status
    FOR EACH ROW EXECUTE FUNCTION trigger_identity_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_login_sessions') THEN
    CREATE TRIGGER set_updated_at_login_sessions
    BEFORE UPDATE ON login_sessions
    FOR EACH ROW EXECUTE FUNCTION trigger_identity_set_updated_at();
  END IF;
END
$$;

-- Immutable enforcement
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'block_consent_records_update') THEN
    CREATE TRIGGER block_consent_records_update
    BEFORE UPDATE OR DELETE ON consent_records
    FOR EACH ROW EXECUTE FUNCTION trigger_block_mutation();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'block_audit_logs_update') THEN
    CREATE TRIGGER block_audit_logs_update
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION trigger_block_mutation();
  END IF;
END
$$;
