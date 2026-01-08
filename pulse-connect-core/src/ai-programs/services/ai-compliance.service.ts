import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

export interface ContentCheckResult {
  allowed: boolean;
  reason?: string;
  risk_score: number;
  restricted_categories: string[];
  action: "allow" | "block" | "flag" | "quarantine";
}

export interface ComplianceAuditEntry {
  id: string;
  trace_id: string;
  user_id: string;
  content_type: "input" | "output";
  ai_program_run_id?: string;
  risk_score: number;
  restricted_content_detected: boolean;
  restricted_categories: string[];
  compliance_action: "allow" | "block" | "flag" | "quarantine";
  reviewed_by?: string;
  reviewed_at?: Date;
  metadata: any;
  created_at: Date;
}

export class AIComplianceService {
  constructor(
    private pool: Pool,
    private complianceService: any // Reference to existing ComplianceService
  ) {}

  /**
   * Check content for compliance (input/output)
   */
  async checkContent(
    content: string,
    contentType: "input" | "output",
    traceId: string,
    programRunId?: string
  ): Promise<ContentCheckResult> {
    // Step 1: Basic content analysis
    const analysis = await this.analyzeContent(content);

    // Step 2: Determine action based on risk score and categories
    const action = this.determineAction(analysis.risk_score, analysis.categories);

    // Step 3: Log compliance check
    await this.logComplianceCheck({
      trace_id: traceId,
      user_id: "system", // Will be updated with actual user
      content_type: contentType,
      ai_program_run_id: programRunId,
      risk_score: analysis.risk_score,
      restricted_content_detected: analysis.categories.length > 0,
      restricted_categories: analysis.categories,
      compliance_action: action,
      metadata: {
        content_length: content.length,
        content_hash: this.generateContentHash(content),
        analysis_method: "automated"
      }
    });

    return {
      allowed: action === "allow",
      reason:
        action !== "allow"
          ? `Content ${action}ed due to: ${analysis.categories.join(", ")}`
          : undefined,
      risk_score: analysis.risk_score,
      restricted_categories: analysis.categories,
      action
    };
  }

  /**
   * Check user eligibility for AI programs (KYC/AML)
   */
  async checkUserEligibility(
    userId: string,
    programType: string
  ): Promise<{
    eligible: boolean;
    reason?: string;
    kyc_required: boolean;
    restrictions: string[];
  }> {
    // Get user's compliance status from existing service
    const complianceStatus = await this.complianceService.getSellerComplianceStatus(userId);

    const restrictions: string[] = [...complianceStatus.restrictions];

    // Additional AI-specific checks
    if (programType === "premium") {
      // Premium programs require enhanced KYC
      if (complianceStatus.kyc_status !== "verified") {
        restrictions.push("Premium programs require verified KYC");
      }
    }

    // Check for AI-specific restrictions
    const aiRestrictions = await this.getUserAIRestrictions(userId);
    restrictions.push(...aiRestrictions);

    const eligible = complianceStatus.can_receive_payments && restrictions.length === 0;
    const kycRequired = programType === "premium" || complianceStatus.kyc_status === "pending";

    return {
      eligible,
      reason: !eligible ? restrictions.join("; ") : undefined,
      kyc_required: kycRequired,
      restrictions
    };
  }

