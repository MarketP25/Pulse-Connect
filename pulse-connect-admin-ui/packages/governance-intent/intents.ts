// Governance Intent Registry - Why metrics exist and who owns them
// Every metric must have a governance purpose and responsible admin

import { GovernanceIntent, AdminRoleType, EscalationRule } from "@pulsco/admin-shared-types";

export const GOVERNANCE_INTENTS: GovernanceIntent[] = [
  // SuperAdmin Intents
  {
    id: "global-system-health",
    name: "Global System Health Monitoring",
    description: "Monitor overall system health across all components and regions",
    purpose: "Ensure system availability and performance meets SLA requirements",
    responsibleAdmin: "superadmin",
    escalationRules: [
      {
        id: "critical-system-failure",
        condition: "system_availability < 0.99",
        targetRole: "tech-security",
        timeoutMinutes: 5,
        action: "escalate"
      }
    ],
    metrics: ["system_availability", "global_latency", "error_rate", "csi_health", "marp_health"],
    thresholds: {
      system_availability: 0.997,
      global_latency: 100,
      error_rate: 0.001
    },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  },

  // COO Intents
  {
    id: "operational-efficiency",
    name: "Operational Efficiency Tracking",
    description: "Monitor operational metrics and resource utilization",
    purpose: "Optimize operations and ensure efficient resource allocation",
    responsibleAdmin: "coo",
    escalationRules: [
      {
        id: "resource-utilization-high",
        condition: "cpu_utilization > 0.85",
        targetRole: "tech-security",
        timeoutMinutes: 15,
        action: "notify"
      }
    ],
    metrics: [
      "cpu_utilization",
      "memory_usage",
      "disk_usage",
      "network_throughput",
      "active_connections"
    ],
    thresholds: {
      cpu_utilization: 0.8,
      memory_usage: 0.85,
      disk_usage: 0.9
    },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  },

  // Business Operations Intents
  {
    id: "business-performance",
    name: "Business Performance Metrics",
    description: "Track key business metrics and operational KPIs",
    purpose: "Monitor business health and identify growth opportunities",
    responsibleAdmin: "business-ops",
    escalationRules: [
      {
        id: "revenue-decline",
        condition: "daily_revenue < previous_day * 0.9",
        targetRole: "coo",
        timeoutMinutes: 60,
        action: "escalate"
      }
    ],
    metrics: [
      "daily_revenue",
      "active_users",
      "transaction_volume",
      "conversion_rate",
      "churn_rate"
    ],
    thresholds: {
      conversion_rate: 0.05,
      churn_rate: 0.02
    },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  },

  // People & Risk Intents
  {
    id: "risk-management",
    name: "Risk Assessment and Mitigation",
    description: "Monitor risk indicators and compliance metrics",
    purpose: "Identify and mitigate operational and compliance risks",
    responsibleAdmin: "people-risk",
    escalationRules: [
      {
        id: "high-risk-detected",
        condition: "risk_score > 0.8",
        targetRole: "superadmin",
        timeoutMinutes: 30,
        action: "escalate"
      }
    ],
    metrics: [
      "risk_score",
      "compliance_violations",
      "security_incidents",
      "audit_findings",
      "policy_breaches"
    ],
    thresholds: {
      risk_score: 0.7,
      compliance_violations: 0,
      security_incidents: 0
    },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  },

  // Procurement & Partnerships Intents
  {
    id: "vendor-performance",
    name: "Vendor and Partnership Performance",
    description: "Monitor vendor SLAs and partnership metrics",
    purpose: "Ensure vendor compliance and optimize partnership value",
    responsibleAdmin: "procurement-partnerships",
    escalationRules: [
      {
        id: "vendor-sla-breach",
        condition: "vendor_sla_compliance < 0.95",
        targetRole: "coo",
        timeoutMinutes: 120,
        action: "notify"
      }
    ],
    metrics: [
      "vendor_sla_compliance",
      "partnership_revenue",
      "procurement_costs",
      "vendor_response_time"
    ],
    thresholds: {
      vendor_sla_compliance: 0.98,
      vendor_response_time: 24
    },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  },

  // Legal & Finance Intents
  {
    id: "financial-compliance",
    name: "Financial and Legal Compliance",
    description: "Monitor financial metrics and legal compliance indicators",
    purpose: "Ensure financial health and legal compliance across jurisdictions",
    responsibleAdmin: "legal-finance",
    escalationRules: [
      {
        id: "compliance-violation",
        condition: "legal_violations > 0",
        targetRole: "superadmin",
        timeoutMinutes: 15,
        action: "freeze"
      }
    ],
    metrics: [
      "cash_flow",
      "legal_violations",
      "regulatory_compliance",
      "financial_ratios",
      "audit_status"
    ],
    thresholds: {
      legal_violations: 0,
      regulatory_compliance: 1.0
    },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  },

  // Commercial & Global Outreach Intents
  {
    id: "market-expansion",
    name: "Market Expansion and Growth",
    description: "Track market expansion and global outreach metrics",
    purpose: "Monitor market penetration and expansion success",
    responsibleAdmin: "commercial-outreach",
    escalationRules: [
      {
        id: "market-penetration-low",
        condition: "market_penetration < 0.1",
        targetRole: "business-ops",
        timeoutMinutes: 240,
        action: "notify"
      }
    ],
    metrics: [
      "market_penetration",
      "regional_growth",
      "customer_acquisition_cost",
      "brand_awareness"
    ],
    thresholds: {
      market_penetration: 0.15,
      customer_acquisition_cost: 100
    },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  },

  // Tech & Security Intents
  {
    id: "security-monitoring",
    name: "Security and Technical Infrastructure",
    description: "Monitor security threats and technical infrastructure health",
    purpose: "Maintain security posture and technical system reliability",
    responsibleAdmin: "tech-security",
    escalationRules: [
      {
        id: "security-breach",
        condition: "security_threats > 0",
        targetRole: "superadmin",
        timeoutMinutes: 5,
        action: "freeze"
      }
    ],
    metrics: [
      "security_threats",
      "vulnerability_count",
      "patch_compliance",
      "infrastructure_health"
    ],
    thresholds: {
      security_threats: 0,
      vulnerability_count: 5,
      patch_compliance: 0.95
    },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  },

  // Customer Experience Intents
  {
    id: "customer-satisfaction",
    name: "Customer Experience and Satisfaction",
    description: "Monitor customer satisfaction and experience metrics",
    purpose: "Ensure high customer satisfaction and identify improvement areas",
    responsibleAdmin: "customer-experience",
    escalationRules: [
      {
        id: "satisfaction-decline",
        condition: "customer_satisfaction < 0.8",
        targetRole: "commercial-outreach",
        timeoutMinutes: 180,
        action: "escalate"
      }
    ],
    metrics: ["customer_satisfaction", "support_response_time", "resolution_rate", "nps_score"],
    thresholds: {
      customer_satisfaction: 0.85,
      support_response_time: 2,
      resolution_rate: 0.95
    },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  },

  // Governance Registrar Intents
  {
    id: "governance-oversight",
    name: "Governance and Audit Oversight",
    description: "Monitor governance processes and audit compliance",
    purpose: "Ensure governance processes are followed and audit requirements met",
    responsibleAdmin: "governance-registrar",
    escalationRules: [
      {
        id: "audit-failure",
        condition: "audit_compliance < 1.0",
        targetRole: "superadmin",
        timeoutMinutes: 60,
        action: "audit"
      }
    ],
    metrics: ["audit_compliance", "governance_violations", "policy_adherence", "decision_latency"],
    thresholds: {
      audit_compliance: 1.0,
      governance_violations: 0,
      policy_adherence: 1.0
    },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  },

  // DPO (Data Protection Officer) Intents
  {
    id: "data-protection",
    name: "Data Protection and Privacy Compliance",
    description: "Monitor data protection metrics and privacy compliance across the platform",
    purpose: "Ensure GDPR compliance, data privacy, and protection of user data",
    responsibleAdmin: "dpo",
    escalationRules: [
      {
        id: "data-breach-detected",
        condition: "data_breach_count > 0",
        targetRole: "superadmin",
        timeoutMinutes: 5,
        action: "freeze"
      },
      {
        id: "gdpr-compliance-low",
        condition: "gdpr_compliance < 0.95",
        targetRole: "legal-finance",
        timeoutMinutes: 30,
        action: "escalate"
      },
      {
        id: "dsar-overdue",
        condition: "dsar_requests_pending > 10",
        targetRole: "legal-finance",
        timeoutMinutes: 60,
        action: "notify"
      }
    ],
    metrics: [
      "gdpr_compliance",
      "data_breach_count",
      "privacy_policy_violations",
      "data_retention_compliance",
      "dsar_requests",
      "dsar_requests_pending",
      "data_anonymization_rate"
    ],
    thresholds: {
      gdpr_compliance: 0.98,
      data_breach_count: 0,
      privacy_policy_violations: 0,
      data_retention_compliance: 0.95,
      dsar_requests_pending: 5,
      data_anonymization_rate: 0.9
    },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  }
];

