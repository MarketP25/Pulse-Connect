// Admin Lifecycle Management for Pulsco Admin Governance System
// Handles onboarding, suspension, role transitions, and decommissioning

import {
  AdminRole,
  AdminRoleType,
  ADMIN_EMAILS,
  MAX_ADMIN_COUNT
} from "@pulsco/admin-shared-types";
import { AdminAuthClient } from "@pulsco/admin-auth-client";

export interface OnboardingRequest {
  email: string;
  proposedRole: AdminRoleType;
  requestedBy: AdminRoleType;
  justification: string;
  backgroundCheck?: {
    completed: boolean;
    clearanceLevel: "standard" | "enhanced" | "top-secret";
    expiryDate?: Date;
  };
  trainingCompleted?: boolean;
}

export interface OnboardingApproval {
  requestId: string;
  approved: boolean;
  approvedBy: AdminRoleType;
  approvalDate: Date;
  comments?: string;
  conditions?: string[];
}

export interface SuspensionRequest {
  adminId: string;
  adminRole: AdminRoleType;
  reason:
    | "security-incident"
    | "policy-violation"
    | "performance-issue"
    | "investigation"
    | "other";
  severity: "low" | "medium" | "high" | "critical";
  requestedBy: AdminRoleType;
  details: string;
  immediate: boolean; // instant suspension vs. pending approval
}

export interface SuspensionRecord {
  id: string;
  adminId: string;
  adminRole: AdminRoleType;
  reason: string;
  severity: string;
  requestedBy: AdminRoleType;
  approvedBy?: AdminRoleType;
  suspensionDate: Date;
  plannedLiftDate?: Date;
  actualLiftDate?: Date;
  status: "pending" | "active" | "lifted" | "permanent";
  details: string;
  remediationRequired: string[];
}

export interface RoleTransition {
  adminId: string;
  fromRole: AdminRoleType;
  toRole: AdminRoleType;
  requestedBy: AdminRoleType;
  approvedBy?: AdminRoleType;
  reason: string;
  effectiveDate: Date;
  transitionPlan: {
    knowledgeTransfer: string[];
    accessChanges: string[];
    trainingRequired: string[];
  };
  status: "pending" | "approved" | "completed" | "rejected";
}

export interface DecommissionRequest {
  adminId: string;
  adminRole: AdminRoleType;
  reason: "resignation" | "termination" | "role-elimination" | "performance" | "other";
  requestedBy: AdminRoleType;
  details: string;
  handoverPlan: {
    responsibilities: string[];
    knowledgeTransfer: string[];
    accessRevocation: string[];
    dataArchival: string[];
  };
}

export interface DecommissionRecord {
  id: string;
  adminId: string;
  adminRole: AdminRoleType;
  reason: string;
  requestedBy: AdminRoleType;
  approvedBy?: AdminRoleType;
  decommissionDate: Date;
  status: "pending" | "in-progress" | "completed";
  handoverCompletion: number; // percentage
  cryptographicRevocation: {
    certificatesRevoked: boolean;
    keysDestroyed: boolean;
    auditLogsArchived: boolean;
  };
}

export interface LifecycleConfig {
  apiBaseUrl: string;
  authToken: string;
  approvalWorkflow: {
    onboardingRequiresApproval: boolean;
    suspensionRequiresApproval: boolean;
    roleTransitionRequiresApproval: boolean;
    decommissionRequiresApproval: boolean;
  };
  escalationRules: {
    criticalSuspensionEscalation: AdminRoleType;
    roleTransitionEscalation: AdminRoleType;
    decommissionEscalation: AdminRoleType;
  };
}

export class AdminLifecycleManager {
  private config: LifecycleConfig;
  private authClient: AdminAuthClient;
  private onboardingRequests: Map<string, OnboardingRequest> = new Map();
  private suspensionRecords: Map<string, SuspensionRecord> = new Map();
  private roleTransitions: Map<string, RoleTransition> = new Map();
  private decommissionRecords: Map<string, DecommissionRecord> = new Map();

