export type Currency = "USD";

export type Region =
  | "Africa South 1"
  | "Europe West 1"
  | "Asia East 1"
  | "South America East 1"
  | "Middle East Central 1";

export interface Policy {
  policyId: string;
  version: string;
  signedBy: string;
  effectiveFrom: string; // ISO
  effectiveUntil?: string;
  scope: string;
  payload: any;
  signature?: string;
}

export interface Offer {
  offerId: string;
  policyId: string;
  policyVersion: string;
  scope: "subscriptions" | "usage" | "all";
  discountPercent?: number;
  discountFixed?: number;
  effectiveFrom: string;
  effectiveUntil?: string;
  maxRedemptions?: number;
}

export interface LedgerEntry {
  entryId: string;
  timestamp: string;
  accountId: string;
  walletId: string;
  type: string;
  amount: number;
  currency: Currency;
  balanceAfter: number;
  sourceEngine?: string;
  sourceEventId?: string;
  policyId?: string;
  policyVersion?: string;
  discounts?: Array<{ offerId: string; applied: number; policyId: string }>; 
  region?: Region;
  taxBreakdown?: { region: string; rate: number; amount: number }[];
  userExplanation?: string;
  idempotencyKey?: string;
  prevHash?: string | null;
  entryHash?: string;
}

export interface WalletRecord {
  walletId: string;
  accountId: string;
  currency: Currency;
  balance: number;
  status: "active" | "locked" | "closed";
}

export interface SubscriptionRecord {
  accountId: string;
  walletId: string;
  planId: string;
  price: number;
  region: Region;
  periodStart: string;
  periodEnd: string;
  status: 'active' | 'pending_change' | 'canceled' | 'closed';
  autoRenew?: boolean;
  pendingPlan?: { planId: string; price: number };
  pendingEffective?: string;
  canceledEffective?: string;
}

export interface ChargeBreakdown {
  base: number;
  multiplier: number;
  discounts: { offerId: string; amount: number }[];
  subtotal: number;
  tax: number;
  total: number;
  appliedPolicy?: Policy;
}

export type ActivityEngineType =
  | 'ecommerce'
  | 'matchmaking'
  | 'places'
  | 'communication'
  | 'pap_v1'
  | 'ai_programs'
  | 'localization';

export interface UsageEvent {
  engine: ActivityEngineType;
  eventId?: string;
  units?: number; // generic unit count
  amount?: number; // for ecommerce/purchase amount
  details?: any; // engine-specific payload
}

export interface ActivityChargeResult {
  base: number;
  fees: number;
  commission?: number;
  subtotal: number;
  tax: number;
  total: number;
  description?: string;
}
export type ActivityEngine = (event: UsageEvent, region?: Region, atIso?: string, policy?: Policy) => ActivityChargeResult;
