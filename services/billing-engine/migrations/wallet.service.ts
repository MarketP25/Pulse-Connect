import { Pool } from "pg";

export interface Wallet {
  id: string;
  accountId: string;
  balance: number;
  currency: string;
}

export class WalletService {
  constructor(private pool: Pool) {}

  /**
   * Fetches a wallet's current balance and details.
   * Uses the primary pool to ensure we see the most recent atomic updates.
   */
  async getWallet(walletId: string, accountId: string): Promise<Wallet | null> {
    const query = `
      SELECT id, account_id as "accountId", balance::float, currency
      FROM wallets
      WHERE id = $1 AND account_id = $2;
    `;
    const { rows } = await this.pool.query(query, [walletId, accountId]);
    return rows[0] || null;
  }

  /**
   * Creates or initializes a wallet for an account.
   */
  async createWallet(
    walletId: string,
    accountId: string,
    initialBalance: number = 0
  ): Promise<Wallet> {
    const query = `
      INSERT INTO wallets (id, account_id, balance)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET
        updated_at = NOW()
      RETURNING id, account_id as "accountId", balance::float, currency;
 
   `;
    const { rows } = await this.pool.query(query, [walletId, accountId, initialBalance]);
    return rows[0];
  }
}
