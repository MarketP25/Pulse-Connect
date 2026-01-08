import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

export interface Transaction {
  transaction_id: string;
  transaction_type: string;
  reference_id: string;
  reference_price_usd: number;
  gross_usd: number;
  fee_usd: number;
  net_usd: number;
  fx_rate: number;
  currency: string;
  policy_version: string;
  trace_id: string;
  created_at: Date;
}

export interface LedgerEntry {
  entry_id: string;
  transaction_id: string;
  account: string;
  debit_usd: number;
  credit_usd: number;
  balance_after_usd: number;
  reason_code: string;
  policy_version: string;
  trace_id: string;
  created_at: Date;
}

export class LedgerService {
  constructor(private pool: Pool) {}

  async recordTransaction(
    transactionType: string,
    referenceId: string,
    referencePriceUsd: number,
    grossUsd: number,
    feeUsd: number,
    netUsd: number,
    policyVersion: string,
    traceId: string
  ): Promise<Transaction> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const transactionId = uuidv4();

      // Insert transaction record
      const transactionResult = await client.query(
        `
        INSERT INTO transactions (
          transaction_id, transaction_type, reference_id, reference_price_usd,
          gross_usd, fee_usd, net_usd, fx_rate, currency, policy_version, trace_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `,
        [
          transactionId,
          transactionType,
          referenceId,
          referencePriceUsd,
          grossUsd,
          feeUsd,
          netUsd,
          1.0, // fx_rate
          "USD",
          policyVersion,
          traceId
        ]
      );

      // Create ledger entries based on transaction type
      await this.createLedgerEntriesForTransaction(client, transactionResult.rows[0], traceId);

      // Emit transaction recorded event
      await this.emitEvent("transaction_recorded", {
        transaction_id: transactionId,
        transaction_type: transactionType,
        reference_id: referenceId,
        gross_usd: grossUsd,
        fee_usd: feeUsd,
        net_usd: netUsd,
        policy_version: policyVersion,
        trace_id: traceId
      });

      await client.query("COMMIT");

