const express = require('express');
const router = express.Router();
const { signUpVendor, loginVendor } = require('../services/authService');
const { requireAuth } = require('../middleware/auth');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, businessName } = req.body;
    if (!email || !password || !businessName) {
      return res.status(400).json({ error: 'email, password, and businessName are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const result = await signUpVendor({ email, password, businessName });
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }
    const result = await loginVendor({ email, password });
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

// GET /api/auth/me  (protected)
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
