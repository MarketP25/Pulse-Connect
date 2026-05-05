import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import type { Pool } from "pg";

@Injectable()
export class AutomatedArbitrationService {
  private readonly logger = new Logger(AutomatedArbitrationService.name);

  constructor(@Optional() @Inject("DATABASE_CONNECTION") private readonly db?: Pool) {}

  async getAutomationStats() {
    if (!this.db) {
      return {
        total_cases: 0,
        automated_decisions: 0,
        escalated_cases: 0,
        avg_confidence: 0,
        approval_rate: 0,
        avg_processing_time: "00:00:00"
      };
    }

    const result = await this.db.query("SELECT * FROM get_automation_stats()");
    return (
      result.rows[0] || {
        total_cases: 0,
        automated_decisions: 0,
        escalated_cases: 0,
        avg_confidence: 0,
        approval_rate: 0,
        avg_processing_time: "00:00:00"
      }
    );
  }

  async updateAutomationRules(rules: any[]) {
    if (!this.db) {
      this.logger.warn("DATABASE_CONNECTION not available; skipping automation rule persistence");
      return { success: true, message: "Automation rules accepted (no database connection)" };
    }

    for (const rule of rules) {
      await this.db.query(
        `
        INSERT INTO automation_rules (
          rule_name, issue_type, severity, auto_approval_threshold,
          auto_rejection_threshold, requires_human_review, escalation_criteria, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (rule_name) DO UPDATE SET
          auto_approval_threshold = EXCLUDED.auto_approval_threshold,
          auto_rejection_threshold = EXCLUDED.auto_rejection_threshold,
          requires_human_review = EXCLUDED.requires_human_review,
          escalation_criteria = EXCLUDED.escalation_criteria,
          updated_at = NOW()
      `,
        [
          rule.rule_name,
          rule.issue_type,
          rule.severity,
          rule.auto_approval_threshold,
          rule.auto_rejection_threshold,
          rule.requires_human_review,
          JSON.stringify(rule.escalation_criteria),
          "system"
        ]
      );
    }

    return { success: true, message: "Automation rules updated" };
  }

  async getAutomationRules() {
    if (!this.db) {
      return [];
    }

    const result = await this.db.query(
      "SELECT * FROM automation_rules WHERE is_active = true ORDER BY created_at DESC"
    );
    return result.rows;
  }
}
