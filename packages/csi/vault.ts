import { createHash, randomUUID } from "crypto";

export type VaultCollection =
  | "aggregated_intelligence"
  | "pattern_models"
  | "risk_maps"
  | "historical_decisions"
  | "analytics_results"
  | "audit_logs";

export interface VaultAuthContext {
  actorId: string;
  actorRole: string;
  pc365Attestation: string;
  requestId?: string;
  founderApproved?: boolean;
  ipAddress?: string;
}

export interface VaultDocument {
  id: string;
  createdAt: number;
  updatedAt: number;
  [key: string]: any;
}

export interface VaultAuditLog extends VaultDocument {
  collection: VaultCollection;
  operation: "read" | "write" | "update";
  actorId: string;
  actorRole: string;
  pc365Verified: boolean;
  pc365AttestationHash: string;
  requestId?: string;
  success: boolean;
  detail?: string;
}

export interface SecureDatabaseAdapter {
  insert<T extends Record<string, any>>(collection: VaultCollection, document: T): Promise<T & VaultDocument>;
  query<T extends Record<string, any>>(
    collection: VaultCollection,
    predicate?: (document: T & VaultDocument) => boolean,
  ): Promise<Array<T & VaultDocument>>;
  update<T extends Record<string, any>>(
    collection: VaultCollection,
    id: string,
    patch: Partial<T>,
  ): Promise<(T & VaultDocument) | null>;
}

type CollectionStore = Map<string, VaultDocument>;

export class InMemorySecureDatabaseAdapter implements SecureDatabaseAdapter {
  private readonly collections: Record<VaultCollection, CollectionStore> = {
    aggregated_intelligence: new Map(),
    pattern_models: new Map(),
    risk_maps: new Map(),
    historical_decisions: new Map(),
    analytics_results: new Map(),
    audit_logs: new Map(),
  };

  async insert<T extends Record<string, any>>(collection: VaultCollection, document: T): Promise<T & VaultDocument> {
    const timestamp = Date.now();
    const persisted: T & VaultDocument = {
      ...document,
      id: randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.collections[collection].set(persisted.id, persisted);
    return persisted;
  }

  async query<T extends Record<string, any>>(
    collection: VaultCollection,
    predicate?: (document: T & VaultDocument) => boolean,
  ): Promise<Array<T & VaultDocument>> {
    const documents = Array.from(this.collections[collection].values()) as Array<T & VaultDocument>;
    if (!predicate) {
      return documents;
    }

    return documents.filter(predicate);
  }

  async update<T extends Record<string, any>>(
    collection: VaultCollection,
    id: string,
    patch: Partial<T>,
  ): Promise<(T & VaultDocument) | null> {
    const existing = this.collections[collection].get(id);
    if (!existing) {
      return null;
    }

    const updated: T & VaultDocument = {
      ...(existing as T & VaultDocument),
      ...patch,
      id,
      updatedAt: Date.now(),
    };

    this.collections[collection].set(id, updated);
    return updated;
  }
}

export class CSIIntelligenceVault {
  private readonly adapter: SecureDatabaseAdapter;

  constructor(adapter: SecureDatabaseAdapter) {
    this.adapter = adapter;
  }

  async storeAggregatedIntelligence(payload: Record<string, any>, context: VaultAuthContext): Promise<VaultDocument> {
    await this.assertAuthenticated(context);
    const record = await this.adapter.insert("aggregated_intelligence", payload);
    await this.writeAudit("aggregated_intelligence", "write", context, true, "storeAggregatedIntelligence");
    return record;
  }

  async storePatternModel(payload: Record<string, any>, context: VaultAuthContext): Promise<VaultDocument> {
    await this.assertAuthenticated(context);
    const record = await this.adapter.insert("pattern_models", payload);
    await this.writeAudit("pattern_models", "write", context, true, "storePatternModel");
    return record;
  }

  async storeRiskMap(payload: Record<string, any>, context: VaultAuthContext): Promise<VaultDocument> {
    await this.assertAuthenticated(context);
    const record = await this.adapter.insert("risk_maps", payload);
    await this.writeAudit("risk_maps", "write", context, true, "storeRiskMap");
    return record;
  }

  async storeHistoricalDecision(payload: Record<string, any>, context: VaultAuthContext): Promise<VaultDocument> {
    await this.assertAuthenticated(context);
    const record = await this.adapter.insert("historical_decisions", payload);
    await this.writeAudit("historical_decisions", "write", context, true, "storeHistoricalDecision");
    return record;
  }

  async storeAnalyticsResult(payload: Record<string, any>, context: VaultAuthContext): Promise<VaultDocument> {
    await this.assertAuthenticated(context);
    const record = await this.adapter.insert("analytics_results", payload);
    await this.writeAudit("analytics_results", "write", context, true, "storeAnalyticsResult");
    return record;
  }

  async getLatestIntelligenceSummary(context: VaultAuthContext): Promise<VaultDocument | null> {
    await this.assertAuthenticated(context);
    const records = await this.adapter.query("aggregated_intelligence");
    await this.writeAudit("aggregated_intelligence", "read", context, true, "getLatestIntelligenceSummary");

    if (records.length === 0) {
      return null;
    }

    return records.sort((a, b) => b.updatedAt - a.updatedAt)[0];
  }

  async getRecommendedActions(context: VaultAuthContext): Promise<VaultDocument[]> {
    await this.assertAuthenticated(context);
    const records = await this.adapter.query("historical_decisions");
    await this.writeAudit("historical_decisions", "read", context, true, "getRecommendedActions");
    return records.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getPerformanceInsights(context: VaultAuthContext): Promise<VaultDocument[]> {
    await this.assertAuthenticated(context);
    const records = await this.adapter.query("analytics_results");
    await this.writeAudit("analytics_results", "read", context, true, "getPerformanceInsights");
    return records.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async listAuditLogs(context: VaultAuthContext): Promise<VaultAuditLog[]> {
    await this.assertAuthenticated(context);
    const logs = await this.adapter.query<VaultAuditLog>("audit_logs");
    await this.writeAudit("audit_logs", "read", context, true, "listAuditLogs");
    return logs as VaultAuditLog[];
  }

  private async assertAuthenticated(context: VaultAuthContext): Promise<void> {
    const hasAttestation = typeof context.pc365Attestation === "string" && context.pc365Attestation.trim().length >= 12;
    const hasActor = Boolean(context.actorId && context.actorRole);

    if (!hasAttestation || !hasActor) {
      await this.writeAudit(
        "audit_logs",
        "write",
        context,
        false,
        "PC365 authentication failed for VAULT access",
      );
      throw new Error("PC365 authentication required for VAULT access");
    }
  }

  private async writeAudit(
    collection: VaultCollection,
    operation: VaultAuditLog["operation"],
    context: VaultAuthContext,
    success: boolean,
    detail?: string,
  ): Promise<void> {
    const attestationHash = createHash("sha256")
      .update(context.pc365Attestation || "missing")
      .digest("hex");

    const payload: Omit<VaultAuditLog, "id" | "createdAt" | "updatedAt"> = {
      collection,
      operation,
      actorId: context.actorId || "unknown",
      actorRole: context.actorRole || "unknown",
      pc365Verified: success,
      pc365AttestationHash: attestationHash,
      requestId: context.requestId,
      success,
      detail,
    };

    await this.adapter.insert("audit_logs", payload);
  }
}
