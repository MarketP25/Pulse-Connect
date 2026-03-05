import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreferences } from '../entities/user-preferences.entity';
import { LocalizationStrings } from '../entities/localization-strings.entity';
import { TranslationEvents } from '../entities/translation-events.entity';
import { MachineTranslationService } from './machine-translation.service';
import { SpeechTranslationService } from './speech-translation.service';
import { SignLanguageService } from './sign-language.service';
import { GeoRouterService } from './geo-router.service';
import { WalletFeesService } from './wallet-fees.service';
import { emitLocalizationEvent } from '../../csi/instrumentation';

export interface TranslationRequest {
  userId: string;
  sourceLanguage: string;
  targetLanguage: string;
  content: string;
  contentType: 'text' | 'speech' | 'video' | 'sign';
  quality?: 'fast' | 'standard' | 'premium';
  context?: {
    domain?: string;
    urgency?: 'low' | 'normal' | 'high';
    audience?: string;
  };
}

export interface TranslationResponse {
  translatedContent: string;
  sourceLanguage: string;
  targetLanguage: string;
  quality: {
    score: number;
    confidence: number;
  };
  metadata: {
    processingTime: number;
    cost: number;
    provider: string;
    model: string;
  };
  traceId: string;
}

export interface LocalizationContext {
  userId: string;
  language: string;
  region?: string;
  signLanguage?: string;
  preferences: {
    autoTranslate: boolean;
    showOriginal: boolean;
    quality: string;
  };
}

@Injectable()
export class LocalizationEngineService {
  private readonly logger = new Logger(LocalizationEngineService.name);

  constructor(
    @InjectRepository(UserPreferences)
    private readonly userPreferencesRepository: Repository<UserPreferences>,
    @InjectRepository(LocalizationStrings)
    private readonly localizationStringsRepository: Repository<LocalizationStrings>,
    @InjectRepository(TranslationEvents)
    private readonly translationEventsRepository: Repository<TranslationEvents>,
    private readonly machineTranslationService: MachineTranslationService,
    private readonly speechTranslationService: SpeechTranslationService,
    private readonly signLanguageService: SignLanguageService,
    private readonly geoRouterService: GeoRouterService,
    private readonly walletFeesService: WalletFeesService,
  ) {}

  /**
   * Main translation orchestration method
   */
  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    const startTime = Date.now();
    const traceId = this.generateTraceId();

