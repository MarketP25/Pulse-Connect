import request from 'supertest';
import express from 'express';
import { createComplianceRouter } from '../../controllers/compliance.controller';
import { Pool } from 'pg';
import { ComplianceService } from '../../services/compliance.service';

jest.mock('pg', () => {
  const mockPool = { connect: jest.fn(), query: jest.fn() };
  return { Pool: jest.fn(() => mockPool) };
});

describe('kyc expiry API', () => {
  let app: express.Express;
  let mockPool: any;

  beforeEach(() => {
    mockPool = new Pool();
    const svc = new ComplianceService(mockPool);
    app = express();
    app.use(express.json());
    app.use('/api', createComplianceRouter(svc));
  });

  it('calls expireOldKYC and returns count', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 2 });
    const res = await request(app).post('/api/admin/kyc/expire').send();
    expect(res.status).toBe(200);
    expect(res.body.expired).toBe(2);
  });
});
