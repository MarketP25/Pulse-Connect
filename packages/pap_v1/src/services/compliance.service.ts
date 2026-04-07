import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, MoreThan } from "typeorm";
import { ConsentEntity } from "../entities/consent.entity";
import { ActionEntity } from "../entities/action.entity";
import { CampaignEntity } from "../entities/campaign.entity";

export interface GDPRComplianceReport {
  reportId: string;
  generatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalUsers: number;
    totalConsents: number;
    activeConsents: number;
    consentRevocations: number;
    dataProcessingActivities: number;
    crossBorderTransfers: number;
  };
  consentAnalysis: {
    consentByPurpose: Record<string, number>;
    consentByChannel: Record<string, number>;
    consentByLegalBasis: Record<string, number>;
    revocationRate: number;
    averageConsentLifespan: number; // Days
  };
  dataProcessing: {
    totalActions: number;
    actionsByPurpose: Record<string, number>;
    internationalTransfers: number;
    automatedDecisions: number;
    profilingActivities: number;
  };
  complianceStatus: {
    gdprCompliant: boolean;
    issues: Array<{
      severity: "low" | "medium" | "high" | "critical";
      category: string;
      description: string;
      recommendation: string;
      affectedUsers?: number;
    }>;
    riskScore: number; // 0-100
  };
  recommendations: string[];
}

export interface DataSubjectRequest {
  requestId: string;
  userId: string;
  requestType: "access" | "rectification" | "erasure" | "restriction" | "portability" | "objection";
  status: "pending" | "processing" | "completed" | "rejected";
  requestedAt: Date;
  completedAt?: Date;
  dataScope: {
    includePersonalData: boolean;
    includeConsentHistory: boolean;
    includeMarketingData: boolean;
    includeAnalytics: boolean;
  };
  legalBasis?: string;
  justification?: string;
  response?: {
    dataProvided: boolean;
    recordsFound: number;
    recordsDeleted?: number;
    restrictionsApplied?: string[];
    format: "json" | "xml" | "pdf";
    downloadUrl?: string;
  };
}

