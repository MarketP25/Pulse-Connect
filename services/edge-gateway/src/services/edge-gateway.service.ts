import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import { createHash } from "crypto";
import { Pool } from "pg";
import { PC365Guard } from "@pulsco/shared-lib";
import { ExecuteRequestDto, ExecuteResponseDto, DecisionType } from "../dto/execute-request.dto";
import { PolicyVersionDto } from "../dto/policy-version.dto";
import { SignatureVerifierService } from "./signature-verifier.service";
import { PolicyCacheService } from "./policy-cache.service";
import { ExecutionEngineService } from "./execution-engine.service";
import { TelemetryService } from "./telemetry.service";
import { CrossModuleEnrichmentService } from "./cross-module-enrichment.service";
import { SubsystemAdapterRegistryService } from "./subsystem-adapter-registry.service";
import { AdapterContext, AdapterResult } from "../adapters/subsystem-adapter.interface";

const CSI_REASON_CODE = "CSI_GATEWAY_ACCESS";

type ExecuteHeaders = Record<string, string | undefined>;
type AdapterExecutionMode = "off" | "shadow" | "strict";

type EmergencyControls = {
  disableMajorFeatures: boolean;
  disabledFeatures: string[];
  freezeTransactions: boolean;
  freezeWalletPayouts: boolean;
  blockedRegions: string[];
  blockedIpRanges: string[];
  allowFounderBypass: boolean;
};

type EmergencySnapshot = {
  active: boolean;
  protocolId?: string;
  severity?: "elevated" | "critical" | "lockdown";
  version?: number;
  lastUpdatedAt?: string;
  controls: EmergencyControls;
};

const DEFAULT_EMERGENCY_SNAPSHOT: EmergencySnapshot = {
  active: false,
  version: 1,
  controls: {
    disableMajorFeatures: false,
    disabledFeatures: [],
    freezeTransactions: false,
    freezeWalletPayouts: false,
    blockedRegions: [],
    blockedIpRanges: [],
    allowFounderBypass: true
  }
};

@Injectable()
export class EdgeGatewayService {
  private readonly logger = new Logger(EdgeGatewayService.name);
  private readonly pc365Guard: PC365Guard | null;
  private emergencySnapshotCache: EmergencySnapshot | null = null;
  private emergencySnapshotCacheExpiry = 0;

  constructor(
    @Inject("DATABASE_CONNECTION") private readonly db: Pool,
    private readonly signatureVerifier: SignatureVerifierService,
    private readonly policyCache: PolicyCacheService,
    private readonly executionEngine: ExecutionEngineService,
    private readonly telemetryService: TelemetryService,
    private readonly crossModuleEnrichment: CrossModuleEnrichmentService,
    @Optional() private readonly adapterRegistry?: SubsystemAdapterRegistryService
  ) {
    this.pc365Guard = this.buildPc365Guard();
  }

