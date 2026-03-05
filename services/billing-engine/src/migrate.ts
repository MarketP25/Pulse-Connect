import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log('Applying', file);
    await client.query(sql);
  }
  await client.end();
  console.log('Migrations applied');
}

if (require.main === module) {
  runMigrations().catch((e) => { console.error(e); process.exit(1); });
}

export { runMigrations };
