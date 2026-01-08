import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * MARP Policy Events
 *
 * Event-driven architecture for policy lifecycle management.
 * Enables real-time notifications and reactive governance workflows.
 */

export interface PolicyCreatedEvent {
  policyId: string;
  policyName: string;
  policyVersion: string;
  subsystemScope?: string;
  createdBy: string;
  timestamp: string;
  csiInsights?: any;
}

export interface PolicyValidatedEvent {
  policyId: string;
  policyName: string;
  validationResult: {
    isValid: boolean;
    riskAssessment: string;
    csiPoweredInsights: any[];
  };
  validatedBy: string;
  timestamp: string;
}

export interface PolicySignedEvent {
  policyId: string;
  policyName: string;
  signature: string;
  signedBy: string;
  councilDecisionId: string;
  pc365Attestation: boolean;
  timestamp: string;
}

export interface PolicyActivatedEvent {
  policyId: string;
  policyName: string;
  effectiveFrom: string;
  subsystemScope?: string;
  activatedBy: string;
  timestamp: string;
}

export interface PolicyConflictEvent {
  conflictId: string;
  conflictingPolicies: string[];
  conflictType: 'version' | 'scope' | 'content';
  severity: 'low' | 'medium' | 'high' | 'critical';
  subsystemScope?: string;
  detectedBy: string;
  timestamp: string;
}

@Injectable()
export class PolicyEventEmitter {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emit policy creation event
   */
  async emitPolicyCreated(event: PolicyCreatedEvent): Promise<void> {
    this.eventEmitter.emit('marp.policy.created', event);
    this.eventEmitter.emit('marp.governance.policy.lifecycle', {
      type: 'created',
      ...event,
    });
  }

  /**
   * Emit policy validation event
   */
  async emitPolicyValidated(event: PolicyValidatedEvent): Promise<void> {
    this.eventEmitter.emit('marp.policy.validated', event);
    this.eventEmitter.emit('marp.governance.policy.lifecycle', {
      type: 'validated',
      ...event,
    });
  }

  /**
   * Emit policy signing event
   */
  async emitPolicySigned(event: PolicySignedEvent): Promise<void> {
    this.eventEmitter.emit('marp.policy.signed', event);
    this.eventEmitter.emit('marp.governance.policy.lifecycle', {
      type: 'signed',
      ...event,
    });
  }

  /**
   * Emit policy activation event
   */
  async emitPolicyActivated(event: PolicyActivatedEvent): Promise<void> {
    this.eventEmitter.emit('marp.policy.activated', event);
    this.eventEmitter.emit('marp.governance.policy.lifecycle', {
      type: 'activated',
      ...event,
    });
  }

  /**
   * Emit policy conflict event
   */
  async emitPolicyConflict(event: PolicyConflictEvent): Promise<void> {
    this.eventEmitter.emit('marp.policy.conflict', event);
    this.eventEmitter.emit('marp.governance.conflict', event);
  }
}

/**
 * Event Topics for MARP Governance
 */
export const MARP_GOVERNANCE_TOPICS = {
  // Policy Lifecycle Events
  POLICY_CREATED: 'marp.policy.created',
  POLICY_VALIDATED: 'marp.policy.validated',
  POLICY_SIGNED: 'marp.policy.signed',
  POLICY_ACTIVATED: 'marp.policy.activated',
  POLICY_CONFLICT: 'marp.policy.conflict',

  // Council Events
  COUNCIL_DECISION_MADE: 'marp.council.decision.made',
  COUNCIL_VOTE_CAST: 'marp.council.vote.cast',
  COUNCIL_QUORUM_REACHED: 'marp.council.quorum.reached',

  // Governance Lifecycle
  GOVERNANCE_POLICY_LIFECYCLE: 'marp.governance.policy.lifecycle',
  GOVERNANCE_CONFLICT: 'marp.governance.conflict',
  GOVERNANCE_AUDIT: 'marp.governance.audit',

  // CSI Integration Events
  CSI_INSIGHTS_AVAILABLE: 'marp.csi.insights.available',
  CSI_VALIDATION_COMPLETE: 'marp.csi.validation.complete',
  CSI_ARBITRATION_REQUESTED: 'marp.csi.arbitration.requested',

  // Security Events
  SECURITY_PC365_VALIDATION: 'marp.security.pc365.validation',
  SECURITY_SIGNATURE_VERIFIED: 'marp.security.signature.verified',
  SECURITY_ACCESS_DENIED: 'marp.security.access.denied',
} as const;

/**
 * Event Payload Types
 */
export type PolicyEventPayload =
  | PolicyCreatedEvent
  | PolicyValidatedEvent
  | PolicySignedEvent
  | PolicyActivatedEvent
  | PolicyConflictEvent;

/**
 * Event Handler Interface
 */
export interface PolicyEventHandler {
  handlePolicyCreated(event: PolicyCreatedEvent): Promise<void>;
  handlePolicyValidated(event: PolicyValidatedEvent): Promise<void>;
  handlePolicySigned(event: PolicySignedEvent): Promise<void>;
  handlePolicyActivated(event: PolicyActivatedEvent): Promise<void>;
  handlePolicyConflict(event: PolicyConflictEvent): Promise<void>;
}
