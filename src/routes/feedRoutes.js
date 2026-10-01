import express from 'express';
import { FeedService } from '../services/feedService.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/feed/for-you
router.get('/for-you', optionalAuth, async (req, res) => {
  try {
    const page  = parseInt(req.query.page  || '1',  10);
    const limit = parseInt(req.query.limit || '10', 10);

    const result = await FeedService.getForYouFeed({
      userId: req.user?.id || null,
      page,
      limit,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Feed/ForYou]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/feed/following
router.get('/following', requireAuth, async (req, res) => {
  try {
    const page  = parseInt(req.query.page  || '1',  10);
    const limit = parseInt(req.query.limit || '10', 10);

    const result = await FeedService.getFollowingFeed({
      userId: req.user.id,
      page,
      limit,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Feed/Following]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/feed/view/:videoId  — record a view
router.post('/view/:videoId', optionalAuth, async (req, res) => {
  try {
    await FeedService.recordView(req.params.videoId, req.user?.id || null);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
