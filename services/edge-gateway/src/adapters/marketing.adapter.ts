import { Injectable, Logger } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { EdgeTelemetryService } from "../services/telemetry.service";
import { AiRuleInterpreter } from "@/shared/lib/src/ai-rule-interpreter";

export interface MarketingRequest {
  campaignId: string;
  userId: string;
  action: "send_campaign" | "target_users" | "analyze_engagement" | "create_segment";
  context?: {
    segmentCriteria?: any;
    content?: string;
    targetRadius?: number;
    location?: { latitude: number; longitude: number };
  };
}

export interface MarketingResponse {
  campaignId: string;
  allowed: boolean;
  blockedReason?: string;
  marketingData?: {
    targetedUsers: number;
    engagementRate?: number;
    segmentSize?: number;
  };
  complianceFlags: string[];
  processingTime: number;
}

@Injectable()
export class MarketingAdapter {
  private readonly logger = new Logger(MarketingAdapter.name);

  constructor(
    private readonly kafkaClient: ClientKafka,
    private readonly telemetryService: EdgeTelemetryService,
    private readonly aiRuleInterpreter: AiRuleInterpreter
  ) {}

  /**
   * Process marketing request through Edge governance
   */
  async processMarketingRequest(request: MarketingRequest): Promise<MarketingResponse> {
    const startTime = Date.now();

    try {
      // 1. Validate marketing campaign and targeting
      const campaignCheck = await this.validateMarketingCampaign(request);
      if (!campaignCheck.allowed) {
        await this.telemetryService.recordEvent("marketing_blocked", {
          campaignId: request.campaignId,
          userId: request.userId,
          action: request.action,
          reason: campaignCheck.blockedReason
        });
        return {
          campaignId: request.campaignId,
          allowed: false,
          blockedReason: campaignCheck.blockedReason,
          complianceFlags: campaignCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 2. Check user consent for marketing communications
      const consentCheck = await this.checkMarketingConsent(request);
      if (!consentCheck.allowed) {
        return {
          campaignId: request.campaignId,
          allowed: false,
          blockedReason: consentCheck.blockedReason,
          complianceFlags: consentCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 3. Apply proximity-aware targeting rules
      const proximityCheck = await this.applyProximityTargeting(request);
      if (!proximityCheck.allowed) {
        return {
          campaignId: request.campaignId,
          allowed: false,
          blockedReason: proximityCheck.blockedReason,
          complianceFlags: proximityCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 4. Execute marketing operation
      const result = await this.executeMarketingOperation(request);

      // 5. Record telemetry
      await this.telemetryService.recordEvent("marketing_operation", {
        campaignId: request.campaignId,
        userId: request.userId,
        action: request.action,
        allowed: true,
        complianceFlags: [...campaignCheck.flags, ...consentCheck.flags, ...proximityCheck.flags]
          .length,
        processingTime: Date.now() - startTime
      });

      return {
        campaignId: request.campaignId,
        allowed: true,
        marketingData: result.marketingData,
        complianceFlags: [...campaignCheck.flags, ...consentCheck.flags, ...proximityCheck.flags],
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      this.logger.error(`Marketing processing failed: ${error.message}`, error.stack);
      await this.telemetryService.recordEvent("marketing_error", {
        campaignId: request.campaignId,
        userId: request.userId,
        action: request.action,
        error: error.message,
        processingTime: Date.now() - startTime
      });

      return {
        campaignId: request.campaignId,
        allowed: false,
        blockedReason: "System error during marketing operation",
        complianceFlags: ["error"],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate marketing campaign
   */
  private async validateMarketingCampaign(request: MarketingRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Check campaign exists and is active
    const campaignValid = await this.validateCampaign(request.campaignId);
    if (!campaignValid) {
      return {
        allowed: false,
        blockedReason: "Invalid or inactive campaign",
        flags: ["invalid_campaign"]
      };
    }

    flags.push("campaign_valid");

    // Validate content appropriateness
    if (request.context?.content) {
      const contentValid = await this.validateMarketingContent(request.context.content);
      if (!contentValid) {
        return {
          allowed: false,
          blockedReason: "Marketing content violates guidelines",
          flags: ["inappropriate_content"]
        };
      }
      flags.push("content_appropriate");
    }

    flags.push("campaign_compliant");
    return { allowed: true, flags };
  }

  /**
   * Check marketing consent
   */
  private async checkMarketingConsent(request: MarketingRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Check user's marketing consent preferences
    const consentGranted = await this.checkUserMarketingConsent(request.userId);
    if (!consentGranted) {
      return {
        allowed: false,
        blockedReason: "User has not consented to marketing communications",
        flags: ["consent_denied"]
      };
    }

    flags.push("consent_granted");

    // Check for opt-out preferences
    const optOut = await this.checkMarketingOptOut(request.userId);
    if (optOut) {
      return {
        allowed: false,
        blockedReason: "User has opted out of marketing",
        flags: ["opt_out"]
      };
    }

    flags.push("not_opted_out");
    return { allowed: true, flags };
  }

  /**
   * Apply proximity-aware targeting
   */
  private async applyProximityTargeting(request: MarketingRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    if (request.context?.location && request.context?.targetRadius) {
      // Validate targeting radius
      if (request.context.targetRadius > 100) {
        // Max 100km radius
        return {
          allowed: false,
          blockedReason: "Targeting radius too large",
          flags: ["radius_too_large"]
        };
      }

      flags.push("radius_valid");

      // Check for location-based restrictions
      const locationAllowed = await this.checkLocationTargetingRestrictions(
        request.context.location
      );
      if (!locationAllowed) {
        return {
          allowed: false,
          blockedReason: "Location targeting not allowed",
          flags: ["location_restricted"]
        };
      }

      flags.push("location_targeting_allowed");
    }

    flags.push("proximity_targeting_applied");
    return { allowed: true, flags };
  }

  /**
   * Execute marketing operation
   */
  private async executeMarketingOperation(request: MarketingRequest): Promise<any> {
    const result = await this.kafkaClient
      .send("marketing.execute", {
        campaignId: request.campaignId,
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
   * Validate campaign
   */
  private async validateCampaign(campaignId: string): Promise<boolean> {
    // Would check campaign database
    return campaignId && campaignId.length > 5;
  }

  /**
   * Validate marketing content
   */
  private async validateMarketingContent(content: string): Promise<boolean> {
    // Would apply content guidelines
    return !content.includes("spam") && !content.includes("scam");
  }

  /**
   * Check user marketing consent
   */
  private async checkUserMarketingConsent(userId: string): Promise<boolean> {
    // Would check user preferences
    return Math.random() > 0.2; // 80% consent rate
  }

  /**
   * Check marketing opt-out
   */
  private async checkMarketingOptOut(userId: string): Promise<boolean> {
    // Would check opt-out lists
    return Math.random() < 0.1; // 10% opt-out rate
  }

  /**
   * Check location targeting restrictions
   */
  private async checkLocationTargetingRestrictions(location: {
    latitude: number;
    longitude: number;
  }): Promise<boolean> {
    // Would check restricted areas
    return true; // Simplified
  }
}
