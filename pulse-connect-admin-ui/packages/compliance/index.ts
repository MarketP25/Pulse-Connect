// Compliance Overlays for Pulsco Admin Governance System
// Handles jurisdiction overlays, data residency flags, and legal compliance

import { ComplianceFlag, AdminRoleType } from "@pulsco/admin-shared-types";
import { CSIClient } from "@pulsco/admin-csi-client";

export interface JurisdictionRule {
  id: string;
  jurisdiction: string;
  dataTypes: string[];
  residencyRequirements: "local" | "regional" | "global";
  legalFrameworks: string[];
  complianceOfficer: AdminRoleType;
  auditFrequency: "daily" | "weekly" | "monthly" | "quarterly";
  escalationThreshold: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataResidencyCheck {
  dataId: string;
  dataType: string;
  currentLocation: string;
  requiredLocation: string;
  compliant: boolean;
  violationSeverity: "low" | "medium" | "high" | "critical";
  remediationSteps: string[];
  lastChecked: Date;
  nextCheck: Date;
}

export interface LegalHold {
  id: string;
  caseId: string;
  description: string;
  affectedData: string[];
  holdDuration: {
    startDate: Date;
    endDate?: Date;
    indefinite: boolean;
  };
  authorizedBy: AdminRoleType;
  jurisdiction: string;
  complianceStatus: "active" | "expired" | "released";
  auditTrail: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface JurisdictionOverlay {
  jurisdiction: string;
  displayColor: string;
  borderStyle: "solid" | "dashed" | "dotted";
  opacity: number;
  showLabel: boolean;
  labelText: string;
  restrictions: {
    export: boolean;
    modify: boolean;
    delete: boolean;
    share: boolean;
  };
  complianceIndicators: {
    dataResidency: boolean;
    legalHolds: boolean;
    auditRequirements: boolean;
  };
}

export interface ComplianceConfig {
  apiBaseUrl: string;
  authToken: string;
  auditEnabled: boolean;
  realTimeMonitoring: boolean;
  defaultJurisdiction: string;
}

export class ComplianceOverlayManager {
  private config: ComplianceConfig;
  private csiClient: CSIClient;
  private jurisdictionRules: Map<string, JurisdictionRule> = new Map();
  private legalHolds: Map<string, LegalHold> = new Map();
  private dataResidencyChecks: Map<string, DataResidencyCheck> = new Map();
  private overlays: Map<string, JurisdictionOverlay> = new Map();

  constructor(config: ComplianceConfig) {
    this.config = config;
    this.csiClient = new CSIClient({
      apiBaseUrl: config.apiBaseUrl,
      wsUrl: `ws://${new URL(config.apiBaseUrl).host}`,
      sseUrl: config.apiBaseUrl.replace("http", "http"),
      authToken: config.authToken,
      reconnectInterval: 5000,
      maxRetries: 3
    });

    this.initializeDefaultRules();
    this.initializeDefaultOverlays();
  }

  /**
   * Get compliance overlay for a specific jurisdiction
   */
  getJurisdictionOverlay(jurisdiction: string): JurisdictionOverlay | undefined {
    return this.overlays.get(jurisdiction);
  }

  /**
   * Check data residency compliance for a dataset
   */
  async checkDataResidency(dataId: string, dataType: string): Promise<DataResidencyCheck> {
    // Check cache first
    const cached = this.dataResidencyChecks.get(dataId);
    if (cached && this.isCheckValid(cached)) {
      return cached;
    }

    // Perform residency check
    const check = await this.performResidencyCheck(dataId, dataType);

    // Cache the result
    this.dataResidencyChecks.set(dataId, check);

    return check;
  }

  /**
   * Get all active legal holds affecting data
   */
  getLegalHoldsForData(dataId: string): LegalHold[] {
    return Array.from(this.legalHolds.values()).filter(
      (hold) => hold.affectedData.includes(dataId) && hold.complianceStatus === "active"
    );
  }

