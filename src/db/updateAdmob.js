import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({
  host: process.env.DB_HOST || '3.111.105.85',
  port: parseInt(process.env.DB_PORT || '6543'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres.pmejlkkcgnzrzjwoedrh',
  password: process.env.DB_PASS,
  ssl: { rejectUnauthorized: false }
});

const adSettings = {
  admob_app_id: 'ca-app-pub-8844132035077956~5130385161',
  banner_ad_unit: 'ca-app-pub-8844132035077956/9225457127',
  interstitial_ad_unit: 'ca-app-pub-8844132035077956/3869274302',
  native_ad_unit: 'ca-app-pub-8844132035077956/9225457127',
  rewarded_ad_unit: 'ca-app-pub-8844132035077956/3869274302',
  feed_ad_frequency: 4,
  test_mode: false,
  is_active: true
};

async function run() {
  await client.connect();
  await client.query(
    `UPDATE app_settings SET setting_value = $1::jsonb, updated_at = NOW() WHERE setting_key = 'ad_settings'`,
    [JSON.stringify(adSettings)]
  );
  await client.query(
    `UPDATE advertisements SET ad_unit_id = 'ca-app-pub-8844132035077956/9225457127', test_mode = false`
  );
  console.log('✅ Supabase AdMob settings updated successfully!');
  await client.end();
}

run().catch(e => {
  console.error(e.message);
  process.exit(1);
});
