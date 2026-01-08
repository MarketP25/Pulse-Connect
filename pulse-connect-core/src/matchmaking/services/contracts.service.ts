import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

export interface Proposal {
  id: number;
  brief_id: number;
  provider_id: number;
  pitch: string;
  proposed_price: number;
  currency: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
}

export interface Contract {
  id: number;
  client_id: number;
  provider_id: number;
  brief_id: number;
  proposal_id: number;
  status: "drafted" | "active" | "completed" | "cancelled" | "disputed";
  total_value: number;
  currency: string;
}

export interface Milestone {
  id: number;
  contract_id: number;
  name: string;
  amount: number;
  currency: string;
  due_date: Date;
  status: "pending" | "funded" | "in_progress" | "completed" | "cancelled" | "disputed";
}

export class ContractsService {
  constructor(private db: Pool) {}

  /**
   * Submit a proposal for a brief
   */
  async submitProposal(
    briefId: number,
    providerId: number,
    pitch: string,
    proposedPrice: number,
    currency: string = "USD"
  ): Promise<Proposal> {
    const query = `
      INSERT INTO proposals (brief_id, provider_id, pitch, proposed_price, currency, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
      RETURNING *
    `;

    const result = await this.db.query(query, [
      briefId,
      providerId,
      pitch,
      proposedPrice,
      currency
    ]);
    return result.rows[0];
  }

  /**
   * List proposals for a brief
   */
  async listProposals(briefId: number): Promise<Proposal[]> {
    const query = `
      SELECT * FROM proposals
      WHERE brief_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [briefId]);
    return result.rows;
  }

  /**
   * Update proposal status
   */
  async updateProposalStatus(proposalId: number, status: Proposal["status"]): Promise<Proposal> {
    const query = `
      UPDATE proposals
      SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, [proposalId, status]);
    if (result.rows.length === 0) {
      throw new Error("Proposal not found");
    }
    return result.rows[0];
  }

  /**
   * Create contract from accepted proposal
   */
  async createContractFromProposal(proposalId: number): Promise<Contract> {
    // First get the proposal with brief info
    const proposalQuery = `
      SELECT p.*, b.client_id
      FROM proposals p
      JOIN briefs b ON p.brief_id = b.id
      WHERE p.id = $1 AND p.status = 'accepted'
    `;

    const proposalResult = await this.db.query(proposalQuery, [proposalId]);
    if (proposalResult.rows.length === 0) {
      throw new Error("Accepted proposal not found");
    }

    const proposal = proposalResult.rows[0];

    // Create contract
    const contractQuery = `
      INSERT INTO contracts (client_id, provider_id, brief_id, proposal_id, status, total_value, currency, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'drafted', $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const result = await this.db.query(contractQuery, [
      proposal.client_id,
      proposal.provider_id,
      proposal.brief_id,
      proposal.id,
      proposal.proposed_price,
      proposal.currency
    ]);

    return result.rows[0];
  }

  /**
   * Update contract status
   */
  async updateContractStatus(contractId: number, status: Contract["status"]): Promise<Contract> {
    const query = `
      UPDATE contracts
      SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, [contractId, status]);
    if (result.rows.length === 0) {
      throw new Error("Contract not found");
    }
    return result.rows[0];
  }

  /**
   * Create milestone for contract
   */
  async createMilestone(
    contractId: number,
    name: string,
    amount: number,
    currency: string,
    dueDate: Date
  ): Promise<Milestone> {
    // Validate contract exists and is in correct state
    const contractQuery = `SELECT * FROM contracts WHERE id = $1`;
    const contractResult = await this.db.query(contractQuery, [contractId]);
    if (contractResult.rows.length === 0) {
      throw new Error("Contract not found");
    }

    const contract = contractResult.rows[0];
    if (contract.status !== "drafted" && contract.status !== "active") {
      throw new Error("Cannot add milestones to contract in current status");
    }

    const query = `
      INSERT INTO milestones (contract_id, name, amount, currency, due_date, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
      RETURNING *
    `;

    const result = await this.db.query(query, [contractId, name, amount, currency, dueDate]);
    return result.rows[0];
  }

  /**
   * Update milestone status
   */
  async updateMilestoneStatus(
    milestoneId: number,
    status: Milestone["status"]
  ): Promise<Milestone> {
    const query = `
      UPDATE milestones
      SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, [milestoneId, status]);
    if (result.rows.length === 0) {
      throw new Error("Milestone not found");
    }
    return result.rows[0];
  }

  /**
   * Get contract with milestones
   */
  async getContractWithMilestones(
    contractId: number
  ): Promise<{ contract: Contract; milestones: Milestone[] }> {
    const contractQuery = `SELECT * FROM contracts WHERE id = $1`;
    const contractResult = await this.db.query(contractQuery, [contractId]);
    if (contractResult.rows.length === 0) {
      throw new Error("Contract not found");
    }

    const milestonesQuery = `
      SELECT * FROM milestones
      WHERE contract_id = $1
      ORDER BY due_date ASC
    `;

    const milestonesResult = await this.db.query(milestonesQuery, [contractId]);

    return {
      contract: contractResult.rows[0],
      milestones: milestonesResult.rows
    };
  }

  /**
   * Validate milestone amounts sum to contract total
   */
  async validateMilestoneTotals(contractId: number): Promise<boolean> {
    const contractQuery = `SELECT total_value FROM contracts WHERE id = $1`;
    const contractResult = await this.db.query(contractQuery, [contractId]);
    if (contractResult.rows.length === 0) {
      return false;
    }

    const contractTotal = contractResult.rows[0].total_value;

    const milestonesQuery = `SELECT SUM(amount) as total FROM milestones WHERE contract_id = $1`;
    const milestonesResult = await this.db.query(milestonesQuery, [contractId]);
    const milestonesTotal = milestonesResult.rows[0].total || 0;

    return Math.abs(contractTotal - milestonesTotal) < 0.01; // Allow for small rounding differences
  }
}
