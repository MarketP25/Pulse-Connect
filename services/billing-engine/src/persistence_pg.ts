import { Client } from 'pg';
import { Policy, Offer, WalletRecord, LedgerEntry } from './types';

export class PostgresPersistence {
  private client: Client;
  constructor(connection: string | Client) {
    if (typeof connection === 'string') {
      this.client = new Client({ connectionString: connection });
    } else {
      this.client = connection;
    }
  }

  async connect() {
    await this.client.connect();
    // create simple tables if they do not exist
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS policies (
        id TEXT PRIMARY KEY,
        policy_id TEXT,
        version TEXT,
        data JSONB
      );
    `);
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS offers (
        offer_id TEXT PRIMARY KEY,
        data JSONB
      );
    `);
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        wallet_id TEXT PRIMARY KEY,
        account_id TEXT,
        data JSONB
      );
    `);
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS ledger (
        entry_id TEXT PRIMARY KEY,
        wallet_id TEXT,
        account_id TEXT,
        ts TIMESTAMP WITH TIME ZONE,
        data JSONB
      );
    `);
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        account_id TEXT PRIMARY KEY,
        data JSONB
      );
    `);
  }

  async close() {
    await this.client.end();
  }

  async savePolicy(p: Policy) {
    const id = `${p.policyId}@${p.version}`;
    await this.client.query(`
      INSERT INTO policies(id, policy_id, version, data)
      VALUES($1,$2,$3,$4)
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
    `, [id, p.policyId, p.version, p]);
  }

  async loadPolicies(): Promise<Policy[]> {
    const res = await this.client.query(`SELECT data FROM policies`);
    return res.rows.map((r: any) => r.data as Policy);
  }

  async saveOffer(o: Offer) {
    await this.client.query(`
      INSERT INTO offers(offer_id, data) VALUES($1,$2) ON CONFLICT (offer_id) DO UPDATE SET data = EXCLUDED.data;
    `, [o.offerId, o]);
  }

  async loadOffers(): Promise<Offer[]> {
    const res = await this.client.query(`SELECT data FROM offers`);
    return res.rows.map((r: any) => r.data as Offer);
  }

  async saveWallet(w: WalletRecord) {
    await this.client.query(`
      INSERT INTO wallets(wallet_id, account_id, data) VALUES($1,$2,$3) ON CONFLICT (wallet_id) DO UPDATE SET data = EXCLUDED.data;
    `, [w.walletId, w.accountId, w]);
  }

  async loadWallets(): Promise<WalletRecord[]> {
    const res = await this.client.query(`SELECT data FROM wallets`);
    return res.rows.map((r: any) => r.data as WalletRecord);
  }

  async saveLedgerEntry(e: LedgerEntry) {
    // Use DB function to perform atomic ledger insert + wallet update to avoid race conditions and overdrafts
    try {
      await this.client.query(`SELECT marp_create_ledger_entry($1::jsonb)`, [e]);
    } catch (err: any) {
      // Bubble up DB-level errors for caller to handle (e.g., insufficient funds, duplicate_entry)
      throw err;
    }
  }

  async saveSubscription(s: any) {
    const id = s.accountId;
    await this.client.query(`
      INSERT INTO subscriptions(account_id, data) VALUES($1,$2)
      ON CONFLICT (account_id) DO UPDATE SET data = EXCLUDED.data;
    `, [id, s]);
  }

  async loadSubscriptions(): Promise<any[]> {
    const res = await this.client.query(`SELECT data FROM subscriptions`);
    return res.rows.map((r: any) => r.data as any);
  }

  async loadLedger(): Promise<LedgerEntry[]> {
    const res = await this.client.query(`SELECT data FROM ledger ORDER BY ts ASC`);
    return res.rows.map((r: any) => r.data as LedgerEntry);
  }
}
