const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Get all clients
router.get('/', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query(
      'SELECT * FROM clients WHERE active = true ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single client
router.get('/:id', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create client
router.post('/', requireAdmin, async (req, res) => {
  const { name, address, phone, email, notes } = req.body;
  const db = req.app.locals.db;

  try {
    const result = await db.query(
      `INSERT INTO clients (name, address, phone, email, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, address, phone, email, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update client
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, address, phone, email, notes, active } = req.body;
  const db = req.app.locals.db;

  try {
    const result = await db.query(
      `UPDATE clients SET name = $1, address = $2, phone = $3, email = $4, notes = $5, active = $6
       WHERE id = $7 RETURNING *`,
      [name, address, phone, email, notes, active !== undefined ? active : true, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
