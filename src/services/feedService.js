// ─────────────────────────────────────────────────────────────────
// src/services/feedService.js  —  PostgreSQL / Supabase backed
// ─────────────────────────────────────────────────────────────────
import { query } from '../db/db.js';

// Common video enrichment SQL fragment
const VIDEO_SELECT = `
  SELECT
    v.*,
    u.username, u.full_name, u.profile_photo_url, u.is_verified,
    p.followers_count, p.allow_downloads,
    COALESCE(array_agg(DISTINCT h.tag_name) FILTER (WHERE h.tag_name IS NOT NULL), '{}') AS hashtags
  FROM videos v
  JOIN users u ON u.id = v.user_id
  LEFT JOIN profiles p ON p.user_id = v.user_id
  LEFT JOIN video_hashtags vh ON vh.video_id = v.id
  LEFT JOIN hashtags h ON h.id = vh.hashtag_id
`;

function enrichVideo(row, viewerUserId = null) {
  return {
    id:            row.id,
    caption:       row.caption,
    video_url:     row.video_url,
    thumbnail_url: row.thumbnail_url,
    duration:      parseFloat(row.duration_seconds),
    audio: {
      title:  row.audio_title,
      artist: row.audio_artist,
      url:    row.audio_url || null
    },
    hashtags:      row.hashtags || [],
    stats: {
      views:    parseInt(row.view_count),
      likes:    parseInt(row.like_count),
      comments: parseInt(row.comment_count),
      shares:   parseInt(row.share_count),
      saves:    parseInt(row.save_count),
    },
    privacy:    row.privacy,
    is_featured: row.is_featured,
    created_at: row.created_at,
    creator: {
      id:            row.user_id,
      username:      row.username,
      full_name:     row.full_name,
      avatar:        row.profile_photo_url,
      is_verified:   row.is_verified,
      followers:     parseInt(row.followers_count || 0),
    },
    viewer: {
      is_liked:    false,   // will be set if viewerUserId provided
      is_saved:    false,
      is_following:false,
    },
    allow_download: row.allow_downloads !== false,
  };
}

export class FeedService {

  // ── For You Feed (recommended public videos) ─────────────────────
  static async getForYouFeed({ userId = null, page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;

    const res = await query(
      `${VIDEO_SELECT}
       WHERE v.status = 'published' AND v.privacy = 'public'
       GROUP BY v.id, u.id, u.username, u.full_name, u.profile_photo_url, u.is_verified,
                p.user_id, p.followers_count, p.allow_downloads
       ORDER BY v.score DESC, v.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    let videos = res.rows.map(r => enrichVideo(r, userId));

    // If user is logged in, check like/save/follow status
    if (userId && videos.length > 0) {
      videos = await this.attachViewerState(videos, userId);
    }

    return {
      videos,
      page,
      has_more: res.rows.length === limit
    };
  }

  // ── Following Feed ───────────────────────────────────────────────
  static async getFollowingFeed({ userId, page = 1, limit = 10 } = {}) {
    if (!userId) return { videos: [], page, has_more: false };
    const offset = (page - 1) * limit;

    const res = await query(
      `${VIDEO_SELECT}
       JOIN follows f ON f.following_id = v.user_id
       WHERE f.follower_id = $1
         AND f.status = 'active'
         AND v.status = 'published'
         AND v.privacy IN ('public', 'followers')
       GROUP BY v.id, u.id, u.username, u.full_name, u.profile_photo_url, u.is_verified,
                p.user_id, p.followers_count, p.allow_downloads
       ORDER BY v.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    let videos = res.rows.map(r => enrichVideo(r, userId));
    if (videos.length > 0) videos = await this.attachViewerState(videos, userId);

    return { videos, page, has_more: res.rows.length === limit };
  }

  // ── Attach viewer like/save/follow state ─────────────────────────
  static async attachViewerState(videos, userId) {
    const videoIds   = videos.map(v => v.id);
    const creatorIds = videos.map(v => v.creator.id);

    const [likesRes, savesRes, followsRes] = await Promise.all([
      query(`SELECT video_id FROM video_likes WHERE user_id = $1 AND video_id = ANY($2)`,  [userId, videoIds]),
      query(`SELECT video_id FROM saved_videos  WHERE user_id = $1 AND video_id = ANY($2)`, [userId, videoIds]),
      query(`SELECT following_id FROM follows   WHERE follower_id = $1 AND following_id = ANY($2) AND status = 'active'`, [userId, creatorIds]),
    ]);

    const likedSet    = new Set(likesRes.rows.map(r => r.video_id));
    const savedSet    = new Set(savesRes.rows.map(r => r.video_id));
    const followedSet = new Set(followsRes.rows.map(r => r.following_id));

    return videos.map(v => ({
      ...v,
      viewer: {
        is_liked:     likedSet.has(v.id),
        is_saved:     savedSet.has(v.id),
        is_following: followedSet.has(v.creator.id),
      }
    }));
  }

  // ── Record a video view ──────────────────────────────────────────
  static async recordView(videoId, userId = null) {
    await Promise.all([
      query(`UPDATE videos SET view_count = view_count + 1 WHERE id = $1`, [videoId]),
      query(`INSERT INTO video_views (video_id, user_id) VALUES ($1, $2)`, [videoId, userId || null]),
    ]);
    return true;
  }
}
