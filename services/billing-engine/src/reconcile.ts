import { Client } from 'pg';
import crypto from 'crypto';

async function computeMerkleRoot(hashes: string[]): Promise<string> {
  if (hashes.length === 0) return crypto.createHash('sha256').update('').digest('hex');
  let layer = hashes.map((h) => Buffer.from(h, 'hex'));
  while (layer.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : layer[i];
      const combined = Buffer.concat([left, right]);
      const hashed = crypto.createHash('sha256').update(combined).digest();
      next.push(hashed);
    }
    layer = next;
  }
  return layer[0].toString('hex');
}

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  // fetch all ledger entry_hash values in order
  const res = await client.query('SELECT entry_hash FROM ledger ORDER BY ts ASC');
  const hashes = res.rows.map((r: any) => r.entry_hash).filter(Boolean);
  const root = await computeMerkleRoot(hashes);
  await client.query('INSERT INTO merkle_roots(root, ledger_count) VALUES($1,$2)', [root, hashes.length]);
  console.log('Computed merkle root for', hashes.length, 'entries:', root);
  await client.end();
}

if (require.main === module) run().catch((e) => { console.error(e); process.exit(1); });

export { computeMerkleRoot };
