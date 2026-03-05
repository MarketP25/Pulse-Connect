#!/usr/bin/env ts-node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import { MARPKV } from '../kms';
import { PolicyRegistry } from '../policyRegistry';
import { JSONPersistence } from '../persistence';
import { PostgresPersistence } from '../persistence_pg';
import { Policy } from '../types';

async function loadPersistence() {
  if (process.env.DATABASE_URL) {
    const p = new PostgresPersistence(process.env.DATABASE_URL);
    await p.connect();
    return p;
  }
  return new JSONPersistence();
}

async function savePolicyToPersistence(persistence: any, policy: Policy) {
  if (persistence.savePolicy) return persistence.savePolicy(policy);
  // JSONPersistence: load, append, save
  const existing = await persistence.loadPolicies();
  const idx = existing.findIndex((x: Policy) => x.policyId === policy.policyId && x.version === policy.version);
  if (idx !== -1) existing[idx] = policy; else existing.push(policy);
  return persistence.savePolicies(existing);
}

async function run() {
  const argv = yargs(hideBin(process.argv))
    .command('create [file]', 'Create and sign a policy', (y) => y.positional('file', { type: 'string', describe: 'JSON file with policy object' }))
    .command('deprecate', 'Deprecate an existing policy', (y) => y
      .option('policyId', { type: 'string', demandOption: true })
      .option('version', { type: 'string', demandOption: true })
      .option('effectiveUntil', { type: 'string', demandOption: true }))
    .option('sign', { type: 'boolean', default: true })
    .help()
    .argv as any;

  const persistence = await loadPersistence();
  const marp = new MARPKV();
  const registry = new PolicyRegistry(marp);

  // hydrate existing policies
  const pols = await persistence.loadPolicies();
  for (const p of pols) { try { registry.addPolicy(p); } catch (e) { /* ignore */ } }

  const cmd = argv._[0];
  if (cmd === 'create') {
    const file = argv.file;
    if (!file) throw new Error('policy JSON file required');
    const raw = fs.readFileSync(file, 'utf8');
    const p: Policy = JSON.parse(raw);
    // sign if requested
    let signed = p;
    if (argv.sign) {
      const sig = await (marp.signPolicy(p) as any);
      signed = sig as Policy;
    }
    registry.addPolicy(signed);
    await savePolicyToPersistence(persistence, signed);
    console.log('Policy created:', `${signed.policyId}@${signed.version}`);
    process.exit(0);
  } else if (cmd === 'deprecate') {
    const { policyId, version, effectiveUntil } = argv;
    registry.deprecatePolicy(policyId, version, effectiveUntil);
    // persist updated policy
    const p = registry.getAllPolicies().find((x) => x.policyId === policyId && x.version === version);
    if (!p) throw new Error('policy_not_found_after_deprecate');
    await savePolicyToPersistence(persistence, p);
    console.log('Policy deprecated:', `${policyId}@${version} until ${effectiveUntil}`);
    process.exit(0);
  } else {
    console.log('unknown command');
    process.exit(2);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
