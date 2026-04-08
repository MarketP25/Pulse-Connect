import { Injectable, Logger } from "@nestjs/common";
import { ExecuteRequestDto, DecisionType, ExecutionDecision } from "../dto/execute-request.dto";
import { PolicySnapshot } from "./policy-cache.service";

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
        ruleId: "error-fallback"
      };
    }
  }

  /**
   * Evaluate individual policy rule
   */
  private async evaluateRule(
    request: ExecuteRequestDto,
    rule: any
  ): Promise<ExecutionDecision | null> {
    try {
      // Check if rule conditions match
      const conditionsMet = await this.evaluateConditions(request, rule.conditions || []);

      if (!conditionsMet) {
        return null; // Rule doesn't apply
      }

      // Rule matches - determine action
      const action = rule.action || "allow";
      const riskScore = this.calculateRiskScore(request, rule);

      switch (action) {
        case "allow":
          return {
            type: DecisionType.ALLOW,
            rationale: rule.rationale || `Allowed by rule: ${rule.id || "unnamed"}`,
            riskScore,
            ruleId: rule.id
          };

        case "block":
          return {
            type: DecisionType.BLOCK,
            rationale: rule.rationale || `Blocked by rule: ${rule.id || "unnamed"}`,
            riskScore,
            ruleId: rule.id
          };

        case "quarantine":
          return {
            type: DecisionType.QUARANTINE,
            rationale: rule.rationale || `Quarantined by rule: ${rule.id || "unnamed"}`,
            riskScore,
            ruleId: rule.id,
            quarantineReason: rule.quarantineReason,
            quarantineDuration: rule.quarantineDuration,
            escalationRequired: rule.escalationRequired
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
  private async evaluateConditions(
    request: ExecuteRequestDto,
    conditions: any[]
  ): Promise<boolean> {
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
      case "equals":
        return fieldValue === value;
      case "not_equals":
        return fieldValue !== value;
      case "contains":
        return String(fieldValue).includes(String(value));
      case "greater_than":
        return Number(fieldValue) > Number(value);
      case "less_than":
        return Number(fieldValue) < Number(value);
      case "in":
        return Array.isArray(value) && value.includes(fieldValue);
      case "not_in":
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Extract field value from request using dot notation
   */
  private extractFieldValue(request: ExecuteRequestDto, fieldPath: string): any {
    const parts = fieldPath.split(".");
    let value: any = request;

    for (const part of parts) {
      if (value && typeof value === "object") {
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
        ruleId: "ai-risk-assessment",
        quarantineReason: "AI-detected high risk",
        quarantineDuration: 3600000, // 1 hour
        escalationRequired: riskScore > 0.9
      };
    }

    return {
      type: DecisionType.ALLOW,
      rationale: `AI risk assessment passed (score: ${riskScore.toFixed(2)})`,
      riskScore,
      ruleId: "ai-risk-assessment"
    };
  }

  /**
   * Apply subsystem-specific risk factors
   */
  private applySubsystemRiskFactors(request: ExecuteRequestDto, baseRisk: number): number {
    let risk = baseRisk;
    const crossModule = this.extractCrossModuleSignals(request);

    if (crossModule.aiRiskAmplifier > 0) {
      risk += crossModule.aiRiskAmplifier;
    }
    if (
      crossModule.crossRegion &&
      (request.subsystem === "ecommerce" ||
        request.subsystem === "payments" ||
        request.subsystem === "matchmaking")
    ) {
      risk += 0.1;
    }
    if (crossModule.localizationLanguage !== "en" && request.subsystem === "ecommerce") {
      risk += 0.02;
    }
    if (
      request.subsystem === "ecommerce" &&
      crossModule.placesSignalScore > 0.7 &&
      crossModule.matchmakingCompatibilityScore > 0.65
    ) {
      risk -= 0.06;
    }
    if (request.subsystem === "ecommerce" && crossModule.placesSignalScore < 0.3) {
      risk += 0.08;
    }

    switch (request.subsystem) {
      case "payments":
        if (request.context?.amount > 5000) risk += 0.3;
        if (request.context?.destination === "high-risk") risk += 0.2;
        break;

      case "ai-engine-chatbot":
        if (request.context?.intent === "unsafe") risk += 0.4;
        if (request.context?.contentLength > 1000) risk += 0.1;
        break;

      case "matchmaking":
        if (request.context?.crossRegion) risk += 0.2;
        if (request.context?.ageDifference > 10) risk += 0.1;
        break;

      case "ecommerce":
        if (crossModule.dynamicPricingZone === "high-regulation") risk += 0.08;
        if (crossModule.placeZone === "global") risk += 0.05;
        break;

      case "proximity-geocoding":
        if (!crossModule.coordinatesAvailable) risk += 0.05;
        break;

      case "places-venues":
        if (!crossModule.coordinatesAvailable) risk += 0.2;
        if (crossModule.placeZone === "global") risk += 0.12;
        break;

      case "automated-marketing":
        if (request.context?.frequency > 5) risk += 0.3;
        if (!request.context?.consent) risk += 0.5;
        break;
    }

    return Math.min(risk, 1.0); // Cap at 1.0
  }

  private extractCrossModuleSignals(request: ExecuteRequestDto): {
    aiRiskAmplifier: number;
    placesSignalScore: number;
    matchmakingCompatibilityScore: number;
    localizationLanguage: string;
    crossRegion: boolean;
    dynamicPricingZone: string;
    coordinatesAvailable: boolean;
    placeZone: string;
  } {
    const context =
      request.context && typeof request.context === "object" && !Array.isArray(request.context)
        ? (request.context as Record<string, unknown>)
        : {};
    const crossModule =
      context.crossModule &&
      typeof context.crossModule === "object" &&
      !Array.isArray(context.crossModule)
        ? (context.crossModule as Record<string, unknown>)
        : {};
    const ai =
      crossModule.ai && typeof crossModule.ai === "object" && !Array.isArray(crossModule.ai)
        ? (crossModule.ai as Record<string, unknown>)
        : {};
    const places =
      crossModule.places &&
      typeof crossModule.places === "object" &&
      !Array.isArray(crossModule.places)
        ? (crossModule.places as Record<string, unknown>)
        : {};
    const matchmaking =
      crossModule.matchmaking &&
      typeof crossModule.matchmaking === "object" &&
      !Array.isArray(crossModule.matchmaking)
        ? (crossModule.matchmaking as Record<string, unknown>)
        : {};
    const localization =
      crossModule.localization &&
      typeof crossModule.localization === "object" &&
      !Array.isArray(crossModule.localization)
        ? (crossModule.localization as Record<string, unknown>)
        : {};
    const ecommerce =
      crossModule.ecommerce &&
      typeof crossModule.ecommerce === "object" &&
      !Array.isArray(crossModule.ecommerce)
        ? (crossModule.ecommerce as Record<string, unknown>)
        : {};
    const geocoding =
      crossModule.geocoding &&
      typeof crossModule.geocoding === "object" &&
      !Array.isArray(crossModule.geocoding)
        ? (crossModule.geocoding as Record<string, unknown>)
        : {};

    return {
      aiRiskAmplifier: this.toNumber(ai.riskAmplifier, 0),
      placesSignalScore: this.toNumber(places.signalScore, 0.5),
      matchmakingCompatibilityScore: this.toNumber(matchmaking.compatibilityScore, 0.5),
      localizationLanguage: this.toString(localization.language, "en"),
      crossRegion: this.toBoolean(matchmaking.crossRegion),
      dynamicPricingZone: this.toString(ecommerce.dynamicPricingZone, "regional-standard"),
      coordinatesAvailable: this.toBoolean(geocoding.coordinatesAvailable),
      placeZone: this.toString(places.zone, "unknown")
    };
  }

  private toNumber(value: unknown, fallback: number): number {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return fallback;
  }

  private toString(value: unknown, fallback: string): string {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  private toBoolean(value: unknown): boolean {
    return value === true;
  }

  /**
   * Calculate risk score for rule-based decisions
   */
  private calculateRiskScore(request: ExecuteRequestDto, rule: any): number {
    // Base score from rule
    let score = rule.riskScore || 0.5;

    // Adjust based on request context
    if (request.context?.urgency === "high") score += 0.1;
    if (request.context?.verified === false) score += 0.2;

    return Math.min(Math.max(score, 0), 1);
  }
}
