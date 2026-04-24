import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Pool } from "pg";
import { RoutingEngine } from "../routing.engine";
import { PC365Guard } from "../../shared/lib/src/pc365Guard";
import { HashChain } from "../../shared/lib/src/hashChain";

@Injectable()
export class GSOService {
  private readonly logger = new Logger(GSOService.name);

  // Local cache for network nodes to meet <50ms target
  private nodesCache: any[] | null = null;
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 30000; // 30 second fallback TTL
  private readonly RETENTION_INTERVAL = "7 days";

  // Mock Notification Service Interface - In production, this would be an injected service
  private notificationService = {
    sendEmail: async (to: string, subject: string, body: string) => {
      this.logger.log(`[EMAIL] To: ${to}, Subject: ${subject}, Body: ${body.substring(0, 100)}...`);
    },
    sendDashboardNotification: async (
      userId: string,
      message: string,
      type: "info" | "warning" | "error"
    ) => {
      this.logger.log(
        `[DASHBOARD NOTIFICATION] User: ${userId}, Type: ${type}, Message: ${message.substring(0, 100)}...`
      );
    }
  };

  constructor(
    private readonly pool: Pool,
    private readonly routingEngine: RoutingEngine,
    private readonly pc365Guard: PC365Guard
  ) {}

  /**
   * Adds a region to the planetary catalog.
   * This powers the branding and localization synchronization globally.
   */
  async addRegionToCatalog(params: {
    regionCode: string;
    brandConfig: any;
    localeConfig: any;
    parentRegionCode?: string;
  }) {
    const code = params.regionCode.toUpperCase();
    await this.pool.query(
      `INSERT INTO region_catalog (
        region_code, parent_region_code, brand_config, locale_config
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (region_code) DO UPDATE SET
        brand_config = EXCLUDED.brand_config,
        locale_config = EXCLUDED.locale_config,
        updated_at = NOW()`,
      [
        code,
        params.parentRegionCode?.toUpperCase() || null,
        params.brandConfig,
        params.localeConfig
      ]
    );

    this.logger.log(`Region ${code} added to catalog.`);
  }

  /**
   * Fetches the branding and locale configuration for a specific region.
   * Uses the hierarchical fall-through function in the database.
   */
  async getRegionConfig(regionCode: string) {
    const res = await this.pool.query(
      `SELECT brand_config, locale_config FROM get_region_config($1)`,
      [regionCode.toUpperCase()]
    );

    return res.rows[0] || null;
  }

