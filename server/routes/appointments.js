const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Get appointments for a date range
router.get('/', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  const { date, start_date, end_date, user_id } = req.query;

  try {
    let query = `
      SELECT a.*, cl.name as client_name, u.name as user_name
      FROM appointments a
      LEFT JOIN clients cl ON a.client_id = cl.id
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      params.push(date);
      query += ` AND DATE(a.start_time) = $${params.length}`;
    } else if (start_date && end_date) {
      params.push(start_date, end_date);
      query += ` AND DATE(a.start_time) >= $${params.length - 1} AND DATE(a.start_time) <= $${params.length}`;
    }

    if (user_id) {
      params.push(user_id);
      query += ` AND a.user_id = $${params.length}`;
    }

    query += ' ORDER BY a.start_time ASC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create appointment
router.post('/', requireAuth, async (req, res) => {
  const { user_id, client_id, title, description, start_time, end_time, notes } = req.body;
  const db = req.app.locals.db;

  try {
    const result = await db.query(
      `INSERT INTO appointments (user_id, client_id, title, description, start_time, end_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id || req.session.userId, client_id, title, description, start_time, end_time, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete appointment with notes and optional quote trigger
router.patch('/:id/complete', requireAuth, async (req, res) => {
  const { appointment_notes, needs_quote, quote_description } = req.body;
  const db = req.app.locals.db;

  try {
    const result = await db.query(
      `UPDATE appointments SET appointment_notes = $1, completed_at = NOW()
       WHERE id = $2 RETURNING *`,
      [appointment_notes, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = result.rows[0];

    // If quote/estimate needed, create a job that rolls over daily
    if (needs_quote && appointment.client_id) {
      await db.query(
        `INSERT INTO jobs (client_id, description, assigned_user_id, scheduled_date, type, source_appointment_id)
         VALUES ($1, $2, $3, CURRENT_DATE, $4, $5)`,
        [
          appointment.client_id,
          quote_description || `Quote needed - ${appointment.title}`,
          appointment.user_id,
          'quote',
          appointment.id
        ]
      );
    }

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update appointment
router.put('/:id', requireAuth, async (req, res) => {
  const { title, description, start_time, end_time, notes, client_id, user_id } = req.body;
  const db = req.app.locals.db;

  try {
    const result = await db.query(
      `UPDATE appointments SET title = $1, description = $2, start_time = $3,
       end_time = $4, notes = $5, client_id = $6, user_id = $7
       WHERE id = $8 RETURNING *`,
      [title, description, start_time, end_time, notes, client_id, user_id, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete appointment
router.delete('/:id', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query('DELETE FROM appointments WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
