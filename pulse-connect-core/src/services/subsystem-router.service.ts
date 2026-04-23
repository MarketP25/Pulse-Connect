import {
  Injectable,
  InternalServerErrorException,
  Logger,
  Inject,
  ServiceUnavailableException
} from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class SubsystemRouterService {
  private readonly logger = new Logger("SubsystemRouter");
  private readonly BREAKER_THRESHOLD = 5;
  private readonly RECOVERY_TIME_SEC = 60;

  constructor(@Inject("REDIS_CLIENT") private readonly redis: Redis) {}

  // Coordination: Mapping subsystems to their internal URLs (as defined in apps/pulse-portal)
  private readonly namespace = process.env.K8S_NAMESPACE || "pulsco";
  private readonly registry = {
    // Places & Venues
    places:
      process.env.PLACES_SERVICE_URL ||
      `http://places-service.${this.namespace}.svc.cluster.local:3001`,

    // Core Economic & Navigational Primitives
    ecommerce:
      process.env.ECOMMERCE_SERVICE_URL ||
      `http://ecommerce-service.${this.namespace}.svc.cluster.local:3004`,
    billing:
      process.env.BILLING_SERVICE_URL ||
      `http://billing-engine.${this.namespace}.svc.cluster.local:4002`,

    // Gig Economy & Matchmaking
    matchmaking:
      process.env.MATCHMAKING_SERVICE_URL ||
      `http://matchmaking-engine.${this.namespace}.svc.cluster.local:3003`,

    // AI-Driven Marketing (Pulse Agent Protocol)
    marketing:
      process.env.PAP_MARKETING_URL ||
      `http://pap-v1-service.${this.namespace}.svc.cluster.local:3002`,

    // Planetary Communication & AI Translation
    communication:
      process.env.COMMUNICATION_SERVICE_URL ||
      `http://communication-layer.${this.namespace}.svc.cluster.local:3006`,

    // Location Intelligence
    proximity:
      process.env.PROXIMITY_SERVICE_URL ||
      `http://proximity-geocoding.${this.namespace}.svc.cluster.local:3003`
  };

  async route(payload: any) {
    const subsystem = payload.subsystem;
    const target = this.registry[subsystem];

    if (!target) {
      this.logger.error(`Routing failed: Subsystem ${subsystem} not found in registry`);
      throw new InternalServerErrorException("Subsystem offline or unregistered");
    }

    // 1. Check Distributed Circuit Breaker State
    // Shared state ensures region-wide K8s DNS failures blow the fuse for all pods in the cluster.
    const breakerKey = `breaker:state:${subsystem}`;
    const state = await this.redis.get(breakerKey);

    if (state === "OPEN") {
      this.logger.error(
        `Circuit Open: Blocking request to ${subsystem} due to persistent failures.`
      );
      throw new ServiceUnavailableException(
        `Subsystem ${subsystem} is currently in isolation mode.`
      );
    }

    this.logger.log(`Routing ${payload.action} to ${subsystem} at ${target}`);

    try {
      // If matchmaking, enrich the payload with regional latency scores
      let enrichedPayload = payload;
      if (subsystem === "matchmaking") {
        const region = process.env.REGION_CODE || "us-east-1";
        const latencyScore = (await this.redis.get(`latency:score:${region}`)) || "1.0";

        enrichedPayload = {
          ...payload,
          routingMetadata: {
            originRegion: region,
            latencyWeight: parseFloat(latencyScore)
          }
        };
      }

      // Coordination: Simulated cross-service HTTP call
      const result = await this.executeSubsystemCall(target, enrichedPayload);

      // On successful resolution and call, reset the failure tracker
      await this.redis.del(`breaker:fail_count:${subsystem}`);

      return result;
    } catch (error) {
      await this.handleBreakerFailure(subsystem, error);
      throw error;
    }
  }

  private async handleBreakerFailure(subsystem: string, error: any) {
    const failKey = `breaker:fail_count:${subsystem}`;
    const failures = await this.redis.incr(failKey);

    this.logger.warn(
      `Connectivity failure to ${subsystem}: ${error.message} (Failures: ${failures})`
    );

    if (failures >= this.BREAKER_THRESHOLD) {
      this.logger.error(
        `CRITICAL: Isolation triggered for ${subsystem}. Opening circuit for ${this.RECOVERY_TIME_SEC}s.`
      );
      await this.redis.set(`breaker:state:${subsystem}`, "OPEN", "EX", this.RECOVERY_TIME_SEC);
    }
  }

  private async executeSubsystemCall(target: string, payload: any) {
    // Coordination: Logic for the actual HTTP call (e.g., fetch, axios)
    return {
      subsystemResponse: "ACK",
      executionId: Math.random().toString(36).substring(7)
    };
  }
}