      return this.mapTransactionRow(transactionResult.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getTransaction(transactionId: string): Promise<Transaction | null> {
    const result = await this.pool.query(
      `
      SELECT * FROM transactions WHERE transaction_id = $1
    `,
      [transactionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapTransactionRow(result.rows[0]);
  }

  async getLedgerEntriesForTransaction(transactionId: string): Promise<LedgerEntry[]> {
    const result = await this.pool.query(
      `
      SELECT * FROM ledger_entries
      WHERE transaction_id = $1
      ORDER BY created_at ASC
    `,
      [transactionId]
    );

    return result.rows.map((row) => this.mapLedgerEntryRow(row));
  }

  async getAccountBalance(account: string): Promise<number> {
    const result = await this.pool.query(
      `
      SELECT balance_after_usd
      FROM ledger_entries
      WHERE account = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [account]
    );

    return result.rows.length > 0 ? parseFloat(result.rows[0].balance_after_usd) : 0;
  }

  async reconcileTransactions(
    hoursBack: number = 24
  ): Promise<{ balanced: boolean; discrepancies: any[] }> {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    // Get all transactions in the period
    const transactions = await this.pool.query(
      `
      SELECT * FROM transactions
      WHERE created_at >= $1
      ORDER BY created_at ASC
    `,
      [cutoffTime.toISOString()]
    );

    const discrepancies: any[] = [];

    for (const transaction of transactions.rows) {
      const entries = await this.getLedgerEntriesForTransaction(transaction.transaction_id);

      // Check double-entry invariants
      const totalDebits = entries.reduce((sum, entry) => sum + entry.debit_usd, 0);
      const totalCredits = entries.reduce((sum, entry) => sum + entry.credit_usd, 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        // Allow for small floating point errors
        discrepancies.push({
          transaction_id: transaction.transaction_id,
          total_debits: totalDebits,
          total_credits: totalCredits,
          difference: totalDebits - totalCredits
        });
      }
    }

    return {
      balanced: discrepancies.length === 0,
      discrepancies
    };
  }

  private async createLedgerEntriesForTransaction(
    client: any,
    transaction: any,
    traceId: string
  ): Promise<void> {
    const transactionType = transaction.transaction_type;

    switch (transactionType) {
      case "posting_fee":
        // Debit host (they pay the fee), Credit platform
        await this.createLedgerEntry(
          client,
          transaction.transaction_id,
          "host_receivable",
          transaction.fee_usd,
          0,
          "posting_fee",
          transaction.policy_version,
          traceId
        );
        await this.createLedgerEntry(
          client,
          transaction.transaction_id,
          "platform_revenue",
          0,
          transaction.fee_usd,
          "posting_fee",
          transaction.policy_version,
          traceId
        );
        break;

      case "booking_fee":
        // Debit booker (they pay the fee), Credit platform
        await this.createLedgerEntry(
          client,
          transaction.transaction_id,
          "buyer_payable",
          transaction.fee_usd,
          0,
          "booking_fee",
          transaction.policy_version,
          traceId
        );
        await this.createLedgerEntry(
          client,
          transaction.transaction_id,
          "platform_revenue",
          0,
          transaction.fee_usd,
          "booking_fee",
          transaction.policy_version,
          traceId
        );
        break;

      case "payout":
        // Debit platform (pays out), Credit host
        await this.createLedgerEntry(
          client,
          transaction.transaction_id,
          "platform_revenue",
          transaction.net_usd,
          0,
          "payout",
          transaction.policy_version,
          traceId
        );
        await this.createLedgerEntry(
          client,
          transaction.transaction_id,
          "host_receivable",
          0,
          transaction.net_usd,
          "payout",
          transaction.policy_version,
          traceId
        );
        break;

      default:
        throw new Error(`Unknown transaction type: ${transactionType}`);
    }
  }

  private async createLedgerEntry(
    client: any,
    transactionId: string,
    account: string,
    debitUsd: number,
    creditUsd: number,
    reasonCode: string,
    policyVersion: string,
    traceId: string
  ): Promise<void> {
    // Get current balance for this account
    const currentBalance = await this.getAccountBalance(account);

    // Calculate new balance
    const newBalance = currentBalance + creditUsd - debitUsd;

    await client.query(
      `
      INSERT INTO ledger_entries (
        entry_id, transaction_id, account, debit_usd, credit_usd,
        balance_after_usd, reason_code, policy_version, trace_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
      [
        uuidv4(),
        transactionId,
        account,
        debitUsd,
        creditUsd,
        newBalance,
        reasonCode,
        policyVersion,
        traceId
      ]
    );
  }

  private mapTransactionRow(row: any): Transaction {
    return {
      transaction_id: row.transaction_id,
      transaction_type: row.transaction_type,
      reference_id: row.reference_id,
      reference_price_usd: parseFloat(row.reference_price_usd),
      gross_usd: parseFloat(row.gross_usd),
      fee_usd: parseFloat(row.fee_usd),
      net_usd: parseFloat(row.net_usd),
      fx_rate: parseFloat(row.fx_rate),
      currency: row.currency,
      policy_version: row.policy_version,
      trace_id: row.trace_id,
      created_at: new Date(row.created_at)
    };
  }

  private mapLedgerEntryRow(row: any): LedgerEntry {
    return {
      entry_id: row.entry_id,
      transaction_id: row.transaction_id,
      account: row.account,
      debit_usd: parseFloat(row.debit_usd),
      credit_usd: parseFloat(row.credit_usd),
      balance_after_usd: parseFloat(row.balance_after_usd),
      reason_code: row.reason_code,
      policy_version: row.policy_version,
      trace_id: row.trace_id,
      created_at: new Date(row.created_at)
    };
  }

  private async emitEvent(eventType: string, payload: any): Promise<void> {
    console.log(`Emitting event: ${eventType}`, payload);
  }
}
