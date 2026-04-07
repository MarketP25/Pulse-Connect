import { randomUUID } from "crypto";
import { emitBillingEvent } from "../csi/instrumentation";

export interface BillingChargeRequest {
  accountId: string;
  region: string;
  amountUsd: number;
  currency: string;
  reason: string;
  traceId?: string;
}

export interface BillingChargeRecord extends BillingChargeRequest {
  id: string;
  createdAt: number;
}

export interface BillingSnapshot {
  totalCharges: number;
  totalAmountUsd: number;
  averageAmountUsd: number;
  region: string;
}

export class BillingService {
  private readonly records: BillingChargeRecord[] = [];

  async recordCharge(request: BillingChargeRequest): Promise<BillingChargeRecord> {
    const record: BillingChargeRecord = {
      ...request,
      id: randomUUID(),
      createdAt: Date.now()
    };

    this.records.push(record);
    emitBillingEvent(
      "billing.charge.recorded",
      request.region,
      {
        chargeId: record.id,
        accountId: request.accountId,
        amountUsd: request.amountUsd,
        currency: request.currency,
        reason: request.reason,
        traceId: request.traceId || null
      },
      {
        riskScore: request.amountUsd > 10_000 ? 68 : 24,
        performanceScore: 90
      }
    );

    return record;
  }

  async generateSnapshot(region = "GLOBAL"): Promise<BillingSnapshot> {
    const scoped = this.records.filter((record) =>
      region === "GLOBAL" ? true : record.region === region
    );
    const totalAmountUsd = scoped.reduce((sum, record) => sum + record.amountUsd, 0);
    const totalCharges = scoped.length;
    const averageAmountUsd =
      totalCharges === 0 ? 0 : Number((totalAmountUsd / totalCharges).toFixed(2));

    const snapshot: BillingSnapshot = {
      totalCharges,
      totalAmountUsd: Number(totalAmountUsd.toFixed(2)),
      averageAmountUsd,
      region
    };

    emitBillingEvent(
      "billing.snapshot.generated",
      region,
      {
        totalCharges: snapshot.totalCharges,
        totalAmountUsd: snapshot.totalAmountUsd,
        averageAmountUsd: snapshot.averageAmountUsd
      },
      {
        riskScore: totalCharges === 0 ? 30 : 14,
        performanceScore: 88
      }
    );

    return snapshot;
  }

  listCharges(): BillingChargeRecord[] {
    return [...this.records];
  }
}
