"use strict";
/**
 * PULSCO Shared Governance Framework
 *
 * This file defines the core type contracts for the "governance-first" planetary architecture.
 * It provides the shared schema for policy evaluation (MARP), advisory signals (CSI),
 * and the immutable hash-chained audit trails required for planetary-scale trust.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceLevel = void 0;
/**
 * Governance Levels define the risk thresholds and approval workflows.
 */
var GovernanceLevel;
(function (GovernanceLevel) {
    /** LEVEL 1: Low-risk. Fully automated within predefined guardrails. */
    GovernanceLevel["L1_AUTOMATED"] = "LEVEL_1";
    /** LEVEL 2: Moderate risk. Semi-automated; requires oversight or supervised rollout. */
    GovernanceLevel["L2_SUPERVISED"] = "LEVEL_2";
    /** LEVEL 3: Strategic/High-risk. Requires Founder/Superadmin Dual-Control (PC365). */
    GovernanceLevel["L3_FOUNDER_SIGNATURE"] = "LEVEL_3";
})(GovernanceLevel || (exports.GovernanceLevel = GovernanceLevel = {}));
