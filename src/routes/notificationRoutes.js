import express from 'express';
import { NotificationService } from '../services/notificationService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get Notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const result = await NotificationService.getInbox(req.user.id, { page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mark Single as Read
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    await NotificationService.markRead(req.params.id, req.user.id);
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mark All as Read
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await NotificationService.markAllRead(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
