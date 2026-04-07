// Shared types for Pulsco Admin Governance System

export type AdminRoleType =
  | "superadmin"
  | "coo"
  | "business-ops"
  | "people-risk"
  | "procurement-partnerships"
  | "legal-finance"
  | "commercial-outreach"
  | "tech-security"
  | "customer-experience"
  | "governance-registrar"
  | "dpo";

export interface GovernanceIntent {
  id: string;
  name: string;
  description: string;
  purpose: string;
  responsibleAdmin: AdminRoleType;
  escalationRules: EscalationRule[];
  metrics: string[];
  thresholds: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface EscalationRule {
  id: string;
  condition: string;
  targetRole: AdminRoleType;
  timeoutMinutes: number;
  action: "notify" | "escalate" | "freeze" | "audit";
}
