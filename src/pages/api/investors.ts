import type { NextApiRequest, NextApiResponse } from 'next';
import { DONATION_TIERS, SUBSCRIPTION_PLANS } from '@/lib/upgradePlans';

// Advanced API endpoint for investors: GET plans, POST interest, GET all submissions (admin)
const submissions: any[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // ?plans=1 returns upgrade plans, otherwise returns investor tiers
    if (req.query.plans) {
      return res.status(200).json({ plans: SUBSCRIPTION_PLANS, tiers: DONATION_TIERS });
    }
    // Admin: ?all=1 returns all submissions (mock, not for prod)
    if (req.query.all) {
      return res.status(200).json({ submissions });
    }
    // Default: return investor tiers
    return res.status(200).json({ tiers: DONATION_TIERS });
  }
  if (req.method === 'POST') {
    // Accept new investor interest, with plan selection
    const { name, email, amount, planId, tierName } = req.body;
    if (!name || !email || !amount || (!planId && !tierName)) {
      return res.status(400).json({ error: 'Missing required fields (name, email, amount, planId or tierName)' });
    }
    // Store submission (mock, not persistent)
    submissions.push({ name, email, amount, planId, tierName, date: new Date().toISOString() });
    return res.status(201).json({ message: 'Interest received', name, email, amount, planId, tierName });
  }
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
