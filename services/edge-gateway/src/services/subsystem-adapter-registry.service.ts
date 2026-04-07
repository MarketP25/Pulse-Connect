import { Injectable, Logger, Inject } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import {
  SubsystemAdapter,
  AdapterResult,
  AdapterContext
} from "../adapters/subsystem-adapter.interface";
import { ExecuteRequestDto } from "../dto/execute-request.dto";

// Import all adapters
import { EcommerceAdapter } from "../adapters/ecommerce.adapter";
import { ChatbotAdapter } from "../adapters/chatbot.adapter";
import { PlacesAdapter } from "../adapters/places.adapter";
import { MatchmakingAdapter } from "../adapters/matchmaking.adapter";
import { PaymentsAdapter } from "../adapters/payments.adapter";
import { FraudAdapter } from "../adapters/fraud.adapter";
import { ProximityGeocodingAdapter } from "../adapters/proximity-geocoding.adapter";
import { CommunicationAdapter } from "../adapters/communication.adapter";
import { MarketingAdapter } from "../adapters/marketing.adapter";
import { AiProgramsAdapter } from "../adapters/ai-programs.adapter";
import { LocalizationAdapter } from "../adapters/localization.adapter";
import { TranslationsAdapter } from "../adapters/translations.adapter";
import { BillingAdapter } from "../adapters/billing.adapter";

export interface AdapterRegistration {
  subsystem: string;
  adapter: SubsystemAdapter;
  version: string;
  capabilities: string[];
  healthCheck: () => Promise<boolean>;
}

@Injectable()
export class SubsystemAdapterRegistryService {
  private readonly logger = new Logger(SubsystemAdapterRegistryService.name);
  private readonly adapters = new Map<string, AdapterRegistration>();

  constructor(private readonly moduleRef: ModuleRef) {
    this.initializeAdapters();
  }

  /**
   * Initialize and register all subsystem adapters
   */
  private async initializeAdapters() {
    try {
      this.logger.log("Initializing subsystem adapter registry...");

      // Register core adapters
      await this.registerAdapter("ecommerce", EcommerceAdapter);
      await this.registerAdapter("chatbot", ChatbotAdapter);
      await this.registerAdapter("places", PlacesAdapter);
      await this.registerAdapter("matchmaking", MatchmakingAdapter);

      // Register additional adapters
      await this.registerAdapter("payments", PaymentsAdapter);
      await this.registerAdapter("fraud", FraudAdapter);
      await this.registerAdapter("proximity-geocoding", ProximityGeocodingAdapter);
      await this.registerAdapter("communication", CommunicationAdapter);
      await this.registerAdapter("marketing", MarketingAdapter);
      await this.registerAdapter("ai-programs", AiProgramsAdapter);
      await this.registerAdapter("localization", LocalizationAdapter);
      await this.registerAdapter("translations", TranslationsAdapter);
      await this.registerAdapter("billing", BillingAdapter);

      this.logger.log(`Registered ${this.adapters.size} subsystem adapters`);
    } catch (error) {
      this.logger.error(`Failed to initialize adapter registry: ${error.message}`);
      throw error;
    }
  }