  /**
   * Execute policy-governed request across subsystems
   */
  async executeRequest(
    request: ExecuteRequestDto,
    headers: ExecuteHeaders = {}
  ): Promise<ExecuteResponseDto> {
    const startTime = Date.now();
    const reasonCode = request.reasonCode || headers["x-csi-reason-code"] || CSI_REASON_CODE;
    const sourceApp = headers["x-pulsco-source-app"] || "unknown";
    const adapterMode = this.resolveAdapterExecutionMode(headers);
    let coordinatedRequest: ExecuteRequestDto = request;

    try {
      this.logger.log(`Processing request ${request.requestId} for ${request.subsystem}`);

      if (reasonCode !== CSI_REASON_CODE) {
        throw new Error(`Invalid reason_code: ${reasonCode}`);
      }

      if (this.isHighRiskAction(request)) {
        this.assertPc365ForHighRisk(headers);
      }

      const emergencyBlock = await this.evaluateEmergencyProtocolBlock(request, headers);
      if (emergencyBlock.blocked) {
        const response: ExecuteResponseDto = {
          requestId: request.requestId,
          decision: DecisionType.BLOCK,
          rationale: emergencyBlock.message,
          policyVersion: emergencyBlock.policyVersion || "emergency-protocol",
          executionTime: Date.now() - startTime,
          riskScore: 1.0,
          telemetry: {
            subsystem: request.subsystem,
            action: request.action,
            timestamp: new Date().toISOString(),
            hash: this.generateRequestHash(request),
            reasonCode: CSI_REASON_CODE,
            sourceApp
          }
        };

        await this.telemetryService.sendTelemetry({
          ...response,
          originalRequest: request,
          policySnapshot: emergencyBlock.policyVersion || "emergency-protocol",
          reasonCode: CSI_REASON_CODE,
          sourceApp
        });
        await this.auditRequest(request, response, sourceApp);
        return response;
      }

      // Step 1: Verify MARP signature
      const signatureValid = await this.signatureVerifier.verifyRequest(request);
      if (!signatureValid) {
        throw new Error("MARP signature verification failed");
      }

      coordinatedRequest = this.crossModuleEnrichment.enrichRequest(request, headers);

      // Step 2: Get active policy snapshot
      const policySnapshot = await this.policyCache.getActivePolicy(coordinatedRequest.subsystem);

      // Step 3: Execute policy rules
      const decision = await this.executionEngine.evaluateRequest(coordinatedRequest, policySnapshot);
      let finalDecision = decision.type;
      let finalRationale = decision.rationale;
      let finalRiskScore = decision.riskScore;
      let finalQuarantine:
        | { reason: string; duration: number; escalationRequired: boolean }
        | undefined;

      if (decision.type === DecisionType.QUARANTINE) {
        finalQuarantine = {
          reason: decision.quarantineReason || "Policy violation",
          duration: decision.quarantineDuration || 3600000,
          escalationRequired: decision.escalationRequired || false
        };
      }

      // Step 4: Execute subsystem adapter in controlled rollout mode
      const adapterFlow = await this.executeAdapterFlow({
        request: coordinatedRequest,
        headers,
        sourceApp,
        mode: adapterMode,
        initialDecision: decision.type,
        policyVersion: policySnapshot.version,
        policyContent: policySnapshot.content
      });

      coordinatedRequest = adapterFlow.request;
      if (adapterFlow.override) {
        finalDecision = adapterFlow.override.decision;
        finalRationale = adapterFlow.override.rationale;
        finalRiskScore = adapterFlow.override.riskScore;
        finalQuarantine = adapterFlow.override.quarantine;
      }

      // Step 5: Generate response
      const response: ExecuteResponseDto = {
        requestId: coordinatedRequest.requestId,
        decision: finalDecision,
        rationale: finalRationale,
        policyVersion: policySnapshot.version,
        executionTime: Date.now() - startTime,
        riskScore: finalRiskScore,
        telemetry: {
          subsystem: coordinatedRequest.subsystem,
          action: coordinatedRequest.action,
          timestamp: new Date().toISOString(),
          hash: this.generateRequestHash(coordinatedRequest),
          reasonCode: CSI_REASON_CODE,
          sourceApp
        }
      };

      // Add quarantine details if needed
      if (finalDecision === DecisionType.QUARANTINE && finalQuarantine) {
        response.quarantine = finalQuarantine;
      }

      // Step 6: Send telemetry to MARP
      await this.telemetryService.sendTelemetry({
        ...response,
        originalRequest: coordinatedRequest,
        policySnapshot: policySnapshot.id,
        reasonCode: CSI_REASON_CODE,
        sourceApp
      });

      // Step 7: Audit log
      await this.auditRequest(coordinatedRequest, response, sourceApp);

      return response;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Request execution failed: ${message}`);

      // Send anomaly telemetry
      await this.telemetryService.sendAnomaly({
        anomalyType: "edge_execute_failure",
        severity: "high",
        requestId: coordinatedRequest.requestId || "unknown",
        subsystem: coordinatedRequest.subsystem,
        description: message,
        context: {
          action: coordinatedRequest.action,
          reasonCode: CSI_REASON_CODE,
          sourceApp,
          adapterMode,
          coordination: this.extractCoordinationMetadata(coordinatedRequest)
        },
        timestamp: new Date().toISOString()
      });

      // Return blocked decision on error
      return {
        requestId: coordinatedRequest.requestId,
        decision: DecisionType.BLOCK,
        rationale: `Execution failed: ${message}`,
        policyVersion: "error",
        executionTime: Date.now() - startTime,
        riskScore: 1.0,
        telemetry: {
          subsystem: coordinatedRequest.subsystem,
          action: coordinatedRequest.action,
          timestamp: new Date().toISOString(),
          hash: this.generateRequestHash(coordinatedRequest),
          reasonCode: CSI_REASON_CODE,
          sourceApp
        }
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
      regionCode: query.regionCode
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
      timestamp: Date.now()
    });

    return createHash("sha256").update(canonicalData).digest("hex");
  }

  /**
   * Audit request execution to immutable log
   */
  private async auditRequest(
    request: ExecuteRequestDto,
    response: ExecuteResponseDto,
    sourceApp: string
  ) {
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
        sourceApp
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Audit logging failed: ${message}`);
    }
  }

  private async executeAdapterFlow(input: {
    request: ExecuteRequestDto;
    headers: ExecuteHeaders;
    sourceApp: string;
    mode: AdapterExecutionMode;
    initialDecision: DecisionType;
    policyVersion: string;
    policyContent: unknown;
  }): Promise<{
    request: ExecuteRequestDto;
    override?: {
      decision: DecisionType;
      rationale: string;
      riskScore: number;
      quarantine?: { reason: string; duration: number; escalationRequired: boolean };
    };
  }> {
    if (input.initialDecision !== DecisionType.ALLOW || input.mode === "off") {
      return { request: input.request };
    }

    const adapterSubsystem = this.resolveAdapterForSubsystem(input.request.subsystem);
    if (!adapterSubsystem) {
      return {
        request: this.attachAdapterTrace(input.request, {
          mode: input.mode,
          status: "skipped_unmapped",
          subsystem: input.request.subsystem
        })
      };
    }

    const strictEnforcement = this.isStrictAdapterEnforcementEnabled(
      input.mode,
      input.request.subsystem
    );

    if (!this.adapterRegistry) {
      const requestWithTrace = this.attachAdapterTrace(input.request, {
        mode: input.mode,
        status: "registry_unavailable",
        subsystem: adapterSubsystem
      });

      if (!strictEnforcement) {
        await this.telemetryService.sendAnomaly({
          anomalyType: "edge_adapter_registry_unavailable",
          severity: "medium",
          requestId: input.request.requestId,
          subsystem: input.request.subsystem,
          description: `Adapter mode ${input.mode} skipped because registry is unavailable`,
          context: {
            sourceApp: input.sourceApp,
            adapterSubsystem,
            adapterMode: input.mode
          },
          timestamp: new Date().toISOString()
        });
        return { request: requestWithTrace };
      }

      return {
        request: requestWithTrace,
        override: {
          decision: DecisionType.BLOCK,
          rationale: `Strict adapter enforcement blocked ${input.request.subsystem}: adapter registry unavailable`,
          riskScore: 0.92
        }
      };
    }

    if (!this.adapterRegistry.isInitialized()) {
      await this.adapterRegistry.waitUntilInitialized();
    }

    if (!this.adapterRegistry.isInitialized()) {
      const requestWithTrace = this.attachAdapterTrace(input.request, {
        mode: input.mode,
        status: "registry_initializing",
        subsystem: adapterSubsystem
      });

      if (!strictEnforcement) {
        return { request: requestWithTrace };
      }

      return {
        request: requestWithTrace,
        override: {
          decision: DecisionType.BLOCK,
          rationale: `Strict adapter enforcement blocked ${input.request.subsystem}: adapter registry not ready`,
          riskScore: 0.9
        }
      };
    }

    if (!this.adapterRegistry.hasAdapter(adapterSubsystem)) {
      const requestWithTrace = this.attachAdapterTrace(input.request, {
        mode: input.mode,
        status: "adapter_missing",
        subsystem: adapterSubsystem
      });

      if (!strictEnforcement) {
        await this.telemetryService.sendAnomaly({
          anomalyType: "edge_adapter_missing",
          severity: "medium",
          requestId: input.request.requestId,
          subsystem: input.request.subsystem,
          description: `Adapter ${adapterSubsystem} not registered in ${input.mode} mode`,
          context: {
            sourceApp: input.sourceApp,
            adapterSubsystem,
            adapterMode: input.mode
          },
          timestamp: new Date().toISOString()
        });
        return { request: requestWithTrace };
      }

      return {
        request: requestWithTrace,
        override: {
          decision: DecisionType.BLOCK,
          rationale: `Strict adapter enforcement blocked ${input.request.subsystem}: adapter ${adapterSubsystem} unavailable`,
          riskScore: 0.9
        }
      };
    }

    const adapterContext: AdapterContext = {
      policy: {
        version: input.policyVersion,
        content: input.policyContent
      },
      regionCode: input.request.regionCode,
      instanceId: process.env.EDGE_INSTANCE_ID || "unknown",
      telemetryEnabled: true,
      headers: input.headers
    };

    const adapterResult = await this.adapterRegistry.executeThroughAdapter(
      adapterSubsystem,
      input.request,
      adapterContext
    );

    const requestWithTrace = this.attachAdapterTrace(input.request, {
      mode: input.mode,
      status: adapterResult.success ? "adapter_success" : "adapter_failed",
      subsystem: adapterSubsystem,
      riskFactors: adapterResult.riskFactors || [],
      error: adapterResult.error
    });

    if (adapterResult.success) {
      return { request: requestWithTrace };
    }

    if (!strictEnforcement) {
      await this.telemetryService.sendAnomaly({
        anomalyType: "edge_adapter_execution_failed",
        severity: "medium",
        requestId: input.request.requestId,
        subsystem: input.request.subsystem,
        description: adapterResult.error || "Adapter execution reported failure",
        context: {
          sourceApp: input.sourceApp,
          adapterSubsystem,
          adapterMode: input.mode,
          riskFactors: adapterResult.riskFactors
        },
        timestamp: new Date().toISOString()
      });
      return { request: requestWithTrace };
    }

    const normalizedFactors = new Set(
      (adapterResult.riskFactors || []).map((factor) => String(factor).toLowerCase())
    );
    const shouldQuarantine =
      normalizedFactors.has("requires_review") ||
      normalizedFactors.has("high_fraud_risk") ||
      normalizedFactors.has("adapter_error");

    const rationale = this.extractAdapterFailureReason(adapterResult, adapterSubsystem);
    const riskScore = this.deriveAdapterRiskScore(adapterResult);

    if (shouldQuarantine) {
      return {
        request: requestWithTrace,
        override: {
          decision: DecisionType.QUARANTINE,
          rationale,
          riskScore,
          quarantine: {
            reason: "Adapter enforcement flagged request for manual review",
            duration: 3600000,
            escalationRequired: true
          }
        }
      };
    }

    return {
      request: requestWithTrace,
      override: {
        decision: DecisionType.BLOCK,
        rationale,
        riskScore
      }
    };
  }

  private resolveAdapterExecutionMode(headers: ExecuteHeaders): AdapterExecutionMode {
    const configured = (process.env.EDGE_ADAPTER_EXECUTION_MODE || "off").toLowerCase();
    const requestedHeaderMode = this.getHeader(headers, "x-edge-adapter-mode")?.toLowerCase();
    const allowHeaderOverride =
      process.env.NODE_ENV !== "production" || this.isAuthorizedEmergencyMutation(headers);

    const mode = requestedHeaderMode && allowHeaderOverride ? requestedHeaderMode : configured;
    if (mode === "shadow" || mode === "strict") {
      return mode;
    }
    return "off";
  }

  private resolveAdapterForSubsystem(subsystem: string): string | null {
    const map: Record<string, string> = {
      ecommerce: "ecommerce",
      payments: "payments",
      fraud: "fraud",
      matchmaking: "matchmaking",
      "ai-programs": "ai-programs",
      "ai-engine-chatbot": "chatbot",
      "proximity-geocoding": "proximity-geocoding",
      communication: "communication",
      "automated-marketing": "marketing",
      "places-venues": "places",
      localization: "localization",
      translations: "translations",
      billing: "billing"
    };
    return map[subsystem] || null;
  }

  private isStrictAdapterEnforcementEnabled(mode: AdapterExecutionMode, subsystem: string): boolean {
    if (mode !== "strict") {
      return false;
    }

    const scopedSubsystems = (process.env.EDGE_ADAPTER_STRICT_SUBSYSTEMS || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    if (scopedSubsystems.length === 0) {
      return true;
    }

    return scopedSubsystems.includes(subsystem.toLowerCase());
  }

  private extractAdapterFailureReason(adapterResult: AdapterResult, adapterSubsystem: string): string {
    const error =
      typeof adapterResult.error === "string" && adapterResult.error.trim()
        ? adapterResult.error.trim()
        : "adapter_rejected";
    return `Strict adapter enforcement blocked ${adapterSubsystem}: ${error}`;
  }

  private deriveAdapterRiskScore(adapterResult: AdapterResult): number {
    const normalizedFactors = new Set(
      (adapterResult.riskFactors || []).map((factor) => String(factor).toLowerCase())
    );
    let score = 0.82;

    if (normalizedFactors.has("high_fraud_risk")) {
      score += 0.1;
    } else if (normalizedFactors.has("requires_review") || normalizedFactors.has("adapter_error")) {
      score += 0.07;
    } else if (normalizedFactors.has("moderate_risk")) {
      score += 0.04;
    }

    if (normalizedFactors.has("compliance_violation") || normalizedFactors.has("policy_block")) {
      score += 0.06;
    }

    return Math.min(1, Number(score.toFixed(4)));
  }

  private attachAdapterTrace(
    request: ExecuteRequestDto,
    trace: {
      mode: AdapterExecutionMode;
      status: string;
      subsystem: string;
      riskFactors?: string[];
      error?: string;
    }
  ): ExecuteRequestDto {
    const context =
      request.context && typeof request.context === "object" && !Array.isArray(request.context)
        ? (request.context as Record<string, unknown>)
        : {};

    return {
      ...request,
      context: {
        ...context,
        adapterExecution: {
          ...trace,
          recordedAt: new Date().toISOString()
        }
      }
    };
  }

  private isHighRiskAction(request: ExecuteRequestDto) {
    const action = request.action || "";
    const subsystem = request.subsystem || "";
    return (
      /(delete|remove|revoke|refund|charge|transfer|cancel|deprecate|shutdown|destroy)/i.test(
        action
      ) || /(billing|wallet|payments|admin|auth|edge|marp)/i.test(subsystem)
    );
  }

  private assertPc365ForHighRisk(headers: ExecuteHeaders) {
    if (!this.pc365Guard) {
      throw new Error("PC365 guard is not configured for high-risk action");
    }

    this.pc365Guard.validateDestructiveAction({
      "x-pc365": headers["x-pc365"],
      "x-founder": headers["x-founder"],
      "x-device": headers["x-device"],
      authorization: headers.authorization
    });
  }

  private async evaluateEmergencyProtocolBlock(
    request: ExecuteRequestDto,
    headers: ExecuteHeaders
  ): Promise<{ blocked: boolean; message: string; policyVersion?: string }> {
    const snapshot = await this.fetchEmergencySnapshot();
    if (!snapshot.active) {
      return { blocked: false, message: "" };
    }

    if (
      snapshot.controls.allowFounderBypass &&
      headers["x-pc365"] &&
      headers["x-founder"] &&
      headers["x-device"]
    ) {
      return { blocked: false, message: "" };
    }

    const requestIp = this.resolveClientIp(headers);
    if (requestIp && this.isIpBlocked(requestIp, snapshot.controls.blockedIpRanges)) {
      return {
        blocked: true,
        message: "Emergency protocol blocked operations from this IP range.",
        policyVersion: snapshot.protocolId || "emergency-protocol"
      };
    }

    const region = (request.regionCode || "").toUpperCase();
    if (region && snapshot.controls.blockedRegions.includes(region)) {
      return {
        blocked: true,
        message: `Emergency protocol blocked operations in region ${region}.`,
        policyVersion: snapshot.protocolId || "emergency-protocol"
      };
    }

    const signal = `${request.subsystem} ${request.action}`.toLowerCase();
    const transactionPattern =
      /(transaction|payment|wallet|billing|charge|refund|transfer|checkout|invoice|reserve|settlement|chargeback|purchase|payout|withdraw|cashout|disburse|remittance)/i;

    if (snapshot.controls.freezeTransactions && transactionPattern.test(signal)) {
      return {
        blocked: true,
        message: "Emergency protocol froze transactional actions.",
        policyVersion: snapshot.protocolId || "emergency-protocol"
      };
    }

    if (
      snapshot.controls.freezeWalletPayouts &&
      /(payout|withdraw|cashout|disburse|remittance)/i.test(signal)
    ) {
      return {
        blocked: true,
        message: "Emergency protocol froze wallet payout actions.",
        policyVersion: snapshot.protocolId || "emergency-protocol"
      };
    }

    if (snapshot.controls.disableMajorFeatures) {
      return {
        blocked: true,
        message: "Emergency protocol disabled major feature execution.",
        policyVersion: snapshot.protocolId || "emergency-protocol"
      };
    }

    if (
      snapshot.controls.disabledFeatures.some(
        (feature) => feature === "*" || signal.includes(feature)
      )
    ) {
      return {
        blocked: true,
        message: "Emergency protocol disabled this feature.",
        policyVersion: snapshot.protocolId || "emergency-protocol"
      };
    }

    return { blocked: false, message: "" };
  }

  ingestEmergencyMutationEvent(
    payload: unknown,
    headers: ExecuteHeaders = {}
  ): { accepted: boolean; snapshot?: EmergencySnapshot; reason?: string } {
    if (!this.isAuthorizedEmergencyMutation(headers)) {
      return { accepted: false, reason: "unauthorized" };
    }

    const record =
      typeof payload === "object" && payload ? (payload as Record<string, unknown>) : {};
    const eventType =
      typeof record.eventType === "string" ? record.eventType : "emergency_protocol_mutated";
    if (eventType !== "emergency_protocol_mutated") {
      return { accepted: false, reason: "unsupported_event_type" };
    }

    const normalized = this.normalizeEmergencySnapshot({
      active: record.active,
      protocolId: record.protocolId,
      severity: record.severity,
      controls: record.controls,
      version: record.version,
      lastUpdatedAt: record.timestamp ?? record.lastUpdatedAt
    });

    this.emergencySnapshotCache = normalized;
    this.emergencySnapshotCacheExpiry =
      Date.now() + Number(process.env.EMERGENCY_POLICY_CACHE_MS || 5000);
    return { accepted: true, snapshot: normalized };
  }

  private async fetchEmergencySnapshot(): Promise<EmergencySnapshot> {
    const now = Date.now();
    if (this.emergencySnapshotCache && now < this.emergencySnapshotCacheExpiry) {
      return this.emergencySnapshotCache;
    }

    const base = process.env.ADMIN_GATEWAY_URL || "http://localhost:3001";
    const url = `${base.replace(/\/$/, "")}/api/admin/emergency-protocol?scope=enforcement`;
    const headers: Record<string, string> = {
      "cache-control": "no-store"
    };

    if (process.env.INTERNAL_SERVICE_TOKEN) {
      headers["x-internal-service-token"] = process.env.INTERNAL_SERVICE_TOKEN;
      headers.authorization = `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`;
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`emergency_policy_status_${response.status}`);
      }

      const payload = await response.json();
      const normalized = this.normalizeEmergencySnapshot(payload);
      this.emergencySnapshotCache = normalized;
      this.emergencySnapshotCacheExpiry =
        now + Number(process.env.EMERGENCY_POLICY_CACHE_MS || 5000);
      return normalized;
    } catch (error) {
      if (this.emergencySnapshotCache) {
        return this.emergencySnapshotCache;
      }

      if (process.env.NODE_ENV === "production") {
        const failSafe: EmergencySnapshot = {
          ...DEFAULT_EMERGENCY_SNAPSHOT,
          active: true,
          controls: {
            ...DEFAULT_EMERGENCY_SNAPSHOT.controls,
            freezeTransactions: true,
            freezeWalletPayouts: true,
            allowFounderBypass: false
          }
        };
        this.emergencySnapshotCache = failSafe;
        this.emergencySnapshotCacheExpiry = now + 1000;
        return failSafe;
      }

      return DEFAULT_EMERGENCY_SNAPSHOT;
    }
  }

  private normalizeEmergencySnapshot(value: unknown): EmergencySnapshot {
    const payload = typeof value === "object" && value ? (value as Record<string, unknown>) : {};
    const controls =
      typeof payload.controls === "object" && payload.controls
        ? (payload.controls as Record<string, unknown>)
        : {};

    return {
      active: Boolean(payload.active),
      protocolId: typeof payload.protocolId === "string" ? payload.protocolId : undefined,
      severity:
        payload.severity === "elevated" ||
        payload.severity === "critical" ||
        payload.severity === "lockdown"
          ? payload.severity
          : undefined,
      version:
        typeof payload.version === "number" && payload.version > 0 ? payload.version : undefined,
      lastUpdatedAt: typeof payload.lastUpdatedAt === "string" ? payload.lastUpdatedAt : undefined,
      controls: {
        disableMajorFeatures: Boolean(controls.disableMajorFeatures),
        disabledFeatures: Array.isArray(controls.disabledFeatures)
          ? controls.disabledFeatures
              .map((entry) => String(entry).trim().toLowerCase())
              .filter(Boolean)
          : [],
        freezeTransactions: Boolean(controls.freezeTransactions),
        freezeWalletPayouts: Boolean(controls.freezeWalletPayouts),
        blockedRegions: Array.isArray(controls.blockedRegions)
          ? controls.blockedRegions
              .map((entry) => String(entry).trim().toUpperCase())
              .filter(Boolean)
          : [],
        blockedIpRanges: Array.isArray(controls.blockedIpRanges)
          ? controls.blockedIpRanges.map((entry) => String(entry).trim()).filter(Boolean)
          : [],
        allowFounderBypass: controls.allowFounderBypass !== false
      }
    };
  }

  private isAuthorizedEmergencyMutation(headers: ExecuteHeaders): boolean {
    const internalToken = process.env.INTERNAL_SERVICE_TOKEN;
    if (!internalToken) {
      return process.env.NODE_ENV !== "production";
    }

    const providedToken = this.getHeader(headers, "x-internal-service-token");
    if (providedToken === internalToken) {
      return true;
    }

    const authorization = this.getHeader(headers, "authorization");
    if (authorization?.startsWith("Bearer ")) {
      return authorization.slice("Bearer ".length) === internalToken;
    }

    return false;
  }

  private getHeader(headers: ExecuteHeaders, name: string): string | undefined {
    const direct = headers[name];
    if (direct) return direct;

    const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
    return entry?.[1];
  }

  private resolveClientIp(headers: ExecuteHeaders): string {
    const forwarded = this.getHeader(headers, "x-forwarded-for");
    if (forwarded) {
      const first = forwarded
        .split(",")
        .map((part) => part.trim())
        .find(Boolean);
      if (first) return first;
    }

    return (
      this.getHeader(headers, "x-real-ip") ||
      this.getHeader(headers, "x-client-ip") ||
      this.getHeader(headers, "cf-connecting-ip") ||
      ""
    ).trim();
  }

  private isIpBlocked(ip: string, blockedRanges: string[]): boolean {
    if (!ip || !Array.isArray(blockedRanges) || blockedRanges.length === 0) {
      return false;
    }

    return blockedRanges.some((entry) => {
      if (entry.includes("/")) return this.isIpInCidr(ip, entry);
      return entry === ip;
    });
  }

  private isIpInCidr(ip: string, cidr: string): boolean {
    const [rangeIp, prefixRaw] = cidr.split("/");
    const prefix = Number(prefixRaw);
    if (!rangeIp || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
      return false;
    }

    const ipInt = this.ipToInt(ip);
    const rangeInt = this.ipToInt(rangeIp);
    if (ipInt === null || rangeInt === null) {
      return false;
    }

    if (prefix === 0) {
      return true;
    }
    const mask = (0xffffffff << (32 - prefix)) >>> 0;
    return (ipInt & mask) === (rangeInt & mask);
  }

  private ipToInt(ip: string): number | null {
    const parts = ip.split(".");
    if (parts.length !== 4) {
      return null;
    }

    let result = 0;
    for (const part of parts) {
      const n = Number(part);
      if (!Number.isInteger(n) || n < 0 || n > 255) {
        return null;
      }
      result = (result << 8) + n;
    }
    return result >>> 0;
  }

  private buildPc365Guard() {
    const master = process.env.PC_365_MASTER_TOKEN || "";
    const founder = process.env.FOUNDER_EMAIL || "";
    const device = process.env.SERVICE_DEVICE_FINGERPRINT || "";
    if (!master || !founder || !device) return null;

    try {
      return new PC365Guard({
        pc365MasterToken: master,
        founderEmail: founder,
        serviceDeviceFingerprint: device
      });
    } catch {
      return null;
    }
  }

  private extractCoordinationMetadata(request: ExecuteRequestDto) {
    const context =
      request.context && typeof request.context === "object" && !Array.isArray(request.context)
        ? (request.context as Record<string, unknown>)
        : {};
    const crossModule =
      context.crossModule &&
      typeof context.crossModule === "object" &&
      !Array.isArray(context.crossModule)
        ? (context.crossModule as Record<string, unknown>)
        : {};
    const orchestration =
      crossModule.orchestration &&
      typeof crossModule.orchestration === "object" &&
      !Array.isArray(crossModule.orchestration)
        ? (crossModule.orchestration as Record<string, unknown>)
        : {};

    return {
      version: typeof crossModule.version === "string" ? crossModule.version : undefined,
      coordinationHash:
        typeof crossModule.coordinationHash === "string" ? crossModule.coordinationHash : undefined,
      globalReady:
        typeof orchestration.globalReady === "boolean" ? orchestration.globalReady : undefined
    };
  }
}
