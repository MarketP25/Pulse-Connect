-- Localization schema migration for Pulsco Planetary Translation Engine
-- Version: 005
-- Description: Create tables for localization, translation, speech, sign-language, and billing

-- User Preferences for Language & Sign Language Settings
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL, -- Reference to external user system
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'en', -- ISO 639-1 language code
    fallback_language VARCHAR(10) DEFAULT 'en',
    sign_language_enabled BOOLEAN NOT NULL DEFAULT false,
    sign_language_type VARCHAR(20), -- 'asl', 'bsl', 'isl', etc.
    auto_translate BOOLEAN NOT NULL DEFAULT true,
    show_original BOOLEAN NOT NULL DEFAULT false,
    voice_gender VARCHAR(10) DEFAULT 'neutral' CHECK (voice_gender IN ('male', 'female', 'neutral')),
    voice_speed DECIMAL(3,2) DEFAULT 1.0 CHECK (voice_speed >= 0.5 AND voice_speed <= 2.0),
    region_code VARCHAR(5), -- ISO 3166-1 alpha-2
    policy_version VARCHAR(50) NOT NULL DEFAULT 'v1.0.0',
    trace_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Localization Strings Catalog (Version-Controlled UI Strings)
CREATE TABLE localization_strings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) NOT NULL, -- e.g., 'auth.login.button'
    language_code VARCHAR(10) NOT NULL, -- ISO 639-1
    region_code VARCHAR(5), -- ISO 3166-1 alpha-2 for regional variants
    value TEXT NOT NULL,
    context TEXT, -- Additional context for translators
    policy_version VARCHAR(50) NOT NULL DEFAULT 'v1.0.0',
    is_approved BOOLEAN NOT NULL DEFAULT false,
    approved_by INTEGER, -- User ID of approver
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(key, language_code, region_code)
);

-- Translation Events (Audit Trail for All Translations)
CREATE TABLE translation_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_id VARCHAR(255), -- For grouping related translations
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    translation_type VARCHAR(20) NOT NULL CHECK (translation_type IN ('text', 'speech', 'video', 'sign')),
    input_length INTEGER, -- Characters for text, seconds for audio/video
    output_length INTEGER,
    latency_ms INTEGER NOT NULL, -- Response time
    accuracy_score DECIMAL(5,4), -- BLEU score or similar
    cost_usd DECIMAL(10,6), -- Micro-costing
    provider VARCHAR(50), -- 'google', 'azure', 'aws', etc.
    model_version VARCHAR(50),
    region_code VARCHAR(5),
    policy_version VARCHAR(50) NOT NULL DEFAULT 'v1.0.0',
    trace_id VARCHAR(255) NOT NULL UNIQUE,
    reason_code VARCHAR(50), -- PAP reason code
    fraud_flags JSONB, -- Any detected anomalies
    metadata JSONB, -- Additional context
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Speech Sessions (ASR/TTS Call Attributes)
CREATE TABLE speech_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    call_id VARCHAR(255), -- Link to WebRTC call
    session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('asr', 'tts', 'translation')),
    source_language VARCHAR(10),
    target_language VARCHAR(10),
    audio_duration_seconds INTEGER,
    input_text TEXT,
    output_text TEXT,
    voice_gender VARCHAR(10),
    voice_speed DECIMAL(3,2),
    provider VARCHAR(50),
    region_code VARCHAR(5),
    policy_version VARCHAR(50) NOT NULL DEFAULT 'v1.0.0',
    trace_id VARCHAR(255) NOT NULL UNIQUE,
    reason_code VARCHAR(50),
    cost_usd DECIMAL(10,6),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Sign Language Sessions (Gesture Detection/Production)
CREATE TABLE sign_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('recognition', 'generation')),
    sign_language VARCHAR(20) NOT NULL, -- 'asl', 'bsl', 'isl', etc.
    input_type VARCHAR(20) CHECK (input_type IN ('camera', 'video', 'text')),
    output_type VARCHAR(20) CHECK (output_type IN ('text', 'voice', 'avatar')),
    gesture_sequence TEXT, -- Tokenized gesture data
    recognized_text TEXT,
    generated_avatar_url VARCHAR(500),
    confidence_score DECIMAL(5,4),
    duration_seconds INTEGER,
    region_code VARCHAR(5),
    policy_version VARCHAR(50) NOT NULL DEFAULT 'v1.0.0',
    trace_id VARCHAR(255) NOT NULL UNIQUE,
    reason_code VARCHAR(50),
    cost_usd DECIMAL(10,6),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Translation Wallet Balance (Minutes + Credits)
