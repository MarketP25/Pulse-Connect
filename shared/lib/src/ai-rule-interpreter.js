"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIRuleInterpreter = void 0;
const hashChain_1 = require("./hashChain");
/**
 * AI Rule Interpreter Service
 * Evaluates MARP-signed AI rules against execution contexts
 */
class AIRuleInterpreter {
    constructor() {
        this.hashChain = new hashChain_1.HashChain();
    }
    /**
     * Evaluate AI rules against execution context
     */
    async evaluateRules(rules, context) {
        const startTime = Date.now();
        const appliedRules = [];
        const reasoning = [];
        let finalDecision = "allow";
        let maxConfidence = 0;
        let totalRiskScore = context.riskScore || 0;
        // Evaluate each rule
        for (const rule of rules) {
            if (this.shouldEvaluateRule(rule, context)) {
                const ruleResult = await this.evaluateRule(rule, context);
                appliedRules.push(rule.id);
                // Update decision based on rule outcome
                if (ruleResult.decision === "block" && finalDecision === "allow") {
                    finalDecision = "block";
                }
                else if (ruleResult.decision === "escalate") {
                    finalDecision = "escalate";
                }
                else if (ruleResult.decision === "quarantine" && finalDecision !== "escalate") {
                    finalDecision = "quarantine";
                }
                // Update confidence and risk
                maxConfidence = Math.max(maxConfidence, ruleResult.confidence);
                totalRiskScore += ruleResult.riskAdjustment || 0;
                // Add reasoning
                reasoning.push(...ruleResult.reasoning);
            }
        }
        const executionTime = Date.now() - startTime;
        // Create result hash for audit trail
        const resultData = {
            decision: finalDecision,
            confidence: maxConfidence,
            appliedRules,
            timestamp: new Date().toISOString(),
            context: {
                userId: context.userId,
                subsystem: context.subsystem,
                action: context.action
            }
        };
        const hash = await this.hashChain.createHash(JSON.stringify(resultData));
        return {
            decision: finalDecision,
            confidence: maxConfidence,
            reasoning,
            riskScore: Math.min(totalRiskScore, 100), // Cap at 100
            appliedRules,
            metadata: {
                ruleVersion: rules[0]?.metadata.version || "1.0.0",
                executionTime,
                hash
            }
        };
    }
    /**
     * Check if rule should be evaluated for given context
     */
    shouldEvaluateRule(rule, context) {
        // Check subsystem scope
        if (rule.metadata.subsystemScope && !rule.metadata.subsystemScope.includes(context.subsystem)) {
            return false;
        }
        // Rule is applicable
        return true;
    }
    /**
     * Evaluate individual rule against context
     */
    async evaluateRule(rule, context) {
        const reasoning = [];
        let conditionsMet = 0;
        let totalWeight = 0;
        let riskAdjustment = 0;
        // Evaluate all conditions
        for (const condition of rule.conditions) {
            const weight = condition.weight || 1;
            totalWeight += weight;
            if (this.evaluateCondition(condition, context)) {
                conditionsMet += weight;
                reasoning.push(`Condition met: ${condition.field} ${condition.operator} ${condition.value}`);
            }
            else {
                reasoning.push(`Condition not met: ${condition.field} ${condition.operator} ${condition.value}`);
            }
        }
        // Calculate confidence based on conditions met
        const confidence = totalWeight > 0 ? (conditionsMet / totalWeight) * rule.metadata.confidence : 0;
        // Determine action based on rule type and confidence
        let decision = "allow";
        switch (rule.type) {
            case "classification":
                if (confidence >= 0.8) {
                    decision = rule.actions[0]?.type || "allow";
                }
                break;
            case "scoring":
                riskAdjustment = confidence * 10; // Scale risk score
                if (confidence >= 0.9) {
                    decision = "escalate";
                }
                break;
            case "threshold":
                if (confidence >= 0.7) {
                    decision = rule.actions[0]?.type || "block";
                }
                break;
            case "pattern":
                if (confidence >= 0.6) {
                    decision = rule.actions[0]?.type || "quarantine";
                }
                break;
        }
        reasoning.push(`Rule ${rule.name} (${rule.type}): ${conditionsMet}/${totalWeight} conditions met, confidence: ${(confidence * 100).toFixed(1)}%`);
        return {
            decision,
            confidence,
            riskAdjustment,
            reasoning
        };
    }
    /**
     * Evaluate individual condition against context
     */
    evaluateCondition(condition, context) {
        const fieldValue = this.getFieldValue(condition.field, context);
        switch (condition.operator) {
            case "eq":
                return fieldValue === condition.value;
            case "gt":
                return typeof fieldValue === "number" && fieldValue > condition.value;
            case "lt":
                return typeof fieldValue === "number" && fieldValue < condition.value;
            case "gte":
                return typeof fieldValue === "number" && fieldValue >= condition.value;
            case "lte":
                return typeof fieldValue === "number" && fieldValue <= condition.value;
            case "contains":
                return typeof fieldValue === "string" && fieldValue.includes(condition.value);
            case "regex":
                return typeof fieldValue === "string" && new RegExp(condition.value).test(fieldValue);
            case "in":
                return Array.isArray(condition.value) && condition.value.includes(fieldValue);
            default:
                return false;
        }
    }
    /**
     * Extract field value from execution context
     */
    getFieldValue(field, context) {
        const fieldPath = field.split(".");
        let value = context;
        for (const path of fieldPath) {
            value = value?.[path];
            if (value === undefined)
                break;
        }
        return value;
    }
}
exports.AIRuleInterpreter = AIRuleInterpreter;
