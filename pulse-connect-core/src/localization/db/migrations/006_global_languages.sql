-- Global Languages Expansion Migration
-- Migration: 006_global_languages.sql
-- Description: Expand localization support for 200+ languages with regional variants

-- Ensure the trigger helper is available
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Language Registry (ISO 639-3 codes for comprehensive coverage)
CREATE TABLE supported_languages (
    id SERIAL PRIMARY KEY,
    iso_code VARCHAR(3) NOT NULL UNIQUE, -- ISO 639-3 for comprehensive coverage
    iso_639_1 VARCHAR(2), -- ISO 639-1 where available
    name_en VARCHAR(100) NOT NULL, -- English name
    name_native VARCHAR(100), -- Native language name
    script VARCHAR(20), -- Writing system (Latin, Cyrillic, Arabic, etc.)
    region_code VARCHAR(5), -- Primary region (ISO 3166-1 alpha-2)
    is_active BOOLEAN NOT NULL DEFAULT true,
    translation_available BOOLEAN NOT NULL DEFAULT false,
    speech_available BOOLEAN NOT NULL DEFAULT false,
    sign_available BOOLEAN NOT NULL DEFAULT false,
    quality_score DECIMAL(3,2), -- Overall quality rating 0-1
    speakers_millions INTEGER, -- Approximate number of speakers
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Language Pair Capabilities (which language pairs are supported)
CREATE TABLE language_pair_capabilities (
    id SERIAL PRIMARY KEY,
    source_language VARCHAR(3) NOT NULL,
    target_language VARCHAR(3) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'google', 'azure', 'aws', 'deepl', etc.
    quality_score DECIMAL(3,2), -- Translation quality 0-1
    latency_ms INTEGER, -- Typical latency
    cost_per_char DECIMAL(10,6), -- Cost per character
    supports_speech BOOLEAN NOT NULL DEFAULT false,
    supports_formatting BOOLEAN NOT NULL DEFAULT false,
    last_validated TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(source_language, target_language, provider)
);

-- Regional Language Preferences
CREATE TABLE regional_language_preferences (
    id SERIAL PRIMARY KEY,
    region_code VARCHAR(5) NOT NULL, -- ISO 3166-1 alpha-2
    primary_languages TEXT[], -- Array of preferred language codes
    fallback_languages TEXT[], -- Fallback options
    excluded_languages TEXT[], -- Languages not to use due to regulations
    content_moderation_rules JSONB, -- Regional content rules
    data_residency_required BOOLEAN NOT NULL DEFAULT false,
    export_controls JSONB, -- Export control restrictions
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(region_code)
);

-- Translation Cache (for performance optimization)
CREATE TABLE translation_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL UNIQUE, -- Hash of content + languages + options
    source_language VARCHAR(3) NOT NULL,
    target_language VARCHAR(3) NOT NULL,
    source_content_hash VARCHAR(64) NOT NULL, -- SHA-256 of source
    translated_content TEXT NOT NULL,
    quality_score DECIMAL(3,2),
    provider VARCHAR(50),
    model_version VARCHAR(50),
    cost_usd DECIMAL(10,6),
    access_count INTEGER NOT NULL DEFAULT 1,
    last_accessed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_supported_languages_iso_code ON supported_languages (iso_code);
CREATE INDEX idx_supported_languages_active ON supported_languages (is_active);
CREATE INDEX idx_supported_languages_region ON supported_languages (region_code);
CREATE INDEX idx_language_pair_capabilities_source_target ON language_pair_capabilities (source_language, target_language);
CREATE INDEX idx_language_pair_capabilities_provider ON language_pair_capabilities (provider);
CREATE INDEX idx_language_pair_capabilities_active ON language_pair_capabilities (is_active);
CREATE INDEX idx_regional_language_preferences_region ON regional_language_preferences (region_code);
CREATE INDEX idx_translation_cache_key ON translation_cache (cache_key);
CREATE INDEX idx_translation_cache_expires ON translation_cache (expires_at);
CREATE INDEX idx_translation_cache_access ON translation_cache (last_accessed);

-- Triggers for updated_at
CREATE TRIGGER update_supported_languages_updated_at BEFORE UPDATE ON supported_languages FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER update_language_pair_capabilities_updated_at BEFORE UPDATE ON language_pair_capabilities FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER update_regional_language_preferences_updated_at BEFORE UPDATE ON regional_language_preferences FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Insert core supported languages (sample - would be expanded to 200+)
INSERT INTO supported_languages (iso_code, iso_639_1, name_en, name_native, script, region_code, translation_available, speech_available, sign_available, quality_score, speakers_millions) VALUES
-- Major world languages
('eng', 'en', 'English', 'English', 'Latin', 'US', true, true, true, 1.00, 1500),
('spa', 'es', 'Spanish', 'Español', 'Latin', 'ES', true, true, true, 0.95, 500),
('fra', 'fr', 'French', 'Français', 'Latin', 'FR', true, true, true, 0.95, 300),
('deu', 'de', 'German', 'Deutsch', 'Latin', 'DE', true, true, true, 0.95, 100),
('ita', 'it', 'Italian', 'Italiano', 'Latin', 'IT', true, true, false, 0.90, 70),
('por', 'pt', 'Portuguese', 'Português', 'Latin', 'PT', true, true, false, 0.90, 260),
('rus', 'ru', 'Russian', 'Русский', 'Cyrillic', 'RU', true, true, true, 0.90, 260),
('ara', 'ar', 'Arabic', 'العربية', 'Arabic', 'SA', true, true, false, 0.85, 300),
('hin', 'hi', 'Hindi', 'हिन्दी', 'Devanagari', 'IN', true, true, false, 0.85, 600),
('ben', 'bn', 'Bengali', 'বাংলা', 'Bengali', 'BD', true, false, false, 0.80, 270),
('jpn', 'ja', 'Japanese', '日本語', 'Japanese', 'JP', true, true, false, 0.90, 125),
('kor', 'ko', 'Korean', '한국어', 'Korean', 'KR', true, true, false, 0.85, 80),
('cmn', 'zh', 'Mandarin Chinese', '普通话', 'Chinese', 'CN', true, true, false, 0.90, 1100),
('swa', 'sw', 'Swahili', 'Kiswahili', 'Latin', 'KE', true, false, false, 0.75, 100),
-- Sign languages
('ase', NULL, 'American Sign Language', 'American Sign Language', 'Sign', 'US', false, false, true, 0.80, 0),
('bfi', NULL, 'British Sign Language', 'British Sign Language', 'Sign', 'GB', false, false, true, 0.75, 0),
('ssp', NULL, 'Spanish Sign Language', 'Lengua de Signos Española', 'Sign', 'ES', false, false, true, 0.70, 0)
ON CONFLICT (iso_code) DO NOTHING;

-- Insert regional preferences
INSERT INTO regional_language_preferences (region_code, primary_languages, fallback_languages, data_residency_required) VALUES
('US', ARRAY['eng', 'spa', 'fra'], ARRAY['deu', 'ita'], false),
('EU', ARRAY['eng', 'fra', 'deu', 'spa'], ARRAY['ita', 'por'], true),
('KE', ARRAY['swa', 'eng'], ARRAY['fra', 'ara'], false),
('IN', ARRAY['hin', 'eng'], ARRAY['ben', 'tam'], true),
('CN', ARRAY['cmn', 'eng'], ARRAY['kor', 'jpn'], true),
('RU', ARRAY['rus', 'eng'], ARRAY['deu', 'fra'], true)
ON CONFLICT (region_code) DO NOTHING;

-- Insert sample language pair capabilities
INSERT INTO language_pair_capabilities (source_language, target_language, provider, quality_score, latency_ms, cost_per_char, supports_speech) VALUES
('eng', 'spa', 'google', 0.95, 200, 0.0001, true),
('eng', 'fra', 'deepl', 0.97, 150, 0.0002, true),
('spa', 'eng', 'azure', 0.94, 180, 0.00015, true),
('fra', 'deu', 'google', 0.93, 220, 0.00012, false),
('hin', 'eng', 'aws', 0.88, 300, 0.00018, false)
ON CONFLICT (source_language, target_language, provider) DO NOTHING;
