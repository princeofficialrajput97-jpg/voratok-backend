import express from 'express';
import { query } from '../db/db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { AuthService } from '../services/authService.js';
import { VideoService } from '../services/videoService.js';
import { saveFCMToken } from '../services/pushNotificationService.js';

const router = express.Router();

// Get User Profile by Username
router.get('/profile/:username', optionalAuth, async (req, res) => {
  try {
    const resUser = await query(
      `SELECT u.id, u.username, u.full_name, u.bio, u.profile_photo_url, u.cover_photo_url,
              u.is_verified, u.created_at,
              p.followers_count, p.following_count, p.likes_count, p.videos_count,
              p.website, p.is_private, p.allow_comments, p.allow_downloads
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE LOWER(u.username) = LOWER($1) AND u.is_banned = FALSE`,
      [req.params.username.trim()]
    );

    const user = resUser.rows[0];
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const isOwner = req.user?.id === user.id;

    let isFollowing = false;
    if (req.user && !isOwner) {
      const resFollow = await query(
        `SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2 AND status = 'active'`,
        [req.user.id, user.id]
      );
      isFollowing = resFollow.rows.length > 0;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        bio: user.bio,
        profile_photo_url: user.profile_photo_url,
        cover_photo_url: user.cover_photo_url,
        is_verified: user.is_verified,
        created_at: user.created_at,
        profile: {
          followers_count: parseInt(user.followers_count || 0),
          following_count: parseInt(user.following_count || 0),
          likes_count: parseInt(user.likes_count || 0),
          videos_count: parseInt(user.videos_count || 0),
          website: user.website || '',
          is_private: !!user.is_private,
          allow_comments: user.allow_comments || 'everyone',
          allow_downloads: user.allow_downloads !== false,
        },
        is_owner: isOwner,
        is_following: isFollowing
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Current User Profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { full_name, username, bio, profile_photo_url, website, is_private } = req.body;

    const userRes = await query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const currentUsername = userRes.rows[0]?.username;

    // Username change validation & uniqueness check
    if (username && username.toLowerCase() !== currentUsername?.toLowerCase()) {
      if (!AuthService.validateUsername(username)) {
        return res.status(400).json({ success: false, error: 'Invalid username format.' });
      }
      if (!(await AuthService.isUsernameAvailable(username))) {
        return res.status(400).json({ success: false, error: 'Username is already taken.' });
      }
    }

    if (full_name || username || bio !== undefined || profile_photo_url) {
      await query(
        `UPDATE users
         SET full_name = COALESCE($1, full_name),
             username = COALESCE($2, username),
             bio = COALESCE($3, bio),
             profile_photo_url = COALESCE($4, profile_photo_url),
             updated_at = NOW()
         WHERE id = $5`,
        [
          full_name?.trim() || null,
          username?.toLowerCase().trim() || null,
          bio !== undefined ? bio.trim() : null,
          profile_photo_url || null,
          req.user.id
        ]
      );
    }

    if (website !== undefined || is_private !== undefined) {
      await query(
        `UPDATE profiles
         SET website = COALESCE($1, website),
             is_private = COALESCE($2, is_private),
             updated_at = NOW()
         WHERE user_id = $3`,
        [website !== undefined ? website.trim() : null, is_private, req.user.id]
      );
    }

    const updatedRes = await query(
      `SELECT u.*, p.followers_count, p.following_count, p.likes_count, p.videos_count
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: AuthService.sanitizeUser(updatedRes.rows[0])
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get User's Uploaded Videos
router.get('/profile/:username/videos', optionalAuth, async (req, res) => {
  try {
    const userRes = await query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [req.params.username]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '12', 10);

    const result = await VideoService.getUserVideos(user.id, req.user?.id || null, { page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get User's Liked Videos
router.get('/profile/:username/liked', requireAuth, async (req, res) => {
  try {
    const userRes = await query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [req.params.username]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '12', 10);

    const result = await VideoService.getLikedVideos(user.id, { page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get User's Saved/Bookmarked Videos
router.get('/profile/:username/saved', requireAuth, async (req, res) => {
  try {
    const userRes = await query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [req.params.username]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    if (req.user.id !== user.id) {
      return res.status(403).json({ success: false, error: 'Saved videos are private.' });
    }

    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '12', 10);

    const result = await VideoService.getSavedVideos(user.id, { page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Register FCM Device Token ─────────────────────────────────────
router.post('/fcm-token', requireAuth, async (req, res) => {
  try {
    const { fcm_token, device_type = 'android' } = req.body;
    if (!fcm_token) return res.status(400).json({ success: false, error: 'fcm_token is required' });

    await saveFCMToken(req.user.id, fcm_token, device_type);
    res.json({ success: true, message: 'FCM token registered successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
