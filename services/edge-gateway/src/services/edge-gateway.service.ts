import { Injectable, Logger, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { Pool } from 'pg';
import { PC365Guard } from '@pulsco/shared-lib';
import { ExecuteRequestDto, ExecuteResponseDto, DecisionType } from '../dto/execute-request.dto';
import { PolicyVersionDto } from '../dto/policy-version.dto';
import { SignatureVerifierService } from './signature-verifier.service';
import { PolicyCacheService } from './policy-cache.service';
import { ExecutionEngineService } from './execution-engine.service';
import { TelemetryService } from './telemetry.service';

const CSI_REASON_CODE = 'CSI_GATEWAY_ACCESS';

type ExecuteHeaders = Record<string, string | undefined>;

@Injectable()
export class EdgeGatewayService {
  private readonly logger = new Logger(EdgeGatewayService.name);
  private readonly pc365Guard: PC365Guard | null;

  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
    private readonly signatureVerifier: SignatureVerifierService,
    private readonly policyCache: PolicyCacheService,
    private readonly executionEngine: ExecutionEngineService,
    private readonly telemetryService: TelemetryService,
  ) {
    this.pc365Guard = this.buildPc365Guard();
  }

  /**
   * Execute policy-governed request across subsystems
   */
  async executeRequest(request: ExecuteRequestDto, headers: ExecuteHeaders = {}): Promise<ExecuteResponseDto> {
    const startTime = Date.now();
    const reasonCode = request.reasonCode || headers['x-csi-reason-code'] || CSI_REASON_CODE;
    const sourceApp = headers['x-pulsco-source-app'] || 'unknown';

    try {
      this.logger.log(`Processing request ${request.requestId} for ${request.subsystem}`);

      if (reasonCode !== CSI_REASON_CODE) {
        throw new Error(`Invalid reason_code: ${reasonCode}`);
      }

      if (this.isHighRiskAction(request)) {
        this.assertPc365ForHighRisk(headers);
      }

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
          reasonCode: CSI_REASON_CODE,
          sourceApp,
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
        reasonCode: CSI_REASON_CODE,
        sourceApp,
      });

      // Step 6: Audit log
      await this.auditRequest(request, response, sourceApp);

      return response;

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Request execution failed: ${message}`);

      // Send anomaly telemetry
      await this.telemetryService.sendAnomaly({
        anomalyType: 'edge_execute_failure',
        severity: 'high',
        requestId: request.requestId || 'unknown',
        subsystem: request.subsystem,
        description: message,
        context: {
          action: request.action,
          reasonCode: CSI_REASON_CODE,
          sourceApp,
        },
        timestamp: new Date().toISOString(),
      });

      // Return blocked decision on error
      return {
        requestId: request.requestId,
        decision: DecisionType.BLOCK,
        rationale: `Execution failed: ${message}`,
        policyVersion: 'error',
        executionTime: Date.now() - startTime,
        riskScore: 1.0,
        telemetry: {
          subsystem: request.subsystem,
          action: request.action,
          timestamp: new Date().toISOString(),
          hash: this.generateRequestHash(request),
          reasonCode: CSI_REASON_CODE,
          sourceApp,
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

    return createHash('sha256').update(canonicalData).digest('hex');
  }

  /**
   * Audit request execution to immutable log
   */
  private async auditRequest(request: ExecuteRequestDto, response: ExecuteResponseDto, sourceApp: string) {
    try {
      const auditQuery = `
        INSERT INTO edge_audit (
          request_id, subsystem, action, user_id, region_code,
          decision, risk_score, policy_version, execution_time, reason_code, source_app, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
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
        CSI_REASON_CODE,
        sourceApp,
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Audit logging failed: ${message}`);
    }
  }

  private isHighRiskAction(request: ExecuteRequestDto) {
    const action = request.action || '';
    const subsystem = request.subsystem || '';
    return (
      /(delete|remove|revoke|refund|charge|transfer|cancel|deprecate|shutdown|destroy)/i.test(action) ||
      /(billing|wallet|payments|admin|auth|edge|marp)/i.test(subsystem)
    );
  }

  private assertPc365ForHighRisk(headers: ExecuteHeaders) {
    if (!this.pc365Guard) {
      throw new Error('PC365 guard is not configured for high-risk action')
    }

    this.pc365Guard.validateDestructiveAction({
      'x-pc365': headers['x-pc365'],
      'x-founder': headers['x-founder'],
      'x-device': headers['x-device'],
      authorization: headers.authorization,
    })
  }

  private buildPc365Guard() {
    const master = process.env.PC_365_MASTER_TOKEN || ''
    const founder = process.env.FOUNDER_EMAIL || ''
    const device = process.env.SERVICE_DEVICE_FINGERPRINT || ''
    if (!master || !founder || !device) return null

    try {
      return new PC365Guard({
        pc365MasterToken: master,
        founderEmail: founder,
        serviceDeviceFingerprint: device,
      })
    } catch {
      return null
    }
  }
}
