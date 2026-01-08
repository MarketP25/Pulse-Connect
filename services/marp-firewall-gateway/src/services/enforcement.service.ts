import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { HashChain } from '../../../shared/lib/src/hashChain';

export interface EnforcementRequest {
  subsystemName: string;
  action: string;
  payload: Record<string, any>;
  context?: Record<string, any>;
}

export interface EnforcementResult {
  allowed: boolean;
  action?: string;
  appliedRules?: any[];
  quarantineInfo?: Record<string, any>;
  escalationInfo?: Record<string, any>;
  riskAssessment?: string;
  auditEntry?: Record<string, any>;
}

@Injectable()
export class EnforcementService {
  private readonly logger = new Logger(EnforcementService.name);
  private readonly hashChain = new HashChain();

  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
    @Inject('REDIS_CONNECTION') private readonly redis: any,
  ) {}

  async enforceRules(request: EnforcementRequest): Promise<EnforcementResult> {
    try {
      const { subsystemName, action, payload, context } = request;

      // CRITICAL: MARP does not operate on CSI - it protects it
      // MARP acts as interface between Pulsco through MARP platform and Edge
      if (this.isCSIProtectedOperation(payload, context)) {
        return {
          allowed: false,
          action: 'blocked',
          riskAssessment: 'csi_protected_operation',
          auditEntry: this.createAuditEntry(request, 'blocked', 'csi_protection_violation'),
        };
      }

      // Check subsystem registration
      const isRegistered = await this.checkSubsystemRegistration(subsystemName);
      if (!isRegistered) {
        return {
          allowed: false,
          action: 'blocked',
          riskAssessment: 'unregistered_subsystem',
          auditEntry: this.createAuditEntry(request, 'blocked', 'unregistered_subsystem'),
        };
      }

      // Validate MARP interface role - ensure flows are between Pulsco and Edge
      const interfaceValidation = this.validateMARPInterfaceRole(payload, context);
      if (!interfaceValidation.valid) {
        return {
          allowed: false,
          action: 'quarantined',
          riskAssessment: 'interface_role_violation',
          quarantineInfo: { reason: interfaceValidation.reason },
          auditEntry: this.createAuditEntry(request, 'quarantined', 'interface_role_violation'),
        };
      }

      // Get applicable firewall rules
      const rules = await this.getApplicableRules(subsystemName, action, payload);

      // Evaluate rules
      const evaluation = await this.evaluateRules(rules, payload, context);

      // Create audit entry
      const auditEntry = this.createAuditEntry(request, evaluation.action, evaluation.riskAssessment);

      return {
        allowed: evaluation.allowed,
        action: evaluation.action,
        appliedRules: rules,
        quarantineInfo: evaluation.quarantineInfo,
        escalationInfo: evaluation.escalationInfo,
        riskAssessment: evaluation.riskAssessment,
        auditEntry,
      };
    } catch (error) {
      this.logger.error(`Enforcement failed: ${error.message}`);
      return {
        allowed: false,
        action: 'escalated',
        riskAssessment: 'enforcement_error',
        escalationInfo: { error: error.message },
        auditEntry: this.createAuditEntry(request, 'escalated', 'enforcement_error'),
      };
    }
  }

  private async checkSubsystemRegistration(subsystemName: string): Promise<boolean> {
    const query = `
      SELECT is_registered FROM subsystem_registry
      WHERE subsystem_name = $1 AND is_registered = true
    `;

    const result = await this.db.query(query, [subsystemName]);
    return result.rows.length > 0;
  }

  private async getApplicableRules(
    subsystemName: string,
    action: string,
    payload: Record<string, any>
  ): Promise<any[]> {
    const query = `
      SELECT * FROM firewall_rules
      WHERE is_active = true
        AND (subsystem_scope IS NULL OR subsystem_scope = $1)
      ORDER BY priority DESC
    `;

    const result = await this.db.query(query, [subsystemName]);
    return result.rows;
  }

  private async evaluateRules(
    rules: any[],
    payload: Record<string, any>,
    context?: Record<string, any>
  ): Promise<{
    allowed: boolean;
    action: string;
    quarantineInfo?: Record<string, any>;
    escalationInfo?: Record<string, any>;
    riskAssessment: string;
  }> {
    let riskAssessment = 'low';
    let quarantineInfo: Record<string, any> | undefined;
    let escalationInfo: Record<string, any> | undefined;

    for (const rule of rules) {
      const matches = this.evaluateRuleConditions(rule, payload, context);

      if (matches) {
        switch (rule.rule_type) {
          case 'allow':
            return { allowed: true, action: 'allowed', riskAssessment };
          case 'block':
            return { allowed: false, action: 'blocked', riskAssessment: 'high' };
          case 'quarantine':
            quarantineInfo = rule.actions;
            riskAssessment = 'medium';
            break;
          case 'escalate':
            escalationInfo = rule.actions;
            riskAssessment = 'critical';
            break;
        }
      }
    }

    // Default action if no rules match
    return {
      allowed: true,
      action: 'allowed',
      riskAssessment,
      quarantineInfo,
      escalationInfo,
    };
  }

  private evaluateRuleConditions(
    rule: any,
    payload: Record<string, any>,
    context?: Record<string, any>
  ): boolean {
    const conditions = rule.conditions || {};

    // Simple pattern matching for now
    // In production, this would be more sophisticated
    for (const [key, pattern] of Object.entries(conditions)) {
      const value = payload[key] || context?.[key];
      if (value && typeof pattern === 'string') {
        if (!new RegExp(pattern).test(String(value))) {
          return false;
        }
      }
    }

    return true;
  }

  private createAuditEntry(
    request: EnforcementRequest,
    action: string,
    riskAssessment: string
  ): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      subsystemName: request.subsystemName,
      action: request.action,
      enforcementAction: action,
      riskAssessment,
      payloadHash: this.hashChain.hash(this.hashChain.canonicalize(request.payload)),
    };
  }

  /**
   * CRITICAL: MARP does not operate on CSI - it protects it
   * Block any operations that attempt to directly access or modify CSI
   */
  private isCSIProtectedOperation(payload: Record<string, any>, context?: Record<string, any>): boolean {
    const protectedPatterns = [
      /csi/i,
      /central.*super.*intelligence/i,
      /super.*intelligence.*core/i,
      /internal.*ai.*system/i,
      /protected.*core/i
    ];

    const checkValue = (value: any): boolean => {
      if (typeof value === 'string') {
        return protectedPatterns.some(pattern => pattern.test(value));
      }
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some(checkValue);
      }
      return false;
    };

    return checkValue(payload) || (context && checkValue(context));
  }

  /**
   * Validate MARP's interface role - ensure flows are between Pulsco and Edge
   * MARP acts as interface between Pulsco through MARP platform and Edge
   */
  private validateMARPInterfaceRole(payload: Record<string, any>, context?: Record<string, any>): { valid: boolean; reason?: string } {
    // Check if this is a valid Pulsco-to-Edge flow
    const source = payload.source || context?.source;
    const destination = payload.destination || context?.destination;

    // Valid sources: Pulsco subsystems, MARP platform
    const validSources = [
      'pulsco',
      'marp-platform',
      'ecommerce',
      'fraud',
      'communication',
      'payments',
      'marketing',
      'reporting',
      'ai-engine',
      'global-speed'
    ];

    // Valid destinations: Edge nodes, planetary systems
    const validDestinations = [
      'edge',
      'planetary',
      'regional',
      'user',
      'device',
      'client'
    ];

    const isValidSource = source && validSources.some(s => source.toLowerCase().includes(s));
    const isValidDestination = destination && validDestinations.some(d => destination.toLowerCase().includes(d));

    if (!isValidSource) {
      return { valid: false, reason: 'Invalid source - must be Pulsco or MARP platform subsystem' };
    }

    if (!isValidDestination) {
      return { valid: false, reason: 'Invalid destination - must be Edge or planetary system' };
    }

    return { valid: true };
  }
}
