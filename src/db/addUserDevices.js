/**
 * addUserDevices.js — Migration: Create user_devices table for FCM tokens
 * Run: node src/db/addUserDevices.js
 */

import { query, testConnection } from './db.js';

async function migrate() {
  await testConnection();

  console.log('📦 Creating user_devices table...');

  await query(`
    CREATE TABLE IF NOT EXISTS user_devices (
      id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      fcm_token   TEXT NOT NULL,
      device_type VARCHAR(20) DEFAULT 'android',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, fcm_token)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id)
  `);

  console.log('✅ user_devices table created successfully!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
