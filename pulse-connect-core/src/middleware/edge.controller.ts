import {
  Controller,
  Post,
  Body,
  Get,
  HttpStatus,
  Res,
  Logger,
  Headers,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  Ip,
  Inject
} from "@nestjs/common";
import { AuditService } from "../services/audit.service";
import { SubsystemRouterService } from "../services/subsystem-router.service";
import { TelemetryService } from "../services/telemetry.service";
import { DeviceKeyService } from "../services/device-key.service";
import { RateLimiterService } from "../services/rate-limiter.service";
import { WalletService } from "../services/wallet.service";
import { PC365Guard } from "../shared/lib/src/pc365Guard";
import { AiSafetyService } from "../services/ai-safety.service";
import { Redis } from "ioredis";
import * as crypto from "crypto";

@Controller("edge")
export class EdgeController {
  private readonly logger = new Logger("EdgeController");

  constructor(
    private readonly audit: AuditService,
    private readonly telemetry: TelemetryService,
    private readonly keyService: DeviceKeyService,
    private readonly rateLimiter: RateLimiterService,
    private readonly router: SubsystemRouterService,
    private readonly wallet: WalletService,
    private readonly pc365: PC365Guard,
    private readonly aiSafety: AiSafetyService,
    @Inject("REDIS_CLIENT") private readonly redis: Redis
  ) {}

