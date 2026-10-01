import express from 'express';
import { SearchService } from '../services/searchService.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Search endpoint
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { q, tab, page, limit } = req.query;
    const result = await SearchService.search({
      q: q || '',
      tab: tab || 'all',
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10),
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Explore Page Defaults
router.get('/explore', optionalAuth, async (req, res) => {
  try {
    const defaults = await SearchService.getExploreDefaults();
    res.json({ success: true, ...defaults });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Hashtag Details View
router.get('/hashtag/:tag', async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const details = await SearchService.getHashtagDetail(req.params.tag, { page, limit });
    res.json({ success: true, ...details });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