  constructor(config: LifecycleConfig) {
    this.config = config;
    this.authClient = new AdminAuthClient({
      apiBaseUrl: config.apiBaseUrl,
      sessionDurationMinutes: 15,
      codeExpirySeconds: 60,
      maxRetries: 3
    });
  }

  /**
   * Initiate admin onboarding process
   */
  async initiateOnboarding(request: OnboardingRequest): Promise<string> {
    // Validate request
    if (!this.validateOnboardingRequest(request)) {
      throw new Error("Invalid onboarding request");
    }

    // Check admin count limit
    const currentCount = await this.getActiveAdminCount();
    if (currentCount >= MAX_ADMIN_COUNT) {
      throw new Error("Maximum admin count reached");
    }

    // Generate request ID
    const requestId = `onboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store request
    this.onboardingRequests.set(requestId, request);

    // If approval required, create approval workflow
    if (this.config.approvalWorkflow.onboardingRequiresApproval) {
      await this.createApprovalWorkflow(requestId, "onboarding", request.requestedBy);
    } else {
      // Auto-approve and proceed
      await this.approveOnboarding(requestId, request.requestedBy, "Auto-approved");
    }

    return requestId;
  }

  /**
   * Approve onboarding request
   */
  async approveOnboarding(
    requestId: string,
    approvedBy: AdminRoleType,
    comments?: string,
    conditions?: string[]
  ): Promise<boolean> {
    const request = this.onboardingRequests.get(requestId);
    if (!request) {
      throw new Error("Onboarding request not found");
    }

    const approval: OnboardingApproval = {
      requestId,
      approved: true,
      approvedBy,
      approvalDate: new Date(),
      comments,
      conditions
    };

    // Send approval to backend
    const success = await this.submitOnboardingApproval(approval);

    if (success) {
      // Complete onboarding
      await this.completeOnboarding(request, approval);
    }

    return success;
  }

  /**
   * Suspend an admin
   */
  async suspendAdmin(suspensionRequest: SuspensionRequest): Promise<string> {
    // Validate request
    if (!this.validateSuspensionRequest(suspensionRequest)) {
      throw new Error("Invalid suspension request");
    }

    // Generate suspension ID
    const suspensionId = `suspend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const suspensionRecord: SuspensionRecord = {
      id: suspensionId,
      adminId: suspensionRequest.adminId,
      adminRole: suspensionRequest.adminRole,
      reason: suspensionRequest.reason,
      severity: suspensionRequest.severity,
      requestedBy: suspensionRequest.requestedBy,
      suspensionDate: new Date(),
      status: suspensionRequest.immediate ? "active" : "pending",
      details: suspensionRequest.details,
      remediationRequired: this.generateRemediationSteps(suspensionRequest)
    };

    // Store record
    this.suspensionRecords.set(suspensionId, suspensionRecord);

    // If immediate suspension, execute immediately
    if (suspensionRequest.immediate) {
      await this.executeSuspension(suspensionRecord);
    } else if (this.config.approvalWorkflow.suspensionRequiresApproval) {
      await this.createApprovalWorkflow(suspensionId, "suspension", suspensionRequest.requestedBy);
    }

    // Escalate if critical
    if (suspensionRequest.severity === "critical") {
      await this.escalateSuspension(suspensionRecord);
    }

    return suspensionId;
  }

  /**
   * Lift admin suspension
   */
  async liftSuspension(
    suspensionId: string,
    liftedBy: AdminRoleType,
    reason: string
  ): Promise<boolean> {
    const suspension = this.suspensionRecords.get(suspensionId);
    if (!suspension) {
      throw new Error("Suspension record not found");
    }

    suspension.actualLiftDate = new Date();
    suspension.status = "lifted";

    // Execute lift
    const success = await this.executeSuspensionLift(suspension, reason);

    return success;
  }

