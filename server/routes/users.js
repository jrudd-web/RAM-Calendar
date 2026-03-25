const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Get all users
router.get('/', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query(
      'SELECT id, name, email, phone, role, active, created_at FROM users ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create user (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  const db = req.app.locals.db;

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, phone, role, created_at`,
      [name, email, hash, phone, role || 'field']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update user
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, email, phone, role, active } = req.body;
  const db = req.app.locals.db;

  try {
    const result = await db.query(
      `UPDATE users SET name = $1, email = $2, phone = $3, role = $4, active = $5
       WHERE id = $6
       RETURNING id, name, email, phone, role, active`,
      [name, email, phone, role, active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