  @Post("register-key")
  async register(
    @Body() data: { userId: string; publicKey: string; kycToken: string },
    @Ip() ip: string
  ) {
    // 1. IP-based security limit (e.g., 50 attempts per hour from one network)
    const ipLimit = await this.rateLimiter.checkLimit(`ip:${ip}`, 50, 3600);
    if (!ipLimit.allowed) {
      this.logger.error(`Network threshold exceeded for IP: ${ip}`);
      throw new UnauthorizedException("Network security threshold reached.");
    }

    // 2. User-based sliding window: 3 attempts per 10 minutes (600s)
    const { allowed, count } = await this.rateLimiter.checkLimit(`reg:${data.userId}`, 3, 600);

    if (!allowed) {
      // Check for "extreme" brute-force activity (e.g., 10+ attempts in same window)
      if (count >= 10) {
        this.logger.error(
          `CRITICAL: Extreme brute force detected for User: ${data.userId}. Initiating asset freeze.`
        );
        await this.wallet.freezeAssets(
          data.userId,
          "Extreme brute-force activity on registration surface."
        );
        await this.telemetry.reportToCsi(
          { userId: data.userId, action: "governance:asset_freeze" },
          0
        );
      } else {
        this.logger.warn(
          `Governance threshold triggered for User: ${data.userId} - Brute force prevented.`
        );
      }

      // Reporting to CSI for risk scoring
      await this.telemetry.reportToCsi({ userId: data.userId, action: "blocked:brute_force" }, 0);
      throw new UnauthorizedException("MARP Governance Threshold Reached.");
    }

    try {
      return await this.keyService.registerKey(data.userId, data.publicKey, data.kycToken);
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  @Post("admin/lift-quarantine")
  async liftQuarantine(
    @Body() data: { userId: string; adminId: string; reason: string },
    @Headers() headers: any,
    @Headers("x-marp-signature") signature: string
  ) {
    // 1. PC365 Dual Control Validation (Founder Identity + Device + Attestation)
    this.pc365.validateDestructiveAction(headers);

    // 2. Coordination: Manually lift the temporary block in Redis
    await this.keyService.liftQuarantine(data.userId);

    // Immutable audit record of the human intervention
    const auditResult = await this.audit.recordAction(
      { subsystem: "governance", action: "quarantine:lift_manual", ...data },
      "allow",
      data.adminId,
      signature || "INTERNAL_ADMIN_OVERRIDE"
    );

    // Notify CSI that the risk state has been manually adjusted
    await this.telemetry.reportToCsi(
      { userId: data.userId, action: "governance:manual_lift", adminId: data.adminId },
      0
    );

    return { status: "lifted", userId: data.userId, auditHash: auditResult.hash };
  }

  @Post("internal/update-policy")
  async updatePolicy(@Body() policy: any) {
    const { signature, ...policyData } = policy;

    if (!signature) {
      throw new BadRequestException("MARP policy signature missing");
    }

    // 1. Canonicalize data (sorting keys) to match the signing process in CSI
    const canonicalData = JSON.stringify(policyData, Object.keys(policyData).sort());

    const publicKey = process.env.MARP_PUBLIC_KEY;
    if (!publicKey) {
      throw new InternalServerErrorException("MARP Public Key not configured");
    }

    try {
      // 2. Verify RSA-SHA256 Signature
      const verifier = crypto.createVerify("RSA-SHA256");
      verifier.update(canonicalData);

      const isValid = verifier.verify(publicKey, signature, "base64");

      if (!isValid) {
        this.logger.error(
          `MARP Policy update rejected: Invalid signature for epoch ${policy.epoch_version}`
        );
        throw new UnauthorizedException("Invalid MARP policy signature");
      }

      this.logger.log(`MARP Policy updated successfully to epoch: ${policy.epoch_version}`);

      // Propagation: Notify Intelligence Core via Redis Pub/Sub
      await this.redis.publish("marp_policy_updates", JSON.stringify(policy));

      // Coordination: The engine should now use these new thresholds for risk and velocity checks.
      return {
        status: "updated",
        epoch: policy.epoch_version,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Policy update failure: ${error.message}`);
      throw new UnauthorizedException("Governance signature verification failed");
    }
  }

  @Post("execute")
  async executeAction(@Body() payload: any, @Headers("x-marp-signature") signature: string) {
    const startTime = Date.now();
    let safetyResult;

    // AI-Backed Content Safety for Communication Subsystem
    if (payload.subsystem === "communication") {
      safetyResult = await this.aiSafety.scanContent(payload.data);

      if (safetyResult.status === "blocked") {
        throw new BadRequestException("Content blocked by Pulse AI Safety Filter.");
      }
    }

    let serviceResult;

    // 1. Intelligent Routing or Shadow Ban Simulation
    if (safetyResult?.status === "shadow_ban") {
      // Shadow Ban Logic: Simulate success without routing to the real subsystem
      this.logger.warn(`[SHADOW_BAN] Intercepted message from ${payload.userId}. Faking ACK.`);
      serviceResult = {
        subsystemResponse: "ACK",
        executionId: `sb_${crypto.randomBytes(4).toString("hex")}`,
        note: "Governance intercepted"
      };
    } else {
      // Normal execution flow
      serviceResult = await this.router.route(payload);
    }

    // 2. Immutable audit log entry via Packages
    const internalDecision = safetyResult?.status === "shadow_ban" ? "shadow_allow" : "allow";
    const auditResult = await this.audit.recordAction(
      payload,
      internalDecision,
      payload.userId || "system",
      signature
    );

    // 3. Telemetry reporting to Intelligence Core
    const duration = Date.now() - startTime;
    await this.telemetry.reportToCsi(payload, duration, safetyResult);

    return {
      status: "executed",
      traceId: crypto.randomUUID(),
      timestamp: auditResult.timestamp,
      decision: "allow",
      auditHash: auditResult.hash,
      data: serviceResult
    };
  }

  @Get("health/ready")
  async readiness(@Res() res: any) {
    try {
      // 1. Verify Redis connectivity via DeviceKeyService
      const isQuarantined = await this.keyService.isQuarantined("health-check-id");

      // 2. Verify MARP Public Key is loaded
      const hasKey = !!process.env.MARP_PUBLIC_KEY;

      if (!hasKey) {
        throw new Error("MARP_PUBLIC_KEY_NOT_LOADED");
      }

      // 3. Confirm Subsystem Coordination
      // Dynamically list all subsystems from the router's registry
      const availableSubsystems = Object.keys((this.router as any).registry);

      const status = {
        status: "ready",
        infrastructure: {
          redis: "connected",
          marp_vault: "active"
        },
        subsystems: availableSubsystems,
        version: "1.0.0-core",
        timestamp: new Date().toISOString()
      };

      return res.status(HttpStatus.OK).send(status);
    } catch (error) {
      this.logger.error(`Readiness check failed: ${error.message}`);
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).send({
        status: "unhealthy",
        error: error.message
      });
    }
  }
}
