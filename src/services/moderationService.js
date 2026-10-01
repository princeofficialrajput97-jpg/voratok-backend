// ─────────────────────────────────────────────────────────────────
// src/services/moderationService.js  —  PostgreSQL / Supabase
// Block/Unblock users, Report content
// ─────────────────────────────────────────────────────────────────
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/db.js';

export class ModerationService {

  // ── BLOCK ────────────────────────────────────────────────────────
  static async blockUser(blockerId, blockedId) {
    if (blockerId === blockedId) throw new Error('You cannot block yourself.');

    const existing = await query(
      `SELECT id FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2`,
      [blockerId, blockedId]
    );
    if (existing.rows.length > 0) throw new Error('User is already blocked.');

    await query(
      `INSERT INTO blocked_users (id, blocker_id, blocked_id) VALUES ($1,$2,$3)`,
      [uuidv4(), blockerId, blockedId]
    );

    // Also unfollow both directions
    await query(
      `DELETE FROM follows WHERE (follower_id = $1 AND following_id = $2) OR (follower_id = $2 AND following_id = $1)`,
      [blockerId, blockedId]
    );

    return { blocked: true };
  }

  static async unblockUser(blockerId, blockedId) {
    const res = await query(
      `DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2 RETURNING id`,
      [blockerId, blockedId]
    );
    if (res.rows.length === 0) throw new Error('User was not blocked.');
    return { blocked: false };
  }

  static async getBlockedUsers(userId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const res = await query(
      `SELECT u.id, u.username, u.full_name, u.profile_photo_url, bu.created_at AS blocked_at
       FROM blocked_users bu
       JOIN users u ON u.id = bu.blocked_id
       WHERE bu.blocker_id = $1
       ORDER BY bu.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return { blocked_users: res.rows, page, has_more: res.rows.length === limit };
  }

  // ── REPORT ───────────────────────────────────────────────────────
  static async report({ reporter_id, type, reason, description = '', video_id = null, reported_user_id = null, comment_id = null }) {
    const valid_reasons = ['spam','harassment','hate','violence','sexual','copyright','scam','other'];
    if (!valid_reasons.includes(reason)) throw new Error('Invalid report reason.');

    const id = uuidv4();
    await query(
      `INSERT INTO reports (id, reporter_id, type, reason, description, video_id, reported_user_id, comment_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, reporter_id, type, reason, description, video_id, reported_user_id, comment_id]
    );
    return { report_id: id, message: 'Report submitted. Our team will review it shortly.' };
  }
}