    try {
      this.logger.log(`Starting translation request: ${traceId}`, {
        userId: request.userId,
        source: request.sourceLanguage,
        target: request.targetLanguage,
        type: request.contentType,
      });

      // 1. Get user preferences and context
      const context = await this.getLocalizationContext(request.userId);

      // 2. Route to appropriate service based on content type
      let translationResult: TranslationResponse;

      switch (request.contentType) {
        case 'text':
          translationResult = await this.handleTextTranslation(request, context, traceId);
          break;
        case 'speech':
          translationResult = await this.handleSpeechTranslation(request, context, traceId);
          break;
        case 'video':
          translationResult = await this.handleVideoTranslation(request, context, traceId);
          break;
        case 'sign':
          translationResult = await this.handleSignTranslation(request, context, traceId);
          break;
        default:
          throw new Error(`Unsupported content type: ${request.contentType}`);
      }

      // 3. Calculate final processing time and cost
      const processingTime = Date.now() - startTime;
      const finalCost = await this.walletFeesService.calculateCost({
        userId: request.userId,
        contentType: request.contentType,
        processingTime,
        contentLength: request.content.length,
        quality: request.quality || 'standard',
      });

      // 4. Log translation event for audit and analytics
      await this.logTranslationEvent({
        traceId,
        userId: request.userId,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        contentType: request.contentType,
        processingTime,
        cost: finalCost,
        quality: translationResult.quality,
        provider: translationResult.metadata.provider,
        model: translationResult.metadata.model,
      });

      // 5. Update wallet balance
      await this.walletFeesService.deductCredits(request.userId, finalCost, traceId);

      emitLocalizationEvent(
        'translation.completed',
        context.region || 'GLOBAL',
        {
          traceId,
          userId: request.userId,
          sourceLanguage: request.sourceLanguage,
          targetLanguage: request.targetLanguage,
          contentType: request.contentType,
          processingTimeMs: processingTime,
          costUsd: finalCost,
          provider: translationResult.metadata.provider,
        },
        {
          riskScore: 18,
          performanceScore: translationResult.quality.score,
        },
      );

      return {
        ...translationResult,
        metadata: {
          ...translationResult.metadata,
          processingTime,
          cost: finalCost,
        },
        traceId,
      };

    } catch (error) {
      this.logger.error(`Translation failed: ${traceId}`, error);

      emitLocalizationEvent(
        'translation.failed',
        request.targetLanguage.toUpperCase(),
        {
          traceId,
          userId: request.userId,
          sourceLanguage: request.sourceLanguage,
          targetLanguage: request.targetLanguage,
          contentType: request.contentType,
          reason: error instanceof Error ? error.message : 'unknown_error',
        },
        {
          riskScore: 74,
          performanceScore: 28,
        },
      );

      // Log failed translation event
      await this.logTranslationEvent({
        traceId,
        userId: request.userId,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        contentType: request.contentType,
        processingTime: Date.now() - startTime,
        cost: 0,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Get localized UI strings for a user
   */
  async getLocalizedStrings(
    userId: string,
    namespace: string = 'ui',
    language?: string,
  ): Promise<Record<string, string>> {
    const context = await this.getLocalizationContext(userId);
    const targetLanguage = language || context.language;

    const strings = await this.localizationStringsRepository.find({
      where: {
        languageCode: targetLanguage,
        namespace,
        isApproved: true,
      },
    });

    return strings.reduce((acc, str) => {
      acc[str.key] = str.value;
      return acc;
    }, {} as Record<string, string>);
  }

  /**
   * Update user localization preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    let userPrefs = await this.userPreferencesRepository.findOne({
      where: { userId },
    });

    if (!userPrefs) {
      userPrefs = this.userPreferencesRepository.create({
        userId,
        preferredLanguage: 'en',
        fallbackLanguage: 'en',
        autoTranslate: true,
        showOriginal: false,
        ...preferences,
      });
    } else {
      Object.assign(userPrefs, preferences);
      userPrefs.updatedAt = new Date();
    }

    return await this.userPreferencesRepository.save(userPrefs);
  }

  /**
   * Get real-time translation statistics
   */
  async getTranslationStats(timeRange: { start: Date; end: Date }) {
    const events = await this.translationEventsRepository.find({
      where: {
        createdAt: Between(timeRange.start, timeRange.end),
      },
    });

    const stats = {
      totalTranslations: events.length,
      averageLatency: events.reduce((sum, e) => sum + e.latencyMs, 0) / events.length || 0,
      totalCost: events.reduce((sum, e) => sum + parseFloat(e.costUsd.toString()), 0),
      translationsByType: {} as Record<string, number>,
      translationsByLanguage: {} as Record<string, number>,
      errorRate: events.filter(e => e.errorCode).length / events.length,
    };

    // Group by type and language
    events.forEach(event => {
      stats.translationsByType[event.translationType] =
        (stats.translationsByType[event.translationType] || 0) + 1;

      stats.translationsByLanguage[event.targetLanguage] =
        (stats.translationsByLanguage[event.targetLanguage] || 0) + 1;
    });

    return stats;
  }

  // Private helper methods

  private async getLocalizationContext(userId: string): Promise<LocalizationContext> {
    const prefs = await this.userPreferencesRepository.findOne({
      where: { userId },
    });

    return {
      userId,
      language: prefs?.preferredLanguage || 'en',
      region: prefs?.regionCode,
      signLanguage: prefs?.signLanguageType,
      preferences: {
        autoTranslate: prefs?.autoTranslate ?? true,
        showOriginal: prefs?.showOriginal ?? false,
        quality: prefs?.translationQuality || 'standard',
      },
    };
  }

  private async handleTextTranslation(
    request: TranslationRequest,
    context: LocalizationContext,
    traceId: string,
  ): Promise<TranslationResponse> {
    // Route to optimal region for this language pair
    const region = await this.geoRouterService.getOptimalRegion(
      request.sourceLanguage,
      request.targetLanguage,
    );

    // Perform machine translation
    const result = await this.machineTranslationService.translate({
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      text: request.content,
      quality: request.quality || context.preferences.quality as any,
      region,
    });

    return {
      translatedContent: result.translatedText,
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      quality: result.quality,
      metadata: {
        processingTime: result.processingTime,
        cost: result.cost,
        provider: result.provider,
        model: result.model,
      },
      traceId,
    };
  }

  private async handleSpeechTranslation(
    request: TranslationRequest,
    context: LocalizationContext,
    traceId: string,
  ): Promise<TranslationResponse> {
    // This would handle ASR -> Translation -> TTS pipeline
    const result = await this.speechTranslationService.translateSpeech({
      audioData: request.content, // Base64 encoded audio
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      voicePreferences: {
        gender: context.preferences.voiceGender,
        speed: context.preferences.voiceSpeed,
      },
    });

    return {
      translatedContent: result.translatedAudioUrl, // URL to generated audio
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      quality: result.quality,
      metadata: {
        processingTime: result.processingTime,
        cost: result.cost,
        provider: result.provider,
        model: result.model,
      },
      traceId,
    };
  }

  private async handleVideoTranslation(
    request: TranslationRequest,
    context: LocalizationContext,
    traceId: string,
  ): Promise<TranslationResponse> {
    // Handle video with speech translation and subtitles
    const result = await this.speechTranslationService.translateVideo({
      videoData: request.content, // Video file/stream
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      includeSubtitles: true,
      includeVoiceover: true,
    });

    return {
      translatedContent: result.translatedVideoUrl,
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      quality: result.quality,
      metadata: {
        processingTime: result.processingTime,
        cost: result.cost,
        provider: result.provider,
        model: result.model,
      },
      traceId,
    };
  }

  private async handleSignTranslation(
    request: TranslationRequest,
    context: LocalizationContext,
    traceId: string,
  ): Promise<TranslationResponse> {
    const result = await this.signLanguageService.translateSign({
      gestureData: request.content, // Gesture tracking data
      sourceSignLanguage: context.signLanguage || 'asl',
      targetLanguage: request.targetLanguage,
      outputType: 'text', // Could also be 'voice' or 'avatar'
    });

    return {
      translatedContent: result.translatedText,
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      quality: result.quality,
      metadata: {
        processingTime: result.processingTime,
        cost: result.cost,
        provider: result.provider,
        model: result.model,
      },
      traceId,
    };
  }

  private async logTranslationEvent(eventData: {
    traceId: string;
    userId: string;
    sourceLanguage: string;
    targetLanguage: string;
    contentType: string;
    processingTime: number;
    cost: number;
    quality?: { score: number; confidence: number };
    provider?: string;
    model?: string;
    error?: string;
  }) {
    const event = this.translationEventsRepository.create({
      traceId: eventData.traceId,
      userId: parseInt(eventData.userId),
      sourceLanguage: eventData.sourceLanguage,
      targetLanguage: eventData.targetLanguage,
      translationType: eventData.contentType,
      latencyMs: eventData.processingTime,
      costUsd: eventData.cost,
      accuracyScore: eventData.quality?.score,
      provider: eventData.provider,
      modelVersion: eventData.model,
      errorCode: eventData.error ? 'TRANSLATION_ERROR' : null,
      metadata: eventData.quality ? { quality: eventData.quality } : {},
    });

    await this.translationEventsRepository.save(event);
  }

  private generateTraceId(): string {
    return `translation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
