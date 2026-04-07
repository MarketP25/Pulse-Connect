import { Injectable, Logger } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { EdgeTelemetryService } from "../services/telemetry.service";
import { AiRuleInterpreter } from "@/shared/lib/src/ai-rule-interpreter";

export interface FraudRequest {
  caseId: string;
  userId: string;
  action: "detect" | "report" | "investigate" | "resolve";
  context?: {
    transactionId?: string;
    amount?: number;
    location?: string;
    deviceFingerprint?: string;
    riskIndicators?: string[];
  };
}

export interface FraudResponse {
  caseId: string;
  allowed: boolean;
  blockedReason?: string;
  fraudData?: {
    riskScore: number;
    decision: string;
    recommendations: string[];
  };
  complianceFlags: string[];
  processingTime: number;
}

@Injectable()
export class FraudAdapter {
  private readonly logger = new Logger(FraudAdapter.name);

  constructor(
    private readonly kafkaClient: ClientKafka,
    private readonly telemetryService: EdgeTelemetryService,
    private readonly aiRuleInterpreter: AiRuleInterpreter
  ) {}

  /**
   * Process fraud request through Edge governance
   */
  async processFraudRequest(request: FraudRequest): Promise<FraudResponse> {
    const startTime = Date.now();

    try {
      // 1. Validate fraud case and user permissions
      const permissionCheck = await this.validateFraudPermissions(request);
      if (!permissionCheck.allowed) {
        await this.telemetryService.recordEvent("fraud_blocked", {
          caseId: request.caseId,
          userId: request.userId,
          action: request.action,
          reason: permissionCheck.blockedReason
        });
        return {
          caseId: request.caseId,
          allowed: false,
          blockedReason: permissionCheck.blockedReason,
          complianceFlags: permissionCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 2. Apply AI-driven fraud analysis
      const aiAnalysis = await this.aiRuleInterpreter.analyzeFraudPatterns({
        caseId: request.caseId,
        userId: request.userId,
        context: request.context
      });

      // 3. Check for false positive prevention
      const falsePositiveCheck = await this.preventFalsePositives(request, aiAnalysis);
      if (!falsePositiveCheck.allowed) {
        return {
          caseId: request.caseId,
          allowed: false,
          blockedReason: falsePositiveCheck.blockedReason,
          complianceFlags: falsePositiveCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 4. Execute fraud operation
      const result = await this.executeFraudOperation(request, aiAnalysis);

      // 5. Record detailed fraud telemetry
      await this.telemetryService.recordEvent("fraud_operation", {
        caseId: request.caseId,
        userId: request.userId,
        action: request.action,
        riskScore: result.fraudData?.riskScore || 0,
        decision: result.fraudData?.decision || "unknown",
        allowed: true,
        complianceFlags: [...permissionCheck.flags, ...falsePositiveCheck.flags].length,
        processingTime: Date.now() - startTime
      });

      return {
        caseId: request.caseId,
        allowed: true,
        fraudData: result.fraudData,
        complianceFlags: [...permissionCheck.flags, ...falsePositiveCheck.flags],
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      this.logger.error(`Fraud processing failed: ${error.message}`, error.stack);
      await this.telemetryService.recordEvent("fraud_error", {
        caseId: request.caseId,
        userId: request.userId,
        action: request.action,
        error: error.message,
        processingTime: Date.now() - startTime
      });

      return {
        caseId: request.caseId,
        allowed: false,
        blockedReason: "System error during fraud processing",
        complianceFlags: ["error"],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate fraud permissions
   */
  private async validateFraudPermissions(request: FraudRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Check if user has fraud investigation permissions
    if (request.action === "investigate" || request.action === "resolve") {
      // Would check user roles/permissions
      const hasPermission = await this.checkUserFraudPermissions(request.userId);
      if (!hasPermission) {
        return {
          allowed: false,
          blockedReason: "Insufficient permissions for fraud operations",
          flags: ["insufficient_permissions"]
        };
      }
      flags.push("permissions_granted");
    }

    // Validate case exists
    const caseExists = await this.validateFraudCase(request.caseId);
    if (!caseExists) {
      return {
        allowed: false,
        blockedReason: "Invalid fraud case",
        flags: ["invalid_case"]
      };
    }

    flags.push("case_valid");
    return { allowed: true, flags };
  }

  /**
   * Prevent false positives
   */
  private async preventFalsePositives(
    request: FraudRequest,
    aiAnalysis: any
  ): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Check for known false positive patterns
    if (aiAnalysis.confidence < 0.6) {
      flags.push("low_confidence");
    }

    // Override high-risk decisions for verified users
    if (aiAnalysis.riskScore > 0.8) {
      const userVerified = await this.checkUserVerificationStatus(request.userId);
      if (userVerified) {
        flags.push("verified_user_override");
        return { allowed: true, flags };
      }
    }

    flags.push("false_positive_check_passed");
    return { allowed: true, flags };
  }

  /**
   * Execute fraud operation
   */
  private async executeFraudOperation(request: FraudRequest, aiAnalysis: any): Promise<any> {
    const result = await this.kafkaClient
      .send("fraud.execute", {
        caseId: request.caseId,
        userId: request.userId,
        action: request.action,
        context: request.context,
        aiAnalysis: aiAnalysis,
        edgeValidated: true,
        timestamp: new Date().toISOString()
      })
      .toPromise();

    return result;
  }

  /**
   * Check user fraud permissions
   */
  private async checkUserFraudPermissions(userId: string): Promise<boolean> {
    // Would check user roles in database
    return true; // Simplified
  }

  /**
   * Validate fraud case
   */
  private async validateFraudCase(caseId: string): Promise<boolean> {
    // Would check if case exists in fraud database
    return caseId && caseId.length > 5;
  }

  /**
   * Check user verification status
   */
  private async checkUserVerificationStatus(userId: string): Promise<boolean> {
    // Would check KYC/verification status
    return Math.random() > 0.5; // Simplified
  }
}
