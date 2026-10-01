// ─────────────────────────────────────────────────────────────────
// src/services/interactionService.js  —  PostgreSQL / Supabase
// Handles: likes, comments, follows, saves, shares
// ─────────────────────────────────────────────────────────────────
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/db.js';
import {
  sendLikeNotification,
  sendCommentNotification,
  sendFollowNotification
} from './pushNotificationService.js';

export class InteractionService {

  // ── LIKE / UNLIKE ────────────────────────────────────────────────
  static async toggleLike(videoId, userId) {
    const existing = await query(
      `SELECT id FROM video_likes WHERE video_id = $1 AND user_id = $2`,
      [videoId, userId]
    );

    if (existing.rows.length > 0) {
      // Unlike
      await query(`DELETE FROM video_likes WHERE video_id = $1 AND user_id = $2`, [videoId, userId]);
      await query(`UPDATE videos SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1`, [videoId]);
      return { liked: false };
    } else {
      // Like
      await query(`INSERT INTO video_likes (id, video_id, user_id) VALUES ($1, $2, $3)`, [uuidv4(), videoId, userId]);
      await query(`UPDATE videos SET like_count = like_count + 1 WHERE id = $1`, [videoId]);

      // 🔔 Fire FCM push notification (non-blocking)
      query(`SELECT v.user_id AS owner_id, v.title, u.username, u.full_name
             FROM videos v
             JOIN users u ON u.id = $2
             WHERE v.id = $1`, [videoId, userId])
        .then(({ rows }) => {
          if (rows[0] && rows[0].owner_id !== userId) {
            sendLikeNotification({
              recipientId: rows[0].owner_id,
              actorName: rows[0].full_name || rows[0].username,
              videoTitle: rows[0].title,
            }).catch(() => {});
          }
        }).catch(() => {});

      return { liked: true };
    }
  }

