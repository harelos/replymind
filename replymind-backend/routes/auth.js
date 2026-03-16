const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const crypto = require('crypto');
const validateToken = require('../middleware/validateToken');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Invalid email address' });

  try {
    if (db.getUserByEmail(email.toLowerCase()))
      return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const activation_code = crypto.randomBytes(16).toString('hex');
    const user = db.createUser({ email: email.toLowerCase(), password_hash, activation_code });

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    db.logEvent(user.id, 'account_created', { email: user.email });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, plan: user.plan, toneProfile: '' }
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  try {
    const user = db.getUserByEmail(email.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, plan: user.plan, toneProfile: user.tone_profile || '' }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/activate
router.post('/activate', async (req, res) => {
  const { activationCode } = req.body;
  if (!activationCode) return res.status(400).json({ error: 'Activation code required' });

  try {
    const user = db.getUserByActivationCode(activationCode.trim());
    if (!user) return res.status(404).json({ error: 'Invalid activation code' });
    if (user.plan === 'pro') return res.json({ message: 'Already activated', plan: 'pro' });

    db.updateUser(user.id, { plan: 'pro', activated_at: new Date().toISOString() });
    db.logEvent(user.id, 'plan_activated', { method: 'activation_code' });

    res.json({ success: true, message: 'Pro plan activated!', plan: 'pro' });
  } catch (err) {
    res.status(500).json({ error: 'Activation failed. Please try again.' });
  }
});

// PUT /api/auth/tone
router.put('/tone', validateToken, (req, res) => {
  const { toneProfile } = req.body;
  if (typeof toneProfile !== 'string')
    return res.status(400).json({ error: 'toneProfile must be a string' });

  try {
    db.updateUser(req.userId, { tone_profile: toneProfile.slice(0, 500) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not save tone profile' });
  }
});

module.exports = router;
