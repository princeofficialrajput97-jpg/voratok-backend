import express from 'express';
import { AdsService } from '../services/adsService.js';

const router = express.Router();

// Get Remote AdMob Configuration
router.get('/config', async (req, res) => {
  try {
    const config = await AdsService.getAdConfig();
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Active Feed Ads
router.get('/feed', async (req, res) => {
  try {
    const ads = await AdsService.getActiveFeedAds();
    res.json({ success: true, ads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Record Impression
router.post('/:id/impression', async (req, res) => {
  try {
    await AdsService.recordImpression(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Record Click
router.post('/:id/click', async (req, res) => {
  try {
    await AdsService.recordClick(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
