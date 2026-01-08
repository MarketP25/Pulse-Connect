import { Pool } from 'pg';
import { WalletIntegrationService } from '../../communication/services/wallet-integration.service';

describe('WalletIntegrationService', () => {
  let pool: any;
  let ledgerService: any;
  let svc: WalletIntegrationService;

  beforeEach(() => {
    pool = { query: jest.fn() };
    ledgerService = { recordTransaction: jest.fn() };
    svc = new WalletIntegrationService(pool as Pool, ledgerService);
  });

  it('initializeWallet inserts and returns balance', async () => {
    pool.query.mockImplementation((sql: string, params?: any[]) => {
      if (sql.includes('INSERT INTO communication_wallet_balances')) {
        return Promise.resolve({ rowCount: 1 });
      }
      if (sql.includes('SELECT * FROM communication_wallet_balances')) {
        return Promise.resolve({
          rows: [
            {
              user_id: params ? params[0] : 'user-1',
              available_minutes: '10',
              purchased_minutes: '10',
              used_minutes: '0',
              auto_top_up_enabled: false,
              auto_top_up_threshold: '10',
              last_top_up_at: null,
              region_code: 'US',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]
        });
      }

      return Promise.resolve({ rows: [] });
    });

    const res = await svc.initializeWallet('user-1');

    expect(res).toBeDefined();
    expect(res.user_id).toBe('user-1');
    expect(res.available_minutes).toBeGreaterThanOrEqual(0);
  });

  it.todo('topUpWallet creates a top-up transaction and updates balance');
  it.todo('startCallBilling creates pending billing transaction');
  it.todo('finalizeCallBilling deducts minutes and records ledger entry');
  it.todo('checkAndAutoTopUp triggers when below threshold and enabled');
});