  // ── COMMENTS ─────────────────────────────────────────────────────
  static async getComments(videoId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const res = await query(
      `SELECT c.*, u.username, u.full_name, u.profile_photo_url, u.is_verified,
              (SELECT COUNT(*) FROM comments r WHERE r.parent_comment_id = c.id) AS reply_count
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.video_id = $1 AND c.parent_comment_id IS NULL AND c.status = 'active'
       ORDER BY c.is_pinned DESC, c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [videoId, limit, offset]
    );

    return {
      comments: res.rows.map(r => this.formatComment(r)),
      page,
      has_more: res.rows.length === limit
    };
  }

  static async getReplies(commentId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const res = await query(
      `SELECT c.*, u.username, u.full_name, u.profile_photo_url, u.is_verified
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.parent_comment_id = $1 AND c.status = 'active'
       ORDER BY c.created_at ASC
       LIMIT $2 OFFSET $3`,
      [commentId, limit, offset]
    );
    return res.rows.map(r => this.formatComment(r));
  }

  static async addComment(videoId, userId, { content, parent_comment_id = null }) {
    if (!content || !content.trim()) throw new Error('Comment cannot be empty.');
    if (content.length > 500) throw new Error('Comment too long (max 500 chars).');

    const id = uuidv4();
    await query(
      `INSERT INTO comments (id, video_id, user_id, parent_comment_id, content) VALUES ($1,$2,$3,$4,$5)`,
      [id, videoId, userId, parent_comment_id || null, content.trim()]
    );
    await query(`UPDATE videos SET comment_count = comment_count + 1 WHERE id = $1`, [videoId]);

    const res = await query(
      `SELECT c.*, u.username, u.full_name, u.profile_photo_url, u.is_verified
       FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = $1`,
      [id]
    );

    // 🔔 Fire FCM push notification to video owner (non-blocking)
    query(`SELECT user_id FROM videos WHERE id = $1`, [videoId])
      .then(({ rows }) => {
        if (rows[0] && rows[0].user_id !== userId) {
          sendCommentNotification({
            recipientId: rows[0].user_id,
            actorName: res.rows[0]?.full_name || res.rows[0]?.username || 'Someone',
            comment: content.trim(),
            videoId,
          }).catch(() => {});
        }
      }).catch(() => {});

    return this.formatComment(res.rows[0]);
  }

  static async deleteComment(commentId, userId) {
    const res = await query(`SELECT user_id, video_id FROM comments WHERE id = $1`, [commentId]);
    if (res.rows.length === 0) throw new Error('Comment not found.');
    if (res.rows[0].user_id !== userId) throw new Error('You can only delete your own comments.');

    await query(`UPDATE comments SET status = 'deleted' WHERE id = $1`, [commentId]);
    await query(
      `UPDATE videos SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = $1`,
      [res.rows[0].video_id]
    );
    return true;
  }

  static async likeComment(commentId, userId) {
    const existing = await query(
      `SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2`,
      [commentId, userId]
    );

    if (existing.rows.length > 0) {
      await query(`DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2`, [commentId, userId]);
      await query(`UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1`, [commentId]);
      return { liked: false };
    } else {
      await query(`INSERT INTO comment_likes (id, comment_id, user_id) VALUES ($1,$2,$3)`, [uuidv4(), commentId, userId]);
      await query(`UPDATE comments SET like_count = like_count + 1 WHERE id = $1`, [commentId]);
      return { liked: true };
    }
  }

  static formatComment(r) {
    return {
      id:                r.id,
      content:           r.content,
      like_count:        parseInt(r.like_count),
      reply_count:       parseInt(r.reply_count || 0),
      is_pinned:         r.is_pinned,
      parent_comment_id: r.parent_comment_id,
      created_at:        r.created_at,
      user: {
        id:          r.user_id,
        username:    r.username,
        full_name:   r.full_name,
        avatar:      r.profile_photo_url,
        is_verified: r.is_verified,
      }
    };
  }

  // ── FOLLOW / UNFOLLOW ────────────────────────────────────────────
  static async toggleFollow(followerId, followingId) {
    if (followerId === followingId) throw new Error('You cannot follow yourself.');

    const existing = await query(
      `SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );

    if (existing.rows.length > 0) {
      // Unfollow
      await query(`DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`, [followerId, followingId]);
      await query(`UPDATE profiles SET followers_count = GREATEST(followers_count-1,0) WHERE user_id = $1`, [followingId]);
      await query(`UPDATE profiles SET following_count = GREATEST(following_count-1,0) WHERE user_id = $1`, [followerId]);
      return { following: false };
    } else {
      // Follow
      await query(
        `INSERT INTO follows (id, follower_id, following_id, status) VALUES ($1,$2,$3,'active')`,
        [uuidv4(), followerId, followingId]
      );
      await query(`UPDATE profiles SET followers_count = followers_count+1 WHERE user_id = $1`, [followingId]);
      await query(`UPDATE profiles SET following_count = following_count+1 WHERE user_id = $1`, [followerId]);

      // 🔔 Fire FCM push notification (non-blocking)
      query(`SELECT u.full_name, u.username, p.profile_photo_url
             FROM users u LEFT JOIN profiles p ON p.user_id = u.id
             WHERE u.id = $1`, [followerId])
        .then(({ rows }) => {
          if (rows[0]) {
            sendFollowNotification({
              recipientId: followingId,
              actorName: rows[0].full_name || rows[0].username,
              actorAvatar: rows[0].profile_photo_url,
            }).catch(() => {});
          }
        }).catch(() => {});

      return { following: true };
    }
  }

  // ── SAVE / UNSAVE ────────────────────────────────────────────────
  static async toggleSave(videoId, userId) {
    const existing = await query(
      `SELECT id FROM saved_videos WHERE video_id = $1 AND user_id = $2`,
      [videoId, userId]
    );

    if (existing.rows.length > 0) {
      await query(`DELETE FROM saved_videos WHERE video_id = $1 AND user_id = $2`, [videoId, userId]);
      await query(`UPDATE videos SET save_count = GREATEST(save_count-1,0) WHERE id = $1`, [videoId]);
      return { saved: false };
    } else {
      await query(`INSERT INTO saved_videos (id, video_id, user_id) VALUES ($1,$2,$3)`, [uuidv4(), videoId, userId]);
      await query(`UPDATE videos SET save_count = save_count+1 WHERE id = $1`, [videoId]);
      return { saved: true };
    }
  }

  // ── SHARE (increment counter) ────────────────────────────────────
  static async recordShare(videoId) {
    await query(`UPDATE videos SET share_count = share_count + 1 WHERE id = $1`, [videoId]);
    const res = await query(`SELECT share_count FROM videos WHERE id = $1`, [videoId]);
    return { share_count: parseInt(res.rows[0]?.share_count || 0) };
  }
}
