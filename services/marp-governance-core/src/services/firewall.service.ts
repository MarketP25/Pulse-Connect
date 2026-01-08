import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { HashChain } from '../../../shared/lib/src/hashChain';
import { PC365Guard } from '../../../shared/lib/src/pc365Guard';
import {
  CreateFirewallRuleDto,
  FirewallEnforceDto,
  FirewallRuleDto,
  FirewallEnforceResultDto,
  FirewallRuleType,
  FirewallDirection
} from '../dto/firewall.dto';

@Injectable()
export class FirewallService {
  private readonly logger = new Logger(FirewallService.name);
  private readonly hashChain = new HashChain();

  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
    private readonly pc365Guard: PC365Guard,
  ) {}

  /**
   * Get all active firewall rules
   */
  async getActiveRules(subsystem?: string, direction?: FirewallDirection): Promise<FirewallRuleDto[]> {
    try {
      let query = `
        SELECT
          id, rule_name as "ruleName", rule_type as "ruleType", direction,
          subsystem_scope as "subsystemScope", source_pattern as "sourcePattern",
          destination_pattern as "destinationPattern", conditions, actions, priority,
          is_active as "isActive", council_decision_id as "councilDecisionId",
          created_by as "createdBy", effective_from as "effectiveFrom",
          effective_until as "effectiveUntil", created_at as "createdAt",
          updated_at as "updatedAt"
        FROM firewall_rules
        WHERE is_active = true
          AND effective_from <= NOW()
          AND (effective_until IS NULL OR effective_until > NOW())
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (subsystem) {
        query += ` AND (subsystem_scope = $${paramIndex} OR subsystem_scope IS NULL)`;
        params.push(subsystem);
        paramIndex++;
      }

      if (direction) {
        query += ` AND direction = $${paramIndex}`;
        params.push(direction);
        paramIndex++;
      }

      query += ` ORDER BY priority DESC, created_at DESC`;

      const result = await this.db.query(query, params);

      return result.rows.map(row => ({
        ...row,
        effectiveFrom: row.effectiveFrom.toISOString(),
        effectiveUntil: row.effectiveUntil?.toISOString(),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));
    } catch (error) {
      this.logger.error(`Failed to get active firewall rules: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new firewall rule
   */
  async createRule(dto: CreateFirewallRuleDto, createdBy: string): Promise<FirewallRuleDto> {
    try {
      // Validate rule doesn't already exist
      const existingQuery = `SELECT id FROM firewall_rules WHERE rule_name = $1`;
      const existingResult = await this.db.query(existingQuery, [dto.ruleName]);

      if (existingResult.rows.length > 0) {
        throw new Error(`Firewall rule with name '${dto.ruleName}' already exists`);
      }

      // Insert new rule
      const insertQuery = `
        INSERT INTO firewall_rules (
          rule_name, rule_type, direction, subsystem_scope, source_pattern,
          destination_pattern, conditions, actions, priority, is_active,
          council_decision_id, created_by, effective_from
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const params = [
        dto.ruleName,
        dto.ruleType,
        dto.direction,
        dto.subsystemScope,
        dto.sourcePattern,
        dto.destinationPattern,
        JSON.stringify(dto.conditions || {}),
        JSON.stringify(dto.actions || {}),
        dto.priority || 100,
        false, // New rules start inactive
        dto.councilDecisionId,
        createdBy,
        new Date(),
      ];

      const result = await this.db.query(insertQuery, params);
      const rule = result.rows[0];

      // Create audit entry
      await this.createAuditEntry({
        actionType: 'firewall_rule_create',
        subsystemName: dto.subsystemScope,
        userId: createdBy,
        actionData: {
          ruleId: rule.id,
          ruleName: dto.ruleName,
          ruleType: dto.ruleType,
        },
        riskLevel: 'medium',
        actionResult: 'success',
      });

      return {
        ...rule,
        ruleName: rule.rule_name,
        ruleType: rule.rule_type,
        subsystemScope: rule.subsystem_scope,
        sourcePattern: rule.source_pattern,
        destinationPattern: rule.destination_pattern,
        isActive: rule.is_active,
        councilDecisionId: rule.council_decision_id,
        createdBy: rule.created_by,
        effectiveFrom: rule.effective_from.toISOString(),
        effectiveUntil: rule.effective_until?.toISOString(),
        createdAt: rule.created_at.toISOString(),
        updatedAt: rule.updated_at.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to create firewall rule: ${error.message}`);

      await this.createAuditEntry({
        actionType: 'firewall_rule_create',
        actionData: { ruleName: dto.ruleName, error: error.message },
        riskLevel: 'medium',
        actionResult: 'failure',
        errorMessage: error.message,
      });

      throw error;
    }
  }

  /**
   * Enforce firewall rules for a subsystem action
   */
  async enforceRules(dto: FirewallEnforceDto): Promise<FirewallEnforceResultDto> {
    try {
      // Get active rules for this subsystem and direction
      const rules = await this.getActiveRules(dto.subsystemName, FirewallDirection.OUTBOUND);

      let allowed = true;
      let appliedRules: FirewallRuleDto[] = [];
      let quarantineInfo: any = null;
      let escalationInfo: any = null;
      let riskAssessment = 'low';

      // Evaluate rules in priority order
      for (const rule of rules) {
        if (this.ruleMatches(dto, rule)) {
          appliedRules.push(rule);

          switch (rule.ruleType) {
            case FirewallRuleType.BLOCK:
              allowed = false;
              riskAssessment = 'high';
              break;

            case FirewallRuleType.QUARANTINE:
              allowed = false;
              quarantineInfo = rule.actions;
              riskAssessment = 'medium';
              break;

            case FirewallRuleType.ESCALATE:
              allowed = false;
              escalationInfo = rule.actions;
              riskAssessment = 'critical';
              break;

            case FirewallRuleType.ALLOW:
              // Explicit allow overrides previous blocks
              allowed = true;
              riskAssessment = 'low';
              break;
          }

          // If we have a definitive action, break
          if (!allowed) break;
        }
      }

      // Create audit entry
      const auditEntry = await this.createAuditEntry({
        actionType: 'firewall_enforce',
        subsystemName: dto.subsystemName,
        userId: 'marp-firewall',
        actionData: {
          action: dto.action,
          allowed,
          appliedRulesCount: appliedRules.length,
          riskAssessment,
        },
        riskLevel: riskAssessment as any,
        actionResult: allowed ? 'success' : 'blocked',
      });

      return {
        allowed,
        action: allowed ? 'allowed' : 'blocked',
        appliedRules,
        quarantineInfo,
        escalationInfo,
        riskAssessment,
        auditEntry,
      };
    } catch (error) {
      this.logger.error(`Failed to enforce firewall rules: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a firewall rule matches the enforcement request
   */
  private ruleMatches(dto: FirewallEnforceDto, rule: FirewallRuleDto): boolean {
    // Check subsystem scope
    if (rule.subsystemScope && rule.subsystemScope !== dto.subsystemName) {
      return false;
    }

    // Check source pattern (simplified regex matching)
    if (rule.sourcePattern) {
      try {
        const regex = new RegExp(rule.sourcePattern);
        if (!regex.test(dto.subsystemName)) {
          return false;
        }
      } catch (error) {
        this.logger.warn(`Invalid regex pattern in firewall rule: ${rule.sourcePattern}`);
        return false;
      }
    }

    // Check destination pattern
    if (rule.destinationPattern) {
      try {
        const regex = new RegExp(rule.destinationPattern);
        if (!regex.test(dto.action)) {
          return false;
        }
      } catch (error) {
        this.logger.warn(`Invalid regex pattern in firewall rule: ${rule.destinationPattern}`);
        return false;
      }
    }

    // Check conditions
    if (rule.conditions && Object.keys(rule.conditions).length > 0) {
      // Simplified condition checking - in production this would be more sophisticated
      for (const [key, value] of Object.entries(rule.conditions)) {
        if (dto.payload[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Create audit entry for firewall operations
   */
  private async createAuditEntry(data: {
    actionType: string;
    subsystemName?: string;
    userId?: string;
    actionData: any;
    riskLevel: string;
    actionResult: string;
    errorMessage?: string;
  }): Promise<Record<string, any>> {
    const auditQuery = `
      INSERT INTO marp_audit (
        action_type, subsystem_name, user_id, request_id,
        action_data, risk_level, action_result, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at
    `;

    const result = await this.db.query(auditQuery, [
      data.actionType,
      data.subsystemName,
      data.userId,
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      JSON.stringify(data.actionData),
      data.riskLevel,
      data.actionResult,
      data.errorMessage,
    ]);

    return {
      auditId: result.rows[0].id,
      timestamp: result.rows[0].created_at.toISOString(),
    };
  }
}
