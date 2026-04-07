// MARP Governance Core Events
// Export all governance-related event types, interfaces, and services

export * from "./policy-events";
// TODO: Implement additional event modules
// export * from './governance-events';
// export * from './audit-events';
// export * from './compliance-events';

// Re-export common event interfaces
export interface BaseEvent {
  id: string;
  type: string;
  timestamp: Date;
  source: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export interface GovernanceEvent extends BaseEvent {
  governanceId: string;
  policyVersion: string;
  jurisdiction: string;
  complianceLevel: "strict" | "moderate" | "flexible";
}

export interface AuditEvent extends BaseEvent {
  auditId: string;
  action: string;
  resource: string;
  resourceId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  details?: Record<string, any>;
}

export interface ComplianceEvent extends BaseEvent {
  complianceId: string;
  regulation: string;
  requirement: string;
  status: "compliant" | "non_compliant" | "pending_review" | "exempted";
  severity: "low" | "medium" | "high" | "critical";
  remediationRequired: boolean;
  remediationDeadline?: Date;
}

// Event type constants
export const EVENT_TYPES = {
  // Policy Events
  POLICY_CREATED: "policy.created",
  POLICY_UPDATED: "policy.updated",
  POLICY_ACTIVATED: "policy.activated",
  POLICY_DEACTIVATED: "policy.deactivated",
  POLICY_VIOLATED: "policy.violated",
  POLICY_COMPLIANCE_CHECK: "policy.compliance_check",

  // Governance Events
  GOVERNANCE_DECISION_MADE: "governance.decision_made",
  GOVERNANCE_REVIEW_INITIATED: "governance.review_initiated",
  GOVERNANCE_APPROVAL_GRANTED: "governance.approval_granted",
  GOVERNANCE_APPROVAL_DENIED: "governance.approval_denied",
  GOVERNANCE_ESCALATION_TRIGGERED: "governance.escalation_triggered",

  // Audit Events
  AUDIT_LOG_CREATED: "audit.log_created",
  AUDIT_TRAIL_ACCESSED: "audit.trail_accessed",
  AUDIT_REPORT_GENERATED: "audit.report_generated",
  AUDIT_ANOMALY_DETECTED: "audit.anomaly_detected",

  // Compliance Events
  COMPLIANCE_CHECK_PASSED: "compliance.check_passed",
  COMPLIANCE_CHECK_FAILED: "compliance.check_failed",
  COMPLIANCE_VIOLATION_REPORTED: "compliance.violation_reported",
  COMPLIANCE_REMEDIATION_COMPLETED: "compliance.remediation_completed",
  COMPLIANCE_CERTIFICATION_RENEWED: "compliance.certification_renewed"
} as const;

// Event priority levels
export const EVENT_PRIORITIES = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
} as const;

// Event processing status
export const EVENT_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  RETRIED: "retried"
} as const;

// Jurisdiction constants
export const JURISDICTIONS = {
  GLOBAL: "global",
  REGIONAL: "regional",
  NATIONAL: "national",
  STATE: "state",
  LOCAL: "local"
} as const;

// Compliance frameworks
export const COMPLIANCE_FRAMEWORKS = {
  GDPR: "gdpr",
  CCPA: "ccpa",
  SOX: "sox",
  HIPAA: "hipaa",
  PCI_DSS: "pci_dss",
  ISO_27001: "iso_27001",
  MARP: "marp" // Market Arbitration Review Policies
} as const;

// Event factory functions
export function createPolicyEvent(
  type: string,
  policyId: string,
  details: Record<string, any>
): BaseEvent {
  return {
    id: generateEventId(),
    type,
    timestamp: new Date(),
    source: "marp-governance-core",
    metadata: {
      policyId,
      ...details
    }
  };
}

export function createGovernanceEvent(
  type: string,
  governanceId: string,
  jurisdiction: string,
  details: Record<string, any>
): GovernanceEvent {
  return {
    id: generateEventId(),
    type,
    timestamp: new Date(),
    source: "marp-governance-core",
    governanceId,
    policyVersion: details.policyVersion || "1.0.0",
    jurisdiction,
    complianceLevel: details.complianceLevel || "moderate",
    metadata: details
  };
}

export function createAuditEvent(
  action: string,
  resource: string,
  resourceId: string,
  success: boolean,
  details?: Record<string, any>
): AuditEvent {
  return {
    id: generateEventId(),
    type: EVENT_TYPES.AUDIT_LOG_CREATED,
    timestamp: new Date(),
    source: "marp-governance-core",
    auditId: generateAuditId(),
    action,
    resource,
    resourceId,
    success,
    details
  };
}