export interface PrivacyImpactAssessment {
  assessmentId: string;
  projectName: string;
  assessedAt: Date;
  assessor: string;
  riskLevel: "low" | "medium" | "high";
  dataProcessing: {
    personalDataTypes: string[];
    dataSubjects: string[];
    processingPurposes: string[];
    legalBasis: string[];
    retentionPeriod: string;
    dataSharing: string[];
  };
  risks: Array<{
    riskId: string;
    description: string;
    likelihood: number; // 1-5
    impact: number; // 1-5
    riskScore: number; // likelihood * impact
    mitigationMeasures: string[];
    residualRisk: number;
  }>;
  recommendations: string[];
  approvalStatus: "draft" | "approved" | "rejected";
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    @InjectRepository(ConsentEntity)
    private readonly consentRepository: Repository<ConsentEntity>,
    @InjectRepository(ActionEntity)
    private readonly actionRepository: Repository<ActionEntity>,
    @InjectRepository(CampaignEntity)
    private readonly campaignRepository: Repository<CampaignEntity>
  ) {}

  /**
   * Generate GDPR compliance report
   */
  async generateGDPRComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<GDPRComplianceReport> {
    const [consentStats, actionStats, campaignStats] = await Promise.all([
      this.getConsentStatistics(startDate, endDate),
      this.getActionStatistics(startDate, endDate),
      this.getCampaignStatistics(startDate, endDate)
    ]);

    const issues = await this.identifyComplianceIssues(consentStats, actionStats);
    const riskScore = this.calculateRiskScore(issues);

    return {
      reportId: `gdpr_report_${Date.now()}`,
      generatedAt: new Date(),
      period: { startDate, endDate },
      summary: {
        totalUsers: consentStats.uniqueUsers,
        totalConsents: consentStats.totalConsents,
        activeConsents: consentStats.activeConsents,
        consentRevocations: consentStats.revocations,
        dataProcessingActivities: actionStats.totalActions,
        crossBorderTransfers: actionStats.crossBorderActions
      },
      consentAnalysis: {
        consentByPurpose: consentStats.consentByPurpose,
        consentByChannel: consentStats.consentByChannel,
        consentByLegalBasis: consentStats.consentByLegalBasis,
        revocationRate: consentStats.revocationRate,
        averageConsentLifespan: consentStats.averageLifespan
      },
      dataProcessing: {
        totalActions: actionStats.totalActions,
        actionsByPurpose: actionStats.actionsByPurpose,
        internationalTransfers: actionStats.crossBorderActions,
        automatedDecisions: actionStats.automatedDecisions,
        profilingActivities: actionStats.profilingActivities
      },
      complianceStatus: {
        gdprCompliant: riskScore < 30,
        issues,
        riskScore
      },
      recommendations: this.generateComplianceRecommendations(issues, riskScore)
    };
  }

  /**
   * Handle data subject access request (DSAR)
   */
  async createDataSubjectRequest(
    userId: string,
    requestType: DataSubjectRequest["requestType"],
    dataScope: DataSubjectRequest["dataScope"],
    legalBasis?: string,
    justification?: string
  ): Promise<DataSubjectRequest> {
    const request: DataSubjectRequest = {
      requestId: `dsar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      requestType,
      status: "pending",
      requestedAt: new Date(),
      dataScope,
      legalBasis,
      justification
    };

    // In a real implementation, save to database and trigger workflow
    this.logger.log(`Created DSAR ${request.requestId} for user ${userId}: ${requestType}`);

    // Auto-process simple requests
    if (requestType === "access") {
      await this.processDataSubjectRequest(request);
    }

    return request;
  }

  /**
   * Process data subject request
   */
  async processDataSubjectRequest(request: DataSubjectRequest): Promise<DataSubjectRequest> {
    try {
      request.status = "processing";

      const userData = await this.gatherUserData(request.userId, request.dataScope);

      switch (request.requestType) {
        case "access":
          request.response = {
            dataProvided: true,
            recordsFound: userData.totalRecords,
            format: "json",
            downloadUrl: `https://api.pulsco.global/privacy/data-export/${request.requestId}`
          };
          break;

        case "rectification":
          // Implement data rectification logic
          request.response = {
            dataProvided: false,
            recordsFound: userData.totalRecords
          };
          break;

        case "erasure":
          const deletedRecords = await this.deleteUserData(request.userId, request.dataScope);
          request.response = {
            dataProvided: false,
            recordsFound: userData.totalRecords,
            recordsDeleted: deletedRecords
          };
          break;

        case "restriction":
          const restrictions = await this.applyDataRestrictions(request.userId, request.dataScope);
          request.response = {
            dataProvided: false,
            recordsFound: userData.totalRecords,
            restrictionsApplied: restrictions
          };
          break;

        case "portability":
          request.response = {
            dataProvided: true,
            recordsFound: userData.totalRecords,
            format: "json",
            downloadUrl: `https://api.pulsco.global/privacy/data-portability/${request.requestId}`
          };
          break;

        case "objection":
          await this.processObjection(request.userId, request.justification || "");
          request.response = {
            dataProvided: false,
            recordsFound: userData.totalRecords
          };
          break;
      }

      request.status = "completed";
      request.completedAt = new Date();
    } catch (error) {
      this.logger.error(`Failed to process DSAR ${request.requestId}:`, error);
      request.status = "rejected";
      request.completedAt = new Date();
    }

    return request;
  }

  /**
   * Perform privacy impact assessment
   */
  async performPrivacyImpactAssessment(
    projectName: string,
    assessor: string,
    dataProcessing: PrivacyImpactAssessment["dataProcessing"]
  ): Promise<PrivacyImpactAssessment> {
    const risks = await this.assessPrivacyRisks(dataProcessing);

    const riskLevel = risks.some((r) => r.residualRisk >= 15)
      ? "high"
      : risks.some((r) => r.residualRisk >= 8)
        ? "medium"
        : "low";

    return {
      assessmentId: `pia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectName,
      assessedAt: new Date(),
      assessor,
      riskLevel,
      dataProcessing,
      risks,
      recommendations: this.generatePIARecommendations(risks),
      approvalStatus: "draft"
    };
  }

  /**
   * Check consent validity for marketing activities
   */
  async validateConsentForMarketing(
    userId: string,
    channel: string,
    purpose: string
  ): Promise<{
    valid: boolean;
    consentId?: string;
    expiresAt?: Date;
    restrictions?: string[];
    legalBasis?: string;
  }> {
    const consents = await this.consentRepository.find({
      where: {
        userId,
        channel,
        purpose,
        revokedAt: null // Only active consents
      },
      order: { grantedAt: "DESC" }
    });

    if (consents.length === 0) {
      return { valid: false };
    }

    const latestConsent = consents[0];

    // Check if consent has expired
    if (latestConsent.expiresAt && latestConsent.expiresAt < new Date()) {
      return { valid: false };
    }

    return {
      valid: true,
      consentId: latestConsent.id,
      expiresAt: latestConsent.expiresAt || undefined,
      restrictions: latestConsent.restrictions || [],
      legalBasis: latestConsent.legalBasis
    };
  }

  /**
   * Audit consent compliance
   */
  async auditConsentCompliance(
    startDate: Date,
    endDate: Date
  ): Promise<{
    auditId: string;
    period: { startDate: Date; endDate: Date };
    findings: Array<{
      type: "violation" | "warning" | "info";
      description: string;
      affectedRecords: number;
      severity: "low" | "medium" | "high";
      recommendation: string;
    }>;
    complianceScore: number; // 0-100
    summary: {
      totalConsents: number;
      expiredConsents: number;
      revokedConsents: number;
      invalidConsents: number;
      consentWithoutLegalBasis: number;
    };
  }> {
    const consents = await this.consentRepository.find({
      where: {
        grantedAt: Between(startDate, endDate)
      }
    });

    const findings = [];
    let complianceScore = 100;

    // Check for expired consents still being used
    const expiredConsents = consents.filter(
      (c) => c.expiresAt && c.expiresAt < new Date() && !c.revokedAt
    );
    if (expiredConsents.length > 0) {
      findings.push({
        type: "violation",
        description: `Found ${expiredConsents.length} expired consents that may still be active`,
        affectedRecords: expiredConsents.length,
        severity: "high",
        recommendation: "Review and revoke expired consents"
      });
      complianceScore -= 20;
    }

    // Check for consents without legal basis
    const consentsWithoutLegalBasis = consents.filter((c) => !c.legalBasis);
    if (consentsWithoutLegalBasis.length > 0) {
      findings.push({
        type: "warning",
        description: `Found ${consentsWithoutLegalBasis.length} consents without documented legal basis`,
        affectedRecords: consentsWithoutLegalBasis.length,
        severity: "medium",
        recommendation: "Document legal basis for all consents"
      });
      complianceScore -= 10;
    }

    // Check for unusually high revocation rates
    const totalConsents = consents.length;
    const revokedConsents = consents.filter((c) => c.revokedAt).length;
    const revocationRate = totalConsents > 0 ? revokedConsents / totalConsents : 0;

    if (revocationRate > 0.3) {
      // More than 30% revocation rate
      findings.push({
        type: "warning",
        description: `High consent revocation rate: ${(revocationRate * 100).toFixed(1)}%`,
        affectedRecords: revokedConsents,
        severity: "medium",
        recommendation: "Investigate reasons for high revocation rate"
      });
      complianceScore -= 15;
    }

    return {
      auditId: `consent_audit_${Date.now()}`,
      period: { startDate, endDate },
      findings,
      complianceScore: Math.max(0, complianceScore),
      summary: {
        totalConsents,
        expiredConsents: expiredConsents.length,
        revokedConsents,
        invalidConsents: 0, // Would need more complex validation
        consentWithoutLegalBasis: consentsWithoutLegalBasis.length
      }
    };
  }

  // Helper methods
  private async getConsentStatistics(startDate: Date, endDate: Date) {
    const consents = await this.consentRepository.find({
      where: {
        grantedAt: Between(startDate, endDate)
      }
    });

    const uniqueUsers = new Set(consents.map((c) => c.userId)).size;
    const activeConsents = consents.filter((c) => !c.revokedAt).length;
    const revocations = consents.filter((c) => c.revokedAt).length;
    const revocationRate = consents.length > 0 ? revocations / consents.length : 0;

    // Calculate average consent lifespan
    const lifespans = consents
      .filter((c) => c.revokedAt)
      .map((c) => c.revokedAt!.getTime() - c.grantedAt.getTime())
      .map((ms) => ms / (1000 * 60 * 60 * 24)); // Convert to days

    const averageLifespan =
      lifespans.length > 0 ? lifespans.reduce((sum, span) => sum + span, 0) / lifespans.length : 0;

    // Group by various dimensions
    const consentByPurpose = this.groupByCount(consents, "purpose");
    const consentByChannel = this.groupByCount(consents, "channel");
    const consentByLegalBasis = this.groupByCount(consents, "legalBasis");

    return {
      uniqueUsers,
      totalConsents: consents.length,
      activeConsents,
      revocations,
      revocationRate,
      averageLifespan,
      consentByPurpose,
      consentByChannel,
      consentByLegalBasis
    };
  }

  private async getActionStatistics(startDate: Date, endDate: Date) {
    const actions = await this.actionRepository.find({
      where: {
        createdAt: Between(startDate, endDate)
      }
    });

    // Mock additional statistics
    return {
      totalActions: actions.length,
      crossBorderActions: Math.floor(actions.length * 0.15), // 15% international
      automatedDecisions: Math.floor(actions.length * 0.05), // 5% automated
      profilingActivities: Math.floor(actions.length * 0.08), // 8% profiling
      actionsByPurpose: this.groupByCount(actions, "purpose")
    };
  }

  private async getCampaignStatistics(startDate: Date, endDate: Date) {
    const campaigns = await this.campaignRepository.find({
      where: {
        createdAt: Between(startDate, endDate)
      }
    });

    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((c) => c.status === "running").length
    };
  }

  private async identifyComplianceIssues(consentStats: any, actionStats: any) {
    const issues = [];

    if (consentStats.revocationRate > 0.25) {
      issues.push({
        severity: "high",
        category: "consent_management",
        description: `High consent revocation rate: ${(consentStats.revocationRate * 100).toFixed(1)}%`,
        recommendation: "Review consent collection process and user communication",
        affectedUsers: consentStats.revocations
      });
    }

    if (consentStats.averageLifespan < 30) {
      issues.push({
        severity: "medium",
        category: "consent_quality",
        description: `Short average consent lifespan: ${consentStats.averageLifespan.toFixed(1)} days`,
        recommendation: "Improve consent quality and user trust"
      });
    }

    if (actionStats.crossBorderActions > actionStats.totalActions * 0.2) {
      issues.push({
        severity: "medium",
        category: "data_transfers",
        description: "High volume of cross-border data transfers",
        recommendation: "Review adequacy decisions and transfer mechanisms",
        affectedUsers: actionStats.crossBorderActions
      });
    }

    return issues;
  }

  private calculateRiskScore(issues: any[]): number {
    const severityWeights = {
      low: 5,
      medium: 15,
      high: 30,
      critical: 50
    };

    return issues.reduce((score, issue) => score + severityWeights[issue.severity], 0);
  }

  private generateComplianceRecommendations(issues: any[], riskScore: number): string[] {
    const recommendations = [];

    if (riskScore > 50) {
      recommendations.push("Immediate action required: High compliance risk detected");
      recommendations.push("Engage legal counsel for compliance review");
    }

    if (issues.some((i) => i.category === "consent_management")) {
      recommendations.push("Implement consent management improvements");
      recommendations.push("Enhance user communication about data usage");
    }

    if (issues.some((i) => i.category === "data_transfers")) {
      recommendations.push("Review international data transfer mechanisms");
      recommendations.push("Update adequacy decision documentation");
    }

    recommendations.push("Conduct regular compliance training for staff");
    recommendations.push("Implement automated compliance monitoring");

    return recommendations;
  }

  private async gatherUserData(userId: string, scope: any) {
    // Mock data gathering
    return {
      totalRecords: 150,
      personalData: scope.includePersonalData ? {} : null,
      consentHistory: scope.includeConsentHistory ? [] : null,
      marketingData: scope.includeMarketingData ? [] : null,
      analytics: scope.includeAnalytics ? {} : null
    };
  }

  private async deleteUserData(userId: string, scope: any): Promise<number> {
    // Mock data deletion
    let deletedRecords = 0;

    if (scope.includePersonalData) deletedRecords += 50;
    if (scope.includeConsentHistory) deletedRecords += 30;
    if (scope.includeMarketingData) deletedRecords += 60;
    if (scope.includeAnalytics) deletedRecords += 10;

    return deletedRecords;
  }

  private async applyDataRestrictions(userId: string, scope: any): Promise<string[]> {
    // Mock restrictions application
    const restrictions = [];

    if (scope.includeMarketingData) {
      restrictions.push("marketing_data_processing_restricted");
    }

    if (scope.includeAnalytics) {
      restrictions.push("analytics_processing_restricted");
    }

    return restrictions;
  }

  private async processObjection(userId: string, justification: string): Promise<void> {
    // Mock objection processing
    this.logger.log(`Processing objection for user ${userId}: ${justification}`);
  }

  private async assessPrivacyRisks(dataProcessing: any): Promise<any[]> {
    // Mock risk assessment
    return [
      {
        riskId: "data_breach",
        description: "Potential data breach during processing",
        likelihood: 2,
        impact: 5,
        riskScore: 10,
        mitigationMeasures: ["Encryption", "Access controls", "Regular audits"],
        residualRisk: 3
      },
      {
        riskId: "unauthorized_access",
        description: "Unauthorized access to personal data",
        likelihood: 3,
        impact: 4,
        riskScore: 12,
        mitigationMeasures: ["Multi-factor authentication", "Role-based access"],
        residualRisk: 4
      }
    ];
  }

  private generatePIARecommendations(risks: any[]): string[] {
    const recommendations = [];

    if (risks.some((r) => r.residualRisk > 10)) {
      recommendations.push("Implement additional security measures");
    }

    recommendations.push("Conduct regular risk assessments");
    recommendations.push("Document mitigation measures");
    recommendations.push("Train staff on privacy risks");

    return recommendations;
  }

  private groupByCount(items: any[], field: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const key = item[field] || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }
}
