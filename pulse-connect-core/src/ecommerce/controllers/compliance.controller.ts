import express from 'express';
import { ComplianceService } from '../services/compliance.service';

export function createComplianceRouter(service: ComplianceService) {
  const router = express.Router();

  router.post('/kyc/submit', async (req, res) => {
    try {
      const result = await service.submitKYC(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'submission failed' });
    }
  });

  router.get('/kyc/:sellerId', async (req, res) => {
    try {
      const result = await service.getSellerKYC(req.params.sellerId);
      if (!result) return res.status(404).json({ error: 'not found' });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'failed' });
    }
  });

  router.get('/kyc/pending', async (req, res) => {
    try {
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const rows = await service.getPendingKYCReviews(limit);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'failed' });
    }
  });

  // Admin endpoint to expire old KYCs (can be run from CronJob or admin console)
  router.post('/admin/kyc/expire', async (_req, res) => {
    try {
      const count = await service.expireOldKYC();
      res.json({ expired: count });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'failed' });
    }
  });

  router.post('/kyc/:id/review', async (req, res) => {
    try {
      const body = req.body;
      const result = await service.reviewKYC({ kyc_id: req.params.id, reviewer_id: body.reviewer_id, decision: body.decision, rejection_reason: body.rejection_reason, trace_id: body.trace_id } as any);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'review failed' });
    }
  });

  return router;
}
