/**
 * AI Rule Interpreter for MARP-signed policy bundles
 * Provides local AI-driven rule evaluation and risk assessment
 */
export interface AIRule {
    id: string;
    name: string;
    type: "classification" | "scoring" | "threshold" | "pattern";
    conditions: RuleCondition[];
    actions: RuleAction[];
    metadata: {
        version: string;
        author: string;
        confidence: number;
        createdAt: string;
        subsystemScope?: string[];
    };
}
export interface RuleCondition {
    field: string;
    operator: "eq" | "gt" | "lt" | "gte" | "lte" | "contains" | "regex" | "in";
    value: any;
    weight?: number;
}
export interface RuleAction {
    type: "allow" | "block" | "quarantine" | "escalate" | "score";
    value?: any;
    metadata?: Record<string, any>;
}
export interface ExecutionContext {
    userId: string;
    subsystem: string;
    action: string;
    riskScore?: number;
    location?: {
        latitude: number;
        longitude: number;
        region: string;
    };
    history?: Array<{
        timestamp: string;
        action: string;
        result: string;
    }>;
}
export interface InterpretationResult {
    decision: "allow" | "block" | "quarantine" | "escalate";
    confidence: number;
    reasoning: string[];
    riskScore: number;
    appliedRules: string[];
    metadata: {
        ruleVersion: string;
        executionTime: number;
        hash: string;
    };
}
/**
 * AI Rule Interpreter Service
 * Evaluates MARP-signed AI rules against execution contexts
 */
export declare class AIRuleInterpreter {
    private hashChain;
    constructor();
    /**
     * Evaluate AI rules against execution context
     */
    evaluateRules(rules: AIRule[], context: ExecutionContext): Promise<InterpretationResult>;
    /**
     * Check if rule should be evaluated for given context
     */
    private shouldEvaluateRule;
    /**
     * Evaluate individual rule against context
     */
    private evaluateRule;
    /**
     * Evaluate individual condition against context
     */
    private evaluateCondition;
    /**
     * Extract field value from execution context
     */
    private getFieldValue;
}
