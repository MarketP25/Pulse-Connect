import { Injectable, Logger } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { EdgeTelemetryService } from "../services/telemetry.service";
import { AiRuleInterpreter } from "@/shared/lib/src/ai-rule-interpreter";

export interface MatchmakingRequest {
  matchId: string;
  userId: string;
  action: "find_matches" | "create_contract" | "accept_match" | "decline_match";
  context?: {
    criteria?: any;
    contractTerms?: any;
    matchPreferences?: any;
    regionCode?: string;
  };
}

export interface MatchmakingResponse {
  matchId: string;
  allowed: boolean;
  blockedReason?: string;
  matchmakingData?: {
    matches?: any[];
    contractId?: string;
    status?: string;
    compatibilityScore?: number;
  };
  complianceFlags: string[];
  processingTime: number;
}

@Injectable()
export class MatchmakingAdapter {
  private readonly logger = new Logger(MatchmakingAdapter.name);

  constructor(
    private readonly kafkaClient: ClientKafka,
    private readonly telemetryService: EdgeTelemetryService,
    private readonly aiRuleInterpreter: AiRuleInterpreter
  ) {}

  /**
   * Process matchmaking request through Edge governance
   */
  async processMatchmakingRequest(request: MatchmakingRequest): Promise<MatchmakingResponse> {
    const startTime = Date.now();

    try {
      // 1. Validate matchmaking request and user eligibility
      const eligibilityCheck = await this.validateMatchmakingEligibility(request);
      if (!eligibilityCheck.allowed) {
        await this.telemetryService.recordEvent("matchmaking_blocked", {
          matchId: request.matchId,
          userId: request.userId,
          action: request.action,
          reason: eligibilityCheck.blockedReason
        });
        return {
          matchId: request.matchId,
          allowed: false,
          blockedReason: eligibilityCheck.blockedReason,
          complianceFlags: eligibilityCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 2. Apply compatibility and safety checks
      const compatibilityCheck = await this.applyCompatibilityChecks(request);
      if (!compatibilityCheck.allowed) {
        return {
          matchId: request.matchId,
          allowed: false,
          blockedReason: compatibilityCheck.blockedReason,
          complianceFlags: compatibilityCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 3. Check contract compliance for business matches
      const contractCheck = await this.checkContractCompliance(request);
      if (!contractCheck.allowed) {
        return {
          matchId: request.matchId,
          allowed: false,
          blockedReason: contractCheck.blockedReason,
          complianceFlags: contractCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 4. Execute matchmaking operation
      const result = await this.executeMatchmakingOperation(request);

      // 5. Record telemetry
      await this.telemetryService.recordEvent("matchmaking_operation", {
        matchId: request.matchId,
        userId: request.userId,
        action: request.action,
        regionCode: request.context?.regionCode,
        allowed: true,
        complianceFlags: [
          ...eligibilityCheck.flags,
          ...compatibilityCheck.flags,
          ...contractCheck.flags
        ].length,
        processingTime: Date.now() - startTime
      });

      return {
        matchId: request.matchId,
        allowed: true,
        matchmakingData: result.matchmakingData,
        complianceFlags: [
          ...eligibilityCheck.flags,
          ...compatibilityCheck.flags,
          ...contractCheck.flags
        ],
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      this.logger.error(`Matchmaking processing failed: ${error.message}`, error.stack);
      await this.telemetryService.recordEvent("matchmaking_error", {
        matchId: request.matchId,
        userId: request.userId,
        action: request.action,
        error: error.message,
        processingTime: Date.now() - startTime
      });

      return {
        matchId: request.matchId,
        allowed: false,
        blockedReason: "System error during matchmaking",
        complianceFlags: ["error"],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate matchmaking eligibility
   */
  private async validateMatchmakingEligibility(request: MatchmakingRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Check user verification status
    const userVerified = await this.checkUserVerification(request.userId);
    if (!userVerified) {
      return {
        allowed: false,
        blockedReason: "User verification required for matchmaking",
        flags: ["user_not_verified"]
      };
    }

    flags.push("user_verified");

    // Check matchmaking permissions
    const permissionsGranted = await this.checkMatchmakingPermissions(request.userId);
    if (!permissionsGranted) {
      return {
        allowed: false,
        blockedReason: "Insufficient permissions for matchmaking",
        flags: ["permissions_denied"]
      };
    }

    flags.push("permissions_granted");
    return { allowed: true, flags };
  }

  /**
   * Apply compatibility checks
   */
  private async applyCompatibilityChecks(request: MatchmakingRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    if (request.action === "find_matches") {
      // Apply AI-driven compatibility analysis
      const compatibilityAnalysis = await this.aiRuleInterpreter.analyzeCompatibility({
        userId: request.userId,
        criteria: request.context?.criteria,
        preferences: request.context?.matchPreferences
      });

      if (!compatibilityAnalysis.allowed) {
        return {
          allowed: false,
          blockedReason: compatibilityAnalysis.blockedReason,
          flags: compatibilityAnalysis.flags
        };
      }

      flags.push(...compatibilityAnalysis.flags);
    }

    // Check for blocked/suspended users
    const userStatus = await this.checkUserMatchmakingStatus(request.userId);
    if (!userStatus.allowed) {
      return {
        allowed: false,
        blockedReason: userStatus.blockedReason,
        flags: userStatus.flags
      };
    }

    flags.push(...userStatus.flags);
    return { allowed: true, flags };
  }

  /**
   * Check contract compliance
   */
  private async checkContractCompliance(request: MatchmakingRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    if (request.action === "create_contract" || request.action === "accept_match") {
      // Validate contract terms
      const contractValid = await this.validateContractTerms(request.context?.contractTerms);
      if (!contractValid) {
        return {
          allowed: false,
          blockedReason: "Invalid contract terms",
          flags: ["invalid_contract_terms"]
        };
      }

      flags.push("contract_terms_valid");

      // Check legal compliance
      const legalCompliant = await this.checkLegalCompliance(request);
      if (!legalCompliant) {
        return {
          allowed: false,
          blockedReason: "Contract violates legal requirements",
          flags: ["legal_violation"]
        };
      }

      flags.push("legal_compliant");
    }

    flags.push("contract_check_passed");
    return { allowed: true, flags };
  }

  /**
   * Execute matchmaking operation
   */
  private async executeMatchmakingOperation(request: MatchmakingRequest): Promise<any> {
    const result = await this.kafkaClient
      .send("matchmaking.execute", {
        matchId: request.matchId,
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
   * Check user verification
   */
  private async checkUserVerification(userId: string): Promise<boolean> {
    // Would check KYC/verification status
    return Math.random() > 0.1; // 90% verified
  }

  /**
   * Check matchmaking permissions
   */
  private async checkMatchmakingPermissions(userId: string): Promise<boolean> {
    // Would check user permissions
    return true; // Simplified
  }

  /**
   * Check user matchmaking status
   */
  private async checkUserMatchmakingStatus(userId: string): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    // Would check for suspensions, blocks, etc.
    return { allowed: true, flags: ["user_active"] };
  }

  /**
   * Validate contract terms
   */
  private async validateContractTerms(terms: any): Promise<boolean> {
    // Would validate contract structure and terms
    return terms && typeof terms === "object";
  }

  /**
   * Check legal compliance
   */
  private async checkLegalCompliance(request: MatchmakingRequest): Promise<boolean> {
    // Would check jurisdiction-specific legal requirements
    return true; // Simplified
  }
}
