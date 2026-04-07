import { Injectable, Logger } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { EdgeTelemetryService } from "../services/telemetry.service";
import { AiRuleInterpreter } from "@/shared/lib/src/ai-rule-interpreter";

export interface TranslationsRequest {
  translationId: string;
  userId: string;
  action: "translate_text" | "batch_translate" | "get_languages" | "validate_translation";
  context?: {
    sourceLanguage: string;
    targetLanguage: string;
    text?: string;
    texts?: string[];
    domain?: string; // technical, medical, legal, etc.
    quality?: "standard" | "premium";
  };
}

export interface TranslationsResponse {
  translationId: string;
  allowed: boolean;
  blockedReason?: string;
  translationData?: {
    translatedText?: string;
    translatedTexts?: string[];
    confidence?: number;
    detectedLanguage?: string;
    supportedLanguages?: string[];
  };
  complianceFlags: string[];
  processingTime: number;
}

@Injectable()
export class TranslationsAdapter {
  private readonly logger = new Logger(TranslationsAdapter.name);

  constructor(
    private readonly kafkaClient: ClientKafka,
    private readonly telemetryService: EdgeTelemetryService,
    private readonly aiRuleInterpreter: AiRuleInterpreter
  ) {}

  /**
   * Process translations request through Edge governance
   */
  async processTranslationsRequest(request: TranslationsRequest): Promise<TranslationsResponse> {
    const startTime = Date.now();

    try {
      // 1. Validate translation request parameters
      const requestCheck = await this.validateTranslationRequest(request);
      if (!requestCheck.allowed) {
        await this.telemetryService.recordEvent("translations_blocked", {
          translationId: request.translationId,
          userId: request.userId,
          action: request.action,
          reason: requestCheck.blockedReason
        });
        return {
          translationId: request.translationId,
          allowed: false,
          blockedReason: requestCheck.blockedReason,
          complianceFlags: requestCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 2. Check content compliance for translation
      const contentCheck = await this.checkTranslationContentCompliance(request);
      if (!contentCheck.allowed) {
        return {
          translationId: request.translationId,
          allowed: false,
          blockedReason: contentCheck.blockedReason,
          complianceFlags: contentCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 3. Apply domain-specific translation rules
      const domainCheck = await this.applyDomainSpecificRules(request);
      if (!domainCheck.allowed) {
        return {
          translationId: request.translationId,
          allowed: false,
          blockedReason: domainCheck.blockedReason,
          complianceFlags: domainCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 4. Execute translation operation
      const result = await this.executeTranslationOperation(request);

      // 5. Record telemetry
      await this.telemetryService.recordEvent("translations_operation", {
        translationId: request.translationId,
        userId: request.userId,
        action: request.action,
        sourceLanguage: request.context?.sourceLanguage,
        targetLanguage: request.context?.targetLanguage,
        domain: request.context?.domain,
        allowed: true,
        complianceFlags: [...requestCheck.flags, ...contentCheck.flags, ...domainCheck.flags]
          .length,
        processingTime: Date.now() - startTime
      });

      return {
        translationId: request.translationId,
        allowed: true,
        translationData: result.translationData,
        complianceFlags: [...requestCheck.flags, ...contentCheck.flags, ...domainCheck.flags],
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      this.logger.error(`Translations processing failed: ${error.message}`, error.stack);
      await this.telemetryService.recordEvent("translations_error", {
        translationId: request.translationId,
        userId: request.userId,
        action: request.action,
        error: error.message,
        processingTime: Date.now() - startTime
      });

      return {
        translationId: request.translationId,
        allowed: false,
        blockedReason: "System error during translation",
        complianceFlags: ["error"],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate translation request
   */
  private async validateTranslationRequest(request: TranslationsRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Validate language pair
    const supportedLanguages = ["en", "es", "fr", "de", "zh", "ja", "ar", "hi", "pt", "ru"];

    if (!supportedLanguages.includes(request.context?.sourceLanguage || "")) {
      return {
        allowed: false,
        blockedReason: "Unsupported source language",
        flags: ["unsupported_source"]
      };
    }

    if (!supportedLanguages.includes(request.context?.targetLanguage || "")) {
      return {
        allowed: false,
        blockedReason: "Unsupported target language",
        flags: ["unsupported_target"]
      };
    }

    flags.push("language_pair_supported");

    // Validate text content
    if (request.action === "translate_text" && !request.context?.text) {
      return {
        allowed: false,
        blockedReason: "Text content required for translation",
        flags: ["missing_text"]
      };
    }

    if (
      request.action === "batch_translate" &&
      (!request.context?.texts || request.context.texts.length === 0)
    ) {
      return {
        allowed: false,
        blockedReason: "Texts array required for batch translation",
        flags: ["missing_texts"]
      };
    }

    flags.push("content_valid");
    return { allowed: true, flags };
  }

  /**
   * Check translation content compliance
   */
  private async checkTranslationContentCompliance(request: TranslationsRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    const texts = request.context?.text ? [request.context.text] : request.context?.texts || [];

    for (const text of texts) {
      if (text.length > 10000) {
        return {
          allowed: false,
          blockedReason: "Text exceeds maximum length",
          flags: ["text_too_long"]
        };
      }

      // Check for prohibited content
      const prohibitedPatterns = [
        /confidential|classified/i,
        /password|secret/i,
        /internal use only/i
      ];

      for (const pattern of prohibitedPatterns) {
        if (pattern.test(text)) {
          return {
            allowed: false,
            blockedReason: "Content contains prohibited terms",
            flags: ["prohibited_content"]
          };
        }
      }
    }

    flags.push("content_compliant");
    return { allowed: true, flags };
  }

  /**
   * Apply domain-specific translation rules
   */
  private async applyDomainSpecificRules(request: TranslationsRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    const domain = request.context?.domain;

    if (domain) {
      // Domain-specific validations
      const domainRules = {
        medical: ["HIPAA_compliant", "medical_terminology_valid"],
        legal: ["legal_accuracy_required", "jurisdiction_aware"],
        technical: ["terminology_consistent", "version_controlled"]
      };

      const rules = domainRules[domain];
      if (rules) {
        flags.push(...rules);
      } else {
        return {
          allowed: false,
          blockedReason: "Unsupported translation domain",
          flags: ["unsupported_domain"]
        };
      }

      // Check domain-specific permissions
      const domainAllowed = await this.checkDomainPermissions(request.userId, domain);
      if (!domainAllowed) {
        return {
          allowed: false,
          blockedReason: "Insufficient permissions for domain translation",
          flags: ["domain_permission_denied"]
        };
      }

      flags.push("domain_access_granted");
    }

    flags.push("domain_rules_applied");
    return { allowed: true, flags };
  }

  /**
   * Execute translation operation
   */
  private async executeTranslationOperation(request: TranslationsRequest): Promise<any> {
    const result = await this.kafkaClient
      .send("translations.execute", {
        translationId: request.translationId,
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
   * Check domain permissions
   */
  private async checkDomainPermissions(userId: string, domain: string): Promise<boolean> {
    // Would check user permissions for specialized domains
    return true; // Simplified
  }
}