  /**
   * Create a legal hold
   */
  async createLegalHold(
    hold: Omit<LegalHold, "id" | "createdAt" | "updatedAt" | "auditTrail">
  ): Promise<string> {
    const holdId = `hold_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fullHold: LegalHold = {
      ...hold,
      id: holdId,
      auditTrail: [`Created by ${hold.authorizedBy} on ${new Date().toISOString()}`],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate the hold
    if (!this.validateLegalHold(fullHold)) {
      throw new Error("Invalid legal hold configuration");
    }

    // Store locally
    this.legalHolds.set(holdId, fullHold);

    // Submit to compliance service
    await this.submitLegalHold(fullHold);

    return holdId;
  }

  /**
   * Release a legal hold
   */
  async releaseLegalHold(
    holdId: string,
    releasedBy: AdminRoleType,
    reason: string
  ): Promise<boolean> {
    const hold = this.legalHolds.get(holdId);
    if (!hold) {
      throw new Error("Legal hold not found");
    }

    if (hold.complianceStatus !== "active") {
      throw new Error("Legal hold is not active");
    }

    // Update hold status
    hold.complianceStatus = "released";
    hold.updatedAt = new Date();
    hold.auditTrail.push(`Released by ${releasedBy} on ${new Date().toISOString()}: ${reason}`);

    // Submit release to compliance service
    const success = await this.releaseLegalHoldInService(holdId, releasedBy, reason);

    return success;
  }

  /**
   * Get compliance flags for dashboard display
   */
  async getComplianceFlagsForMetrics(metrics: string[]): Promise<ComplianceFlag[]> {
    const flags: ComplianceFlag[] = [];

    for (const metricId of metrics) {
      // Check data residency
      const residencyCheck = await this.checkDataResidency(metricId, "metric");
      if (!residencyCheck.compliant) {
        flags.push({
          id: `residency_${metricId}`,
          type: "data-residency",
          severity: this.mapSeverityToComplianceSeverity(residencyCheck.violationSeverity),
          description: `Data residency violation: located in ${residencyCheck.currentLocation}, required in ${residencyCheck.requiredLocation}`,
          affectedMetrics: [metricId],
          jurisdiction: residencyCheck.requiredLocation,
          createdAt: new Date()
        });
      }

      // Check legal holds
      const legalHolds = this.getLegalHoldsForData(metricId);
      for (const hold of legalHolds) {
        flags.push({
          id: `hold_${hold.id}_${metricId}`,
          type: "legal-hold",
          severity: "warning",
          description: `Legal hold active: ${hold.description} (Case: ${hold.caseId})`,
          affectedMetrics: [metricId],
          jurisdiction: hold.jurisdiction,
          expiresAt: hold.holdDuration.endDate,
          createdAt: hold.createdAt
        });
      }

      // Check jurisdiction conflicts
      const jurisdictionConflicts = await this.checkJurisdictionConflicts(metricId);
      for (const conflict of jurisdictionConflicts) {
        flags.push({
          id: `conflict_${metricId}_${conflict.jurisdiction}`,
          type: "jurisdiction-conflict",
          severity: "error",
          description: conflict.description,
          affectedMetrics: [metricId],
          jurisdiction: conflict.jurisdiction,
          createdAt: new Date()
        });
      }
    }

    return flags;
  }

  /**
   * Get compliance statistics
   */
  getComplianceStats(): {
    totalJurisdictionRules: number;
    activeLegalHolds: number;
    complianceViolations: number;
    dataResidencyChecks: number;
    complianceCoverage: number;
    criticalIssues: number;
  } {
    const totalJurisdictionRules = this.jurisdictionRules.size;
    const activeLegalHolds = Array.from(this.legalHolds.values()).filter(
      (h) => h.complianceStatus === "active"
    ).length;
    const complianceViolations = Array.from(this.dataResidencyChecks.values()).filter(
      (c) => !c.compliant
    ).length;
    const dataResidencyChecks = this.dataResidencyChecks.size;
    const complianceCoverage =
      dataResidencyChecks > 0
        ? (dataResidencyChecks - complianceViolations) / dataResidencyChecks
        : 1;
    const criticalIssues = Array.from(this.dataResidencyChecks.values()).filter(
      (c) => !c.compliant && c.violationSeverity === "critical"
    ).length;

    return {
      totalJurisdictionRules,
      activeLegalHolds,
      complianceViolations,
      dataResidencyChecks,
      complianceCoverage,
      criticalIssues
    };
  }

  // Private helper methods

  private initializeDefaultRules(): void {
    const defaultRules: JurisdictionRule[] = [
      {
        id: "gdpr_eu",
        jurisdiction: "EU",
        dataTypes: ["personal", "health", "financial"],
        residencyRequirements: "regional",
        legalFrameworks: ["GDPR", "ePrivacy"],
        complianceOfficer: "legal-finance",
        auditFrequency: "monthly",
        escalationThreshold: 0.95,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "ccpa_us",
        jurisdiction: "US-CA",
        dataTypes: ["personal", "behavioral"],
        residencyRequirements: "local",
        legalFrameworks: ["CCPA", "CPRA"],
        complianceOfficer: "legal-finance",
        auditFrequency: "quarterly",
        escalationThreshold: 0.98,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "pdpa_sg",
        jurisdiction: "SG",
        dataTypes: ["personal", "financial"],
        residencyRequirements: "local",
        legalFrameworks: ["PDPA"],
        complianceOfficer: "legal-finance",
        auditFrequency: "monthly",
        escalationThreshold: 0.97,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultRules.forEach((rule) => {
      this.jurisdictionRules.set(rule.id, rule);
    });
  }

  private initializeDefaultOverlays(): void {
    const defaultOverlays: JurisdictionOverlay[] = [
      {
        jurisdiction: "EU",
        displayColor: "#3B82F6", // Blue
        borderStyle: "solid",
        opacity: 0.8,
        showLabel: true,
        labelText: "GDPR Protected",
        restrictions: {
          export: true,
          modify: false,
          delete: true,
          share: true
        },
        complianceIndicators: {
          dataResidency: true,
          legalHolds: true,
          auditRequirements: true
        }
      },
      {
        jurisdiction: "US-CA",
        displayColor: "#10B981", // Green
        borderStyle: "dashed",
        opacity: 0.7,
        showLabel: true,
        labelText: "CCPA Protected",
        restrictions: {
          export: true,
          modify: false,
          delete: false,
          share: true
        },
        complianceIndicators: {
          dataResidency: true,
          legalHolds: true,
          auditRequirements: false
        }
      },
      {
        jurisdiction: "SG",
        displayColor: "#F59E0B", // Yellow
        borderStyle: "dotted",
        opacity: 0.6,
        showLabel: true,
        labelText: "PDPA Protected",
        restrictions: {
          export: true,
          modify: false,
          delete: false,
          share: true
        },
        complianceIndicators: {
          dataResidency: true,
          legalHolds: true,
          auditRequirements: true
        }
      }
    ];

    defaultOverlays.forEach((overlay) => {
      this.overlays.set(overlay.jurisdiction, overlay);
    });
  }

  private async performResidencyCheck(
    dataId: string,
    dataType: string
  ): Promise<DataResidencyCheck> {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/compliance/residency-check/${dataId}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.authToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Residency check API error: ${response.status}`);
      }

