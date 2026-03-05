import { BillingSubscriptionRequest, BillingSubscriptionResult } from "./types";

type BillingPlan = { planId: string; price: number };

const PLAN_MAPPING: Record<string, BillingPlan> = {
  basic: { planId: "basic-free", price: 0 },
  premium: { planId: "premium-monthly", price: 49 },
  enterprise: { planId: "enterprise-monthly", price: 299 },
};

export interface BillingClient {
  linkSubscription(input: BillingSubscriptionRequest): Promise<BillingSubscriptionResult>;
}

export class BillingEngineClient implements BillingClient {
  private readonly billingBaseUrl: string;

  constructor(billingBaseUrl = process.env.BILLING_ENGINE_URL || "http://localhost:3100") {
    this.billingBaseUrl = billingBaseUrl;
  }

  async linkSubscription(input: BillingSubscriptionRequest): Promise<BillingSubscriptionResult> {
    const plan = PLAN_MAPPING[input.tier];
    const requestBody = {
      accountId: input.accountId,
      walletId: `wallet_${input.accountId}`,
      planId: plan.planId,
      price: plan.price,
      region: input.region as any,
      idempotencyKey: input.idempotencyKey,
      autoRenew: input.tier !== "basic",
    };

    if (plan.price === 0) {
      return {
        linked: true,
        provider: "billing-engine",
        planId: plan.planId,
        externalResult: { skippedRemoteCharge: true, reason: "free_plan" },
      };
    }

    const response = await fetch(`${this.billingBaseUrl}/marp/subscription/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        linked: false,
        provider: "billing-engine",
        planId: plan.planId,
        externalResult: { status: response.status, body },
      };
    }

    const externalResult = (await response.json()) as Record<string, unknown>;
    return {
      linked: true,
      provider: "billing-engine",
      planId: plan.planId,
      externalResult,
    };
  }
}