  /**
   * Initiate role transition
   */
  async initiateRoleTransition(transition: Omit<RoleTransition, "status">): Promise<string> {
    // Validate transition
    if (!this.validateRoleTransition(transition)) {
      throw new Error("Invalid role transition");
    }

    // Generate transition ID
    const transitionId = `transition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fullTransition: RoleTransition = {
      ...transition,
      status: "pending"
    };

    // Store transition
    this.roleTransitions.set(transitionId, fullTransition);

    // Create approval workflow if required
    if (this.config.approvalWorkflow.roleTransitionRequiresApproval) {
      await this.createApprovalWorkflow(transitionId, "role-transition", transition.requestedBy);
    } else {
      await this.approveRoleTransition(transitionId, transition.requestedBy);
    }

    return transitionId;
  }

  /**
   * Approve role transition
   */
  async approveRoleTransition(transitionId: string, approvedBy: AdminRoleType): Promise<boolean> {
    const transition = this.roleTransitions.get(transitionId);
    if (!transition) {
      throw new Error("Role transition not found");
    }

    transition.approvedBy = approvedBy;
    transition.status = "approved";

    // Execute transition
    const success = await this.executeRoleTransition(transition);

    if (success) {
      transition.status = "completed";
    }

    return success;
  }

  /**
   * Initiate admin decommissioning
   */
  async initiateDecommission(decommissionRequest: DecommissionRequest): Promise<string> {
    // Validate request
    if (!this.validateDecommissionRequest(decommissionRequest)) {
      throw new Error("Invalid decommission request");
    }

    // Generate decommission ID
    const decommissionId = `decommission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const decommissionRecord: DecommissionRecord = {
      id: decommissionId,
      adminId: decommissionRequest.adminId,
      adminRole: decommissionRequest.adminRole,
      reason: decommissionRequest.reason,
      requestedBy: decommissionRequest.requestedBy,
      decommissionDate: new Date(),
      status: "pending",
      handoverCompletion: 0,
      cryptographicRevocation: {
        certificatesRevoked: false,
        keysDestroyed: false,
        auditLogsArchived: false
      }
    };

    // Store record
    this.decommissionRecords.set(decommissionId, decommissionRecord);

    // Create approval workflow if required
    if (this.config.approvalWorkflow.decommissionRequiresApproval) {
      await this.createApprovalWorkflow(
        decommissionId,
        "decommission",
        decommissionRequest.requestedBy
      );
    } else {
      await this.approveDecommission(decommissionId, decommissionRequest.requestedBy);
    }

    return decommissionId;
  }

  /**
   * Approve decommission request
   */
  async approveDecommission(decommissionId: string, approvedBy: AdminRoleType): Promise<boolean> {
    const decommission = this.decommissionRecords.get(decommissionId);
    if (!decommission) {
      throw new Error("Decommission record not found");
    }

    decommission.approvedBy = approvedBy;
    decommission.status = "in-progress";

    // Start decommissioning process
    const success = await this.executeDecommission(decommission);

    if (success) {
      decommission.status = "completed";
    }

    return success;
  }

  /**
   * Get lifecycle statistics
   */
  getLifecycleStats(): {
    activeAdmins: number;
    suspendedAdmins: number;
    pendingOnboardings: number;
    pendingTransitions: number;
    pendingDecommissions: number;
    recentActivity: any[];
  } {
    const activeAdmins = 11; // Would be fetched from API
    const suspendedAdmins = Array.from(this.suspensionRecords.values()).filter(
      (s) => s.status === "active"
    ).length;
    const pendingOnboardings = this.onboardingRequests.size;
    const pendingTransitions = Array.from(this.roleTransitions.values()).filter(
      (t) => t.status === "pending"
    ).length;
    const pendingDecommissions = Array.from(this.decommissionRecords.values()).filter(
      (d) => d.status === "pending"
    ).length;

    // Recent activity (simplified)
    const recentActivity = [
      ...Array.from(this.onboardingRequests.values()).slice(-3),
      ...Array.from(this.suspensionRecords.values()).slice(-3),
      ...Array.from(this.roleTransitions.values()).slice(-3),
      ...Array.from(this.decommissionRecords.values()).slice(-3)
    ]
      .sort(
        (a, b) =>
          new Date(
            b.createdAt || b.suspensionDate || b.effectiveDate || b.decommissionDate
          ).getTime() -
          new Date(
            a.createdAt || a.suspensionDate || a.effectiveDate || a.decommissionDate
          ).getTime()
      )
      .slice(0, 10);

    return {
      activeAdmins,
      suspendedAdmins,
      pendingOnboardings,
      pendingTransitions,
      pendingDecommissions,
      recentActivity
    };
  }

