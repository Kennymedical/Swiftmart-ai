const express = require('express');
const router = express.Router();
const { chat } = require('../services/swiftmartBrain');
const { requireAdmin } = require('../middleware/adminAuth');

// POST /api/swiftmart/chat  (protected)
router.post('/chat', requireAdmin, async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });
    const result = await chat(message, history || []);
    res.json({ reply: result.reply });
  } catch (e) {
    console.error('SwiftMart error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/swiftmart/verify  (checks if password is right)
router.post('/verify', requireAdmin, (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
