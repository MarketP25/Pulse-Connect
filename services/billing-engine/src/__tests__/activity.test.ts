import request from 'supertest';
import { createServer } from '../server';

describe('Activity billing endpoints', () => {
  let app: any;
  beforeAll(async () => { app = await createServer(); });

  test('ecommerce charge debits wallet and creates ledger entry', async () => {
    // create wallet for account
    await request(app).post('/marp/wallet/create').send({ walletId: 'w-activity', accountId: 'acct-act', balance: 100 });
    const event = { engine: 'ecommerce', eventId: 'evt-1', amount: 20 };
    const resp = await request(app).post('/marp/activity/charge').send({ accountId: 'acct-act', walletId: 'w-activity', event, region: 'Europe West 1', at: new Date().toISOString(), idempotencyKey: 'act1' });
    expect(resp.status).toBe(200);
    expect(resp.body).toHaveProperty('entryId');
  });
});
