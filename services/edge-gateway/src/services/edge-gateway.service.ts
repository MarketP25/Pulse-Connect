import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Pool } from 'pg';
import { ExecuteRequestDto, ExecuteResponseDto, DecisionType } from '../dto/execute-request.dto';
import { PolicyVersionDto, SubsystemType } from '../dto/policy-version.dto';
import { SignatureVerifierService } from './signature-verifier.service';
import { PolicyCacheService } from './policy-cache.service';
import { ExecutionEngineService } from './execution-engine.service';
import { TelemetryService } from './telemetry.service';

@Injectable()
export class EdgeGatewayService {
  private readonly logger = new Logger(EdgeGatewayService.name);

  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
    private readonly signatureVerifier: SignatureVerifierService,
    private readonly policyCache: PolicyCacheService,
    private readonly executionEngine: ExecutionEngineService,
    private readonly telemetryService: TelemetryService,
  ) {}

  /**
   * Execute policy-governed request across subsystems
   */
  async executeRequest(request: ExecuteRequestDto): Promise<ExecuteResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(`Processing request ${request.requestId} for ${request.subsystem}`);

      // Step 1: Verify MARP signature
      const signatureValid = await this.signatureVerifier.verifyRequest(request);
      if (!signatureValid) {
        throw new Error('MARP signature verification failed');
      }

      // Step 2: Get active policy snapshot
      const policySnapshot = await this.policyCache.getActivePolicy(request.subsystem);

      // Step 3: Execute policy rules
      const decision = await this.executionEngine.evaluateRequest(request, policySnapshot);

      // Step 4: Generate response
      const response: ExecuteResponseDto = {
        requestId: request.requestId,
        decision: decision.type,
        rationale: decision.rationale,
        policyVersion: policySnapshot.version,
        executionTime: Date.now() - startTime,
        riskScore: decision.riskScore,
        telemetry: {
          subsystem: request.subsystem,
          action: request.action,
          timestamp: new Date().toISOString(),
          hash: this.generateRequestHash(request),
        },
      };

      // Add quarantine details if needed
      if (decision.type === DecisionType.QUARANTINE) {
        response.quarantine = {
          reason: decision.quarantineReason || 'Policy violation',
          duration: decision.quarantineDuration || 3600000, // 1 hour default
          escalationRequired: decision.escalationRequired || false,
        };
      }

      // Step 5: Send telemetry to MARP
      await this.telemetryService.sendTelemetry({
        ...response,
        originalRequest: request,
        policySnapshot: policySnapshot.id,
      });

      // Step 6: Audit log
      await this.auditRequest(request, response);

      return response;

    } catch (error) {
      this.logger.error(`Request execution failed: ${error.message}`);

      // Send anomaly telemetry
      await this.telemetryService.sendAnomaly({
        requestId: request.requestId,
        error: error.message,
        subsystem: request.subsystem,
        timestamp: new Date().toISOString(),
      });

      // Return blocked decision on error
      return {
        requestId: request.requestId,
        decision: DecisionType.BLOCK,
        rationale: `Execution failed: ${error.message}`,
        policyVersion: 'error',
        executionTime: Date.now() - startTime,
        riskScore: 1.0,
        telemetry: {
          subsystem: request.subsystem,
          action: request.action,
          timestamp: new Date().toISOString(),
          hash: this.generateRequestHash(request),
        },
      };
    }
  }

  /**
   * Get current policy version information
   */
  async getPolicyVersion(query: PolicyVersionDto) {
    const policy = await this.policyCache.getActivePolicy(query.subsystem);

    return {
      subsystem: query.subsystem,
      version: policy.version,
      effectiveFrom: policy.effectiveFrom,
      effectiveUntil: policy.effectiveUntil,
      lastUpdated: policy.lastUpdated,
      regionCode: query.regionCode,
    };
  }

  /**
   * Generate cryptographic hash for request audit
   */
  private generateRequestHash(request: ExecuteRequestDto): string {
    const canonicalData = JSON.stringify({
      requestId: request.requestId,
      subsystem: request.subsystem,
      action: request.action,
      context: request.context,
      userId: request.userId,
      timestamp: Date.now(),
    });

    // Use simple hash for now - in production would use crypto module
    return require('crypto').createHash('sha256').update(canonicalData).digest('hex');
  }

  /**
   * Audit request execution to immutable log
   */
  private async auditRequest(request: ExecuteRequestDto, response: ExecuteResponseDto) {
    try {
      const auditQuery = `
        INSERT INTO edge_audit (
          request_id, subsystem, action, user_id, region_code,
          decision, risk_score, policy_version, execution_time,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `;

      await this.db.query(auditQuery, [
        request.requestId,
        request.subsystem,
        request.action,
        request.userId,
        request.regionCode,
        response.decision,
        response.riskScore,
        response.policyVersion,
        response.executionTime,
      ]);
    } catch (error) {
      this.logger.error(`Audit logging failed: ${error.message}`);
    }
  }
}