  /**
   * Manually review flagged content
   */
  async reviewFlaggedContent(
    complianceId: string,
    reviewerId: string,
    decision: "approve" | "reject",
    notes?: string
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Update compliance audit entry
      await client.query(
        `
        UPDATE compliance_audit_log
        SET reviewed_by = $1, reviewed_at = NOW(),
            compliance_action = $2,
            metadata = metadata || $3
        WHERE id = $4
      `,
        [
          reviewerId,
          decision === "approve" ? "allow" : "block",
          JSON.stringify({ review_notes: notes, reviewed_by: reviewerId }),
          complianceId
        ]
      );

      // If rejecting, also update the AI program run status
      if (decision === "reject") {
        await client.query(
          `
          UPDATE ai_program_runs
          SET status = 'cancelled',
              error_message = 'Content rejected during compliance review'
          WHERE id = (
            SELECT ai_program_run_id FROM compliance_audit_log WHERE id = $1
          )
        `,
          [complianceId]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pending compliance reviews
   */
  async getPendingReviews(limit: number = 50): Promise<ComplianceAuditEntry[]> {
    const result = await this.pool.query(
      `
      SELECT * FROM compliance_audit_log
      WHERE compliance_action = 'flag' AND reviewed_by IS NULL
      ORDER BY created_at DESC
      LIMIT $1
    `,
      [limit]
    );

    return result.rows.map((row) => this.mapComplianceRow(row));
  }

  /**
   * Get compliance statistics
   */
  async getComplianceStats(periodDays: number = 30): Promise<{
    total_checks: number;
    blocked_content: number;
    flagged_content: number;
    allowed_content: number;
    avg_risk_score: number;
    top_categories: Array<{ category: string; count: number }>;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    const stats = await this.pool.query(
      `
      SELECT
        COUNT(*) as total_checks,
        COUNT(CASE WHEN compliance_action = 'block' THEN 1 END) as blocked_content,
        COUNT(CASE WHEN compliance_action = 'flag' THEN 1 END) as flagged_content,
        COUNT(CASE WHEN compliance_action = 'allow' THEN 1 END) as allowed_content,
        AVG(risk_score) as avg_risk_score
      FROM compliance_audit_log
      WHERE created_at >= $1
    `,
      [cutoffDate.toISOString()]
    );

    // Get top restricted categories
    const categories = await this.pool.query(
      `
      SELECT unnest(restricted_categories) as category, COUNT(*) as count
      FROM compliance_audit_log
      WHERE created_at >= $1 AND array_length(restricted_categories, 1) > 0
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `,
      [cutoffDate.toISOString()]
    );

    return {
      total_checks: parseInt(stats.rows[0].total_checks),
      blocked_content: parseInt(stats.rows[0].blocked_content),
      flagged_content: parseInt(stats.rows[0].flagged_content),
      allowed_content: parseInt(stats.rows[0].allowed_content),
      avg_risk_score: parseFloat(stats.rows[0].avg_risk_score) || 0,
      top_categories: categories.rows.map((row) => ({
        category: row.category,
        count: parseInt(row.count)
      }))
    };
  }

  private async analyzeContent(content: string): Promise<{
    risk_score: number;
    categories: string[];
  }> {
    let riskScore = 0;
    const categories: string[] = [];

    // Convert to lowercase for analysis
    const lowerContent = content.toLowerCase();

    // Check for restricted keywords/patterns
    const restrictedPatterns = {
      violence: /\b(violence|violent|kill|murder|attack|harm)\b/i,
      hate_speech: /\b(racist|racism|hate|supremacist|discrimination)\b/i,
      adult_content: /\b(porn|sex|adult|explicit|nude|erotic)\b/i,
      illegal_activities: /\b(drug|drugs|illegal|crime|criminal|fraud|scam)\b/i,
      self_harm: /\b(suicide|self.harm|cutting|overdose)\b/i,
      terrorism: /\b(terrorist|terrorism|bomb|explosive|extremist)\b/i,
      personal_info: /\b(ssn|social.security|credit.card|bank.account)\b/i
    };

    for (const [category, pattern] of Object.entries(restrictedPatterns)) {
      if (pattern.test(lowerContent)) {
        categories.push(category);
        riskScore += 20; // Base risk per category
      }
    }

    // Length-based risk assessment
    if (content.length > 10000) {
      riskScore += 10; // Very long content might be suspicious
    }

    // Special character density
    const specialCharRatio = (content.match(/[^a-zA-Z0-9\s]/g) || []).length / content.length;
    if (specialCharRatio > 0.3) {
      riskScore += 15; // High special character content
    }

    // Ensure risk score is within bounds
    riskScore = Math.max(0, Math.min(100, riskScore));

    return { risk_score: riskScore, categories };
  }

  private determineAction(
    riskScore: number,
    categories: string[]
  ): "allow" | "block" | "flag" | "quarantine" {
    // High-risk content is blocked
    if (riskScore >= 80 || categories.includes("terrorism") || categories.includes("self_harm")) {
      return "block";
    }

    // Medium-risk content is flagged for review
    if (riskScore >= 50 || categories.length > 2) {
      return "flag";
    }

    // Low-risk content with some categories is quarantined
    if (riskScore >= 30 && categories.length > 0) {
      return "quarantine";
    }

    // Low-risk content is allowed
    return "allow";
  }

  private async logComplianceCheck(
    entry: Omit<ComplianceAuditEntry, "id" | "created_at">
  ): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO compliance_audit_log (
        id, trace_id, user_id, content_type, ai_program_run_id,
        risk_score, restricted_content_detected, restricted_categories,
        compliance_action, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
      [
        uuidv4(),
        entry.trace_id,
        entry.user_id,
        entry.content_type,
        entry.ai_program_run_id,
        entry.risk_score,
        entry.restricted_content_detected,
        entry.restricted_categories,
        entry.compliance_action,
        JSON.stringify(entry.metadata)
      ]
    );
  }

  private async getUserAIRestrictions(userId: string): Promise<string[]> {
    // Check for AI-specific restrictions (e.g., from previous violations)
    const result = await this.pool.query(
      `
      SELECT COUNT(*) as violation_count
      FROM compliance_audit_log
      WHERE user_id = $1 AND compliance_action = 'block'
      AND created_at >= NOW() - INTERVAL '30 days'
    `,
      [userId]
    );

    const violations = parseInt(result.rows[0].violation_count);
    const restrictions: string[] = [];

    if (violations >= 3) {
      restrictions.push("Multiple content violations - AI access restricted");
    }

    return restrictions;
  }

  private generateContentHash(content: string): string {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(content).digest("hex").substring(0, 16);
  }

  /**
   * Evaluate a KYC submission and provide automated decision recommendation.
   * Returned object: { decision: 'approve'|'reject'|'manual', confidence: number, reason?: string }
   */
  async evaluateKYC(kycPayload: any): Promise<{ decision: string; confidence: number; reason?: string }> {
    // Use provided risk score if present
    const kyc = kycPayload.kyc || kycPayload.request;
    const risk = kyc.risk_score || (kyc.riskScore ? kyc.riskScore : 50);

    // Simple heuristic: low risk => approve, high risk => reject, otherwise manual
    if (risk < 40) {
      return { decision: "approve", confidence: Math.min(0.9, 1 - risk / 100), reason: "Low risk based on automated scoring" };
    }

    if (risk >= 80) {
      return { decision: "reject", confidence: Math.min(0.95, risk / 100), reason: "High risk detected by automated scoring" };
    }

    return { decision: "manual", confidence: 0.5, reason: "Requires human review" };
  }
  private mapComplianceRow(row: any): ComplianceAuditEntry {
    return {
      id: row.id,
      trace_id: row.trace_id,
      user_id: row.user_id,
      content_type: row.content_type,
      ai_program_run_id: row.ai_program_run_id,
      risk_score: parseFloat(row.risk_score),
      restricted_content_detected: Boolean(row.restricted_content_detected),
      restricted_categories: row.restricted_categories || [],
      compliance_action: row.compliance_action,
      reviewed_by: row.reviewed_by,
      reviewed_at: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      metadata: JSON.parse(row.metadata || "{}"),
      created_at: new Date(row.created_at)
    };
  }
}
