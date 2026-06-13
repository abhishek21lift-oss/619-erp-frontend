import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');

if (!process.env.SUPABASE_DB_URL) {
  const envPath = resolve(__dirname, '.env.local');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const eqIdx = trimmed.indexOf('=');
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (key === 'SUPABASE_DB_URL' && !process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const CONNECTION_STRING = process.env.SUPABASE_DB_URL;
if (!CONNECTION_STRING) {
  console.error('Error: SUPABASE_DB_URL environment variable is required.');
  console.error('Set it in .env.local or pass it inline:');
  console.error('  $env:SUPABASE_DB_URL="postgresql://..." ; node scripts/apply-migration.mjs');
  process.exit(1);
}

async function main() {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString: CONNECTION_STRING, ssl: { rejectUnauthorized: false } });

  const migrationFile = process.argv[2] || 'supabase/migrations/00001_biometric_attendance.sql';
  const sql = readFileSync(migrationFile, 'utf8');

  console.log(`Applying migration: ${migrationFile}`);
  console.log('─'.repeat(60));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
