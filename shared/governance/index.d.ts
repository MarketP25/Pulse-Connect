/**
 * PULSCO Shared Governance Framework
 *
 * This file defines the core type contracts for the "governance-first" planetary architecture.
 * It provides the shared schema for policy evaluation (MARP), advisory signals (CSI),
 * and the immutable hash-chained audit trails required for planetary-scale trust.
 */
/**
 * Governance Levels define the risk thresholds and approval workflows.
 */
export declare enum GovernanceLevel {
    /** LEVEL 1: Low-risk. Fully automated within predefined guardrails. */
    L1_AUTOMATED = "LEVEL_1",
    /** LEVEL 2: Moderate risk. Semi-automated; requires oversight or supervised rollout. */
    L2_SUPERVISED = "LEVEL_2",
    /** LEVEL 3: Strategic/High-risk. Requires Founder/Superadmin Dual-Control (PC365). */
    L3_FOUNDER_SIGNATURE = "LEVEL_3"
}
/**
 * Enforcement actions returned by the MARP (Market Arbitration/Review Policy) Core.
 */
export type PolicyAction = "ALLOW" | "DENY" | "MODIFY" | "CHALLENGE_DUAL_CONTROL";
/**
 * The outcome of a governance evaluation.
 * Included in every governed request between the Edge Gateway and Subsystems.
 */
export interface GovernanceDecision {
    decisionId: string;
    action: PolicyAction;
    level: GovernanceLevel;
    policyId: string;
    policyVersion: string;
    /**
     * Human-readable reasoning for the decision.
     * Hooks into the Decision Explainability requirement.
     */
    rationale: string;
    metadata: {
        correlationId: string;
        subsystem: string;
        region: string;
        timestamp: number;
    };
    /** Hash-chain reference for the preceding event to maintain non-repudiation. */
    parentEventHash: string;
}
/**
 * Audit Event Primitive.
 * Implements the "Hash Chaining" principle to ensure audit log immutability.
 */
export interface AuditLogEntry<T = Record<string, any>> {
    id: string;
    timestamp: number;
    actor: {
        id: string;
        role: string;
        pc365Attestation?: string;
    };
    action: string;
    subsystem: string;
    payload: T;
    /** Hash of (payload + timestamp + actor + previousHash). */
    hash: string;
    previousHash: string;
    /** Cryptographic signature of the MARP Core authority. */
    signature: string;
    /** Captured user consent state at the point of execution. */
    consent: {
        purpose: string;
        isVerified: boolean;
    };
}
/**
 * CSI (Central Super Intelligence) Advisory signals.
 * CSI is advisory-only but drives the recommendations evaluated by MARP.
 */
export interface CsiAdvisory {
    recommendation: string;
    suggestedLevel: GovernanceLevel;
    confidence: number;
    scores: {
        risk: number;
        performance: number;
        trust: number;
    };
    evidence: string[];
    simulationReportId?: string;
}
/**
 * PC365 Dual Control Configuration.
 * Used for sensitive Level 3 operations.
 */
export interface DualControlConfig {
    requiredApprovers: number;
    allowedRoles: string[];
    timeoutMs: number;
}
/** Current platform governance posture. */
export type GovernanceStatus = "ACTIVE" | "DEGRADED" | "EMERGENCY_FREEZE";