/**
 * Get governance intent by ID
 */
export function getGovernanceIntent(id: string): GovernanceIntent | undefined {
  return GOVERNANCE_INTENTS.find((intent) => intent.id === id);
}

/**
 * Get governance intents by responsible admin
 */
export function getGovernanceIntentsByAdmin(adminRole: AdminRoleType): GovernanceIntent[] {
  return GOVERNANCE_INTENTS.filter((intent) => intent.responsibleAdmin === adminRole);
}

/**
 * Get all metrics for a specific admin role
 */
export function getMetricsForAdmin(adminRole: AdminRoleType): string[] {
  const intents = getGovernanceIntentsByAdmin(adminRole);
  const metrics = new Set<string>();

  intents.forEach((intent) => {
    intent.metrics.forEach((metric) => metrics.add(metric));
  });

  return Array.from(metrics);
}

/**
 * Get escalation rules for a specific condition
 */
export function getEscalationRules(condition: string): EscalationRule[] {
  const rules: EscalationRule[] = [];

  GOVERNANCE_INTENTS.forEach((intent) => {
    intent.escalationRules.forEach((rule) => {
      if (rule.condition.includes(condition)) {
        rules.push(rule);
      }
    });
  });

  return rules;
}

/**
 * Validate if a metric is governed (has a responsible admin)
 */
export function isMetricGoverned(metricName: string): boolean {
  return GOVERNANCE_INTENTS.some((intent) => intent.metrics.includes(metricName));
}

/**
 * Get responsible admin for a metric
 */
export function getMetricOwner(metricName: string): AdminRoleType | null {
  const intent = GOVERNANCE_INTENTS.find((intent) => intent.metrics.includes(metricName));

  return intent ? intent.responsibleAdmin : null;
}
