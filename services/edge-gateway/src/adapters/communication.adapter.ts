import { Injectable, Logger } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { EdgeTelemetryService } from "../services/telemetry.service";
import { AiRuleInterpreter } from "@/shared/lib/src/ai-rule-interpreter";

export interface CommunicationRequest {
  messageId: string;
  userId: string;
  recipientId: string;
  action: "send_message" | "make_call" | "send_file" | "create_group";
  channel: "text" | "voice" | "video" | "file";
  context?: {
    content?: string;
    duration?: number;
    fileSize?: number;
    groupMembers?: string[];
  };
}

export interface CommunicationResponse {
  messageId: string;
  allowed: boolean;
  blockedReason?: string;
  communicationData?: {
    status: string;
    deliveredAt?: string;
    cost?: number;
  };
  complianceFlags: string[];
  processingTime: number;
}

@Injectable()
export class CommunicationAdapter {
  private readonly logger = new Logger(CommunicationAdapter.name);

  constructor(
    private readonly kafkaClient: ClientKafka,
    private readonly telemetryService: EdgeTelemetryService,
    private readonly aiRuleInterpreter: AiRuleInterpreter
  ) {}

  /**
   * Process communication request through Edge governance
   */
  async processCommunicationRequest(request: CommunicationRequest): Promise<CommunicationResponse> {
    const startTime = Date.now();

    try {
      // 1. Validate communication content and recipients
      const contentCheck = await this.validateCommunicationContent(request);
      if (!contentCheck.allowed) {
        await this.telemetryService.recordEvent("communication_blocked", {
          messageId: request.messageId,
          userId: request.userId,
          action: request.action,
          channel: request.channel,
          reason: contentCheck.blockedReason
        });
        return {
          messageId: request.messageId,
          allowed: false,
          blockedReason: contentCheck.blockedReason,
          complianceFlags: contentCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 2. Check user permissions and relationships
      const permissionCheck = await this.checkCommunicationPermissions(request);
      if (!permissionCheck.allowed) {
        return {
          messageId: request.messageId,
          allowed: false,
          blockedReason: permissionCheck.blockedReason,
          complianceFlags: permissionCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 3. Apply content moderation and safety filters
      const moderationCheck = await this.applyContentModeration(request);
      if (!moderationCheck.allowed) {
        return {
          messageId: request.messageId,
          allowed: false,
          blockedReason: moderationCheck.blockedReason,
          complianceFlags: moderationCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 4. Check billing and rate limits
      const billingCheck = await this.checkCommunicationBilling(request);
      if (!billingCheck.allowed) {
        return {
          messageId: request.messageId,
          allowed: false,
          blockedReason: billingCheck.blockedReason,
          complianceFlags: billingCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 5. Execute communication operation
      const result = await this.executeCommunicationOperation(request);

      // 6. Record telemetry
      await this.telemetryService.recordEvent("communication_operation", {
        messageId: request.messageId,
        userId: request.userId,
        recipientId: request.recipientId,
        action: request.action,
        channel: request.channel,
        allowed: true,
        complianceFlags: [
          ...contentCheck.flags,
          ...permissionCheck.flags,
          ...moderationCheck.flags,
          ...billingCheck.flags
        ].length,
        processingTime: Date.now() - startTime
      });

      return {
        messageId: request.messageId,
        allowed: true,
        communicationData: result.communicationData,
        complianceFlags: [
          ...contentCheck.flags,
          ...permissionCheck.flags,
          ...moderationCheck.flags,
          ...billingCheck.flags
        ],
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      this.logger.error(`Communication processing failed: ${error.message}`, error.stack);
      await this.telemetryService.recordEvent("communication_error", {
        messageId: request.messageId,
        userId: request.userId,
        action: request.action,
        error: error.message,
        processingTime: Date.now() - startTime
      });

      return {
        messageId: request.messageId,
        allowed: false,
        blockedReason: "System error during communication",
        complianceFlags: ["error"],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate communication content
   */
  private async validateCommunicationContent(request: CommunicationRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Check message length limits
    if (request.context?.content && request.context.content.length > 10000) {
      return {
        allowed: false,
        blockedReason: "Message too long",
        flags: ["content_too_long"]
      };
    }

    flags.push("content_length_valid");

    // Validate file sizes for file transfers
    if (request.channel === "file" && request.context?.fileSize) {
      if (request.context.fileSize > 100 * 1024 * 1024) {
        // 100MB limit
        return {
          allowed: false,
          blockedReason: "File size exceeds limit",
          flags: ["file_too_large"]
        };
      }
      flags.push("file_size_valid");
    }

    flags.push("content_valid");
    return { allowed: true, flags };
  }

  /**
   * Check communication permissions
   */
  private async checkCommunicationPermissions(request: CommunicationRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Check if users can communicate (not blocked)
    const canCommunicate = await this.checkUserCommunicationStatus(
      request.userId,
      request.recipientId
    );
    if (!canCommunicate) {
      return {
        allowed: false,
        blockedReason: "Communication not allowed between users",
        flags: ["communication_blocked"]
      };
    }

    flags.push("communication_allowed");

    // Check group creation permissions
    if (request.action === "create_group") {
      const canCreateGroup = await this.checkGroupCreationPermissions(request.userId);
      if (!canCreateGroup) {
        return {
          allowed: false,
          blockedReason: "Insufficient permissions to create group",
          flags: ["group_creation_denied"]
        };
      }
      flags.push("group_creation_allowed");
    }

    return { allowed: true, flags };
  }

  /**
   * Apply content moderation
   */
  private async applyContentModeration(request: CommunicationRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    if (request.context?.content) {
      // Use AI for content moderation
      const moderation = await this.aiRuleInterpreter.analyzeContentModeration({
        content: request.context.content,
        channel: request.channel,
        userId: request.userId
      });

      if (!moderation.allowed) {
        return {
          allowed: false,
          blockedReason: moderation.blockedReason,
          flags: moderation.flags
        };
      }

      flags.push(...moderation.flags);
    }

    flags.push("content_moderated");
    return { allowed: true, flags };
  }

  /**
   * Check communication billing
   */
  private async checkCommunicationBilling(request: CommunicationRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Check user balance for paid communications
    if (request.channel === "voice" || request.channel === "video") {
      const hasBalance = await this.checkUserBalance(request.userId);
      if (!hasBalance) {
        return {
          allowed: false,
          blockedReason: "Insufficient balance for communication",
          flags: ["insufficient_balance"]
        };
      }
      flags.push("balance_sufficient");
    }

    // Check rate limits
    const rateCheck = await this.checkCommunicationRateLimits(request.userId, request.channel);
    if (!rateCheck.allowed) {
      return {
        allowed: false,
        blockedReason: "Rate limit exceeded",
        flags: ["rate_limited"]
      };
    }

    flags.push("billing_compliant");
    return { allowed: true, flags };
  }

  /**
   * Execute communication operation
   */
  private async executeCommunicationOperation(request: CommunicationRequest): Promise<any> {
    const result = await this.kafkaClient
      .send("communication.execute", {
        messageId: request.messageId,
        userId: request.userId,
        recipientId: request.recipientId,
        action: request.action,
        channel: request.channel,
        context: request.context,
        edgeValidated: true,
        timestamp: new Date().toISOString()
      })
      .toPromise();

    return result;
  }

  /**
   * Check user communication status
   */
  private async checkUserCommunicationStatus(
    userId: string,
    recipientId: string
  ): Promise<boolean> {
    // Would check block lists, privacy settings
    return true; // Simplified
  }

  /**
   * Check group creation permissions
   */
  private async checkGroupCreationPermissions(userId: string): Promise<boolean> {
    // Would check user permissions
    return true; // Simplified
  }

  /**
   * Check user balance
   */
  private async checkUserBalance(userId: string): Promise<boolean> {
    // Would check wallet balance
    return Math.random() > 0.1; // 90% have balance
  }

  /**
   * Check communication rate limits
   */
  private async checkCommunicationRateLimits(
    userId: string,
    channel: string
  ): Promise<{ allowed: boolean }> {
    // Would check rate limits per channel
    return { allowed: true }; // Simplified
  }
}
