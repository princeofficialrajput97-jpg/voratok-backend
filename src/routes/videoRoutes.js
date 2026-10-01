import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { VideoService } from '../services/videoService.js';
import { StorageService } from '../services/storageService.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure uploads directory exists for fallback
const uploadDir = path.resolve(__dirname, '../../public/uploads/videos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Upload Video (Accepts video_url, or Base64 / binary payload)
router.post('/upload', requireAuth, async (req, res) => {
  try {
    let {
      video_url,
      video_base64,
      caption,
      thumbnail_url,
      duration_seconds,
      audio_title,
      audio_artist,
      hashtags,
      privacy,
      comment_permission,
      allow_download,
    } = req.body;

    // Upload to Cloudinary CDN if Base64 video sent from mobile device camera / gallery
    if (video_base64) {
      try {
        const cdnResult = await StorageService.uploadVideo(video_base64, { folder: 'voratok/videos' });
        video_url = cdnResult.video_url;
        if (!thumbnail_url) thumbnail_url = cdnResult.thumbnail_url;
        if (!duration_seconds) duration_seconds = cdnResult.duration_seconds;
      } catch (cdnErr) {
        console.warn('⚠️ Cloudinary upload failed, using local disk fallback:', cdnErr.message);
        const safeFilename = `vora_${Date.now()}_${Math.round(Math.random() * 1e9)}.mp4`;
        const filePath = path.join(uploadDir, safeFilename);
        const buffer = Buffer.from(video_base64.replace(/^data:video\/\w+;base64,/, ''), 'base64');
        fs.writeFileSync(filePath, buffer);
        video_url = `${config.cdnBaseUrl}/uploads/videos/${safeFilename}`;
      }
    }

    if (!video_url) {
      return res.status(400).json({
        success: false,
        error: 'Please provide video_url or video_base64.'
      });
    }

    const video = await VideoService.createVideo(req.user.id, {
      caption: caption || '',
      video_url,
      thumbnail_url: thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      duration_seconds: duration_seconds || 15,
      audio_title: audio_title || 'Original Sound',
      audio_artist: audio_artist || req.user.username,
      hashtags: hashtags || [],
      privacy: privacy || 'public',
      comment_permission: comment_permission || 'everyone',
      allow_download: allow_download !== false
    });

    res.status(201).json({
      success: true,
      message: 'Video published successfully!',
      video
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get Video Details
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const video = await VideoService.getVideoById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found.' });
    }
    res.json({ success: true, video });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Video
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await VideoService.deleteVideo(req.params.id, req.user.id);
    res.json({ success: true, message: 'Video deleted.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// --- DRAFTS ---

router.post('/drafts', requireAuth, async (req, res) => {
  try {
    const { caption, video_path, thumbnail_path, filter_preset, speed, tags, privacy } = req.body;
    const draft = await VideoService.saveDraft(req.user.id, {
      caption,
      video_path,
      thumbnail_path,
      filter_preset,
      speed,
      tags,
      privacy
    });
    res.status(201).json({ success: true, draft });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/drafts/my', requireAuth, async (req, res) => {
  try {
    const drafts = await VideoService.getDrafts(req.user.id);
    res.json({ success: true, drafts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/drafts/:id', requireAuth, async (req, res) => {
  try {
    await VideoService.deleteDraft(req.params.id, req.user.id);
    res.json({ success: true, message: 'Draft deleted.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
