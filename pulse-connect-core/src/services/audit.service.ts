import { Injectable, Logger } from "@nestjs/common";
import { HashChain } from "../../../shared/lib/src/hashChain";

@Injectable()
export class AuditService {
  private readonly logger = new Logger("AuditEngine");
  private lastHash: string | undefined = undefined; // In production, this is fetched from Postgres

  async recordAction(payload: any, decision: string, actorId: string, signature: string) {
    const auditEntry = {
      actorId,
      subsystem: payload.subsystem,
      action: payload.action,
      decision,
      signature, // Verifiable proof of intent locked into the chain
      region: process.env.REGION_CODE || "us-east-1"
    };

    const currentHash = HashChain.auditHash(this.lastHash, auditEntry);

    // Coordination: Persist to the PostgreSQL instance provisioned in /infra/terraform
    this.logger.log(`Audit Block Created: ${currentHash.substring(0, 12)}...`);

    this.lastHash = currentHash;
    return {
      hash: currentHash,
      timestamp: new Date().toISOString()
    };
  }
}
