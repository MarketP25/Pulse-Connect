const fs = require('fs');
const path = require('path');

function stripComments(sql) {
  // remove single-line -- comments
  sql = sql.replace(/--.*$/gm, '');
  // remove /* ... */ blocks
  sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  return sql;
}

function checkBalanced(text, openChar, closeChar) {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === openChar) count++;
    if (text[i] === closeChar) count--;
    if (count < 0) return false;
  }
  return count === 0;
}

function checkQuotes(text) {
  let single = 0, double = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'") single++;
    if (ch === '"') double++;
    if (ch === '\\') { i++; }
  }
  return (single % 2 === 0) && (double % 2 === 0);
}

function main() {
  const fp = process.argv[2] || path.join(__dirname, '..', 'infra', 'db-migrations', '001_initial_schema.sql');
  if (!fs.existsSync(fp)) {
    console.error('File not found:', fp);
    process.exit(2);
  }
  const raw = fs.readFileSync(fp, 'utf8');
  const sql = stripComments(raw);

  const results = [];

  if (!checkBalanced(sql, '(', ')')) results.push('Unbalanced parentheses detected.');
  if (!checkQuotes(raw)) results.push('Unbalanced single/double quotes detected.');

  // Basic check: require at least one CREATE TABLE
  if (!/\bCREATE\s+TABLE\b/i.test(sql)) results.push('No CREATE TABLE statement found.');

  // Warn about usage of gen_random_uuid without pgcrypto
  if (/gen_random_uuid\(/i.test(sql) && !/CREATE EXTENSION IF NOT EXISTS pgcrypto/i.test(raw)) {
    results.push('Uses gen_random_uuid() but pgcrypto extension may not be declared.');
  }

  // Check for duplicate trigger names across tables by searching for set_updated_at_trigger repeated
  const triggerCount = (sql.match(/set_updated_at_trigger/gi) || []).length;
  if (triggerCount > 1) results.push('Multiple occurrences of trigger name "set_updated_at_trigger" found; triggers must be named uniquely per table in some environments.');

  if (results.length === 0) {
    console.log('SQL validator: OK — no obvious issues found.');
    process.exit(0);
  } else {
    console.log('SQL validator: Issues found:');
    results.forEach((r) => console.log('- ' + r));
    process.exit(1);
  }
}

main();
