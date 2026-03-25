const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// The heart of the Franklin system: get everything for today's daily view
// This includes rolled-over jobs from prior days
router.get('/:date', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  const { date } = req.params;
  const userId = req.query.user_id || req.session.userId;

  try {
    // Get today's appointments
    const appointments = await db.query(
      `SELECT a.*, cl.name as client_name, u.name as user_name
       FROM appointments a
       LEFT JOIN clients cl ON a.client_id = cl.id
       JOIN users u ON a.user_id = u.id
       WHERE DATE(a.start_time) = $1
       ORDER BY a.start_time ASC`,
      [date]
    );

    // Get today's jobs + ALL pending jobs from prior days (the rollover)
    const jobs = await db.query(
      `SELECT j.*, cl.name as client_name, u.name as assigned_user_name,
              cb.name as completed_by_name,
              CASE WHEN j.scheduled_date < $1 THEN true ELSE false END as is_rollover
       FROM jobs j
       JOIN clients cl ON j.client_id = cl.id
       LEFT JOIN users u ON j.assigned_user_id = u.id
       LEFT JOIN users cb ON j.completed_by_user_id = cb.id
       WHERE (j.scheduled_date = $1 OR (j.scheduled_date < $1 AND j.status = 'pending'))
       ORDER BY j.status ASC, j.scheduled_date ASC, j.created_at ASC`,
      [date]
    );

    // Get unbilled invoice count for the badge
    const unbilledCount = await db.query(
      `SELECT COUNT(*) as count FROM invoices WHERE status = 'unbilled'`
    );

    res.json({
      date,
      appointments: appointments.rows,
      jobs: jobs.rows,
      unbilled_count: parseInt(unbilledCount.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate jobs from active contracts for a specific date
// This would be called by a daily cron job or on app open
router.post('/generate/:date', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  const { date } = req.params;
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay(); // 0=Sun, 1=Mon, etc.
  const dayOfMonth = targetDate.getDate();

  try {
    // Find contracts that should generate jobs for this date
    const contracts = await db.query(
      `SELECT * FROM contracts WHERE active = true
       AND (
         (frequency = 'weekly' AND day_of_week = $1)
         OR (frequency = 'biweekly' AND day_of_week = $1)
         OR (frequency = 'monthly' AND day_of_month = $2)
       )`,
      [dayOfWeek, dayOfMonth]
    );

    let created = 0;
    for (const contract of contracts.rows) {
      // Check if a job already exists for this contract on this date
      const existing = await db.query(
        'SELECT id FROM jobs WHERE contract_id = $1 AND scheduled_date = $2',
        [contract.id, date]
      );

      if (existing.rows.length === 0) {
        await db.query(
          `INSERT INTO jobs (contract_id, client_id, description, assigned_user_id, scheduled_date)
           VALUES ($1, $2, $3, $4, $5)`,
          [contract.id, contract.client_id, contract.description, contract.assigned_user_id, date]
        );
        created++;
      }
    }

    res.json({ message: `Generated ${created} jobs for ${date}`, created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
