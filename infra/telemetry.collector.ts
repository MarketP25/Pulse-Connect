import { Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { HashChain } from "./../shared/lib/src/hashChain";

@Injectable()
export class TelemetryCollector {
  constructor(private readonly pool: Pool) {}

  /**
   * Ingests anonymized telemetry for CSI failure prediction.
   * Enforces encryption and rate-limiting flags at the GSO schema level.
   */
  async collectSignal(payload: {
    requestId: string;
    deviceId: string;
    regionCode: string;
    latencyMs: number;
    gpsDrift: number;
    payloadEncrypted: string;
    payloadIv: string;
  }) {
    // Generate a tamper-evident audit hash for MARP verification
    const ingestionHash = HashChain.auditHash(undefined, {
      requestId: payload.requestId,
      deviceId: payload.deviceId
    });

    await this.pool.query(
      `INSERT INTO gso_device_signals (
        request_id, anonymized_device_id, region_code,
        latency_ms, gps_drift_meters, payload_encrypted,
        payload_iv, ingestion_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        payload.requestId,
        payload.deviceId,
        payload.regionCode,
        payload.latencyMs,
        payload.gpsDrift,
        payload.payloadEncrypted,
        payload.payloadIv,
        ingestionHash
      ]
    );
  }
}
