// ─────────────────────────────────────────────────────────────────
// src/db/db.js  —  Supabase PostgreSQL Connection Pool
// Uses Transaction Pooler (port 6543) — IPv4 stable
// ─────────────────────────────────────────────────────────────────
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host:     process.env.DB_HOST || '3.111.105.85',
  port:     parseInt(process.env.DB_PORT || '6543'),
  database: process.env.DB_NAME || 'postgres',
  user:     process.env.DB_USER || 'postgres.pmejlkkcgnzrzjwoedrh',
  password: process.env.DB_PASS,
  ssl:      { rejectUnauthorized: false },
  max:      10,
  idleTimeoutMillis:   30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('⚠️  PostgreSQL pool error:', err.message);
});

// Simple query helper — use this everywhere instead of pool.query directly
export const query = (text, params) => pool.query(text, params);

// Transaction helper — wraps multiple queries in BEGIN/COMMIT/ROLLBACK
export const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Test connectivity — called once at server startup
export const testConnection = async () => {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT NOW() AS now, current_database() AS db');
    console.log(`✅ Supabase PostgreSQL connected → DB: "${res.rows[0].db}"`);
    return true;
  } finally {
    client.release();
  }
};

export default pool;
