const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Get jobs for a specific date (includes rollovers)
router.get('/', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  const { date, user_id, status } = req.query;

  try {
    let query = `
      SELECT j.*, cl.name as client_name, u.name as assigned_user_name,
             cb.name as completed_by_name
      FROM jobs j
      JOIN clients cl ON j.client_id = cl.id
      LEFT JOIN users u ON j.assigned_user_id = u.id
      LEFT JOIN users cb ON j.completed_by_user_id = cb.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      // Get jobs for this date PLUS any pending jobs from prior days (rollover)
      params.push(date);
      query += ` AND (j.scheduled_date = $${params.length} OR (j.scheduled_date < $${params.length} AND j.status = 'pending'))`;
    }

    if (user_id) {
      params.push(user_id);
      query += ` AND j.assigned_user_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND j.status = $${params.length}`;
    }

    query += ' ORDER BY j.scheduled_date ASC, j.created_at ASC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a job
router.post('/', requireAuth, async (req, res) => {
  const { client_id, description, assigned_user_id, scheduled_date, type, source_appointment_id, notes, contract_id } = req.body;
  const db = req.app.locals.db;

  try {
    const result = await db.query(
      `INSERT INTO jobs (client_id, description, assigned_user_id, scheduled_date, type, source_appointment_id, notes, contract_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [client_id, description, assigned_user_id, scheduled_date, type || 'job', source_appointment_id, notes, contract_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete a job
router.patch('/:id/complete', requireAuth, async (req, res) => {
  const db = req.app.locals.db;

  try {
    const result = await db.query(
      `UPDATE jobs SET status = 'complete', completed_at = NOW(), completed_by_user_id = $1
       WHERE id = $2 RETURNING *`,
      [req.session.userId, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = result.rows[0];

    // Auto-create invoice record when job is completed
    await db.query(
      `INSERT INTO invoices (client_id, job_id, description, completed_date)
       VALUES ($1, $2, $3, $4)`,
      [job.client_id, job.id, job.description, new Date().toISOString().split('T')[0]]
    );

    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Defer a job to a new date
router.patch('/:id/defer', requireAuth, async (req, res) => {
  const { scheduled_date, notes } = req.body;
  const db = req.app.locals.db;

  try {
    const result = await db.query(
      `UPDATE jobs SET scheduled_date = $1, notes = COALESCE($2, notes)
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [scheduled_date, notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found or already completed' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update job
router.put('/:id', requireAuth, async (req, res) => {
  const { description, assigned_user_id, scheduled_date, notes, status } = req.body;
  const db = req.app.locals.db;

  try {
    const result = await db.query(
      `UPDATE jobs SET description = $1, assigned_user_id = $2, scheduled_date = $3, notes = $4, status = $5
       WHERE id = $6 RETURNING *`,
      [description, assigned_user_id, scheduled_date, notes, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