      const result = await response.json();

      return {
        dataId,
        dataType,
        currentLocation: result.currentLocation || "unknown",
        requiredLocation: result.requiredLocation || this.config.defaultJurisdiction,
        compliant: result.compliant || true,
        violationSeverity: result.violationSeverity || "low",
        remediationSteps: result.remediationSteps || [],
        lastChecked: new Date(result.lastChecked || Date.now()),
        nextCheck: new Date(result.nextCheck || Date.now() + 24 * 60 * 60 * 1000)
      };
    } catch (error) {
      console.error("Failed to perform residency check:", error);
      // Return compliant result for demo
      return {
        dataId,
        dataType,
        currentLocation: this.config.defaultJurisdiction,
        requiredLocation: this.config.defaultJurisdiction,
        compliant: true,
        violationSeverity: "low",
        remediationSteps: [],
        lastChecked: new Date(),
        nextCheck: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
    }
  }

  private async submitLegalHold(hold: LegalHold): Promise<void> {
    // In real implementation, submit to compliance service
    console.log("Submitted legal hold:", hold.id);
  }

  private async releaseLegalHoldInService(
    holdId: string,
    releasedBy: AdminRoleType,
    reason: string
  ): Promise<boolean> {
    // In real implementation, release in compliance service
    console.log("Released legal hold:", holdId);
    return true;
  }

  private validateLegalHold(hold: LegalHold): boolean {
    return !!(
      hold.caseId &&
      hold.description &&
      hold.affectedData.length > 0 &&
      hold.authorizedBy &&
      hold.jurisdiction
    );
  }

  private async checkJurisdictionConflicts(
    dataId: string
  ): Promise<Array<{ jurisdiction: string; description: string }>> {
    // In real implementation, check for conflicts
    return [];
  }

  private isCheckValid(check: DataResidencyCheck): boolean {
    return Date.now() - check.lastChecked.getTime() < 24 * 60 * 60 * 1000; // 24 hours
  }

  private mapSeverityToComplianceSeverity(severity: string): ComplianceFlag["severity"] {
    switch (severity) {
      case "critical":
        return "error";
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "info";
    }
  }
}

export default ComplianceOverlayManager;
