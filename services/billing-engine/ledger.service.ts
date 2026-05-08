import { Pool } from "pg";

export interface LedgerEntryParams {
  accountId: string;
  walletId: string;
  amount: number;
  idempotencyKey: string;
  actorId: string;
  actorRole: string;
  description?: string;
  metadata?: Record<string, any>;
}

export class LedgerService {
  constructor(private pool: Pool) {}

  /**
   * Calls the hardened DB function to create a ledger entry.
   * Handles idempotency and overdraft protection at the database level.
   */
  async createEntry(params: LedgerEntryParams) {
    const { walletId, amount, idempot actorId, actorRol descriptio metadata ? J 
    const { rows } = await this.pool.query(query, values);

    // The DB function returns a JSONB object which pg parses automatically
    return rows[0].result;
  }
}
