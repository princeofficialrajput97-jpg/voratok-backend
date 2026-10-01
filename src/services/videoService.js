// ─────────────────────────────────────────────────────────────────
// src/services/videoService.js  —  PostgreSQL / Supabase
// Video upload, drafts, user videos, single video
// ─────────────────────────────────────────────────────────────────
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/db.js';

export class VideoService {

  // ── Create / Upload Video ────────────────────────────────────────
  static async createVideo(userId, {
    caption = '', video_url, thumbnail_url = '', duration_seconds = 0,
    audio_title = 'Original Sound', audio_artist = '',
    hashtags = [], privacy = 'public',
    comment_permission = 'everyone', allow_download = true
  }) {
    if (!video_url) throw new Error('Video URL is required.');

    const videoId = uuidv4();

    await query(
      `INSERT INTO videos
         (id, user_id, caption, video_url, thumbnail_url, duration_seconds,
          audio_title, audio_artist, privacy, comment_permission, allow_download, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'published')`,
      [videoId, userId, caption.trim(), video_url, thumbnail_url,
       duration_seconds, audio_title, audio_artist, privacy,
       comment_permission, allow_download]
    );

    // Attach hashtags
    if (hashtags.length > 0) {
      await this.attachHashtags(videoId, hashtags);
    }

    await query(`UPDATE profiles SET videos_count = videos_count + 1 WHERE user_id = $1`, [userId]);

    return this.getVideoById(videoId);
  }

  // ── Get single video by ID ───────────────────────────────────────
  static async getVideoById(videoId) {
    const res = await query(
      `SELECT v.*, u.username, u.full_name, u.profile_photo_url, u.is_verified,
              p.followers_count,
              COALESCE(array_agg(DISTINCT h.tag_name) FILTER (WHERE h.tag_name IS NOT NULL), '{}') AS hashtags
       FROM videos v
       JOIN users u ON u.id = v.user_id
       LEFT JOIN profiles p ON p.user_id = v.user_id
       LEFT JOIN video_hashtags vh ON vh.video_id = v.id
       LEFT JOIN hashtags h ON h.id = vh.hashtag_id
       WHERE v.id = $1
       GROUP BY v.id, u.id, u.username, u.full_name, u.profile_photo_url, u.is_verified,
                p.user_id, p.followers_count`,
      [videoId]
    );
    if (res.rows.length === 0) throw new Error('Video not found.');
    return res.rows[0];
  }

  // ── Get videos by user ───────────────────────────────────────────
  static async getUserVideos(targetUserId, viewerUserId = null, { page = 1, limit = 12 } = {}) {
    const offset = (page - 1) * limit;
    const isSelf = targetUserId === viewerUserId;

    const privacyFilter = isSelf
      ? `v.status != 'deleted'`
      : `v.status = 'published' AND v.privacy = 'public'`;

    const res = await query(
      `SELECT v.id, v.thumbnail_url, v.video_url, v.like_count, v.view_count, v.comment_count,
              v.caption, v.created_at, v.privacy, v.status
       FROM videos v
       WHERE v.user_id = $1 AND ${privacyFilter}
       ORDER BY v.created_at DESC
       LIMIT $2 OFFSET $3`,
      [targetUserId, limit, offset]
    );

    return { videos: res.rows, page, has_more: res.rows.length === limit };
  }

  // ── Get saved videos ─────────────────────────────────────────────
  static async getSavedVideos(userId, { page = 1, limit = 12 } = {}) {
    const offset = (page - 1) * limit;
    const res = await query(
      `SELECT v.id, v.thumbnail_url, v.video_url, v.like_count, v.view_count,
              v.caption, v.created_at, u.username
       FROM saved_videos sv
       JOIN videos v ON v.id = sv.video_id
       JOIN users u ON u.id = v.user_id
       WHERE sv.user_id = $1 AND v.status = 'published'
       ORDER BY sv.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return { videos: res.rows, page, has_more: res.rows.length === limit };
  }

  // ── Liked videos ─────────────────────────────────────────────────
  static async getLikedVideos(userId, { page = 1, limit = 12 } = {}) {
    const offset = (page - 1) * limit;
    const res = await query(
      `SELECT v.id, v.thumbnail_url, v.video_url, v.like_count, v.view_count,
              v.caption, v.created_at, u.username
       FROM video_likes vl
       JOIN videos v ON v.id = vl.video_id
       JOIN users u ON u.id = v.user_id
       WHERE vl.user_id = $1 AND v.status = 'published'
       ORDER BY vl.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return { videos: res.rows, page, has_more: res.rows.length === limit };
  }

  // ── Drafts ───────────────────────────────────────────────────────
  static async getDrafts(userId) {
    const res = await query(
      `SELECT * FROM video_drafts WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );
    return res.rows;
  }

  static async saveDraft(userId, { caption, video_path, thumbnail_path = '', filter_preset = 'normal', speed = 1, tags = [], privacy = 'public' }) {
    const id = uuidv4();
    await query(
      `INSERT INTO video_drafts (id, user_id, caption, video_path, thumbnail_path, filter_preset, speed, tags_json, privacy)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,
      [id, userId, caption, video_path, thumbnail_path, filter_preset, speed, JSON.stringify(tags), privacy]
    );
    return { id, message: 'Draft saved.' };
  }

  static async deleteDraft(draftId, userId) {
    const res = await query(
      `DELETE FROM video_drafts WHERE id = $1 AND user_id = $2 RETURNING id`,
      [draftId, userId]
    );
    if (res.rows.length === 0) throw new Error('Draft not found.');
    return true;
  }

  // ── Delete video ─────────────────────────────────────────────────
  static async deleteVideo(videoId, userId) {
    const res = await query(
      `UPDATE videos SET status = 'deleted', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING id`,
      [videoId, userId]
    );
    if (res.rows.length === 0) throw new Error('Video not found or not authorized.');
    await query(`UPDATE profiles SET videos_count = GREATEST(videos_count-1,0) WHERE user_id = $1`, [userId]);
    return true;
  }

  // ── Attach hashtags ──────────────────────────────────────────────
  static async attachHashtags(videoId, tags) {
    for (const raw of tags) {
      const tag = raw.replace(/^#/, '').toLowerCase().trim();
      if (!tag) continue;

      // Upsert hashtag
      const hRes = await query(
        `INSERT INTO hashtags (id, tag_name, use_count)
         VALUES ($1, $2, 1)
         ON CONFLICT (tag_name) DO UPDATE SET use_count = hashtags.use_count + 1
         RETURNING id`,
        [uuidv4(), tag]
      );
      const hashtagId = hRes.rows[0].id;

      await query(
        `INSERT INTO video_hashtags (id, video_id, hashtag_id) VALUES ($1,$2,$3)
         ON CONFLICT (video_id, hashtag_id) DO NOTHING`,
        [uuidv4(), videoId, hashtagId]
      );
    }
  }
}
