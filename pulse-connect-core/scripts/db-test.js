#!/usr/bin/env node
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || (() => {
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const user = process.env.POSTGRES_USER || 'postgres';
  const password = process.env.POSTGRES_PASSWORD || 'password';
  const db = process.env.POSTGRES_DB || 'postgres';
  return `postgresql://${user}:${password}@${host}:${port}/${db}`;
})();

console.log('Using connection string:', connectionString.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@'));

const pool = new Pool({ connectionString, max: 2 });

(async () => {
  try {
    const res = await pool.query('SELECT 1 as ok');
    console.log('DB response:', res.rows);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('DB connection failed:', err.message || err);
    try { await pool.end(); } catch (e) {}
    process.exit(2);
  }
})();
