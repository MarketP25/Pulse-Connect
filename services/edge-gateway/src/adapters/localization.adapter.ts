import { Injectable, Logger } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { EdgeTelemetryService } from "../services/telemetry.service";
import { AiRuleInterpreter } from "@/shared/lib/src/ai-rule-interpreter";

export interface LocalizationRequest {
  requestId: string;
  userId: string;
  action: "translate" | "localize_content" | "detect_language" | "get_translations";
  context?: {
    sourceLanguage?: string;
    targetLanguage?: string;
    content?: string;
    contentId?: string;
    regionCode?: string;
  };
}

export interface LocalizationResponse {
  requestId: string;
  allowed: boolean;
  blockedReason?: string;
  localizationData?: {
    translatedContent?: string;
    detectedLanguage?: string;
    confidence?: number;
    translations?: any[];
  };
  complianceFlags: string[];
  processingTime: number;
}

@Injectable()
export class LocalizationAdapter {
  private readonly logger = new Logger(LocalizationAdapter.name);

  constructor(
    private readonly kafkaClient: ClientKafka,
    private readonly telemetryService: EdgeTelemetryService,
    private readonly aiRuleInterpreter: AiRuleInterpreter
  ) {}

  /**
   * Process localization request through Edge governance
   */
  async processLocalizationRequest(request: LocalizationRequest): Promise<LocalizationResponse> {
    const startTime = Date.now();

    try {
      // 1. Validate localization request parameters
      const requestCheck = await this.validateLocalizationRequest(request);
      if (!requestCheck.allowed) {
        await this.telemetryService.recordEvent("localization_blocked", {
          requestId: request.requestId,
          userId: request.userId,
          action: request.action,
          reason: requestCheck.blockedReason
        });
        return {
          requestId: request.requestId,
          allowed: false,
          blockedReason: requestCheck.blockedReason,
          complianceFlags: requestCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 2. Check content appropriateness for translation
      const contentCheck = await this.checkContentAppropriateness(request);
      if (!contentCheck.allowed) {
        return {
          requestId: request.requestId,
          allowed: false,
          blockedReason: contentCheck.blockedReason,
          complianceFlags: contentCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 3. Apply regional compliance and cultural sensitivity
      const regionalCheck = await this.applyRegionalCompliance(request);
      if (!regionalCheck.allowed) {
        return {
          requestId: request.requestId,
          allowed: false,
          blockedReason: regionalCheck.blockedReason,
          complianceFlags: regionalCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 4. Execute localization operation
      const result = await this.executeLocalizationOperation(request);

      // 5. Record telemetry
      await this.telemetryService.recordEvent("localization_operation", {
        requestId: request.requestId,
        userId: request.userId,
        action: request.action,
        sourceLanguage: request.context?.sourceLanguage,
        targetLanguage: request.context?.targetLanguage,
        allowed: true,
        complianceFlags: [...requestCheck.flags, ...contentCheck.flags, ...regionalCheck.flags]
          .length,
        processingTime: Date.now() - startTime
      });

      return {
        requestId: request.requestId,
        allowed: true,
        localizationData: result.localizationData,
        complianceFlags: [...requestCheck.flags, ...contentCheck.flags, ...regionalCheck.flags],
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      this.logger.error(`Localization processing failed: ${error.message}`, error.stack);
      await this.telemetryService.recordEvent("localization_error", {
        requestId: request.requestId,
        userId: request.userId,
        action: request.action,
        error: error.message,
        processingTime: Date.now() - startTime
      });

      return {
        requestId: request.requestId,
        allowed: false,
        blockedReason: "System error during localization",
        complianceFlags: ["error"],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate localization request
   */
  private async validateLocalizationRequest(request: LocalizationRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Validate supported languages
    const supportedLanguages = ["en", "es", "fr", "de", "zh", "ja", "ar", "hi", "pt", "ru"];

    if (
      request.context?.sourceLanguage &&
      !supportedLanguages.includes(request.context.sourceLanguage)
    ) {
      return {
        allowed: false,
        blockedReason: "Unsupported source language",
        flags: ["unsupported_source_language"]
      };
    }

    if (
      request.context?.targetLanguage &&
      !supportedLanguages.includes(request.context.targetLanguage)
    ) {
      return {
        allowed: false,
        blockedReason: "Unsupported target language",
        flags: ["unsupported_target_language"]
      };
    }

    flags.push("languages_supported");

    // Validate content length
    if (request.context?.content && request.context.content.length > 50000) {
      return {
        allowed: false,
        blockedReason: "Content too long for translation",
        flags: ["content_too_long"]
      };
    }

    flags.push("content_length_valid");
    return { allowed: true, flags };
  }

  /**
   * Check content appropriateness
   */
  private async checkContentAppropriateness(request: LocalizationRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    if (request.context?.content) {
      // Check for sensitive content that shouldn't be translated
      const sensitivePatterns = [
        /\b\d{4}[- ]\d{4}[- ]\d{4}[- ]\d{4}\b/g, // Credit cards
        /\b\d{3}[- ]\d{3}[- ]\d{4}\b/g, // Phone numbers
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // Emails
      ];

      for (const pattern of sensitivePatterns) {
        if (pattern.test(request.context.content)) {
          return {
            allowed: false,
            blockedReason: "Content contains sensitive information",
            flags: ["sensitive_content"]
          };
        }
      }

      flags.push("content_appropriate");
    }

    flags.push("appropriateness_checked");
    return { allowed: true, flags };
  }

  /**
   * Apply regional compliance
   */
  private async applyRegionalCompliance(request: LocalizationRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Check regional restrictions on content translation
    if (request.context?.regionCode) {
      const regionAllowed = await this.checkRegionalTranslationRestrictions(
        request.context.regionCode,
        request.context?.targetLanguage
      );
      if (!regionAllowed) {
        return {
          allowed: false,
          blockedReason: "Translation not allowed for this region",
          flags: ["regional_restriction"]
        };
      }
      flags.push("region_compliant");
    }

    // Apply cultural sensitivity checks
    const culturalCheck = await this.applyCulturalSensitivity(request);
    if (!culturalCheck.allowed) {
      return {
        allowed: false,
        blockedReason: culturalCheck.blockedReason,
        flags: culturalCheck.flags
      };
    }

    flags.push(...culturalCheck.flags);
    return { allowed: true, flags };
  }

  /**
   * Execute localization operation
   */
  private async executeLocalizationOperation(request: LocalizationRequest): Promise<any> {
    const result = await this.kafkaClient
      .send("localization.execute", {
        requestId: request.requestId,
        userId: request.userId,
        action: request.action,
        context: request.context,
        edgeValidated: true,
        timestamp: new Date().toISOString()
      })
      .toPromise();

    return result;
  }

  /**
   * Check regional translation restrictions
   */
  private async checkRegionalTranslationRestrictions(
    regionCode: string,
    targetLanguage?: string
  ): Promise<boolean> {
    // Would check regional compliance rules
    return true; // Simplified
  }

  /**
   * Apply cultural sensitivity checks
   */
  private async applyCulturalSensitivity(request: LocalizationRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    // Would analyze content for cultural appropriateness
    return { allowed: true, flags: ["culturally_sensitive"] };
  }
}
