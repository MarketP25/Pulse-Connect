import { PolicyRegistry } from "./policyRegistry";
import { LedgerService } from "./ledger";
import { WalletService } from "./wallet";
import { ChargeBreakdown, Region, Policy, SubscriptionRecord } from "./types";

const REGION_MULTIPLIERS: Record<Region, number> = {
  "Africa South 1": 0.8,
  "Europe West 1": 1.0,
  "Asia East 1": 0.9,
  "South America East 1": 0.85,
  "Middle East Central 1": 0.95
};

const REGION_TAX: Record<string, number> = {
  "Europe West 1": 0.2,
  USA: 0.0,
  "Africa South 1": 0.15,
  "Asia East 1": 0.1,
  "South America East 1": 0.15,
  "Middle East Central 1": 0.1
};

export class Orchestrator {
  // very small in-memory subscription store for access billing rules
  private subscriptions: Map<string, any> = new Map(); // key = accountId

  constructor(
    private policy: PolicyRegistry,
    private ledger: LedgerService,
    private wallet: WalletService,
    private persistence?: any
  ) {}

  calculateCharge(base: number, region: Region, offers: any[], atIso: string): ChargeBreakdown {
    const multiplier = REGION_MULTIPLIERS[region] ?? 1;
    const baseMultiplied = +(base * multiplier);
    // apply percent discounts first
    let discountPercent = 0;
    const discounts: { offerId: string; amount: number }[] = [];
    const eligible = this.policy
      .eligibleOffers("all", atIso)
      .concat(this.policy.eligibleOffers("subscriptions", atIso));
    for (const o of eligible) {
      if (o.discountPercent) discountPercent += o.discountPercent;
    }
    // caps for subscription stacking are policy-controlled; use 22% here
    if (discountPercent > 22) discountPercent = 22;
    const discountAmount = +(baseMultiplied * (discountPercent / 100));
    const subtotal = +(baseMultiplied - discountAmount);
    const taxRate = REGION_TAX[region] ?? 0;
    const tax = +(subtotal * taxRate);
    const total = +(subtotal + tax);

    const policy = this.policy.getPolicyFor("subscriptions", atIso) || undefined;

    return {
      base: baseMultiplied,
      multiplier,
      discounts: discounts,
      subtotal,
      tax,
      total,
      appliedPolicy: policy as Policy | undefined
    } as ChargeBreakdown;
  }
  // create a subscription (signup). By default subscriptions do not auto-renew to avoid surprise renewals.
  createSubscription(
    accountId: string,
    walletId: string,
    planId: string,
    planPrice: number,
    region: Region,
    atIso: string,
    idempotencyKey?: string,
    autoRenew = false
  ) {
    const breakdown = this.calculateCharge(planPrice, region, [], atIso);
    const before = this.wallet.get(walletId);
    if (!before) throw new Error("wallet-not-found");

    // idempotency: check ledger for same idempotencyKey
    if (idempotencyKey) {
      const existing = this.ledger
        .all()
        .find((e) => e.idempotencyKey === idempotencyKey && e.walletId === walletId);
      if (existing) return existing;
    }

    // charge full plan price on signup
    this.wallet.debit(walletId, breakdown.total);
    const after = this.wallet.get(walletId)!;

    const entry = this.ledger.append({
      entryId: `sub-signup-${Date.now()}`,
      timestamp: atIso,
      accountId,
      walletId,
      type: "subscription_signup",
      amount: breakdown.total,
      currency: "USD",
      balanceAfter: after.balance,
      policyId: breakdown.appliedPolicy?.policyId,
      policyVersion: breakdown.appliedPolicy?.version,
      region,
      taxBreakdown: [
        { region, rate: breakdown.tax > 0 ? (REGION_TAX[region] ?? 0) : 0, amount: breakdown.tax }
      ],
      userExplanation: `Signup charge for ${planId}`,
      idempotencyKey
    });

    // create subscription record valid for 30 days
    const periodStart = new Date(atIso);
    const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);
    const record = {
      accountId,
      walletId,
      planId,
      price: planPrice,
      region,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      status: "active",
      autoRenew
    };
    this.subscriptions.set(accountId, record);
    if (this.persistence && this.persistence.saveSubscription) {
      this.persistence.saveSubscription(record).catch(() => {});
    }
    return entry;
  }

  // renew an existing subscription — must be explicit (no surprise renewals)
  renewSubscription(accountId: string, atIso: string, idempotencyKey?: string) {
    const sub = this.subscriptions.get(accountId);
    if (!sub) throw new Error("subscription_not_found");
    if (sub.status !== "active") throw new Error("subscription_not_active");

    // idempotency
    if (idempotencyKey) {
      const existing = this.ledger
        .all()
        .find((e) => e.idempotencyKey === idempotencyKey && e.accountId === accountId);
      if (existing) return existing;
    }

    // bill full period price (no surprises)
    const breakdown = this.calculateCharge(sub.price, sub.region, [], atIso);
    this.wallet.debit(sub.walletId, breakdown.total);
    const after = this.wallet.get(sub.walletId)!;
    const entry = this.ledger.append({
      entryId: `sub-renew-${Date.now()}`,
      timestamp: atIso,
      accountId: sub.accountId,
      walletId: sub.walletId,
      type: "subscription_renewal",
      amount: breakdown.total,
      currency: "USD",
      balanceAfter: after.balance,
      policyId: breakdown.appliedPolicy?.policyId,
      policyVersion: breakdown.appliedPolicy?.version,
      region: sub.region,
      taxBreakdown: [
        {
          region: sub.region,
          rate: breakdown.tax > 0 ? (REGION_TAX[sub.region] ?? 0) : 0,
          amount: breakdown.tax
        }
      ],
      userExplanation: `Renewal charge for ${sub.planId}`,
      idempotencyKey
    });

    // advance period
    const newStart = new Date(atIso);
    const newEnd = new Date(newStart.getTime() + 30 * 24 * 60 * 60 * 1000);
    sub.periodStart = newStart.toISOString();
    sub.periodEnd = newEnd.toISOString();
    this.subscriptions.set(accountId, sub);
    if (this.persistence && this.persistence.saveSubscription) {
      this.persistence.saveSubscription(sub).catch(() => {});
    }
    return entry;
  }

  // upgrade mid-period: charge prorated difference for remainder of period
  upgradeSubscription(
    accountId: string,
    walletId: string,
    newPlanId: string,
    newPrice: number,
    atIso: string,
    idempotencyKey?: string
  ) {
    const sub = this.subscriptions.get(accountId);
    if (!sub) throw new Error("subscription_not_found");
    if (sub.walletId !== walletId) throw new Error("wallet_mismatch");

    // calculate prorated amount for remainder of current period
    const now = new Date(atIso).getTime();
    const periodStart = new Date(sub.periodStart).getTime();
    const periodEnd = new Date(sub.periodEnd).getTime();
    if (now >= periodEnd) throw new Error("period_already_ended");
    const remaining = periodEnd - now;
    const periodLen = periodEnd - periodStart;
    const ratio = remaining / periodLen;

    const proratedOld = sub.price * ratio;
    const proratedNew = newPrice * ratio;
    const delta = +(proratedNew - proratedOld);

    if (delta > 0) {
      // charge additional prorated amount
      if (idempotencyKey) {
        const existing = this.ledger
          .all()
          .find((e) => e.idempotencyKey === idempotencyKey && e.accountId === accountId);
        if (existing) return existing;
      }
      this.wallet.debit(walletId, delta);
      const after = this.wallet.get(walletId)!;
      const entry = this.ledger.append({
        entryId: `sub-upgrade-${Date.now()}`,
        timestamp: atIso,
        accountId,
        walletId,
        type: "subscription_prorate_charge",
        amount: delta,
        currency: "USD",
        balanceAfter: after.balance,
        policyId: undefined,
        policyVersion: undefined,
        region: sub.region,
        userExplanation: `Prorated upgrade from ${sub.planId} -> ${newPlanId}`,
        idempotencyKey
      });
      // apply new plan for remainder
      sub.planId = newPlanId;
      sub.price = newPrice;
      this.subscriptions.set(accountId, sub);
      if (this.persistence && this.persistence.saveSubscription) {
        this.persistence.saveSubscription(sub).catch(() => {});
      }
      return entry;
    } else {
      // downgrade — schedule at period end to avoid retroactive refunds
      sub.pendingPlan = { planId: newPlanId, price: newPrice };
      sub.pendingEffective = sub.periodEnd;
      sub.status = "pending_change";
      this.subscriptions.set(accountId, sub);
      if (this.persistence && this.persistence.saveSubscription) {
        this.persistence.saveSubscription(sub).catch(() => {});
      }
      return { note: "downgrade_scheduled", effective: sub.pendingEffective } as any;
    }
  }

  // cancel: mark cancel effective at period end (no immediate refund)
  cancelSubscription(accountId: string) {
    const sub = this.subscriptions.get(accountId);
    if (!sub) throw new Error("subscription_not_found");
    sub.status = "canceled";
    sub.canceledEffective = sub.periodEnd;
    this.subscriptions.set(accountId, sub);
    if (this.persistence && this.persistence.saveSubscription) {
      this.persistence.saveSubscription(sub).catch(() => {});
    }
    return { canceledEffective: sub.canceledEffective };
  }

  // helper to apply pending changes at period boundary — to be called by a scheduler
  applyPeriodBoundary(accountId: string, atIso: string) {
    const sub = this.subscriptions.get(accountId);
    if (!sub) return null;
    if (sub.pendingPlan && sub.pendingEffective && sub.pendingEffective === sub.periodEnd) {
      sub.planId = sub.pendingPlan.planId;
      sub.price = sub.pendingPlan.price;
      delete sub.pendingPlan;
      delete sub.pendingEffective;
      sub.status = "active";
    }
    if (sub.status === "canceled" && sub.canceledEffective === sub.periodEnd) {
      sub.status = "closed";
    }
    this.subscriptions.set(accountId, sub);
    if (this.persistence && this.persistence.saveSubscription) {
      this.persistence.saveSubscription(sub).catch(() => {});
    }
    return sub;
  }

  importSubscriptions(records: SubscriptionRecord[]) {
    for (const r of records) {
      this.subscriptions.set(r.accountId, r as any);
    }
  }

  getSubscription(accountId: string) {
    return this.subscriptions.get(accountId) || null;
  }

  // Alias for createSubscription - used by tests
  chargeSubscription(
    accountId: string,
    walletId: string,
    planId: string,
    planPrice: number,
    region: Region,
    atIso: string,
    idempotencyKey?: string
  ) {
    return this.createSubscription(
      accountId,
      walletId,
      planId,
      planPrice,
      region,
      atIso,
      idempotencyKey
    );
  }

  // Activity Billing: record usage events and charge via appropriate engine
  async recordUsage(
    accountId: string,
    walletId: string,
    event: any,
    region: Region,
    atIso: string,
    idempotencyKey?: string
  ) {
    // lazy-load activity engines to avoid adding heavy deps to core module
    const { getEngine } = await import("./activity");
    const engine = getEngine(event.engine);
    // fetch activity-specific policy if present (scope activity:<engine>)
    const policyScope = `activity:${event.engine}`;
    const policy = this.policy.getPolicyFor(policyScope, atIso);
    const charge = engine(event, region, atIso, policy || undefined);

    // idempotency: check ledger for same event idempotency or sourceEventId
    if (idempotencyKey) {
      const existing = this.ledger
        .all()
        .find((e) => e.idempotencyKey === idempotencyKey && e.accountId === accountId);
      if (existing) return existing;
    }

    // debit wallet
    this.wallet.debit(walletId, charge.total);
    const after = this.wallet.get(walletId)!;

    const entry = this.ledger.append({
      entryId: `activity-${event.engine}-${Date.now()}`,
      timestamp: atIso,
      accountId,
      walletId,
      type: `activity_${event.engine}`,
      amount: charge.total,
      currency: "USD",
      balanceAfter: after.balance,
      sourceEngine: event.engine,
      sourceEventId: event.eventId,
      userExplanation: charge.description,
      idempotencyKey
    } as any);

    if (this.persistence && this.persistence.saveLedgerEntry) {
      try {
        await this.persistence.saveLedgerEntry(entry);
      } catch (e) {
        /* bubble handled by caller */
      }
    }

    return entry;
  }
}
