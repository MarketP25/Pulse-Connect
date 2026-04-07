import { Injectable, Logger, Inject } from "@nestjs/common";
import { createHash } from "crypto";
import { Pool } from "pg";
import { PC365Guard } from "@pulsco/shared-lib";
import { ExecuteRequestDto, ExecuteResponseDto, DecisionType } from "../dto/execute-request.dto";
import { PolicyVersionDto } from "../dto/policy-version.dto";
import { SignatureVerifierService } from "./signature-verifier.service";
import { PolicyCacheService } from "./policy-cache.service";
import { ExecutionEngineService } from "./execution-engine.service";
import { TelemetryService } from "./telemetry.service";

const CSI_REASON_CODE = "CSI_GATEWAY_ACCESS";

type ExecuteHeaders = Record<string, string | undefined>;

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
    private readonly telemetryService: TelemetryService
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
          sourceApp
        }
      };

      // Add quarantine details if needed
      if (decision.type === DecisionType.QUARANTINE) {
        response.quarantine = {
          reason: decision.quarantineReason || "Policy violation",
          duration: decision.quarantineDuration || 3600000, // 1 hour default
          escalationRequired: decision.escalationRequired || false
        };
      }

      // Step 5: Send telemetry to MARP
      await this.telemetryService.sendTelemetry({
        ...response,
        originalRequest: request,
        policySnapshot: policySnapshot.id,
        reasonCode: CSI_REASON_CODE,
        sourceApp
      });

      // Step 6: Audit log
      await this.auditRequest(request, response, sourceApp);

      return response;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Request execution failed: ${message}`);

      // Send anomaly telemetry
      await this.telemetryService.sendAnomaly({
        anomalyType: "edge_execute_failure",
        severity: "high",
        requestId: request.requestId || "unknown",
        subsystem: request.subsystem,
        description: message,
        context: {
          action: request.action,
          reasonCode: CSI_REASON_CODE,
          sourceApp
        },
        timestamp: new Date().toISOString()
      });

      // Return blocked decision on error
      return {
        requestId: request.requestId,
        decision: DecisionType.BLOCK,
        rationale: `Execution failed: ${message}`,
        policyVersion: "error",
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
}
