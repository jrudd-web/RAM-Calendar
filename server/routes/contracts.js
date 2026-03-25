const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Get all contracts
router.get('/', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query(
      `SELECT c.*, cl.name as client_name, u.name as assigned_user_name
       FROM contracts c
       JOIN clients cl ON c.client_id = cl.id
       LEFT JOIN users u ON c.assigned_user_id = u.id
       ORDER BY c.frequency, cl.name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create contract
router.post('/', requireAdmin, async (req, res) => {
  const { client_id, description, frequency, day_of_week, day_of_month, assigned_user_id } = req.body;
  const db = req.app.locals.db;

  try {
    const result = await db.query(
      `INSERT INTO contracts (client_id, description, frequency, day_of_week, day_of_month, assigned_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [client_id, description, frequency, day_of_week, day_of_month, assigned_user_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update contract
router.put('/:id', requireAdmin, async (req, res) => {
  const { client_id, description, frequency, day_of_week, day_of_month, assigned_user_id, active } = req.body;
  const db = req.app.locals.db;

  try {
    const result = await db.query(
      `UPDATE contracts SET client_id = $1, description = $2, frequency = $3,
       day_of_week = $4, day_of_month = $5, assigned_user_id = $6, active = $7
       WHERE id = $8 RETURNING *`,
      [client_id, description, frequency, day_of_week, day_of_month, assigned_user_id, active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle contract active/inactive
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query(
      `UPDATE contracts SET active = NOT active WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
