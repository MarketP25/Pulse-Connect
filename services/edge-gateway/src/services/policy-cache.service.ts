import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Pool } from "pg";

export type PolicySnapshot = {
  id: string;
  version: string;
  subsystem: string;
  content: {
    rules: Array<Record<string, unknown>>;
    riskThreshold?: number;
  };
  effectiveFrom: string;
  effectiveUntil?: string;
  lastUpdated: string;
};

type CacheEntry = {
  expiresAt: number;
  snapshot: PolicySnapshot;
};

@Injectable()
export class PolicyCacheService {
  private readonly logger = new Logger(PolicyCacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs = 60_000;

  constructor(@Inject("DATABASE_CONNECTION") private readonly db: Pool) {}

  async getActivePolicy(subsystem: string) {
    const now = Date.now();
    const cached = this.cache.get(subsystem);
    if (cached && cached.expiresAt > now) return cached.snapshot;

    const snapshot = await this.readPolicyFromDatabase(subsystem);
    this.cache.set(subsystem, { snapshot, expiresAt: now + this.ttlMs });
    return snapshot;
  }

  private async readPolicyFromDatabase(subsystem: string): Promise<PolicySnapshot> {
    const fallback = this.defaultPolicy(subsystem);

    try {
      const query = `
        SELECT id, version, subsystem, content_json, effective_from, effective_until, updated_at
        FROM edge_policies
        WHERE subsystem = $1 AND is_active = true
        ORDER BY updated_at DESC
        LIMIT 1
      `;
      const result = await this.db.query(query, [subsystem]);
      const row = result.rows?.[0];
      if (!row) return fallback;

      return {
        id: String(row.id ?? `policy-${subsystem}`),
        version: String(row.version ?? "default-v1"),
        subsystem: String(row.subsystem ?? subsystem),
        content: this.normalizeContent(row.content_json),
        effectiveFrom: this.toIso(row.effective_from) || fallback.effectiveFrom,
        effectiveUntil: this.toIso(row.effective_until),
        lastUpdated: this.toIso(row.updated_at) || fallback.lastUpdated
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to load policy for ${subsystem}; using fallback (${message})`);
      return fallback;
    }
  }

  private normalizeContent(rawContent: unknown): PolicySnapshot["content"] {
    if (!rawContent || typeof rawContent !== "object") {
      return { rules: [], riskThreshold: 0.8 };
    }

    const content = rawContent as Record<string, unknown>;
    const rules = Array.isArray(content.rules)
      ? (content.rules as Array<Record<string, unknown>>)
      : [];
    const riskThreshold =
      typeof content.riskThreshold === "number" && Number.isFinite(content.riskThreshold)
        ? content.riskThreshold
        : 0.8;

    return { rules, riskThreshold };
  }

  private defaultPolicy(subsystem: string): PolicySnapshot {
    const now = new Date().toISOString();
    return {
      id: `default-${subsystem}`,
      version: "default-v1",
      subsystem,
      content: {
        rules: [],
        riskThreshold: 0.8
      },
      effectiveFrom: now,
      lastUpdated: now
    };
  }

  private toIso(value: unknown) {
    if (!value) return undefined;
    if (value instanceof Date) return value.toISOString();
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
}
