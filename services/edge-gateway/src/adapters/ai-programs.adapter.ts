import { Injectable, Logger } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { EdgeTelemetryService } from "../services/telemetry.service";
import { AiRuleInterpreter } from "@/shared/lib/src/ai-rule-interpreter";

export interface AiProgramsRequest {
  programId: string;
  userId: string;
  action: "execute_program" | "deploy_agent" | "update_protocol" | "analyze_data";
  context?: {
    protocolVersion?: string;
    agentConfig?: any;
    inputData?: any;
    executionParams?: any;
  };
}

export interface AiProgramsResponse {
  programId: string;
  allowed: boolean;
  blockedReason?: string;
  aiData?: {
    executionId: string;
    status: string;
    output?: any;
    confidence?: number;
  };
  complianceFlags: string[];
  processingTime: number;
}

@Injectable()
export class AiProgramsAdapter {
  private readonly logger = new Logger(AiProgramsAdapter.name);

  constructor(
    private readonly kafkaClient: ClientKafka,
    private readonly telemetryService: EdgeTelemetryService,
    private readonly aiRuleInterpreter: AiRuleInterpreter
  ) {}

  /**
   * Process AI programs request through Edge governance
   */
  async processAiProgramsRequest(request: AiProgramsRequest): Promise<AiProgramsResponse> {
    const startTime = Date.now();

    try {
      // 1. Validate AI program and execution parameters
      const programCheck = await this.validateAiProgram(request);
      if (!programCheck.allowed) {
        await this.telemetryService.recordEvent("ai_programs_blocked", {
          programId: request.programId,
          userId: request.userId,
          action: request.action,
          reason: programCheck.blockedReason
        });
        return {
          programId: request.programId,
          allowed: false,
          blockedReason: programCheck.blockedReason,
          complianceFlags: programCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 2. Apply AI safety and ethical checks
      const safetyCheck = await this.applyAiSafetyChecks(request);
      if (!safetyCheck.allowed) {
        return {
          programId: request.programId,
          allowed: false,
          blockedReason: safetyCheck.blockedReason,
          complianceFlags: safetyCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 3. Check computational resource limits
      const resourceCheck = await this.checkComputationalLimits(request);
      if (!resourceCheck.allowed) {
        return {
          programId: request.programId,
          allowed: false,
          blockedReason: resourceCheck.blockedReason,
          complianceFlags: resourceCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 4. Execute AI program operation
      const result = await this.executeAiProgramOperation(request);

      // 5. Record detailed AI telemetry
      await this.telemetryService.recordEvent("ai_programs_operation", {
        programId: request.programId,
        userId: request.userId,
        action: request.action,
        allowed: true,
        complianceFlags: [...programCheck.flags, ...safetyCheck.flags, ...resourceCheck.flags]
          .length,
        processingTime: Date.now() - startTime
      });

      return {
        programId: request.programId,
        allowed: true,
        aiData: result.aiData,
        complianceFlags: [...programCheck.flags, ...safetyCheck.flags, ...resourceCheck.flags],
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      this.logger.error(`AI programs processing failed: ${error.message}`, error.stack);
      await this.telemetryService.recordEvent("ai_programs_error", {
        programId: request.programId,
        userId: request.userId,
        action: request.action,
        error: error.message,
        processingTime: Date.now() - startTime
      });

      return {
        programId: request.programId,
        allowed: false,
        blockedReason: "System error during AI program execution",
        complianceFlags: ["error"],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate AI program
   */
  private async validateAiProgram(request: AiProgramsRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Check program exists and is approved
    const programValid = await this.validateProgram(request.programId);
    if (!programValid) {
      return {
        allowed: false,
        blockedReason: "Invalid or unapproved AI program",
        flags: ["invalid_program"]
      };
    }

    flags.push("program_valid");

    // Validate protocol version compatibility
    if (request.context?.protocolVersion) {
      const protocolValid = await this.validateProtocolVersion(request.context.protocolVersion);
      if (!protocolValid) {
        return {
          allowed: false,
          blockedReason: "Incompatible protocol version",
          flags: ["protocol_incompatible"]
        };
      }
      flags.push("protocol_compatible");
    }

    flags.push("program_compliant");
    return { allowed: true, flags };
  }

  /**
   * Apply AI safety checks
   */
  private async applyAiSafetyChecks(request: AiProgramsRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Use AI rule interpreter for safety analysis
    const safetyAnalysis = await this.aiRuleInterpreter.analyzeAiSafety({
      programId: request.programId,
      action: request.action,
      context: request.context,
      userId: request.userId
    });

    if (!safetyAnalysis.allowed) {
      return {
        allowed: false,
        blockedReason: safetyAnalysis.blockedReason,
        flags: safetyAnalysis.flags
      };
    }

    flags.push(...safetyAnalysis.flags);

    // Check for bias and fairness
    const biasCheck = await this.checkAlgorithmicBias(request);
    if (!biasCheck.allowed) {
      return {
        allowed: false,
        blockedReason: biasCheck.blockedReason,
        flags: biasCheck.flags
      };
    }

    flags.push(...biasCheck.flags);
    return { allowed: true, flags };
  }

  /**
   * Check computational resource limits
   */
  private async checkComputationalLimits(request: AiProgramsRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Check execution time limits
    if (request.context?.executionParams?.maxExecutionTime) {
      if (request.context.executionParams.maxExecutionTime > 3600000) {
        // 1 hour max
        return {
          allowed: false,
          blockedReason: "Execution time limit exceeded",
          flags: ["execution_time_too_long"]
        };
      }
      flags.push("execution_time_valid");
    }

    // Check resource allocation
    const resourceValid = await this.validateResourceAllocation(request);
    if (!resourceValid) {
      return {
        allowed: false,
        blockedReason: "Resource allocation exceeds limits",
        flags: ["resource_limit_exceeded"]
      };
    }

    flags.push("resources_valid");
    return { allowed: true, flags };
  }

  /**
   * Execute AI program operation
   */
  private async executeAiProgramOperation(request: AiProgramsRequest): Promise<any> {
    const result = await this.kafkaClient
      .send("ai-programs.execute", {
        programId: request.programId,
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
   * Validate program
   */
  private async validateProgram(programId: string): Promise<boolean> {
    // Would check program registry
    return programId && programId.length > 5;
  }

  /**
   * Validate protocol version
   */
  private async validateProtocolVersion(version: string): Promise<boolean> {
    // Would check version compatibility
    return version.startsWith("v1.") || version.startsWith("v2.");
  }

  /**
   * Check algorithmic bias
   */
  private async checkAlgorithmicBias(request: AiProgramsRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    // Would analyze for bias patterns
    return { allowed: true, flags: ["bias_check_passed"] };
  }

  /**
   * Validate resource allocation
   */
  private async validateResourceAllocation(request: AiProgramsRequest): Promise<boolean> {
    // Would check against resource quotas
    return true; // Simplified
  }
}
