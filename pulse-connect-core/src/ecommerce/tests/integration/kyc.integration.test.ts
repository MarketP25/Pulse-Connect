import express from 'express';
import request from 'supertest';
import { createComplianceRouter } from '../../controllers/compliance.controller';
import { Pool } from 'pg';
import { ComplianceService } from '../../services/compliance.service';

jest.mock('pg', () => {
  const mockPool = { connect: jest.fn(), query: jest.fn() };
  return { Pool: jest.fn(() => mockPool) };
});

describe('compliance router integration', () => {
  let app: express.Express;
  let mockPool: any;

  beforeEach(() => {
    mockPool = new Pool();
    const svc = new ComplianceService(mockPool);
    app = express();
    app.use(express.json());
    app.use('/api', createComplianceRouter(svc));
  });

  it('returns 400 for bad submit payload', async () => {
    const res = await request(app).post('/api/kyc/submit').send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown seller kyc', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/kyc/seller-not-found');
    expect(res.status).toBe(404);
  });
});
