import express from 'express';
import { ModerationService } from '../services/moderationService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Block User
router.post('/block/:userId', requireAuth, async (req, res) => {
  try {
    const result = await ModerationService.blockUser(req.user.id, req.params.userId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Unblock User
router.post('/unblock/:userId', requireAuth, async (req, res) => {
  try {
    const result = await ModerationService.unblockUser(req.user.id, req.params.userId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List Blocked Users
router.get('/blocked', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const result = await ModerationService.getBlockedUsers(req.user.id, { page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Submit Content/User Report
router.post('/report', requireAuth, async (req, res) => {
  try {
    const { reported_user_id, video_id, comment_id, type, reason, description } = req.body;
    const result = await ModerationService.report({
      reporter_id: req.user.id,
      reported_user_id,
      video_id,
      comment_id,
      type,
      reason,
      description
    });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
