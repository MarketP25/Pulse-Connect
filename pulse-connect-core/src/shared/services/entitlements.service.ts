export interface SubscriptionBase {
  id: string;
  user_id: string;
  plan: string;
  status: "active" | "inactive";
  created_at: Date;
}

export interface SubscriptionPAP {
  id: string;
  user_id: string;
  base_subscription_id: string;
  status: "active" | "inactive";
  created_at: Date;
}

export interface SubscriptionEntitlementPAP {
  id: string;
  subscription_pap_id: string;
  entitlement: string;
  limit: number;
  used: number;
}

export interface SubscriptionUsagePAP {
  id: string;
  subscription_pap_id: string;
  action: string;
  timestamp: Date;
  cost: number;
}

export class EntitlementsService {
  private subscriptionsBase: SubscriptionBase[] = [];
  private subscriptionsPAP: SubscriptionPAP[] = [];
  private entitlementsPAP: SubscriptionEntitlementPAP[] = [];
  private usagePAP: SubscriptionUsagePAP[] = [];

  /**
   * Create a base subscription
   */
  createBaseSubscription(sub: SubscriptionBase): void {
    this.subscriptionsBase.push(sub);
  }

  /**
   * Create a PAP subscription
   */
  createPAPSubscription(sub: SubscriptionPAP): void {
    this.subscriptionsPAP.push(sub);
  }

  /**
   * Add entitlement to PAP subscription
   */
  addEntitlement(ent: SubscriptionEntitlementPAP): void {
    this.entitlementsPAP.push(ent);
  }

  /**
   * Check gating rules
   */
  checkGating(user_id: string, action: string): { allowed: boolean; reason?: string } {
    const papSub = this.subscriptionsPAP.find(
      (s) => s.user_id === user_id && s.status === "active"
    );
    if (!papSub) {
      return { allowed: false, reason: "PAP subscription not active" };
    }

    const baseSub = this.subscriptionsBase.find(
      (s) => s.id === papSub.base_subscription_id && s.status === "active"
    );
    if (!baseSub) {
      return { allowed: false, reason: "Base subscription not active" };
    }

    const entitlement = this.entitlementsPAP.find(
      (e) => e.subscription_pap_id === papSub.id && e.entitlement === action
    );
    if (!entitlement) {
      return { allowed: false, reason: "No entitlement for this action" };
    }

    if (entitlement.used >= entitlement.limit) {
      return { allowed: false, reason: "Cap exceeded" };
    }

    // Additional checks can be added here (quiet hours, etc.)
    return { allowed: true };
  }

  /**
   * Record usage
   */
  recordUsage(subscription_pap_id: string, action: string, cost: number = 1): void {
    const usage: SubscriptionUsagePAP = {
      id: `usage_${Date.now()}`,
      subscription_pap_id,
      action,
      timestamp: new Date(),
      cost
    };
    this.usagePAP.push(usage);

    // Update entitlement used count
    const entitlement = this.entitlementsPAP.find(
      (e) => e.subscription_pap_id === subscription_pap_id && e.entitlement === action
    );
    if (entitlement) {
      entitlement.used += cost;
    }
  }

  /**
   * Get usage for a PAP subscription
   */
  getUsage(subscription_pap_id: string): SubscriptionUsagePAP[] {
    return this.usagePAP.filter((u) => u.subscription_pap_id === subscription_pap_id);
  }
}
