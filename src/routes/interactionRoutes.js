import express from 'express';
import { InteractionService } from '../services/interactionService.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Toggle Video Like
router.post('/videos/:id/like', requireAuth, async (req, res) => {
  try {
    const result = await InteractionService.toggleLike(req.params.id, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get Video Comments
router.get('/videos/:id/comments', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const result = await InteractionService.getComments(req.params.id, { page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Comment Replies
router.get('/comments/:id/replies', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const replies = await InteractionService.getReplies(req.params.id, { page, limit });
    res.json({ success: true, replies });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add Video Comment / Reply
router.post('/videos/:id/comments', requireAuth, async (req, res) => {
  try {
    const { content, parent_comment_id } = req.body;
    const comment = await InteractionService.addComment(req.params.id, req.user.id, {
      content,
      parent_comment_id: parent_comment_id || null
    });
    res.status(201).json({ success: true, comment });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Toggle Comment Like
router.post('/comments/:id/like', requireAuth, async (req, res) => {
  try {
    const result = await InteractionService.likeComment(req.params.id, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete Comment
router.delete('/comments/:id', requireAuth, async (req, res) => {
  try {
    await InteractionService.deleteComment(req.params.id, req.user.id);
    res.json({ success: true, message: 'Comment deleted successfully.' });
  } catch (err) {
    res.status(403).json({ success: false, error: err.message });
  }
});

// Toggle Follow User
router.post('/users/:id/follow', requireAuth, async (req, res) => {
  try {
    const result = await InteractionService.toggleFollow(req.user.id, req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Toggle Save/Bookmark Video
router.post('/videos/:id/save', requireAuth, async (req, res) => {
  try {
    const result = await InteractionService.toggleSave(req.params.id, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Record Video Share
router.post('/videos/:id/share', async (req, res) => {
  try {
    const result = await InteractionService.recordShare(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
