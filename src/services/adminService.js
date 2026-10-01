// ─────────────────────────────────────────────────────────────────
// src/services/adminService.js  —  PostgreSQL / Supabase
// Admin dashboard, user management, content moderation
// ─────────────────────────────────────────────────────────────────
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/db.js';

export class AdminService {

  // ── Dashboard Stats ──────────────────────────────────────────────
  static async getDashboardStats() {
    const [users, videos, reports, ads] = await Promise.all([
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_banned) AS banned,
                    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS new_this_week
             FROM users`),
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='published') AS published,
                    COUNT(*) FILTER (WHERE is_featured) AS featured FROM videos`),
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='pending') AS pending FROM reports`),
      query(`SELECT COUNT(*) AS total, COALESCE(SUM(impressions_count),0) AS impressions,
                    COALESCE(SUM(clicks_count),0) AS clicks FROM advertisements`),
    ]);

    return {
      users:   users.rows[0],
      videos:  videos.rows[0],
      reports: reports.rows[0],
      ads:     ads.rows[0],
    };
  }

  // ── User Management ──────────────────────────────────────────────
  static async listUsers({ page = 1, limit = 20, search = '' } = {}) {
    const offset = (page - 1) * limit;
    const like = `%${search.toLowerCase()}%`;

    const res = await query(
      `SELECT u.id, u.username, u.full_name, u.mobile_number, u.role,
              u.is_verified, u.is_banned, u.created_at,
              p.followers_count, p.videos_count
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       WHERE ($1 = '%%' OR LOWER(u.username) LIKE $1 OR LOWER(u.full_name) LIKE $1)
       ORDER BY u.created_at DESC
       LIMIT $2 OFFSET $3`,
      [like, limit, offset]
    );

    const countRes = await query(
      `SELECT COUNT(*) FROM users WHERE ($1 = '%%' OR LOWER(username) LIKE $1 OR LOWER(full_name) LIKE $1)`,
      [like]
    );

    return { users: res.rows, total: parseInt(countRes.rows[0].count), page };
  }

  static async banUser(userId, reason = '') {
    await query(
      `UPDATE users SET is_banned = TRUE, suspension_reason = $2, updated_at = NOW() WHERE id = $1`,
      [userId, reason]
    );
    await query(`UPDATE user_sessions SET is_revoked = TRUE WHERE user_id = $1`, [userId]);
    return { banned: true };
  }

  static async unbanUser(userId) {
    await query(
      `UPDATE users SET is_banned = FALSE, suspension_reason = NULL, updated_at = NOW() WHERE id = $1`,
      [userId]
    );
    return { banned: false };
  }

  static async verifyUser(userId) {
    await query(`UPDATE users SET is_verified = TRUE, updated_at = NOW() WHERE id = $1`, [userId]);
    return { verified: true };
  }

  // ── Video Moderation ─────────────────────────────────────────────
  static async listVideos({ page = 1, limit = 20, status = 'published' } = {}) {
    const offset = (page - 1) * limit;
    const res = await query(
      `SELECT v.id, v.caption, v.thumbnail_url, v.status, v.is_featured,
              v.like_count, v.view_count, v.created_at,
              u.username, u.full_name
       FROM videos v JOIN users u ON u.id = v.user_id
       WHERE ($1 = 'all' OR v.status = $1)
       ORDER BY v.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );
    return { videos: res.rows, page };
  }

  static async moderateVideo(videoId, action) {
    const actions = { hide: 'hidden', restore: 'published', delete: 'deleted' };
    const newStatus = actions[action];
    if (!newStatus) throw new Error('Invalid moderation action.');

    await query(`UPDATE videos SET status = $1, updated_at = NOW() WHERE id = $2`, [newStatus, videoId]);
    return { status: newStatus };
  }

  static async featureVideo(videoId, featured) {
    await query(`UPDATE videos SET is_featured = $1, updated_at = NOW() WHERE id = $2`, [featured, videoId]);
    return { is_featured: featured };
  }

  // ── Reports Queue ────────────────────────────────────────────────
  static async listReports({ page = 1, limit = 20, status = 'pending' } = {}) {
    const offset = (page - 1) * limit;
    const res = await query(
      `SELECT r.*, 
              u_rep.username AS reporter_username,
              u_rep.full_name AS reporter_name,
              u_rep2.username AS reported_username
       FROM reports r
       JOIN users u_rep ON u_rep.id = r.reporter_id
       LEFT JOIN users u_rep2 ON u_rep2.id = r.reported_user_id
       WHERE ($1 = 'all' OR r.status = $1)
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );
    return { reports: res.rows, page };
  }

  static async resolveReport(reportId, action, adminId) {
    await query(
      `UPDATE reports SET status = 'actioned', action_taken = $1, reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $3`,
      [action, adminId, reportId]
    );
    return true;
  }

  // ── Remote Config ────────────────────────────────────────────────
  static async getRemoteConfig() {
    const res = await query(`SELECT setting_key, setting_value, description, is_public FROM app_settings ORDER BY setting_key`);
    const config = {};
    res.rows.forEach(r => { config[r.setting_key] = r.setting_value; });
    return config;
  }

  static async updateRemoteConfig(key, value) {
    await query(
      `INSERT INTO app_settings (id, setting_key, setting_value, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = $3::jsonb, updated_at = NOW()`,
      [uuidv4(), key, JSON.stringify(value)]
    );
    return { key, value };
  }
}
