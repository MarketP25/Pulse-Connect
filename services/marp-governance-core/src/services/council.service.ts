import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { HashChain } from '../../../shared/lib/src/hashChain';
import { PC365Guard } from '../../../shared/lib/src/pc365Guard';
import {
  CouncilDto,
  CouncilMemberDto,
  CouncilDecisionDto,
  VoteOnDecisionDto,
  DecisionResultDto,
  CouncilType
} from '../dto/council.dto';

@Injectable()
export class CouncilService {
  private readonly logger = new Logger(CouncilService.name);
  private readonly hashChain = new HashChain();

  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
    private readonly pc365Guard: PC365Guard,
  ) {}

  async getCouncils(): Promise<CouncilDto[]> {
    const query = `
      SELECT
        id,
        council_name as "councilName",
        council_type as "councilType",
        description,
        quorum_required as "quorumRequired",
        scopes,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM councils
      WHERE is_active = true
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query);
    return result.rows;
  }

  async getCouncilMembers(councilId: string): Promise<CouncilMemberDto[]> {
    const query = `
      SELECT
        cm.id,
        cm.council_id as "councilId",
        cm.member_id as "memberId",
        cm.member_name as "memberName",
        cm.role,
        cm.permissions,
        cm.is_active as "isActive",
        cm.joined_at as "joinedAt",
        cm.left_at as "leftAt"
      FROM council_members cm
      WHERE cm.council_id = $1 AND cm.is_active = true
      ORDER BY cm.joined_at DESC
    `;

    const result = await this.db.query(query, [councilId]);
    return result.rows;
  }

  async getCouncilDecisions(councilId?: string): Promise<CouncilDecisionDto[]> {
    let query = `
      SELECT
        cd.id,
        cd.council_id as "councilId",
        cd.decision_type as "decisionType",
        cd.title,
        cd.description,
        cd.proposal,
        cd.votes,
        cd.status,
        cd.executed_at as "executedAt",
        cd.created_at as "createdAt",
        cd.updated_at as "updatedAt"
      FROM council_decisions cd
      WHERE 1=1
    `;

    const params = [];
    if (councilId) {
      query += ' AND cd.council_id = $1';
      params.push(councilId);
    }

    query += ' ORDER BY cd.created_at DESC';

    const result = await this.db.query(query, params);
    return result.rows.map(row => ({
      ...row,
      executedAt: row.executedAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async voteOnDecision(dto: VoteOnDecisionDto): Promise<DecisionResultDto> {
    try {
      if (dto.pc365Attestation) {
        await this.pc365Guard.validateDestructiveAction(dto.pc365Attestation);
      }

      // Record the vote
      const voteQuery = `
        UPDATE council_decisions
        SET votes = votes || $1::jsonb
        WHERE id = $2
        RETURNING *
      `;

      const voteData = {
        [dto.memberId]: {
          vote: dto.vote,
          reasoning: dto.reasoning,
          timestamp: new Date().toISOString(),
        }
      };

      await this.db.query(voteQuery, [JSON.stringify(voteData), dto.decisionId]);

      // Calculate and return decision result
      return this.calculateDecisionResult(dto.decisionId);
    } catch (error) {
      this.logger.error(`Failed to vote on decision: ${error.message}`);
      throw error;
    }
  }

  private async calculateDecisionResult(decisionId: string): Promise<DecisionResultDto> {
    const decisionQuery = `
      SELECT cd.*, c.quorum_required as "quorumRequired"
      FROM council_decisions cd
      JOIN councils c ON cd.council_id = c.id
      WHERE cd.id = $1
    `;

    const decisionResult = await this.db.query(decisionQuery, [decisionId]);
    const decision = decisionResult.rows[0];

    const votes = decision.votes || {};
    const voteEntries = Object.values(votes) as any[];

    const yesVotes = voteEntries.filter(v => v.vote === 'yes').length;
    const noVotes = voteEntries.filter(v => v.vote === 'no').length;
    const abstainVotes = voteEntries.filter(v => v.vote === 'abstain').length;
    const totalVotes = voteEntries.length;

    const quorumReached = totalVotes >= decision.quorumRequired;
    const passed = quorumReached && yesVotes > noVotes;

    return {
      decisionId,
      passed,
      yesVotes,
      noVotes,
      abstainVotes,
      totalVotes,
      quorumReached,
      status: passed ? 'passed' : 'rejected',
    };
  }

  async initializeDefaultCouncils(): Promise<void> {
    const defaultCouncils = [
      {
        name: 'Executive Council',
        type: CouncilType.EXECUTIVE,
        description: 'Strategic direction and executive decisions',
        quorumRequired: 5,
        scopes: ['strategy', 'executive', 'governance'],
      },
      {
        name: 'Technical Council',
        type: CouncilType.TECHNICAL,
        description: 'Technical architecture and implementation decisions',
        quorumRequired: 4,
        scopes: ['architecture', 'technology', 'development'],
      },
      {
        name: 'Security Council',
        type: CouncilType.SECURITY,
        description: 'Security policies and threat response',
        quorumRequired: 4,
        scopes: ['security', 'threats', 'encryption'],
      },
      {
        name: 'Compliance Council',
        type: CouncilType.COMPLIANCE,
        description: 'Regulatory compliance and legal requirements',
        quorumRequired: 3,
        scopes: ['compliance', 'legal', 'regulatory'],
      },
      {
        name: 'Ethics Council',
        type: CouncilType.ETHICS,
        description: 'Ethical AI and responsible technology decisions',
        quorumRequired: 3,
        scopes: ['ethics', 'ai', 'responsible-ai'],
      },
      {
        name: 'Operations Council',
        type: CouncilType.OPERATIONS,
        description: 'Operational efficiency and system reliability',
        quorumRequired: 4,
        scopes: ['operations', 'reliability', 'performance'],
      },
      {
        name: 'Finance Council',
        type: CouncilType.FINANCE,
        description: 'Financial policies and economic decisions',
        quorumRequired: 3,
        scopes: ['finance', 'economics', 'budget'],
      },
      {
        name: 'Legal Council',
        type: CouncilType.LEGAL,
        description: 'Legal frameworks and contractual decisions',
        quorumRequired: 3,
        scopes: ['legal', 'contracts', 'liability'],
      },
      {
        name: 'Risk Council',
        type: CouncilType.RISK,
        description: 'Risk assessment and mitigation strategies',
        quorumRequired: 4,
        scopes: ['risk', 'assessment', 'mitigation'],
      },
      {
        name: 'Audit Council',
        type: CouncilType.AUDIT,
        description: 'Independent audit and oversight functions',
        quorumRequired: 3,
        scopes: ['audit', 'oversight', 'transparency'],
      },
    ];

    for (const council of defaultCouncils) {
      await this.db.query(`
        INSERT INTO councils (council_name, council_type, description, quorum_required, scopes, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (council_name) DO NOTHING
      `, [
        council.name,
        council.type,
        council.description,
        council.quorumRequired,
        JSON.stringify(council.scopes),
      ]);
    }
  }
}
