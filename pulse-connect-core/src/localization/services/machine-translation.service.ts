import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

export interface TranslationProvider {
  name: string;
  supportedLanguages: string[];
  textTranslation: boolean;
  speechTranslation: boolean;
  videoTranslation: boolean;
  priority: number; // Higher = preferred
  rateLimit: number; // Requests per minute
  costPerChar: number; // USD per character
}

export interface TextTranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  userId: number;
  regionCode?: string;
}

export interface VideoTranslationRequest {
  videoUrl: string;
  sourceLanguage: string;
  targetLanguage: string;
  userId: number;
  regionCode?: string;
}

export class MachineTranslationService {
  private providers: TranslationProvider[] = [
    {
      name: 'google',
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'hi', 'ar'],
      textTranslation: true,
      speechTranslation: true,
      videoTranslation: true,
      priority: 10,
      rateLimit: 1000,
      costPerChar: 0.0001
    },
    {
      name: 'azure',
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      textTranslation: true,
      speechTranslation: true,
      videoTranslation: false,
      priority: 8,
      rateLimit: 500,
      costPerChar: 0.00015
    },
    {
      name: 'aws',
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      textTranslation: true,
      speechTranslation: false,
      videoTranslation: false,
      priority: 6,
      rateLimit: 300,
      costPerChar: 0.00012
    }
  ];

  constructor(private pool: Pool) {}

  /**
   * Translate text content
   */
  async translateText(
    request: { content: string; sourceLanguage: string; targetLanguage: string; userId: number; regionCode?: string },
    regionInfo: any
  ): Promise<{ translatedContent: string; confidence: number; provider: string; cost: number }> {
    const { content, sourceLanguage, targetLanguage, userId, regionCode } = request;

    // Select best provider based on languages, region, and availability
    const provider = this.selectProvider(sourceLanguage, targetLanguage, regionInfo);

    if (!provider) {
      throw new Error(`No provider available for ${sourceLanguage} -> ${targetLanguage}`);
    }

    // Check rate limits (simplified)
    await this.checkRateLimit(provider.name, userId);

    // Perform translation (mock implementation)
    const translatedContent = await this.callProvider(provider, {
      text: content,
      sourceLanguage,
      targetLanguage
    });

    const confidence = this.calculateConfidence(translatedContent, content);
    const cost = content.length * provider.costPerChar;

    return {
      translatedContent,
      confidence,
      provider: provider.name,
      cost
    };
  }

  /**
   * Translate video content with subtitles
   */
  async translateVideo(
    request: VideoTranslationRequest,
    regionInfo: any
  ): Promise<{ translatedContent: string; confidence: number; provider: string; cost: number }> {
    // Extract audio from video, transcribe, translate, generate subtitles
    const { videoUrl, sourceLanguage, targetLanguage, userId, regionCode } = request;

    // Step 1: Extract audio and transcribe
    const transcription = await this.extractAudioAndTranscribe(videoUrl, sourceLanguage);

    // Step 2: Translate transcription
    const translation = await this.translateText({
      content: transcription.text,
      sourceLanguage,
      targetLanguage,
      userId,
      regionCode
    }, regionInfo);

    // Step 3: Generate subtitle file
    const subtitleContent = this.generateSubtitles(
      transcription.segments,
      translation.translatedContent,
      targetLanguage
    );

    return {
      translatedContent: subtitleContent,
      confidence: translation.confidence * 0.9, // Slightly lower for video
      provider: translation.provider,
      cost: translation.cost * 1.5 // Video processing costs more
    };
  }

  /**
   * Select best translation provider
   */
  private selectProvider(
    sourceLang: string,
    targetLang: string,
    regionInfo: any
  ): TranslationProvider | null {
    const candidates = this.providers.filter(p =>
      p.textTranslation &&
      p.supportedLanguages.includes(sourceLang) &&
      p.supportedLanguages.includes(targetLang)
    );

    if (candidates.length === 0) return null;

    // Sort by priority, preferring providers available in user's region
    candidates.sort((a, b) => {
      const aRegional = this.isProviderRegional(a, regionInfo);
      const bRegional = this.isProviderRegional(b, regionInfo);

      if (aRegional && !bRegional) return -1;
      if (!aRegional && bRegional) return 1;

      return b.priority - a.priority;
    });

    return candidates[0];
  }

  /**
   * Check if provider is available in region
   */
  private isProviderRegional(provider: TranslationProvider, regionInfo: any): boolean {
    // Simplified regional availability logic
    const regionalProviders = {
      'africa': ['google'],
      'us': ['google', 'azure', 'aws'],
      'eu': ['google', 'azure'],
      'asia': ['google', 'azure']
    };

    const continent = regionInfo?.continent?.toLowerCase();
    return regionalProviders[continent]?.includes(provider.name) || false;
  }

  /**
   * Check rate limits for user/provider combination
   */
  private async checkRateLimit(providerName: string, userId: number): Promise<void> {
    const minuteAgo = new Date(Date.now() - 60 * 1000);

    const result = await this.pool.query(`
      SELECT COUNT(*) as request_count
      FROM translation_events
      WHERE user_id = $1 AND provider = $2 AND created_at > $3
    `, [userId, providerName, minuteAgo]);

    const requestCount = parseInt(result.rows[0].request_count);
    const provider = this.providers.find(p => p.name === providerName);

    if (provider && requestCount >= provider.rateLimit) {
      throw new Error(`Rate limit exceeded for provider ${providerName}`);
    }
  }

  /**
   * Call external translation provider (mock implementation)
   */
  private async callProvider(
    provider: TranslationProvider,
    request: { text: string; sourceLanguage: string; targetLanguage: string }
  ): Promise<string> {
    // Mock translation - in real implementation, this would call actual APIs
    const { text, sourceLanguage, targetLanguage } = request;

    // Simple mock translations for demo
    if (sourceLanguage === 'en' && targetLanguage === 'es') {
      return text.replace(/\bhello\b/gi, 'hola')
                 .replace(/\bworld\b/gi, 'mundo')
                 .replace(/\bthank you\b/gi, 'gracias');
    }

    if (sourceLanguage === 'en' && targetLanguage === 'sw') {
      return text.replace(/\bhello\b/gi, 'habari')
                 .replace(/\bworld\b/gi, 'dunia')
                 .replace(/\bthank you\b/gi, 'asante');
    }

    // For other languages, return with [TRANSLATED] prefix
    return `[TRANSLATED to ${targetLanguage}] ${text}`;
  }

  /**
   * Calculate translation confidence score
   */
  private calculateConfidence(translatedText: string, originalText: string): number {
    // Simple confidence calculation based on length ratio and content
    const lengthRatio = translatedText.length / originalText.length;
    const isReasonableLength = lengthRatio > 0.5 && lengthRatio < 3.0;

    // Check for placeholder translations
    const hasTranslation = !translatedText.includes('[TRANSLATED');

    return isReasonableLength && hasTranslation ? 0.85 : 0.6;
  }

  /**
   * Extract audio from video and transcribe (mock)
   */
  private async extractAudioAndTranscribe(
    videoUrl: string,
    language: string
  ): Promise<{ text: string; segments: Array<{ start: number; end: number; text: string }> }> {
    // Mock transcription
    return {
      text: "This is a sample transcription from the video content.",
      segments: [
        { start: 0, end: 3, text: "This is a" },
        { start: 3, end: 6, text: "sample transcription" },
        { start: 6, end: 9, text: "from the video content." }
      ]
    };
  }

  /**
   * Generate subtitle file content
   */
  private generateSubtitles(
    segments: Array<{ start: number; end: number; text: string }>,
    translatedText: string,
    targetLanguage: string
  ): string {
    // Generate WebVTT subtitle format
    let vtt = 'WEBVTT\n\n';
    const translatedSegments = this.splitTranslationIntoSegments(translatedText, segments.length);

    segments.forEach((segment, index) => {
      const startTime = this.formatTime(segment.start);
      const endTime = this.formatTime(segment.end);
      const translatedSegment = translatedSegments[index] || '';

      vtt += `${index + 1}\n`;
      vtt += `${startTime} --> ${endTime}\n`;
      vtt += `${translatedSegment}\n\n`;
    });

    return vtt;
  }

  /**
   * Split translated text into segments matching original timing
   */
  private splitTranslationIntoSegments(text: string, numSegments: number): string[] {
    const words = text.split(' ');
    const wordsPerSegment = Math.ceil(words.length / numSegments);
    const segments: string[] = [];

    for (let i = 0; i < words.length; i += wordsPerSegment) {
      segments.push(words.slice(i, i + wordsPerSegment).join(' '));
    }

    return segments;
  }

  /**
   * Format time for subtitles (HH:MM:SS.mmm)
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Get supported language pairs
   */
  async getSupportedLanguagePairs(): Promise<Array<{ from: string; to: string; providers: string[] }>> {
    const pairs: Array<{ from: string; to: string; providers: string[] }> = [];

    // Generate all possible pairs from supported languages
    const allLanguages = [...new Set(this.providers.flatMap(p => p.supportedLanguages))];

    for (const from of allLanguages) {
      for (const to of allLanguages) {
        if (from !== to) {
          const providers = this.providers
            .filter(p => p.supportedLanguages.includes(from) && p.supportedLanguages.includes(to))
            .map(p => p.name);

          if (providers.length > 0) {
            pairs.push({ from, to, providers });
          }
        }
      }
    }

    return pairs;
  }
}
