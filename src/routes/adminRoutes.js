import express from 'express';
import { AdminService } from '../services/adminService.js';
import { NotificationService } from '../services/notificationService.js';
import { requireAuth, requireAdmin, requireModerator } from '../middleware/auth.js';

const router = express.Router();

// 1. Dashboard Overview Stats
router.get('/dashboard', requireAuth, requireModerator, async (req, res) => {
  try {
    const stats = await AdminService.getDashboardStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. User Management
router.get('/users', requireAuth, requireModerator, async (req, res) => {
  try {
    const { q, page, limit } = req.query;
    const result = await AdminService.listUsers({
      search: q || '',
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10)
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/users/:id/ban', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await AdminService.banUser(req.params.id, reason);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/users/:id/unban', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await AdminService.unbanUser(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/users/:id/verify', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await AdminService.verifyUser(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 3. Video Moderation
router.get('/videos', requireAuth, requireModerator, async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const result = await AdminService.listVideos({
      status: status || 'published',
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10)
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/videos/:id/status', requireAuth, requireModerator, async (req, res) => {
  try {
    const { action } = req.body; // 'hide', 'restore', 'delete'
    const result = await AdminService.moderateVideo(req.params.id, action);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/videos/:id/featured', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { is_featured } = req.body;
    const result = await AdminService.featureVideo(req.params.id, !!is_featured);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 4. Reports Queue
router.get('/reports', requireAuth, requireModerator, async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const result = await AdminService.listReports({
      status: status || 'pending',
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10)
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/reports/:id/action', requireAuth, requireModerator, async (req, res) => {
  try {
    const { action } = req.body;
    await AdminService.resolveReport(req.params.id, action, req.user.id);
    res.json({ success: true, message: 'Report actioned.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 5. Config, Branding & Feature Flags
router.get('/config', requireAuth, requireAdmin, async (req, res) => {
  try {
    const config = await AdminService.getRemoteConfig();
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/config/:key', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await AdminService.updateRemoteConfig(req.params.key, req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 6. Broadcast System Notification / Announcement
router.post('/announcement', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    const result = await NotificationService.broadcastAdmin(message);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
