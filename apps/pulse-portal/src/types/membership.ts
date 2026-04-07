export interface RegistrationTier {
  id: string;
  name: string;
  description: string;
  features: string[];
  requirements: string[];
  accessLevel: "public" | "authenticated" | "verified" | "business" | "admin" | "council";
  price: number;
  billingCycle?: "monthly" | "yearly";
  maxUsers?: number;
  apiLimits?: {
    requests: number;
    period: string;
  };
}

export interface MembershipLevel {
  id: string;
  name: string;
  priority: number;
  features: string[];
  limitations: string[];
  upgradePath?: string[];
  downgradePath?: string[];
}

export interface UserMembership {
  userId: string;
  tierId: string;
  status: "active" | "inactive" | "suspended" | "cancelled";
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  paymentMethod?: string;
  billingAddress?: any;
  usageStats: {
    apiCalls: number;
    storageUsed: number;
    activeUsers: number;
  };
}

export interface MembershipUpgrade {
  fromTier: string;
  toTier: string;
  priceDifference: number;
  prorationAmount: number;
  effectiveDate: string;
  requiresApproval: boolean;
}

// Predefined membership levels
export const MEMBERSHIP_LEVELS: MembershipLevel[] = [
  {
    id: "public",
    name: "Public Explorer",
    priority: 0,
    features: [
      "Basic place browsing",
      "Public venue information",
      "Localization services",
      "Community access"
    ],
    limitations: ["No personalized features", "Limited API access", "Basic support only"]
  },
  {
    id: "verified",
    name: "Verified Citizen",
    priority: 1,
    features: [
      "All public features",
      "Personalized recommendations",
      "Cross-subsystem data sync",
      "Priority support",
      "Advanced proximity features"
    ],
    limitations: ["API rate limits apply", "Some premium features excluded"],
    upgradePath: ["premium", "enterprise"]
  },
  {
    id: "premium",
    name: "Premium Member",
    priority: 2,
    features: [
      "All verified features",
      "Priority matchmaking",
      "Advanced analytics",
      "API access",
      "Custom integrations"
    ],
    limitations: ["Single user account", "Standard SLA"],
    upgradePath: ["enterprise"],
    downgradePath: ["verified"]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priority: 3,
    features: [
      "All premium features",
      "Multi-user management",
      "Custom SLAs",
      "Dedicated support",
      "Advanced security",
      "White-label options"
    ],
    limitations: [],
    downgradePath: ["premium", "verified"]
  }
];
