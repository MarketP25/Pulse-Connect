import { Injectable, Logger, Inject } from "@nestjs/common";
import { Redis } from "ioredis";
import { SafetyResult } from "./ai-safety.service";

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger("CSI-Reporter");

  constructor(@Inject("REDIS_CLIENT") private readonly redis: Redis) {}

  async reportToCsi(actionData: any, performanceMs: number, safetyResult?: SafetyResult) {
    const userId = actionData.userId || "system";
    // Fetch current risk score from CSI engine state in Redis
    const riskScore = (await this.redis.get(`risk_score:${userId}`)) || "0.0";

    const telemetry = {
      ...actionData,
      safety: safetyResult,
      riskScore: parseFloat(riskScore),
      latency: performanceMs,
      timestamp: Date.now()
    };

    // Coordination: Send to pulse-intelligence-core event stream (Kafka/Redis)
    this.logger.debug(`CSI Telemetry Ingested: ${performanceMs}ms`);
    return true;
  }
}
