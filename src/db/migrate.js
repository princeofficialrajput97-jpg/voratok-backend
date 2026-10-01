// ─────────────────────────────────────────────────────────────────
// src/db/migrate.js  —  Smart migration for Supabase PostgreSQL
// Usage: node src/db/migrate.js [--seed-only] [--schema-only]
// ─────────────────────────────────────────────────────────────────
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

const SCHEMA_FILE = path.resolve(__dirname, '../../../database/schema.sql');
const SEED_FILE   = path.resolve(__dirname, '../../../database/seed.sql');

const args = process.argv.slice(2);
const SEED_ONLY   = args.includes('--seed-only');
const SCHEMA_ONLY = args.includes('--schema-only');

// Patch schema: add IF NOT EXISTS to all CREATE INDEX statements
function patchSchema(sql) {
  return sql.replace(/CREATE INDEX (?!IF NOT EXISTS)/g, 'CREATE INDEX IF NOT EXISTS ');
}

async function migrate() {
  const client = new Client({
    host:     process.env.DB_HOST || '3.111.105.85',
    port:     parseInt(process.env.DB_PORT || '6543'),
    database: process.env.DB_NAME || 'postgres',
    user:     process.env.DB_USER || 'postgres.pmejlkkcgnzrzjwoedrh',
    password: process.env.DB_PASS,
    ssl:      { rejectUnauthorized: false },
  });

  try {
    console.log('\n🔌 Connecting to Supabase PostgreSQL...');
    await client.connect();

    const timeRes = await client.query('SELECT NOW() AS now, current_database() AS db');
    console.log(`✅ Connected! DB: "${timeRes.rows[0].db}"  Server time: ${timeRes.rows[0].now}\n`);

    // ── Schema ────────────────────────────────────────────────────
    if (!SEED_ONLY) {
      if (!fs.existsSync(SCHEMA_FILE)) {
        console.warn('⚠️  schema.sql not found at:', SCHEMA_FILE);
      } else {
        console.log('📋 Running schema.sql (CREATE IF NOT EXISTS, indexes safe)...');
        const raw    = fs.readFileSync(SCHEMA_FILE, 'utf8');
        const schema = patchSchema(raw);
        await client.query(schema);
        console.log('✅ Schema done!\n');
      }
    }

    // ── Seed ──────────────────────────────────────────────────────
    if (!SCHEMA_ONLY) {
      if (!fs.existsSync(SEED_FILE)) {
        console.warn('⚠️  seed.sql not found at:', SEED_FILE);
      } else {
        console.log('🌱 Running seed.sql (ON CONFLICT DO NOTHING — safe to re-run)...');
        const seed = fs.readFileSync(SEED_FILE, 'utf8');
        await client.query(seed);
        console.log('✅ Seed data inserted!\n');
      }
    }

    // ── Summary ───────────────────────────────────────────────────
    const tableRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log(`📊 Tables in Supabase (${tableRes.rows.length} total):`);
    tableRes.rows.forEach(r => console.log(`   ✓ ${r.table_name}`));

    const counts = [
      ['users', 'users'],
      ['videos', 'videos'],
      ['hashtags', 'hashtags'],
      ['app_settings', 'app settings'],
    ];
    console.log('');
    for (const [tbl, label] of counts) {
      try {
        const r = await client.query(`SELECT COUNT(*) FROM ${tbl}`);
        console.log(`   ${label}: ${r.rows[0].count} rows`);
      } catch (_) {}
    }

    console.log('\n🎉 VoraTok database is ready on Supabase!\n');

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    if (err.detail) console.error('   Detail:', err.detail);
    if (err.hint)   console.error('   Hint:  ', err.hint);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
