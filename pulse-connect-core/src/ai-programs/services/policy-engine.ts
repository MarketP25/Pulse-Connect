/**
 * Policy Engine for Privacy-Aware Platform (PAP)
 * Evaluates user consent, data policies, and privacy requirements
 */

export interface Policy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  version: string;
  effectiveDate: Date;
  status: "active" | "inactive" | "draft";
}

export interface PolicyRule {
  id: string;
  condition: string;
  action: "allow" | "deny" | "require_consent";
  priority: number;
  metadata?: Record<string, any>;
}

export interface ConsentRecord {
  userId: string;
  policyId: string;
  granted: boolean;
  timestamp: Date;
  expiresAt?: Date;
  scope: string[];
}

export class PolicyEngine {
  private policies: Map<string, Policy> = new Map();
  private consentStore: Map<string, ConsentRecord[]> = new Map();

  /**
   * Load a policy into the engine
   */
  loadPolicy(policy: Policy): void {
    this.policies.set(policy.id, policy);
  }

  /**
   * Evaluate if an action is allowed based on policies and consent
   */
  async evaluateAction(
    userId: string,
    action: string,
    context: Record<string, any> = {}
  ): Promise<{ allowed: boolean; reason?: string; requiredConsent?: string[] }> {
    const userConsents = this.consentStore.get(userId) || [];

    for (const [policyId, policy] of this.policies) {
      if (policy.status !== "active") continue;

      for (const rule of policy.rules.sort((a, b) => b.priority - a.priority)) {
        if (this.matchesCondition(rule.condition, { action, ...context })) {
          const consent = userConsents.find((c) => c.policyId === policyId);

          switch (rule.action) {
            case "allow":
              return { allowed: true };

            case "deny":
              return { allowed: false, reason: `Policy ${policy.name} denies this action` };

            case "require_consent":
              if (!consent || !consent.granted || this.isExpired(consent)) {
                return {
                  allowed: false,
                  reason: `Consent required for policy ${policy.name}`,
                  requiredConsent: [policyId]
                };
              }
              return { allowed: true };
          }
        }
      }
    }

    return { allowed: true }; // Default allow if no matching policies
  }

  /**
   * Grant consent for a policy
   */
  grantConsent(userId: string, policyId: string, scope: string[] = ["*"], expiresAt?: Date): void {
    const consents = this.consentStore.get(userId) || [];

    const existingIndex = consents.findIndex((c) => c.policyId === policyId);
    const consent: ConsentRecord = {
      userId,
      policyId,
      granted: true,
      timestamp: new Date(),
      expiresAt,
      scope
    };

    if (existingIndex >= 0) {
      consents[existingIndex] = consent;
    } else {
      consents.push(consent);
    }

    this.consentStore.set(userId, consents);
  }

  /**
   * Revoke consent for a policy
   */
  revokeConsent(userId: string, policyId: string): void {
    const consents = this.consentStore.get(userId) || [];
    const filtered = consents.filter((c) => c.policyId !== policyId);
    this.consentStore.set(userId, filtered);
  }

  /**
   * Get all consents for a user
   */
  getUserConsents(userId: string): ConsentRecord[] {
    return this.consentStore.get(userId) || [];
  }

  /**
   * Check if consent is expired
   */
  private isExpired(consent: ConsentRecord): boolean {
    return consent.expiresAt ? new Date() > consent.expiresAt : false;
  }

  /**
   * Enhanced condition matching with support for complex expressions
   */
  private matchesCondition(condition: string, context: Record<string, any>): boolean {
    try {
      // Replace variables in condition with their values from context
      let processedCondition = condition;

      // Handle string literals and variables
      for (const [key, value] of Object.entries(context)) {
        const regex = new RegExp(`\\b${key}\\b`, "g");
        if (typeof value === "string") {
          processedCondition = processedCondition.replace(regex, `'${value}'`);
        } else {
          processedCondition = processedCondition.replace(regex, value.toString());
        }
      }

      // Evaluate the condition using Function constructor (safe for this use case)
      // This allows evaluation of expressions like: action == 'send_email' && (hour >= 22 || hour <= 6)
      const result = new Function("return " + processedCondition)();
      return Boolean(result);
    } catch (error) {
      console.warn("Failed to evaluate condition:", condition, error);
      return false;
    }
  }
}

// Default policies for PAP
export const DEFAULT_POLICIES: Policy[] = [
  {
    id: "data_collection",
    name: "Data Collection Policy",
    description: "Controls what user data can be collected",
    version: "1.0.0",
    effectiveDate: new Date(),
    status: "active",
    rules: [
      {
        id: "personal_data",
        condition: "action == 'collect_personal_data'",
        action: "require_consent",
        priority: 10
      }
    ]
  },
  {
    id: "data_sharing",
    name: "Data Sharing Policy",
    description: "Controls sharing of user data with third parties",
    version: "1.0.0",
    effectiveDate: new Date(),
    status: "active",
    rules: [
      {
        id: "third_party_sharing",
        condition: "action == 'share_with_third_party'",
        action: "require_consent",
        priority: 10
      }
    ]
  }
];