  /**
   * Primary entry point for planetary routing requests.
   * Targets <50ms decision time.
   */
  async resolvePlanetaryRoute(context: {
    userId: string;
    userHash: string;
    sourceRegion: string;
    sessionKey: string;
  }) {
    const startTime = Date.now();

    // 1. Fetch live node health and CSI risk signals from GSO schema
    const nodes = await this.getActiveNetworkNodes();

    // 2. Compute optimal node using the multi-vector algorithm
    const decision = this.routingEngine.calculateOptimalNode(nodes, context);

    // 3. Persist decision to gso_routing_decisions for audit/MARP dispatch
    const requestId = `req_${Date.now()}_${context.userHash.substring(0, 8)}`;
    await this.pool.query(
      `INSERT INTO gso_routing_decisions (
        request_id, session_key, user_hash, source_region,
        selected_node_id, decision_score, decision_vector,
        decision_time_ms, routing_mode
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        requestId,
        context.sessionKey,
        context.userHash,
        context.sourceRegion,
        decision.nodeId,
        decision.score,
        decision.vector,
        Date.now() - startTime,
        decision.mode
      ]
    );

    return decision;
  }

  /**
   * Enqueues a transaction for later replay when a region is isolated or degraded.
   * Ensures "Zero visible disruption" by acknowledging the request while deferring execution.
   */
  async enqueueDegradedTransaction(params: {
    idempotencyKey: string;
    payload: any;
    metadata?: any;
  }) {
    const payloadString = JSON.stringify(params.payload);
    const checksum = HashChain.hash(payloadString);

    // In production, payload_encrypted would be handled via a KMS/Vault provider
    // For MVP, we simulate the storage in the GSO orchestration schema (012)
    const res = await this.pool.query(
      `INSERT INTO gso_degraded_tx_queue (
        idempotency_key,
        payload_encrypted,
        payload_checksum,
        metadata
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING tx_id, status`,
      [
        params.idempotencyKey,
        payloadString, // Simulated encryption
        checksum,
        params.metadata || {}
      ]
    );

    this.logger.log(`Transaction ${params.idempotencyKey} queued in degraded mode.`);

    return {
      queued: true,
      txId: res.rows[0]?.tx_id,
      status: res.rows[0]?.status || "already_exists"
    };
  }

  /**
   * Notifies affected users about emergency status changes.
   * This would typically involve fetching user data based on the affected region/services.
   */
  private async notifyAffectedUsers(
    regionCode: string,
    status: "activated" | "deactivated",
    reason: string,
    emergencyLevel?: number
  ) {
    // In a production system, this would involve a more complex query
    // to identify users whose primary region, current session, or services
    // are directly impacted. For MVP, we'll simulate a few users.
    const affectedUsers = [
      {
        userId: "user-pulsco-001",
        email: "user1@pulsco.global",
        dashboardPreference: true,
        regionCode: "AF-EAST"
      },
      {
        userId: "user-pulsco-002",
        email: "user2@pulsco.global",
        dashboardPreference: true,
        regionCode: "AF-EAST"
      }
    ].filter((u) => u.regionCode === regionCode);

    const subject = `Pulsco Global Ltd Service Alert: Region ${regionCode} - Emergency Protocol ${status}`;
    const dashboardMessage = `Emergency Protocol for ${regionCode} ${status}. Reason: ${reason}. Level: ${emergencyLevel || "N/A"}. Check global status dashboard for updates.`;
    const emailBody =
      `Dear Pulsco User,\n\nThis is an important update regarding services in the ${regionCode} region.\n\n` +
      `Our Emergency Protocol has been ${status}. Reason: ${reason}. (Level: ${emergencyLevel || "N/A"})\n\n` +
      `During this time, you may experience degraded performance or temporary unavailability of certain services in this region.\n\n` +
      `We are working diligently to restore full service and will provide further updates on your dashboard and via email.\n\n` +
      `Thank you for your understanding.\n\nPulsco Global Ltd Operations Team`;

    for (const user of affectedUsers) {
      await this.notificationService.sendEmail(user.email, subject, emailBody);
      if (user.dashboardPreference)
        await this.notificationService.sendDashboardNotification(
          user.userId,
          dashboardMessage,
          status === "activated" ? "error" : "info"
        );
    }
  }

  /**
   * Background worker to replay transactions from the degraded queue.
   * Uses "FOR UPDATE SKIP LOCKED" to ensure planetary scaling across multiple GSO instances.
   */
  async processDegradedQueue(batchSize: number = 50) {
    const client = await this.pool.connect();
    try {
      // Fetch transactions for regions that are no longer isolated
      const res = await client.query(
        `SELECT q.* FROM gso_degraded_tx_queue q
         LEFT JOIN gso_region_isolations i ON (q.metadata->>'region_code') = i.region_code
         WHERE q.status = 'pending'
         AND (i.is_active IS NULL OR i.is_active = false)
         ORDER BY q.created_at ASC
         LIMIT $1
         FOR UPDATE OF q SKIP LOCKED`,
        [batchSize]
      );

      for (const tx of res.rows) {
        try {
          // 1. Verify Integrity via HashChain
          const payloadString =
            typeof tx.payload_encrypted === "string"
              ? tx.payload_encrypted
              : JSON.stringify(tx.payload_encrypted);

          const checksum = HashChain.hash(payloadString);
          if (checksum !== tx.payload_checksum) {
            throw new Error("Tamper detection: Checksum mismatch in queue");
          }

          // 2. Replay Logic (In production, this routes to the target subsystem adapter)
          this.logger.log(
            `Replaying transaction ${tx.tx_id} for region ${tx.metadata?.region_code}`
          );

          await client.query(
            `UPDATE gso_degraded_tx_queue SET status = 'completed', processed_at = NOW() WHERE tx_id = $1`,
            [tx.tx_id]
          );
        } catch (err) {
          this.logger.error(`Replay failed for TX ${tx.tx_id}: ${err.message}`);
          await client.query(
            `UPDATE gso_degraded_tx_queue SET status = 'failed', metadata = metadata || $2::jsonb WHERE tx_id = $1`,
            [tx.tx_id, JSON.stringify({ replay_error: err.message })]
          );
        }
      }
    } finally {
      client.release();
    }
  }

  /**
   * Periodically cleans up successfully replayed transactions from the queue.
   * Runs daily at midnight to maintain database performance at scale.
   * Retention is set to 7 days to allow for MARP audit window.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupCompletedTransactions() {
    this.logger.log("Starting periodic cleanup of gso_degraded_tx_queue...");
    try {
      const res = await this.pool.query(
        `DELETE FROM gso_degraded_tx_queue
         WHERE status = 'completed'
         AND processed_at < NOW() - INTERVAL $1`,
        [this.RETENTION_INTERVAL]
      );
      this.logger.log(`Cleanup complete. Purged ${res.rowCount} records.`);
    } catch (err) {
      this.logger.error(`Failed to cleanup degraded transaction queue: ${err.message}`);
    }
  }

  /**
   * Executes emergency isolation.
   * HARD RULE: Requires PC365 validation and Founder Approval.
   */
  async executeEmergencyProtocol(params: {
    level: number;
    regionCode: string;
    reason: string;
    headers: any; // PC365 Headers
  }) {
    // Validate Dual Control
    this.pc365Guard.validateDestructiveAction(params.headers);

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Log incident
      const incidentId = `EMERGENCY_${params.regionCode}_${Date.now()}`;
      await client.query(
        `INSERT INTO gso_emergency_incidents (incident_id, level, region_code, reason, pc365_verified)
         VALUES ($1, $2, $3, $4, true)`,
        [incidentId, params.level, params.regionCode, params.reason]
      );

      // 2. Update isolation state
      if (params.level >= 3) {
        await client.query(
          `INSERT INTO gso_region_isolations (region_code, is_active, emergency_level, reason, activated_at)
           VALUES ($1, true, $3, $4, NOW())
           ON CONFLICT (region_code) DO UPDATE SET is_active = true, emergency_level = $3`,
          [params.regionCode, true, params.level, params.reason]
        );
      }

      // 3. Log Action for MARP dispatch
      await client.query(
        `INSERT INTO gso_action_logs (action_type, outcome, region_code, detail)
         VALUES ($1, 'success', $2, $3)`,
        ["REGION_ISOLATION", params.regionCode, JSON.stringify({ level: params.level })]
      );

      await client.query("COMMIT");
      this.logger.warn(`Emergency Level ${params.level} activated for ${params.regionCode}`);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Pub/Sub Listener: Triggered via Redis/Kafka when an isolation event occurs.
   * Forces immediate cache invalidation across all GSO instances globally.
   */
  async handleRegionalIsolationEvent(event: {
    regionCode: string;
    action: "activated" | "deactivated";
  }) {
    this.logger.warn(
      `GSO received planetary signal: Region ${event.regionCode} isolation ${event.action}. Invalidating local caches.`
    );

    // Immediate invalidation
    this.nodesCache = null;
    this.lastCacheUpdate = 0;

    // Optional: Pre-warm the cache immediately after invalidation
    // to ensure the next user request doesn't suffer the "cold start" DB hit.
    await this.getActiveNetworkNodes();

    if (event.action === "deactivated") {
      this.processDegradedQueue().catch((err) =>
        this.logger.error(`Planetary deactivation replay trigger failed: ${err.message}`)
      );
    }

    this.logger.log(`GSO global state synchronized for region ${event.regionCode}.`);
  }

  /**
   * Deactivates emergency protocol and restores regional sync.
   * Automatically allows the user_routing_engine to return addresses to their origin.
   */
  async deactivateEmergencyProtocol(params: { regionCode: string; headers: any }) {
    this.pc365Guard.validateDestructiveAction(params.headers);

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Mark isolation as inactive
      await client.query(
        `UPDATE gso_region_isolations
         SET is_active = false, deactivated_at = NOW()
         WHERE region_code = $1`,
        [params.regionCode]
      );

      // 2. Resolve incident
      await client.query(
        `UPDATE gso_emergency_incidents
         SET status = 'resolved', resolved_at = NOW()
         WHERE region_code = $1 AND status = 'active'`,
        [params.regionCode]
      );

      // 3. Log restoration
      await client.query(
        `INSERT INTO gso_action_logs (action_type, outcome, region_code, detail)
         VALUES ($1, 'success', $2, $3)`,
        ["REGION_RESTORATION", params.regionCode, JSON.stringify({ status: "restored" })]
      );

      await client.query("COMMIT");
      this.logger.log(
        `Emergency Protocol deactivated for ${params.regionCode}. Nodes will return to pool.`
      );
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  private async getActiveNetworkNodes() {
    const now = Date.now();

    // Return cached nodes if within TTL and cache is warm
    if (this.nodesCache && now - this.lastCacheUpdate < this.CACHE_TTL) {
      return this.nodesCache;
    }

    // Refresh cache from DB
    // Join with isolations ensures isolated regions are excluded at the source
    const res = await this.pool.query(
      `SELECT n.* FROM gso_network_nodes n
       LEFT JOIN gso_region_isolations i ON n.region_code = i.region_code
       WHERE n.is_active = true
       AND n.health_status != 'offline'
       AND (i.is_active IS NULL OR i.is_active = false)`
    );

    this.nodesCache = res.rows;
    this.lastCacheUpdate = now;

    return this.nodesCache;
  }
}
