import { MARPKV } from '../src/kms';
import { Policy } from '../src/types';

describe('MARPKV integration', () => {
  test('HMAC fallback signs and verifies', async () => {
    const marp = new MARPKV();
    const p: Policy = { policyId: 'test.policy', version: 'v1', signedBy: 'MARP', effectiveFrom: '2026-01-01T00:00:00Z', scope: 'subscriptions', payload: {} };
    // signPolicy may return Promise or object depending on adapter
    const signedAny = await (marp as any).signPolicy(p);
    expect(signedAny.signature).toBeDefined();
    const ok = await marp.verify(signedAny);
    expect(ok).toBeTruthy();
  });

  test('Azure adapter runs when env configured (skipped if not)', async () => {
    if (!process.env.AZURE_KEY_VAULT_URL || !process.env.AZURE_KEY_NAME) {
      console.warn('Skipping Azure KMS integration test; env not set');
      return;
    }
    const marp = new MARPKV();
    const p: Policy = { policyId: 'azure.policy', version: 'v1', signedBy: 'MARP', effectiveFrom: '2026-01-01T00:00:00Z', scope: 'subscriptions', payload: {} };
    const signedAny = await (marp as any).signPolicy(p);
    expect(signedAny.signature).toBeDefined();
    const ok = await marp.verify(signedAny);
    expect(ok).toBeTruthy();
  });
});
