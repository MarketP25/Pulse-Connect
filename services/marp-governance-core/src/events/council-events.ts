import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * MARP Council Events
 *
 * Event-driven architecture for council decision-making and governance.
 * Enables real-time voting, quorum tracking, and decision synchronization.
 */

export interface CouncilCreatedEvent {
  councilId: string;
  councilName: string;
  councilType: 'governance' | 'security' | 'technical' | 'compliance';
  memberCount: number;
  quorumRequirement: number;
  createdBy: string;
  timestamp: string;
}

export interface CouncilMemberAddedEvent {
  councilId: string;
  memberId: string;
  memberRole: 'chair' | 'member' | 'observer';
  addedBy: string;
  timestamp: string;
}

export interface CouncilVoteCastEvent {
  councilId: string;
  decisionId: string;
  memberId: string;
  vote: 'approve' | 'deny' | 'abstain';
  voteWeight: number;
  reasoning?: string;
  timestamp: string;
}

export interface CouncilQuorumReachedEvent {
  councilId: string;
  decisionId: string;
  currentVotes: number;
  requiredVotes: number;
  timeToDecision: number;
  timestamp: string;
}

export interface CouncilDecisionMadeEvent {
  councilId: string;
  decisionId: string;
  decision: 'approved' | 'denied' | 'escalated';
  voteBreakdown: {
    approve: number;
    deny: number;
    abstain: number;
  };
  consensusLevel: number;
  executionDeadline?: string;
  timestamp: string;
}

export interface CouncilEscalationEvent {
  councilId: string;
  decisionId: string;
  escalationReason: string;
  escalationLevel: 'founder' | 'executive' | 'emergency';
  escalatedBy: string;
  timestamp: string;
}

@Injectable()
export class CouncilEventEmitter {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emit council creation event
   */
  async emitCouncilCreated(event: CouncilCreatedEvent): Promise<void> {
    this.eventEmitter.emit('marp.council.created', event);
    this.eventEmitter.emit('marp.governance.council.lifecycle', {
      type: 'created',
      ...event,
    });
  }

  /**
   * Emit council member addition event
   */
  async emitCouncilMemberAdded(event: CouncilMemberAddedEvent): Promise<void> {
    this.eventEmitter.emit('marp.council.member.added', event);
    this.eventEmitter.emit('marp.governance.council.lifecycle', {
      type: 'member_added',
      ...event,
    });
  }

  /**
   * Emit council vote cast event
   */
  async emitCouncilVoteCast(event: CouncilVoteCastEvent): Promise<void> {
    this.eventEmitter.emit('marp.council.vote.cast', event);
    this.eventEmitter.emit('marp.governance.voting', event);
  }

  /**
   * Emit council quorum reached event
   */
  async emitCouncilQuorumReached(event: CouncilQuorumReachedEvent): Promise<void> {
    this.eventEmitter.emit('marp.council.quorum.reached', event);
    this.eventEmitter.emit('marp.governance.quorum', event);
  }

  /**
   * Emit council decision made event
   */
  async emitCouncilDecisionMade(event: CouncilDecisionMadeEvent): Promise<void> {
    this.eventEmitter.emit('marp.council.decision.made', event);
    this.eventEmitter.emit('marp.governance.decision', event);
  }

  /**
   * Emit council escalation event
   */
  async emitCouncilEscalation(event: CouncilEscalationEvent): Promise<void> {
    this.eventEmitter.emit('marp.council.escalation', event);
    this.eventEmitter.emit('marp.governance.escalation', event);
  }
}

/**
 * Council Event Topics
 */
export const COUNCIL_EVENT_TOPICS = {
  COUNCIL_CREATED: 'marp.council.created',
  COUNCIL_MEMBER_ADDED: 'marp.council.member.added',
  COUNCIL_VOTE_CAST: 'marp.council.vote.cast',
  COUNCIL_QUORUM_REACHED: 'marp.council.quorum.reached',
  COUNCIL_DECISION_MADE: 'marp.council.decision.made',
  COUNCIL_ESCALATION: 'marp.council.escalation',

  // Aggregated Topics
  GOVERNANCE_COUNCIL_LIFECYCLE: 'marp.governance.council.lifecycle',
  GOVERNANCE_VOTING: 'marp.governance.voting',
  GOVERNANCE_QUORUM: 'marp.governance.quorum',
  GOVERNANCE_DECISION: 'marp.governance.decision',
  GOVERNANCE_ESCALATION: 'marp.governance.escalation',
} as const;

/**
 * Council Event Payload Types
 */
export type CouncilEventPayload =
  | CouncilCreatedEvent
  | CouncilMemberAddedEvent
  | CouncilVoteCastEvent
  | CouncilQuorumReachedEvent
  | CouncilDecisionMadeEvent
  | CouncilEscalationEvent;

/**
 * Council Event Handler Interface
 */
export interface CouncilEventHandler {
  handleCouncilCreated(event: CouncilCreatedEvent): Promise<void>;
  handleCouncilMemberAdded(event: CouncilMemberAddedEvent): Promise<void>;
  handleCouncilVoteCast(event: CouncilVoteCastEvent): Promise<void>;
  handleCouncilQuorumReached(event: CouncilQuorumReachedEvent): Promise<void>;
  handleCouncilDecisionMade(event: CouncilDecisionMadeEvent): Promise<void>;
  handleCouncilEscalation(event: CouncilEscalationEvent): Promise<void>;
}
