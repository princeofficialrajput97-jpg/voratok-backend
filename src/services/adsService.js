// ─────────────────────────────────────────────────────────────────
// src/services/adsService.js  —  PostgreSQL / Supabase
// ─────────────────────────────────────────────────────────────────
import { query } from '../db/db.js';

export class AdsService {

  static async getActiveFeedAds() {
    const res = await query(
      `SELECT * FROM advertisements
       WHERE is_active = TRUE
         AND (end_date IS NULL OR end_date > NOW())
       ORDER BY RANDOM()
       LIMIT 3`
    );
    return res.rows;
  }

  static async recordImpression(adId) {
    await query(
      `UPDATE advertisements SET impressions_count = impressions_count + 1 WHERE id = $1`,
      [adId]
    );
    return true;
  }

  static async recordClick(adId) {
    await query(
      `UPDATE advertisements SET clicks_count = clicks_count + 1 WHERE id = $1`,
      [adId]
    );
    return true;
  }

  static async getAdConfig() {
    const res = await query(
      `SELECT setting_value FROM app_settings WHERE setting_key = 'ad_settings'`
    );
    return res.rows[0]?.setting_value || {};
  }
}