  /**
   * Register a subsystem adapter
   */
  private async registerAdapter(subsystemType: string, adapterClass: any) {
    try {
      // Get adapter instance from module
      const adapter = this.moduleRef.get(adapterClass, { strict: false });

      if (!adapter) {
        throw new Error(`Failed to resolve adapter instance for ${subsystemType}`);
      }

      const registration: AdapterRegistration = {
        subsystem: subsystemType,
        adapter,
        version: "1.0.0", // Could be dynamic
        capabilities: this.getAdapterCapabilities(subsystemType),
        healthCheck: async () => {
          try {
            return this.hasExecutionFunction(subsystemType, adapter);
          } catch {
            return false;
          }
        }
      };

      this.adapters.set(subsystemType, registration);
      this.logger.debug(`Registered adapter for subsystem: ${subsystemType}`);
    } catch (error) {
      this.logger.error(`Failed to register adapter for ${subsystemType}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute request through appropriate subsystem adapter
   */
  async executeThroughAdapter(
    subsystem: string,
    request: ExecuteRequestDto,
    context: AdapterContext
  ): Promise<AdapterResult> {
    try {
      const registration = this.adapters.get(subsystem);

      if (!registration) {
        throw new Error(`No adapter registered for subsystem: ${subsystem}`);
      }

      // Check adapter health before execution
      const isHealthy = await registration.healthCheck();
      if (!isHealthy) {
        throw new Error(`Adapter for subsystem ${subsystem} is unhealthy`);
      }

      this.logger.debug(`Executing request through ${subsystem} adapter`);

      // Execute through adapter
      const result = await this.runAdapter(subsystem, registration.adapter, request, context);

      // Add adapter metadata
      result.metadata = {
        ...result.metadata,
        adapterVersion: registration.version,
        adapterCapabilities: registration.capabilities,
        executedAt: new Date().toISOString()
      };

      return result;
    } catch (error) {
      this.logger.error(`Adapter execution failed for ${subsystem}: ${error.message}`);

      return {
        success: false,
        error: error.message,
        riskFactors: ["adapter_error"],
        metadata: {
          subsystem,
          adapterError: true,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get all registered adapters
   */
  getRegisteredAdapters(): Array<{ subsystem: string; version: string; capabilities: string[] }> {
    return Array.from(this.adapters.entries()).map(([subsystem, registration]) => ({
      subsystem,
      version: registration.version,
      capabilities: registration.capabilities
    }));
  }

  /**
   * Get adapter registration details
   */
  getAdapterRegistration(subsystem: string): AdapterRegistration | undefined {
    return this.adapters.get(subsystem);
  }

  /**
   * Check if subsystem has registered adapter
   */
  hasAdapter(subsystem: string): boolean {
    return this.adapters.has(subsystem);
  }

  /**
   * Perform health check on all adapters
   */
  async performHealthCheck(): Promise<
    Array<{ subsystem: string; healthy: boolean; error?: string }>
  > {
    const results = [];

    for (const [subsystem, registration] of this.adapters.entries()) {
      try {
        const healthy = await registration.healthCheck();
        results.push({ subsystem, healthy });
      } catch (error) {
        results.push({
          subsystem,
          healthy: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get adapter capabilities for a subsystem
   */
  private getAdapterCapabilities(subsystem: string): string[] {
    const capabilityMap: Record<string, string[]> = {
      ecommerce: ["purchase", "cart_management", "checkout", "refunds"],
      chatbot: ["conversation", "intent_analysis", "content_filtering"],
      places: ["check_in", "booking", "venue_info", "reviews"],
      matchmaking: ["user_matching", "contract_creation", "compatibility_analysis"],
      payments: ["charge", "refund", "transfer", "verification"],
      fraud: ["detection", "investigation", "reporting", "analysis"],
      "proximity-geocoding": ["geocode", "reverse_geocode", "proximity_search", "distance_calc"],
      communication: ["messaging", "calls", "file_transfer", "group_chat"],
      marketing: ["campaign_management", "targeting", "engagement_analysis", "consent_management"],
      "ai-programs": [
        "program_execution",
        "agent_deployment",
        "data_analysis",
        "protocol_management"
      ],
      localization: ["content_translation", "language_detection", "cultural_adaptation"],
      translations: [
        "text_translation",
        "batch_translation",
        "domain_specialization",
        "quality_assurance"
      ],
      billing: ["quote", "charge", "renew", "cancel"]
    };

    return capabilityMap[subsystem] || ["general_processing"];
  }

  private hasExecutionFunction(subsystem: string, adapter: unknown): boolean {
    if (!adapter || typeof adapter !== "object") return false;

    const record = adapter as Record<string, unknown>;
    if (typeof record.execute === "function") return true;

    const legacyMethod = this.getLegacyMethodName(subsystem);
    return legacyMethod ? typeof record[legacyMethod] === "function" : false;
  }

  private async runAdapter(
    subsystem: string,
    adapter: unknown,
    request: ExecuteRequestDto,
    context: AdapterContext
  ): Promise<AdapterResult> {
    const record = adapter as Record<string, unknown>;
    if (typeof record.execute === "function") {
      return (
        record.execute as (req: ExecuteRequestDto, ctx: AdapterContext) => Promise<AdapterResult>
      )(request, context);
    }

    const legacyMethodName = this.getLegacyMethodName(subsystem);
    if (!legacyMethodName || typeof record[legacyMethodName] !== "function") {
      throw new Error(`Adapter for ${subsystem} does not expose executable methods`);
    }

    const legacyPayload = this.toLegacyPayload(subsystem, request);
    const legacyResponse = await (
      record[legacyMethodName] as (
        payload: Record<string, unknown>
      ) => Promise<Record<string, unknown>>
    )(legacyPayload);

    const success = Boolean(legacyResponse?.allowed ?? legacyResponse?.success ?? false);
    return {
      success,
      data: legacyResponse,
      error: success
        ? undefined
        : String(legacyResponse?.blockedReason || legacyResponse?.error || "adapter_rejected"),
      riskFactors: success ? [] : ["adapter_rejected"],
      metadata: {
        subsystem,
        legacyAdapter: true,
        action: request.action
      }
    };
  }

  private getLegacyMethodName(subsystem: string): string | null {
    const methodMap: Record<string, string> = {
      "ai-programs": "processAiProgramsRequest",
      communication: "processCommunicationRequest",
      fraud: "processFraudRequest",
      localization: "processLocalizationRequest",
      marketing: "processMarketingRequest",
      matchmaking: "processMatchmakingRequest",
      payments: "processPaymentsRequest",
      places: "processPlacesRequest",
      "proximity-geocoding": "processProximityGeocodingRequest",
      translations: "processTranslationsRequest"
    };
    return methodMap[subsystem] || null;
  }

  private toLegacyPayload(subsystem: string, request: ExecuteRequestDto): Record<string, unknown> {
    const context = request.context || {};
    const generatedId = `${subsystem}-${Date.now()}`;

    return {
      action: request.action,
      userId: request.userId || "anonymous",
      context,
      campaignId: String(context.campaignId || generatedId),
      paymentId: String(context.paymentId || generatedId),
      requestId: request.requestId,
      sessionId: String(context.sessionId || generatedId),
      matchId: String(context.matchId || generatedId),
      transactionId: String(context.transactionId || generatedId),
      geocodeRequestId: String(context.geocodeRequestId || generatedId),
      messageId: String(context.messageId || generatedId),
      translationId: String(context.translationId || generatedId),
      language: String(context.language || "en"),
      regionCode: request.regionCode || "GLOBAL",
      message: String(context.message || ""),
      intent: String(context.intent || ""),
      amount: Number(context.amount || 0)
    };
  }

  /**
   * Dynamically register a new adapter (for runtime adapter management)
   */
  async registerAdapterRuntime(subsystem: string, adapter: SubsystemAdapter): Promise<void> {
    const registration: AdapterRegistration = {
      subsystem,
      adapter,
      version: "1.0.0",
      capabilities: this.getAdapterCapabilities(subsystem),
      healthCheck: async () => true // Basic health check for runtime adapters
    };

    this.adapters.set(subsystem, registration);
    this.logger.log(`Runtime adapter registered for subsystem: ${subsystem}`);
  }

  /**
   * Unregister an adapter
   */
  unregisterAdapter(subsystem: string): boolean {
    const removed = this.adapters.delete(subsystem);
    if (removed) {
      this.logger.log(`Adapter unregistered for subsystem: ${subsystem}`);
    }
    return removed;
  }

  /**
   * Get adapter statistics
   */
  getAdapterStats(): Array<{ subsystem: string; version: string; capabilitiesCount: number }> {
    return Array.from(this.adapters.entries()).map(([subsystem, registration]) => ({
      subsystem,
      version: registration.version,
      capabilitiesCount: registration.capabilities.length
    }));
  }
}
