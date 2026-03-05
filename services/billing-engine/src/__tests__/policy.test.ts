import { PolicyRegistry } from '../policyRegistry';
import { MARPKV } from '../kms';
import { Policy } from '../types';

describe('Policy lifecycle (MARP)', () => {
  test('signs, verifies and adds a policy', async () => {
    const marp = new MARPKV();
    const registry = new PolicyRegistry(marp);

    const p: Policy = {
      policyId: 'test.signing',
      version: 'v1',
      signedBy: 'MARP',
      effectiveFrom: new Date().toISOString(),
      scope: 'subscriptions',
      payload: { note: 'sign test' }
    };

    const signed = (await marp.signPolicy(p)) as Policy;
    expect(signed.signature).toBeDefined();

    expect(() => registry.addPolicy(signed)).not.toThrow();
    const got = registry.getPolicyFor('subscriptions', new Date().toISOString());
    expect(got).not.toBeNull();
    expect(got!.policyId).toBe('test.signing');
  });

  test('rejects retroactive effectiveFrom for same scope', async () => {
    const marp = new MARPKV();
    const registry = new PolicyRegistry(marp);

    const now = Date.now();
    const laterIso = new Date(now + 1000).toISOString();
    const earlierIso = new Date(now - 1000).toISOString();

    const pLater: Policy = { policyId: 'p.later', version: 'v1', signedBy: 'MARP', effectiveFrom: laterIso, scope: 'subscriptions', payload: {} };
    const pEarlier: Policy = { policyId: 'p.earlier', version: 'v1', signedBy: 'MARP', effectiveFrom: earlierIso, scope: 'subscriptions', payload: {} };

    const signedLater = (await marp.signPolicy(pLater)) as Policy;
    registry.addPolicy(signedLater);

    const signedEarlier = (await marp.signPolicy(pEarlier)) as Policy;
    expect(() => registry.addPolicy(signedEarlier)).toThrow('policy_retroactive_effective_from');
  });

  test('deprecates a policy version', async () => {
    const marp = new MARPKV();
    const registry = new PolicyRegistry(marp);

    const p: Policy = { policyId: 'to.deprecate', version: 'v1', signedBy: 'MARP', effectiveFrom: new Date().toISOString(), scope: 'subscriptions', payload: {} };
    const signed = (await marp.signPolicy(p)) as Policy;
    registry.addPolicy(signed);

    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    registry.deprecatePolicy(signed.policyId, signed.version, until);

    const all = registry.getAllPolicies();
    const found = all.find((x) => x.policyId === signed.policyId && x.version === signed.version);
    expect(found).toBeDefined();
    expect(found!.effectiveUntil).toBe(until);
  });
});
