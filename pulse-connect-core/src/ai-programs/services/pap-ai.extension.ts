import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

export interface PAPWorkflow {
  id: string;
  user_id: string;
  action_type: "ai_program_execution";
  program_type: "basic" | "advanced" | "premium";
  status: "pending" | "approved" | "denied" | "completed";
  pap_subscription_id: string;
  consent_validated: boolean;
  caps_checked: boolean;
  quiet_hours_respected: boolean;
  content_safety_passed: boolean;
  ai_eligibility_checked: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PAPDecision {
  allowed: boolean;
  reason?: string;
  workflow_id: string;
  checks_passed: {
    subscription: boolean;
    consent: boolean;
    caps: boolean;
    quiet_hours: boolean;
    content_safety: boolean;
    ai_eligibility: boolean;
  };
}

export class PAPAIExtensionService {
  constructor(
    private pool: Pool,
    private papEntitlements: any, // Reference to PAP entitlements service
    private aiCompliance: any, // Reference to AI compliance service
    private queueManager: any // Reference to queue manager
  ) {}

  /**
   * Create PAP workflow for AI program execution
   */
  async createAIWorkflow(
    userId: string,
    programType: "basic" | "advanced" | "premium",
    input: string,
    regionCode: string = "US"
  ): Promise<PAPWorkflow> {
    const workflowId = uuidv4();

    // Get user's PAP subscription
    const papSubscription = await this.getUserPAPSubscription(userId);
    if (!papSubscription) {
      throw new Error("User does not have active PAP subscription");
    }

    // Create workflow record
    const workflow: Omit<PAPWorkflow, "created_at" | "updated_at"> = {
      id: workflowId,
      user_id: userId,
      action_type: "ai_program_execution",
      program_type: programType,
      status: "pending",
      pap_subscription_id: papSubscription.id,
      consent_validated: false,
      caps_checked: false,
      quiet_hours_respected: false,
      content_safety_passed: false,
      ai_eligibility_checked: false
    };

    await this.pool.query(
      `
      INSERT INTO pap_ai_workflows (
        id, user_id, action_type, program_type, status, pap_subscription_id,
        consent_validated, caps_checked, quiet_hours_respected,
        content_safety_passed, ai_eligibility_checked
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
      [
        workflow.id,
        workflow.user_id,
        workflow.action_type,
        workflow.program_type,
        workflow.status,
        workflow.pap_subscription_id,
        workflow.consent_validated,
        workflow.caps_checked,
        workflow.quiet_hours_respected,
        workflow.content_safety_passed,
        workflow.ai_eligibility_checked
      ]
    );

    return { ...workflow, created_at: new Date(), updated_at: new Date() };
  }

  /**
   * Execute PAP decision pipeline for AI program
   */
  async executePAPDecision(workflowId: string, input: string): Promise<PAPDecision> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error("PAP workflow not found");
    }

    const checks = {
      subscription: false,
      consent: false,
      caps: false,
      quiet_hours: false,
      content_safety: false,
      ai_eligibility: false
    };

    let allowed = true;
    let reason = "";

    try {
      // 1. Check PAP Subscription
      checks.subscription = await this.checkPAPSubscription(workflow.user_id);
      if (!checks.subscription) {
        allowed = false;
        reason = "No active PAP subscription";
      }

      // 2. Validate Consent
      if (allowed) {
        checks.consent = await this.checkConsent(workflow.user_id, "ai_programs");
        if (!checks.consent) {
          allowed = false;
          reason = "Marketing consent not granted for AI programs";
        }
      }

      // 3. Check Usage Caps
      if (allowed) {
        checks.caps = await this.checkUsageCaps(workflow.user_id, workflow.program_type);
        if (!checks.caps) {
          allowed = false;
          reason = "Usage caps exceeded for AI programs";
        }
      }

      // 4. Apply Quiet Hours
      if (allowed) {
        checks.quiet_hours = await this.checkQuietHours(workflow.user_id);
        if (!checks.quiet_hours) {
          allowed = false;
          reason = "Request blocked by quiet hours policy";
        }
      }

      // 5. Content Safety Check
      if (allowed) {
        checks.content_safety = await this.checkContentSafety(input);
        if (!checks.content_safety) {
          allowed = false;
          reason = "Content failed safety check";
        }
      }

      // 6. AI Eligibility Check
      if (allowed) {
        checks.ai_eligibility = await this.checkAIEligibility(
          workflow.user_id,
          workflow.program_type
        );
        if (!checks.ai_eligibility) {
          allowed = false;
          reason = "User not eligible for AI programs";
        }
      }

      // Update workflow with check results
      await this.updateWorkflowChecks(workflowId, checks);

      // Update workflow status
      const newStatus = allowed ? "approved" : "denied";
      await this.updateWorkflowStatus(workflowId, newStatus);

      return {
        allowed,
        reason: allowed ? undefined : reason,
        workflow_id: workflowId,
        checks_passed: checks
      };
    } catch (error) {
      // Update workflow status to denied on error
      await this.updateWorkflowStatus(workflowId, "denied");
      throw error;
    }
  }

  /**
   * Complete PAP workflow after successful AI execution
   */
  async completeWorkflow(workflowId: string, executionResult: any): Promise<void> {
    // Record usage in PAP entitlements
    await this.recordPAPUsage(workflowId, executionResult);

    // Update workflow status
    await this.updateWorkflowStatus(workflowId, "completed");

    // Check if we need to throttle AI queue due to marketing pressure
    await this.checkMarketingBackpressure();
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<PAPWorkflow | null> {
    const result = await this.pool.query(
      `
      SELECT * FROM pap_ai_workflows WHERE id = $1
    `,
      [workflowId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapWorkflowRow(result.rows[0]);
  }

  /**
   * Get user's recent PAP workflows
   */
  async getUserWorkflows(userId: string, limit: number = 10): Promise<PAPWorkflow[]> {
    const result = await this.pool.query(
      `
      SELECT * FROM pap_ai_workflows
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
      [userId, limit]
    );

    return result.rows.map((row) => this.mapWorkflowRow(row));
  }