CREATE TABLE wallet_balance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    total_minutes INTEGER NOT NULL DEFAULT 0,
    used_minutes INTEGER NOT NULL DEFAULT 0,
    bonus_minutes INTEGER NOT NULL DEFAULT 0,
    total_credits DECIMAL(15,6) NOT NULL DEFAULT 0, -- USD cents precision
    used_credits DECIMAL(15,6) NOT NULL DEFAULT 0,
    bonus_credits DECIMAL(15,6) NOT NULL DEFAULT 0,
    auto_topup_enabled BOOLEAN NOT NULL DEFAULT false,
    auto_topup_threshold INTEGER DEFAULT 10, -- Minutes threshold
    region_code VARCHAR(5),
    policy_version VARCHAR(50) NOT NULL DEFAULT 'v1.0.0',
    trace_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Wallet Transactions (Per-Minute Translation Billing)
CREATE TABLE wallet_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'bonus', 'refund')),
    amount DECIMAL(15,6) NOT NULL, -- Positive for credits, negative for debits
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    description TEXT,
    reference_id VARCHAR(255), -- Link to translation_event or external payment
    payment_method VARCHAR(50), -- 'stripe', 'wallet', etc.
    region_code VARCHAR(5),
    policy_version VARCHAR(50) NOT NULL DEFAULT 'v1.0.0',
    trace_id VARCHAR(255) NOT NULL UNIQUE,
    reason_code VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Fee Policies (Global + Regional Translation Pricing)
CREATE TABLE fee_policies (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    region_code VARCHAR(5), -- NULL for global, specific for regional overrides
    text_translation_per_char DECIMAL(10,6) DEFAULT 0.00001, -- $0.01 per 100 chars = 0.0001 per char
    speech_translation_per_minute DECIMAL(10,4) DEFAULT 0.05, -- $0.05/min
    video_translation_per_minute DECIMAL(10,4) DEFAULT 0.10, -- $0.10/min
    sign_translation_per_minute DECIMAL(10,4) DEFAULT 0.08, -- $0.08/min
    bundle_100_minutes DECIMAL(10,2) DEFAULT 20.00, -- $20 for 100 minutes
    bundle_500_minutes DECIMAL(10,2) DEFAULT 90.00, -- $90 for 500 minutes
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMP WITH TIME ZONE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_user_preferences_user_id ON user_preferences (user_id);
CREATE INDEX idx_localization_strings_key_lang ON localization_strings (key, language_code);
CREATE INDEX idx_localization_strings_approved ON localization_strings (is_approved);
CREATE INDEX idx_translation_events_user_id ON translation_events (user_id);
CREATE INDEX idx_translation_events_session_id ON translation_events (session_id);
CREATE INDEX idx_translation_events_trace_id ON translation_events (trace_id);
CREATE INDEX idx_translation_events_created_at ON translation_events (created_at);
CREATE INDEX idx_speech_sessions_user_id ON speech_sessions (user_id);
CREATE INDEX idx_speech_sessions_call_id ON speech_sessions (call_id);
CREATE INDEX idx_speech_sessions_trace_id ON speech_sessions (trace_id);
CREATE INDEX idx_sign_sessions_user_id ON sign_sessions (user_id);
CREATE INDEX idx_sign_sessions_trace_id ON sign_sessions (trace_id);
CREATE INDEX idx_wallet_balance_user_id ON wallet_balance (user_id);
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions (user_id);
CREATE INDEX idx_wallet_transactions_trace_id ON wallet_transactions (trace_id);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions (created_at);
CREATE INDEX idx_fee_policies_version ON fee_policies (version);
CREATE INDEX idx_fee_policies_region_code ON fee_policies (region_code);
CREATE INDEX idx_fee_policies_status ON fee_policies (status);

-- Unique constraints for idempotency
CREATE UNIQUE INDEX idx_translation_events_trace_id_unique ON translation_events (trace_id);
CREATE UNIQUE INDEX idx_speech_sessions_trace_id_unique ON speech_sessions (trace_id);
CREATE UNIQUE INDEX idx_sign_sessions_trace_id_unique ON sign_sessions (trace_id);
CREATE UNIQUE INDEX idx_wallet_transactions_trace_id_unique ON wallet_transactions (trace_id);

-- Triggers for updated_at
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_localization_strings_updated_at BEFORE UPDATE ON localization_strings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallet_balance_updated_at BEFORE UPDATE ON wallet_balance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fee_policies_updated_at BEFORE UPDATE ON fee_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default global fee policy
INSERT INTO fee_policies (version, region_code, text_translation_per_char, speech_translation_per_minute, video_translation_per_minute, sign_translation_per_minute, bundle_100_minutes, bundle_500_minutes)
VALUES ('v1.0.0', NULL, 0.0001, 0.05, 0.10, 0.08, 20.00, 90.00);

-- Insert regional overrides (Kenya discounted, US/EU standard)
INSERT INTO fee_policies (version, region_code, text_translation_per_char, speech_translation_per_minute, video_translation_per_minute, sign_translation_per_minute, bundle_100_minutes, bundle_500_minutes)
VALUES ('v1.0.0-ke', 'KE', 0.00005, 0.025, 0.05, 0.04, 10.00, 45.00);
