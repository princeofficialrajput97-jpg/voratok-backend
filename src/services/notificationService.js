// ─────────────────────────────────────────────────────────────────
// src/services/notificationService.js  —  PostgreSQL / Supabase
// ─────────────────────────────────────────────────────────────────
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/db.js';

export class NotificationService {

  static async getInbox(userId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;

    const res = await query(
      `SELECT n.*, u.username AS sender_username, u.profile_photo_url AS sender_avatar
       FROM notifications n
       LEFT JOIN users u ON u.id = n.sender_id
       WHERE n.recipient_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const unreadRes = await query(
      `SELECT COUNT(*) FROM notifications WHERE recipient_id = $1 AND is_read = FALSE`,
      [userId]
    );

    return {
      notifications: res.rows,
      unread_count: parseInt(unreadRes.rows[0].count),
      page,
      has_more: res.rows.length === limit,
    };
  }

  static async markRead(notificationId, userId) {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND recipient_id = $2`,
      [notificationId, userId]
    );
    return true;
  }

  static async markAllRead(userId) {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE recipient_id = $1`,
      [userId]
    );
    return true;
  }

  static async create({ recipient_id, sender_id = null, type, reference_id = null, reference_type = null, message }) {
    const id = uuidv4();
    await query(
      `INSERT INTO notifications (id, recipient_id, sender_id, type, reference_id, reference_type, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, recipient_id, sender_id, type, reference_id, reference_type, message]
    );
    return id;
  }

  static async broadcastAdmin(message) {
    const usersRes = await query(`SELECT id FROM users WHERE is_banned = FALSE LIMIT 1000`);
    const ids = usersRes.rows.map(r => r.id);

    for (const uid of ids) {
      await this.create({
        recipient_id: uid,
        type: 'admin_announcement',
        message,
      });
    }
    return { sent: ids.length };
  }
}