  // Private helper methods

  private async getActiveAdminCount(): Promise<number> {
    // In real implementation, fetch from API
    return 9; // Mock value
  }

  private validateOnboardingRequest(request: OnboardingRequest): boolean {
    return !!(
      request.email &&
      request.proposedRole &&
      request.requestedBy &&
      request.justification &&
      ADMIN_EMAILS[request.proposedRole] === request.email
    );
  }

  private validateSuspensionRequest(request: SuspensionRequest): boolean {
    return !!(
      request.adminId &&
      request.adminRole &&
      request.reason &&
      request.severity &&
      request.requestedBy &&
      request.details
    );
  }

  private validateRoleTransition(transition: Omit<RoleTransition, "status">): boolean {
    return !!(
      transition.adminId &&
      transition.fromRole &&
      transition.toRole &&
      transition.requestedBy &&
      transition.reason &&
      transition.effectiveDate
    );
  }

  private validateDecommissionRequest(request: DecommissionRequest): boolean {
    return !!(
      request.adminId &&
      request.adminRole &&
      request.reason &&
      request.requestedBy &&
      request.details
    );
  }

  private generateRemediationSteps(request: SuspensionRequest): string[] {
    const steps: string[] = [];

    switch (request.reason) {
      case "security-incident":
        steps.push("Complete security awareness training");
        steps.push("Change all passwords and revoke compromised tokens");
        steps.push("Review access logs for unauthorized activity");
        break;
      case "policy-violation":
        steps.push("Review company policies and procedures");
        steps.push("Complete ethics and compliance training");
        steps.push("Implement additional oversight measures");
        break;
      case "performance-issue":
        steps.push("Complete performance improvement plan");
        steps.push("Receive additional training in deficient areas");
        steps.push("Demonstrate sustained improvement");
        break;
      default:
        steps.push("Address underlying issues identified");
        steps.push("Implement corrective action plan");
        steps.push("Receive approval from supervising admin");
    }

    return steps;
  }

  private async createApprovalWorkflow(
    itemId: string,
    type: "onboarding" | "suspension" | "role-transition" | "decommission",
    requestedBy: AdminRoleType
  ): Promise<void> {
    // In real implementation, create approval workflow
    console.log(`Created approval workflow for ${type}: ${itemId}`);
  }

  private async submitOnboardingApproval(approval: OnboardingApproval): Promise<boolean> {
    // In real implementation, submit to API
    console.log("Submitted onboarding approval:", approval);
    return true;
  }

  private async completeOnboarding(
    request: OnboardingRequest,
    approval: OnboardingApproval
  ): Promise<void> {
    // In real implementation, complete onboarding process
    console.log("Completed onboarding for:", request.email);
  }

  private async executeSuspension(suspension: SuspensionRecord): Promise<void> {
    // In real implementation, execute suspension
    console.log("Executed suspension for admin:", suspension.adminId);
  }

  private async executeSuspensionLift(
    suspension: SuspensionRecord,
    reason: string
  ): Promise<boolean> {
    // In real implementation, lift suspension
    console.log("Lifted suspension for admin:", suspension.adminId);
    return true;
  }

  private async executeRoleTransition(transition: RoleTransition): Promise<boolean> {
    // In real implementation, execute role transition
    console.log("Executed role transition for admin:", transition.adminId);
    return true;
  }

  private async executeDecommission(decommission: DecommissionRecord): Promise<boolean> {
    // In real implementation, execute decommissioning
    console.log("Executed decommissioning for admin:", decommission.adminId);
    return true;
  }

  private async escalateSuspension(suspension: SuspensionRecord): Promise<void> {
    // Escalate to configured role
    console.log(
      "Escalated suspension to:",
      this.config.escalationRules.criticalSuspensionEscalation
    );
  }
}

export default AdminLifecycleManager;
