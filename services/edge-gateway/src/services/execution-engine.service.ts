import { Injectable, Logger } from '@nestjs/common';
import { ExecuteRequestDto, DecisionType, ExecutionDecision } from '../dto/execute-request.dto';
import { PolicySnapshot } from './policy-cache.service';

@Injectable()
export class ExecutionEngineService {
  private readonly logger = new Logger(ExecutionEngineService.name);

  /**
   * Evaluate request against active policy snapshot
   * Returns allow/block/quarantine decision with rationale
   */
  async evaluateRequest(
    request: ExecuteRequestDto,
    policy: PolicySnapshot
  ): Promise<ExecutionDecision> {
    try {
      this.logger.debug(`Evaluating request ${request.requestId} against policy ${policy.version}`);

      // Step 1: Extract policy rules
      const rules = policy.content?.rules || [];

      // Step 2: Evaluate each rule
      for (const rule of rules) {
        const decision = await this.evaluateRule(request, rule);
        if (decision) {
          return decision;
        }
      }

      // Step 3: Apply AI-driven risk assessment if no rules match
      return await this.performRiskAssessment(request, policy);

    } catch (error) {
      this.logger.error(`Policy evaluation failed: ${error.message}`);
      return {
        type: DecisionType.BLOCK,
        rationale: `Policy evaluation error: ${error.message}`,
        riskScore: 1.0,
        ruleId: 'error-fallback',
      };
    }
  }

  /**
   * Evaluate individual policy rule
   */
  private async evaluateRule(request: ExecuteRequestDto, rule: any): Promise<ExecutionDecision | null> {
    try {
      // Check if rule conditions match
      const conditionsMet = await this.evaluateConditions(request, rule.conditions || []);

      if (!conditionsMet) {
        return null; // Rule doesn't apply
      }

      // Rule matches - determine action
      const action = rule.action || 'allow';
      const riskScore = this.calculateRiskScore(request, rule);

      switch (action) {
        case 'allow':
          return {
            type: DecisionType.ALLOW,
            rationale: rule.rationale || `Allowed by rule: ${rule.id || 'unnamed'}`,
            riskScore,
            ruleId: rule.id,
          };

        case 'block':
          return {
            type: DecisionType.BLOCK,
            rationale: rule.rationale || `Blocked by rule: ${rule.id || 'unnamed'}`,
            riskScore,
            ruleId: rule.id,
          };

        case 'quarantine':
          return {
            type: DecisionType.QUARANTINE,
            rationale: rule.rationale || `Quarantined by rule: ${rule.id || 'unnamed'}`,
            riskScore,
            ruleId: rule.id,
            quarantineReason: rule.quarantineReason,
            quarantineDuration: rule.quarantineDuration,
            escalationRequired: rule.escalationRequired,
          };

        default:
          return null;
      }

    } catch (error) {
      this.logger.warn(`Rule evaluation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Evaluate rule conditions against request
   */
  private async evaluateConditions(request: ExecuteRequestDto, conditions: any[]): Promise<boolean> {
    for (const condition of conditions) {
      const met = await this.evaluateCondition(request, condition);
      if (!met) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate single condition
   */
  private async evaluateCondition(request: ExecuteRequestDto, condition: any): Promise<boolean> {
    const { field, operator, value } = condition;

    // Extract field value from request
    const fieldValue = this.extractFieldValue(request, field);

    // Apply operator
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Extract field value from request using dot notation
   */
  private extractFieldValue(request: ExecuteRequestDto, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value: any = request;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Perform AI-driven risk assessment when no rules match
   */
  private async performRiskAssessment(
    request: ExecuteRequestDto,
    policy: PolicySnapshot
  ): Promise<ExecutionDecision> {
    // Calculate base risk score
    let riskScore = 0.5; // Default medium risk

    // Factor in request characteristics
    if (request.context?.amount > 1000) riskScore += 0.2;
    if (request.context?.frequency > 10) riskScore += 0.1;
    if (request.userId && request.userId.length < 8) riskScore += 0.1; // Suspicious user ID

    // Apply subsystem-specific risk factors
    riskScore = this.applySubsystemRiskFactors(request, riskScore);

    // Determine decision based on risk score and policy thresholds
    const riskThreshold = policy.content?.riskThreshold || 0.7;

    if (riskScore >= riskThreshold) {
      return {
        type: DecisionType.QUARANTINE,
        rationale: `High risk score (${riskScore.toFixed(2)}) exceeds threshold`,
        riskScore,
        ruleId: 'ai-risk-assessment',
        quarantineReason: 'AI-detected high risk',
        quarantineDuration: 3600000, // 1 hour
        escalationRequired: riskScore > 0.9,
      };
    }

    return {
      type: DecisionType.ALLOW,
      rationale: `AI risk assessment passed (score: ${riskScore.toFixed(2)})`,
      riskScore,
      ruleId: 'ai-risk-assessment',
    };
  }

  /**
   * Apply subsystem-specific risk factors
   */
  private applySubsystemRiskFactors(request: ExecuteRequestDto, baseRisk: number): number {
    let risk = baseRisk;

    switch (request.subsystem) {
      case 'payments':
        if (request.context?.amount > 5000) risk += 0.3;
        if (request.context?.destination === 'high-risk') risk += 0.2;
        break;

      case 'ai-engine-chatbot':
        if (request.context?.intent === 'unsafe') risk += 0.4;
        if (request.context?.contentLength > 1000) risk += 0.1;
        break;

      case 'matchmaking':
        if (request.context?.crossRegion) risk += 0.2;
        if (request.context?.ageDifference > 10) risk += 0.1;
        break;

      case 'automated-marketing':
        if (request.context?.frequency > 5) risk += 0.3;
        if (!request.context?.consent) risk += 0.5;
        break;
    }

    return Math.min(risk, 1.0); // Cap at 1.0
  }

  /**
   * Calculate risk score for rule-based decisions
   */
  private calculateRiskScore(request: ExecuteRequestDto, rule: any): number {
    // Base score from rule
    let score = rule.riskScore || 0.5;

    // Adjust based on request context
    if (request.context?.urgency === 'high') score += 0.1;
    if (request.context?.verified === false) score += 0.2;

    return Math.min(Math.max(score, 0), 1);
  }
}
