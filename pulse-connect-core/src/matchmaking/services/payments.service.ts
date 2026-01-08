import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

export interface Transaction {
  id: number;
  contract_id?: number;
  milestone_id?: number;
  type: "fund" | "release" | "refund" | "fee";
  amount: number;
  currency: string;
  policy_version: string;
  trace_id: string;
  status: "pending" | "completed" | "failed" | "cancelled";
}

export interface LedgerEntry {
  id: number;
  transaction_id: number;
  account_type: "client" | "provider" | "platform" | "tax";
  direction: "debit" | "credit";
  amount: number;
  currency: string;
  balance_after: number;
  policy_version: string;
  trace_id: string;
}

export interface Invoice {
  contract_id: number;
  milestone_id?: number;
  gross_amount: number;
  fees: {
    upfront: number;
    completion: number;
  };
  estimated_tax: number;
  net_amount: number;
  currency: string;
  policy_version: string;
}

export class PaymentsService {
  constructor(private db: Pool) {}

  /**
   * Get current fee policy
   */
  private async getCurrentFeePolicy(): Promise<{
    version: string;
    upfront_percent: number;
    completion_percent: number;
  }> {
    const query = `
      SELECT version, upfront_percent, completion_percent
      FROM fee_policy_registry
      WHERE status = 'active'
      ORDER BY effective_from DESC
      LIMIT 1
    `;

    const result = await this.db.query(query);
    if (result.rows.length === 0) {
      throw new Error("No active fee policy found");
    }
    return result.rows[0];
  }

  /**
   * Charge upfront fee when gig is published
   */
  async chargeUpfrontFee(gigId: number, traceId: string = uuidv4()): Promise<Transaction> {
    // Get gig details
    const gigQuery = `SELECT owner_id, base_price, currency FROM gigs WHERE id = $1`;
    const gigResult = await this.db.query(gigQuery, [gigId]);
    if (gigResult.rows.length === 0) {
      throw new Error("Gig not found");
    }

    const gig = gigResult.rows[0];
    const policy = await this.getCurrentFeePolicy();
    const feeAmount = Math.round(gig.base_price * (policy.upfront_percent / 100) * 100) / 100; // Round to 2 decimal places

    // Create transaction
    const transactionQuery = `
      INSERT INTO transactions (type, amount, currency, policy_version, trace_id, status, created_at, updated_at)
      VALUES ('fee', $1, $2, $3, $4, 'completed', NOW(), NOW())
      RETURNING *
    `;

    const transactionResult = await this.db.query(transactionQuery, [
      feeAmount,
      gig.currency,
      policy.version,
      traceId
    ]);

    const transaction = transactionResult.rows[0];

    // Create ledger entries (double-entry accounting)
    await this.createLedgerEntries(
      transaction.id,
      feeAmount,
      gig.currency,
      policy.version,
      traceId,
      "upfront_fee"
    );

    return transaction;
  }

  /**
   * Fund milestone escrow
   */
  async fundMilestone(milestoneId: number, traceId: string = uuidv4()): Promise<Transaction> {
    // Get milestone and contract details
    const milestoneQuery = `
      SELECT m.amount, m.currency, m.contract_id, c.client_id, c.provider_id
      FROM milestones m
      JOIN contracts c ON m.contract_id = c.id
      WHERE m.id = $1 AND m.status = 'pending'
    `;

    const milestoneResult = await this.db.query(milestoneQuery, [milestoneId]);
    if (milestoneResult.rows.length === 0) {
      throw new Error("Milestone not found or not in pending status");
    }

    const milestone = milestoneResult.rows[0];

    // Create fund transaction
    const transactionQuery = `
      INSERT INTO transactions (contract_id, milestone_id, type, amount, currency, policy_version, trace_id, status, created_at, updated_at)
      VALUES ($1, $2, 'fund', $3, $4, $5, $6, 'completed', NOW(), NOW())
      RETURNING *
    `;

    const policy = await this.getCurrentFeePolicy();
    const transactionResult = await this.db.query(transactionQuery, [
      milestone.contract_id,
      milestoneId,
      milestone.amount,
      milestone.currency,
      policy.version,
      traceId
    ]);

    const transaction = transactionResult.rows[0];

    // Create ledger entries
    await this.createLedgerEntries(
      transaction.id,
      milestone.amount,
      milestone.currency,
      policy.version,
      traceId,
      "fund_milestone"
    );

    return transaction;
  }

  /**
   * Release milestone payment (with completion fee)
   */
  async releaseMilestone(
    milestoneId: number,
    traceId: string = uuidv4()
  ): Promise<{ payment: Transaction; fee: Transaction }> {
    // Get milestone details
    const milestoneQuery = `
      SELECT m.amount, m.currency, m.contract_id, c.provider_id
      FROM milestones m
      JOIN contracts c ON m.contract_id = c.id
      WHERE m.id = $1 AND m.status = 'funded'
    `;

    const milestoneResult = await this.db.query(milestoneQuery, [milestoneId]);
    if (milestoneResult.rows.length === 0) {
      throw new Error("Milestone not found or not in funded status");
    }

    const milestone = milestoneResult.rows[0];
    const policy = await this.getCurrentFeePolicy();

    // Calculate completion fee
    const completionFee =
      Math.round(milestone.amount * (policy.completion_percent / 100) * 100) / 100;
    const netPayment = milestone.amount - completionFee;

    // Create release transaction
    const releaseQuery = `
      INSERT INTO transactions (contract_id, milestone_id, type, amount, currency, policy_version, trace_id, status, created_at, updated_at)
      VALUES ($1, $2, 'release', $3, $4, $5, $6, 'completed', NOW(), NOW())
      RETURNING *
    `;

    const releaseResult = await this.db.query(releaseQuery, [
      milestone.contract_id,
      milestoneId,
      netPayment,
      milestone.currency,
      policy.version,
      traceId
    ]);

    const releaseTransaction = releaseResult.rows[0];

    // Create fee transaction
    const feeQuery = `
      INSERT INTO transactions (contract_id, milestone_id, type, amount, currency, policy_version, trace_id, status, created_at, updated_at)
      VALUES ($1, $2, 'fee', $3, $4, $5, $6, 'completed', NOW(), NOW())
      RETURNING *
    `;

    const feeResult = await this.db.query(feeQuery, [
      milestone.contract_id,
      milestoneId,
      completionFee,
      milestone.currency,
      policy.version,
      traceId + "_fee"
    ]);

    const feeTransaction = feeResult.rows[0];

    // Create ledger entries for both transactions
    await this.createLedgerEntries(
      releaseTransaction.id,
      netPayment,
      milestone.currency,
      policy.version,
      traceId,
      "release_milestone"
    );
    await this.createLedgerEntries(
      feeTransaction.id,
      completionFee,
      milestone.currency,
      policy.version,
      traceId + "_fee",
      "completion_fee"
    );

    return { payment: releaseTransaction, fee: feeTransaction };
  }