export function createComplianceEvent(
  regulation: string,
  requirement: string,
  status: string,
  severity: string,
  details?: Record<string, any>
): ComplianceEvent {
  return {
    id: generateEventId(),
    type: getComplianceEventType(status),
    timestamp: new Date(),
    source: "marp-governance-core",
    complianceId: generateComplianceId(),
    regulation,
    requirement,
    status: status as any,
    severity: severity as any,
    remediationRequired: status === "non_compliant",
    metadata: details
  };
}

// Helper functions
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateAuditId(): string {
  return `aud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateComplianceId(): string {
  return `cmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getComplianceEventType(status: string): string {
  switch (status) {
    case "compliant":
      return EVENT_TYPES.COMPLIANCE_CHECK_PASSED;
    case "non_compliant":
      return EVENT_TYPES.COMPLIANCE_VIOLATION_REPORTED;
    default:
      return EVENT_TYPES.COMPLIANCE_CHECK_FAILED;
  }
}

// Event validation functions
export function validateEvent(event: BaseEvent): boolean {
  return !!(
    event.id &&
    event.type &&
    event.timestamp &&
    event.source &&
    typeof event.timestamp.getTime === "function"
  );
}

export function validateGovernanceEvent(event: GovernanceEvent): boolean {
  return (
    validateEvent(event) &&
    !!event.governanceId &&
    !!event.jurisdiction &&
    ["strict", "moderate", "flexible"].includes(event.complianceLevel)
  );
}

export function validateAuditEvent(event: AuditEvent): boolean {
  return (
    validateEvent(event) &&
    !!event.auditId &&
    !!event.action &&
    !!event.resource &&
    typeof event.success === "boolean"
  );
}

export function validateComplianceEvent(event: ComplianceEvent): boolean {
  return (
    validateEvent(event) &&
    !!event.complianceId &&
    !!event.regulation &&
    !!event.requirement &&
    ["compliant", "non_compliant", "pending_review", "exempted"].includes(event.status) &&
    ["low", "medium", "high", "critical"].includes(event.severity)
  );
}

// Event processing utilities
export class EventProcessor {
  private static instance: EventProcessor;
  private eventQueue: BaseEvent[] = [];
  private processing = false;

  static getInstance(): EventProcessor {
    if (!EventProcessor.instance) {
      EventProcessor.instance = new EventProcessor();
    }
    return EventProcessor.instance;
  }

  async queueEvent(event: BaseEvent): Promise<void> {
    this.eventQueue.push(event);
    if (!this.processing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.eventQueue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        if (event) {
          await this.processEvent(event);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async processEvent(event: BaseEvent): Promise<void> {
    // Validate event
    if (!validateEvent(event)) {
      console.error("Invalid event:", event);
      return;
    }

    // Route event based on type
    switch (event.type) {
      case EVENT_TYPES.POLICY_CREATED:
      case EVENT_TYPES.POLICY_UPDATED:
      case EVENT_TYPES.POLICY_ACTIVATED:
      case EVENT_TYPES.POLICY_DEACTIVATED:
        await this.processPolicyEvent(event);
        break;

      case EVENT_TYPES.GOVERNANCE_DECISION_MADE:
      case EVENT_TYPES.GOVERNANCE_REVIEW_INITIATED:
        await this.processGovernanceEvent(event);
        break;

      case EVENT_TYPES.AUDIT_LOG_CREATED:
        await this.processAuditEvent(event);
        break;

      case EVENT_TYPES.COMPLIANCE_CHECK_PASSED:
      case EVENT_TYPES.COMPLIANCE_VIOLATION_REPORTED:
        await this.processComplianceEvent(event);
        break;

      default:
        console.log("Unknown event type:", event.type);
    }
  }

  private async processPolicyEvent(event: BaseEvent): Promise<void> {
    // Policy event processing logic
    console.log("Processing policy event:", event.type);
  }

  private async processGovernanceEvent(event: BaseEvent): Promise<void> {
    // Governance event processing logic
    console.log("Processing governance event:", event.type);
  }

  private async processAuditEvent(event: BaseEvent): Promise<void> {
    // Audit event processing logic
    console.log("Processing audit event:", event.type);
  }

  private async processComplianceEvent(event: BaseEvent): Promise<void> {
    // Compliance event processing logic
    console.log("Processing compliance event:", event.type);
  }
}

// Export singleton instance
export const eventProcessor = EventProcessor.getInstance();