  private async getUserPAPSubscription(userId: string): Promise<any> {
    // This would integrate with PAP entitlements service
    // For now, return mock data
    return {
      id: `pap_sub_${userId}`,
      user_id: userId,
      status: "active"
    };
  }

  private async checkPAPSubscription(userId: string): Promise<boolean> {
    const subscription = await this.getUserPAPSubscription(userId);
    return subscription && subscription.status === "active";
  }

  private async checkConsent(userId: string, scope: string): Promise<boolean> {
    // This would check PAP consent ledger
    // For now, assume consent is granted
    return true;
  }

  private async checkUsageCaps(userId: string, programType: string): Promise<boolean> {
    // Check PAP entitlements for AI program usage
    const today = new Date().toISOString().split("T")[0];

    const result = await this.pool.query(
      `
      SELECT COUNT(*) as daily_count
      FROM pap_ai_workflows
      WHERE user_id = $1 AND DATE(created_at) = $2 AND status = 'completed'
    `,
      [userId, today]
    );

    const dailyCount = parseInt(result.rows[0].daily_count);

    // Basic limits: 50/day, Advanced: 20/day, Premium: 5/day
    const limits = { basic: 50, advanced: 20, premium: 5 };
    return dailyCount < limits[programType];
  }

  private async checkQuietHours(userId: string): Promise<boolean> {
    // Check if current time is within quiet hours (e.g., 22:00-08:00)
    const now = new Date();
    const hour = now.getHours();

    // Quiet hours: 10 PM to 8 AM
    if (hour >= 22 || hour < 8) {
      return false;
    }

    return true;
  }

  private async checkContentSafety(input: string): Promise<boolean> {
    // Use AI compliance service for content safety
    const result = await this.aiCompliance.checkContent(input, "input", uuidv4());
    return result.allowed;
  }

  private async checkAIEligibility(userId: string, programType: string): Promise<boolean> {
    // Use AI compliance service for eligibility
    const result = await this.aiCompliance.checkUserEligibility(userId, programType);
    return result.eligible;
  }

  private async updateWorkflowChecks(workflowId: string, checks: any): Promise<void> {
    await this.pool.query(
      `
      UPDATE pap_ai_workflows
      SET consent_validated = $1, caps_checked = $2, quiet_hours_respected = $3,
          content_safety_passed = $4, ai_eligibility_checked = $5, updated_at = NOW()
      WHERE id = $6
    `,
      [
        checks.consent,
        checks.caps,
        checks.quiet_hours,
        checks.content_safety,
        checks.ai_eligibility,
        workflowId
      ]
    );
  }

  private async updateWorkflowStatus(workflowId: string, status: string): Promise<void> {
    await this.pool.query(
      `
      UPDATE pap_ai_workflows
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `,
      [status, workflowId]
    );
  }

  private async recordPAPUsage(workflowId: string, executionResult: any): Promise<void> {
    // Record usage in PAP entitlements system
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) return;

    // This would integrate with PAP entitlements to record usage
    console.log(
      `Recording PAP usage for workflow ${workflowId}: ${executionResult.tokens_used} tokens`
    );
  }

  private async checkMarketingBackpressure(): Promise<void> {
    // Check marketing queue P95 latency
    const marketingQueue = await this.queueManager.getQueueMetrics("marketing_queue");

    if (marketingQueue.p95_ms > 900) {
      // Throttle AI queue
      await this.queueManager.setBackpressure("ai_queue", true);
      console.log("AI queue throttled due to marketing queue pressure");
    } else if (marketingQueue.p95_ms < 800) {
      // Remove AI throttling
      await this.queueManager.setBackpressure("ai_queue", false);
      console.log("AI queue throttling removed");
    }
  }

  private mapWorkflowRow(row: any): PAPWorkflow {
    return {
      id: row.id,
      user_id: row.user_id,
      action_type: row.action_type,
      program_type: row.program_type,
      status: row.status,
      pap_subscription_id: row.pap_subscription_id,
      consent_validated: Boolean(row.consent_validated),
      caps_checked: Boolean(row.caps_checked),
      quiet_hours_respected: Boolean(row.quiet_hours_respected),
      content_safety_passed: Boolean(row.content_safety_passed),
      ai_eligibility_checked: Boolean(row.ai_eligibility_checked),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}