  /**
   * Create ledger entries for double-entry accounting
   */
  private async createLedgerEntries(
    transactionId: number,
    amount: number,
    currency: string,
    policyVersion: string,
    traceId: string,
    operation: string
  ): Promise<void> {
    let entries: Array<{
      account_type: "client" | "provider" | "platform" | "tax";
      direction: "debit" | "credit";
      amount: number;
    }> = [];

    switch (operation) {
      case "upfront_fee":
        entries = [
          { account_type: "client", direction: "debit", amount },
          { account_type: "platform", direction: "credit", amount }
        ];
        break;
      case "fund_milestone":
        entries = [
          { account_type: "client", direction: "debit", amount },
          { account_type: "platform", direction: "credit", amount } // Escrow
        ];
        break;
      case "release_milestone":
        entries = [
          { account_type: "platform", direction: "debit", amount }, // Release from escrow
          { account_type: "provider", direction: "credit", amount }
        ];
        break;
      case "completion_fee":
        entries = [
          { account_type: "platform", direction: "debit", amount },
          { account_type: "platform", direction: "credit", amount } // Platform revenue
        ];
        break;
    }

    for (const entry of entries) {
      // Get current balance for this account type (simplified - in production would be per account)
      const balanceQuery = `
        SELECT COALESCE(SUM(
          CASE WHEN direction = 'credit' THEN amount ELSE -amount END
        ), 0) as balance
        FROM ledger_entries
        WHERE account_type = $1
      `;

      const balanceResult = await this.db.query(balanceQuery, [entry.account_type]);
      const currentBalance = parseFloat(balanceResult.rows[0].balance);

      const newBalance =
        entry.direction === "credit"
          ? currentBalance + entry.amount
          : currentBalance - entry.amount;

      const ledgerQuery = `
        INSERT INTO ledger_entries (transaction_id, account_type, direction, amount, currency, balance_after, policy_version, trace_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `;

      await this.db.query(ledgerQuery, [
        transactionId,
        entry.account_type,
        entry.direction,
        entry.amount,
        currency,
        newBalance,
        policyVersion,
        traceId
      ]);
    }
  }

  /**
   * Generate invoice for contract/milestone
   */
  async generateInvoice(contractId: number, milestoneId?: number): Promise<Invoice> {
    const policy = await this.getCurrentFeePolicy();

    let query: string;
    let params: any[];

    if (milestoneId) {
      query = `
        SELECT m.amount as gross_amount, m.currency, m.contract_id, m.id as milestone_id
        FROM milestones m
        WHERE m.id = $1 AND m.contract_id = $2
      `;
      params = [milestoneId, contractId];
    } else {
      query = `
        SELECT c.total_value as gross_amount, c.currency, c.id as contract_id
        FROM contracts c
        WHERE c.id = $1
      `;
      params = [contractId];
    }

    const result = await this.db.query(query, params);
    if (result.rows.length === 0) {
      throw new Error("Contract or milestone not found");
    }

    const record = result.rows[0];
    const grossAmount = record.gross_amount;

    // Calculate fees (simplified - in production would check actual transactions)
    const upfrontFee = Math.round(grossAmount * (policy.upfront_percent / 100) * 100) / 100;
    const completionFee = Math.round(grossAmount * (policy.completion_percent / 100) * 100) / 100;

    // Estimate tax (simplified - 20% of net)
    const netBeforeTax = grossAmount - upfrontFee - completionFee;
    const estimatedTax = Math.round(netBeforeTax * 0.2 * 100) / 100;
    const finalNet = netBeforeTax - estimatedTax;

    return {
      contract_id: contractId,
      milestone_id: milestoneId,
      gross_amount: grossAmount,
      fees: {
        upfront: upfrontFee,
        completion: completionFee
      },
      estimated_tax: estimatedTax,
      net_amount: finalNet,
      currency: record.currency,
      policy_version: policy.version
    };
  }

  /**
   * Validate ledger balance integrity
   */
  async validateLedgerIntegrity(): Promise<boolean> {
    // Check that debits equal credits for each transaction
    const integrityQuery = `
      SELECT t.id, t.trace_id
      FROM transactions t
      LEFT JOIN (
        SELECT transaction_id,
               SUM(CASE WHEN direction = 'debit' THEN amount ELSE -amount END) as balance
        FROM ledger_entries
        GROUP BY transaction_id
      ) l ON t.id = l.transaction_id
      WHERE l.balance != 0 OR l.transaction_id IS NULL
    `;

    const result = await this.db.query(integrityQuery);
    return result.rows.length === 0;
  }
}
