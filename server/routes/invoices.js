const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Get invoices
router.get('/', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  const { status } = req.query;

  try {
    let query = `
      SELECT i.*, cl.name as client_name, u.name as sent_by_name
      FROM invoices i
      JOIN clients cl ON i.client_id = cl.id
      LEFT JOIN users u ON i.sent_by_user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND i.status = $${params.length}`;
    }

    query += ' ORDER BY i.status ASC, i.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark invoice as sent
router.patch('/:id/send', requireAuth, async (req, res) => {
  const { qb_reference } = req.body;
  const db = req.app.locals.db;

  try {
    const result = await db.query(
      `UPDATE invoices SET status = 'sent', sent_date = CURRENT_DATE,
       sent_by_user_id = $1, qb_reference = $2
       WHERE id = $3 RETURNING *`,
      [req.session.userId, qb_reference, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update invoice
router.put('/:id', requireAuth, async (req, res) => {
  const { description, amount, qb_reference } = req.body;
  const db = req.app.locals.db;

  try {
    const result = await db.query(
      `UPDATE invoices SET description = $1, amount = $2, qb_reference = $3
       WHERE id = $4 RETURNING *`,
      [description, amount, qb_reference, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
