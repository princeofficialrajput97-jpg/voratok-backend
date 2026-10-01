// ─────────────────────────────────────────────────────────────────
// src/services/searchService.js  —  PostgreSQL / Supabase
// ─────────────────────────────────────────────────────────────────
import { query } from '../db/db.js';

export class SearchService {

  static async search({ q, tab = 'all', page = 1, limit = 20 }) {
    if (!q || !q.trim()) {
      return this.getExploreDefaults();
    }
    const term   = q.trim();
    const offset = (page - 1) * limit;
    const like   = `%${term.toLowerCase()}%`;

    const results = {};

    if (tab === 'all' || tab === 'users') {
      const res = await query(
        `SELECT u.id, u.username, u.full_name, u.profile_photo_url, u.is_verified,
                p.followers_count, p.videos_count
         FROM users u LEFT JOIN profiles p ON p.user_id = u.id
         WHERE u.is_banned = FALSE
           AND (LOWER(u.username) LIKE $1 OR LOWER(u.full_name) LIKE $1)
         ORDER BY p.followers_count DESC NULLS LAST
         LIMIT $2 OFFSET $3`,
        [like, limit, offset]
      );
      results.users = res.rows;
    }

    if (tab === 'all' || tab === 'videos') {
      const res = await query(
        `SELECT v.id, v.caption, v.thumbnail_url, v.video_url, v.like_count, v.view_count,
                u.username, u.profile_photo_url
         FROM videos v JOIN users u ON u.id = v.user_id
         WHERE v.status = 'published' AND v.privacy = 'public'
           AND LOWER(v.caption) LIKE $1
         ORDER BY v.score DESC
         LIMIT $2 OFFSET $3`,
        [like, limit, offset]
      );
      results.videos = res.rows;
    }

    if (tab === 'all' || tab === 'hashtags') {
      const tag = term.replace(/^#/, '');
      const res = await query(
        `SELECT id, tag_name, use_count, view_count, is_trending
         FROM hashtags
         WHERE LOWER(tag_name) LIKE $1
         ORDER BY use_count DESC
         LIMIT $2 OFFSET $3`,
        [`%${tag.toLowerCase()}%`, limit, offset]
      );
      results.hashtags = res.rows;
    }

    return { query: term, tab, results, page, has_more: false };
  }

  static async getExploreDefaults() {
    const [trendingTags, suggestedUsers] = await Promise.all([
      query(`SELECT id, tag_name, use_count, view_count FROM hashtags WHERE is_trending = TRUE ORDER BY use_count DESC LIMIT 10`),
      query(
        `SELECT u.id, u.username, u.full_name, u.profile_photo_url, u.is_verified, p.followers_count
         FROM users u LEFT JOIN profiles p ON p.user_id = u.id
         WHERE u.is_banned = FALSE ORDER BY p.followers_count DESC NULLS LAST LIMIT 10`
      ),
    ]);

    return {
      trending_hashtags:  trendingTags.rows,
      suggested_creators: suggestedUsers.rows,
      recent_searches:    [],
    };
  }

  static async getHashtagDetail(tag, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const clean  = tag.replace(/^#/, '').toLowerCase();

    const tagRes = await query(
      `SELECT * FROM hashtags WHERE LOWER(tag_name) = $1`,
      [clean]
    );
    if (tagRes.rows.length === 0) throw new Error(`Hashtag #${clean} not found.`);

    const videosRes = await query(
      `SELECT v.id, v.caption, v.thumbnail_url, v.video_url, v.like_count, v.view_count,
              u.username, u.profile_photo_url
       FROM videos v
       JOIN video_hashtags vh ON vh.video_id = v.id
       JOIN hashtags h ON h.id = vh.hashtag_id
       JOIN users u ON u.id = v.user_id
       WHERE LOWER(h.tag_name) = $1 AND v.status = 'published'
       ORDER BY v.score DESC
       LIMIT $2 OFFSET $3`,
      [clean, limit, offset]
    );

    return {
      hashtag:  tagRes.rows[0],
      videos:   videosRes.rows,
      page,
      has_more: videosRes.rows.length === limit,
    };
  }
}
