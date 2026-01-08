import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

export interface ASRProvider {
  name: string;
  supportedLanguages: string[];
  realTime: boolean;
  priority: number;
  costPerMinute: number; // USD per minute
  accuracy: number; // Expected accuracy score
}

export interface TTSProvider {
  name: string;
  supportedLanguages: string[];
  voices: Array<{ code: string; name: string; gender: 'male' | 'female' | 'neutral' }>;
  priority: number;
  costPerMinute: number; // USD per minute
  quality: number; // Voice quality score
}

export interface SpeechTranslationRequest {
  audioData: Buffer | string; // Base64 encoded audio or URL
  sourceLanguage: string;
  targetLanguage: string;
  userId: number;
  realTime: boolean;
  voiceGender?: 'male' | 'female' | 'neutral';
  voiceSpeed?: number;
  regionCode?: string;
}

export interface SpeechTranslationResult {
  transcribedText: string;
  translatedText: string;
  translatedAudioUrl?: string;
  confidence: number;
  asrProvider: string;
  ttsProvider?: string;
  totalCost: number;
  processingTime: number;
}

export class SpeechTranslationService {
  private asrProviders: ASRProvider[] = [
    {
      name: 'google-speech',
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'hi', 'ar', 'sw'],
      realTime: true,
      priority: 10,
      costPerMinute: 0.024,
      accuracy: 0.95
    },
    {
      name: 'azure-speech',
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar'],
      realTime: true,
      priority: 9,
      costPerMinute: 0.016,
      accuracy: 0.92
    },
    {
      name: 'aws-transcribe',
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      realTime: true,
      priority: 8,
      costPerMinute: 0.024,
      accuracy: 0.90
    }
  ];

  private ttsProviders: TTSProvider[] = [
    {
      name: 'google-tts',
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'hi', 'ar', 'sw'],
      voices: [
        { code: 'en-US-Neural2-D', name: 'English US Male', gender: 'male' },
        { code: 'en-US-Neural2-F', name: 'English US Female', gender: 'female' },
        { code: 'es-ES-Neural2-A', name: 'Spanish Male', gender: 'male' },
        { code: 'es-ES-Neural2-B', name: 'Spanish Female', gender: 'female' },
        { code: 'fr-FR-Neural2-A', name: 'French Male', gender: 'male' },
        { code: 'fr-FR-Neural2-E', name: 'French Female', gender: 'female' }
      ],
      priority: 10,
      costPerMinute: 0.000014,
      quality: 0.95
    },
    {
      name: 'azure-tts',
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar'],
      voices: [
        { code: 'en-US-ZiraRUS', name: 'English US Female', gender: 'female' },
        { code: 'en-US-BenjaminRUS', name: 'English US Male', gender: 'male' },
        { code: 'es-ES-HelenaRUS', name: 'Spanish Female', gender: 'female' },
        { code: 'es-ES-PabloRUS', name: 'Spanish Male', gender: 'male' }
      ],
      priority: 9,
      costPerMinute: 0.000016,
      quality: 0.92
    }
  ];

  constructor(private pool: Pool) {}

  /**
   * Translate speech from source language to target language
   */
  async translateSpeech(
    request: SpeechTranslationRequest,
    regionInfo: any
  ): Promise<SpeechTranslationResult> {
    const startTime = Date.now();
    const { audioData, sourceLanguage, targetLanguage, userId, realTime, voiceGender = 'neutral', voiceSpeed = 1.0, regionCode } = request;

    // Step 1: Speech-to-Text (ASR)
    const asrResult = await this.performASR(audioData, sourceLanguage, realTime, regionInfo);
    const transcribedText = asrResult.text;

    // Step 2: Text Translation (delegate to machine translation service)
    // This would normally call the machine translation service
    const translatedText = await this.translateText(transcribedText, sourceLanguage, targetLanguage, regionInfo);

    // Step 3: Text-to-Speech (TTS) if audio output requested
    let translatedAudioUrl: string | undefined;
    let ttsProvider: string | undefined;
    let ttsCost = 0;

    if (request.audioData) { // If audio input, assume audio output wanted
      const ttsResult = await this.performTTS(translatedText, targetLanguage, voiceGender, voiceSpeed, regionInfo);
      translatedAudioUrl = ttsResult.audioUrl;
      ttsProvider = ttsResult.provider;
      ttsCost = ttsResult.cost;
    }

    const totalCost = asrResult.cost + ttsCost; // Translation cost handled separately
    const processingTime = Date.now() - startTime;

    // Log speech session
    await this.logSpeechSession({
      userId,
      sessionType: 'translation',
      sourceLanguage,
      targetLanguage,
      audioDurationSeconds: asrResult.duration,
      inputText: transcribedText,
      outputText: translatedText,
      voiceGender,
      voiceSpeed,
      regionCode,
      cost: totalCost,
      traceId: uuidv4()
    });

    return {
      transcribedText,
      translatedText,
      translatedAudioUrl,
      confidence: asrResult.confidence,
      asrProvider: asrResult.provider,
      ttsProvider,
      totalCost,
      processingTime
    };
  }

  /**
   * Perform Automatic Speech Recognition
   */
  private async performASR(
    audioData: Buffer | string,
    language: string,
    realTime: boolean,
    regionInfo: any
  ): Promise<{ text: string; confidence: number; provider: string; cost: number; duration: number }> {
    const provider = this.selectASRProvider(language, realTime, regionInfo);

    if (!provider) {
      throw new Error(`No ASR provider available for ${language}`);
    }

    // Estimate audio duration (rough calculation)
    const durationSeconds = this.estimateAudioDuration(audioData);

    // Mock ASR result - in real implementation, this would call the provider API
    const mockResults: { [key: string]: string } = {
      'en': 'Hello, this is a test transcription in English.',
      'es': 'Hola, esta es una transcripción de prueba en español.',
      'sw': 'Habari, hii ni transcription ya majaribio kwa Kiswahili.',
      'fr': 'Bonjour, ceci est une transcription de test en français.'
    };

    const transcribedText = mockResults[language] || `[TRANSCRIBED from ${language}] ${audioData.toString().substring(0, 100)}`;
    const confidence = provider.accuracy;
    const cost = (durationSeconds / 60) * provider.costPerMinute;

    return {
      text: transcribedText,
      confidence,
      provider: provider.name,
      cost,
      duration: durationSeconds
    };
  }

  /**
   * Perform Text-to-Speech
   */
  private async performTTS(
    text: string,
    language: string,
    voiceGender: string,
    voiceSpeed: number,
    regionInfo: any
  ): Promise<{ audioUrl: string; provider: string; cost: number }> {
    const provider = this.selectTTSProvider(language, regionInfo);

    if (!provider) {
      throw new Error(`No TTS provider available for ${language}`);
    }

    // Select appropriate voice
    const voice = this.selectVoice(provider, language, voiceGender);
    if (!voice) {
      throw new Error(`No suitable voice found for ${language} ${voiceGender}`);
    }

    // Estimate audio duration (rough calculation based on word count)
    const wordCount = text.split(/\s+/).length;
    const wordsPerMinute = 150; // Average speaking rate
    const durationMinutes = wordCount / wordsPerMinute / voiceSpeed; // Adjust for speed

    // Mock TTS result - in real implementation, this would call the provider API
    const audioId = uuidv4();
    const audioUrl = `https://cdn.pulsco.com/tts/${audioId}.mp3`;
    const cost = durationMinutes * provider.costPerMinute;

    return {
      audioUrl,
      provider: provider.name,
      cost
    };
  }

  /**
   * Translate text (mock implementation - would delegate to machine translation service)
   */
  private async translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    regionInfo: any
  ): Promise<string> {
    // Mock translations for testing
    if (sourceLanguage === 'en' && targetLanguage === 'es') {
      return text.replace(/\bhello\b/gi, 'hola')
                 .replace(/\bworld\b/gi, 'mundo')
                 .replace(/\btest\b/gi, 'prueba');
    }

    if (sourceLanguage === 'en' && targetLanguage === 'sw') {
      return text.replace(/\bhello\b/gi, 'habari')
                 .replace(/\bworld\b/gi, 'dunia')
                 .replace(/\btest\b/gi, 'mtihani');
    }

    // For other languages, return with translation marker
    return `[TRANSLATED ${sourceLanguage}→${targetLanguage}] ${text}`;
  }

  /**
   * Select best ASR provider
   */
  private selectASRProvider(language: string, realTime: boolean, regionInfo: any): ASRProvider | null {
    const candidates = this.asrProviders.filter(p =>
      p.supportedLanguages.includes(language) &&
      (!realTime || p.realTime)
    );

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      const aRegional = this.isProviderRegional(a.name, regionInfo);
      const bRegional = this.isProviderRegional(b.name, regionInfo);

      if (aRegional && !bRegional) return -1;
      if (!aRegional && bRegional) return 1;

      return b.priority - a.priority;
    });

    return candidates[0];
  }

  /**
   * Select best TTS provider
   */
  private selectTTSProvider(language: string, regionInfo: any): TTSProvider | null {
    const candidates = this.ttsProviders.filter(p =>
      p.supportedLanguages.includes(language)
    );

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      const aRegional = this.isProviderRegional(a.name, regionInfo);
      const bRegional = this.isProviderRegional(b.name, regionInfo);

      if (aRegional && !bRegional) return -1;
      if (!aRegional && bRegional) return 1;

      return b.priority - a.priority;
    });

    return candidates[0];
  }

  /**
   * Select appropriate voice for TTS
   */
  private selectVoice(provider: TTSProvider, language: string, preferredGender: string): { code: string; name: string; gender: string } | null {
    const languageVoices = provider.voices.filter(v => v.code.startsWith(language));

    if (languageVoices.length === 0) return null;

    // Try to match preferred gender
    const genderMatch = languageVoices.find(v => v.gender === preferredGender);
    if (genderMatch) return genderMatch;

    // Fallback to any voice for the language
    return languageVoices[0];
  }

  /**
   * Check if provider is regionally available
   */
  private isProviderRegional(providerName: string, regionInfo: any): boolean {
    const regionalProviders = {
      'us': ['google-speech', 'azure-speech', 'google-tts', 'azure-tts'],
      'eu': ['google-speech', 'azure-speech', 'google-tts', 'azure-tts'],
      'africa': ['google-speech', 'google-tts'],
      'asia': ['google-speech', 'azure-speech', 'google-tts', 'aws-transcribe']
    };

    const continent = regionInfo?.continent?.toLowerCase();
    return regionalProviders[continent]?.includes(providerName) || false;
  }

  /**
   * Estimate audio duration from data size
   */
  private estimateAudioDuration(audioData: Buffer | string): number {
    // Rough estimation: assume 16kHz, 16-bit, mono
    const bytesPerSecond = 16000 * 2; // 16kHz * 16-bit
    const dataSize = typeof audioData === 'string' ? audioData.length : audioData.length;
    return dataSize / bytesPerSecond;
  }

  /**
   * Log speech session
   */
  private async logSpeechSession(sessionData: {
    userId: number;
    sessionType: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    audioDurationSeconds: number;
    inputText?: string;
    outputText?: string;
    voiceGender?: string;
    voiceSpeed?: number;
    regionCode?: string;
    cost: number;
    traceId: string;
  }): Promise<void> {
    await this.pool.query(`
      INSERT INTO speech_sessions (
        user_id, session_type, source_language, target_language,
        audio_duration_seconds, input_text, output_text,
        voice_gender, voice_speed, region_code, policy_version,
        trace_id, reason_code, cost_usd, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
    `, [
      sessionData.userId,
      sessionData.sessionType,
      sessionData.sourceLanguage,
      sessionData.targetLanguage,
      sessionData.audioDurationSeconds,
      sessionData.inputText,
      sessionData.outputText,
      sessionData.voiceGender,
      sessionData.voiceSpeed,
      sessionData.regionCode,
      'v1.0.0',
      sessionData.traceId,
      'speech_translation',
      sessionData.cost
    ]);
  }

  /**
   * Get supported speech languages
   */
  async getSupportedSpeechLanguages(): Promise<Array<{
    language: string;
    asr: boolean;
    tts: boolean;
    realTime: boolean;
  }>> {
    const languages = new Set([
      ...this.asrProviders.flatMap(p => p.supportedLanguages),
      ...this.ttsProviders.flatMap(p => p.supportedLanguages)
    ]);

    return Array.from(languages).map(language => ({
      language,
      asr: this.asrProviders.some(p => p.supportedLanguages.includes(language)),
      tts: this.ttsProviders.some(p => p.supportedLanguages.includes(language)),
      realTime: this.asrProviders.some(p => p.supportedLanguages.includes(language) && p.realTime)
    }));
  }

  /**
   * Get available voices for a language
   */
  async getAvailableVoices(language: string): Promise<Array<{
    provider: string;
    code: string;
    name: string;
    gender: string;
    quality: number;
  }>> {
    const voices: Array<{
      provider: string;
      code: string;
      name: string;
      gender: string;
      quality: number;
    }> = [];

    for (const provider of this.ttsProviders) {
      if (provider.supportedLanguages.includes(language)) {
        const languageVoices = provider.voices.filter(v => v.code.startsWith(language));
        voices.push(...languageVoices.map(v => ({
          provider: provider.name,
          code: v.code,
          name: v.name,
          gender: v.gender,
          quality: provider.quality
        })));
      }
    }

    return voices;
  }
}
