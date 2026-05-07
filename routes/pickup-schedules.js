const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/pickup-schedules?agent_id=X
router.get('/', async (req, res) => {
  try {
    const { agent_id } = req.query;
    let query  = 'SELECT * FROM pickup_schedules ORDER BY scheduled_date ASC';
    let params = [];

    if (agent_id) {
      query  = 'SELECT * FROM pickup_schedules WHERE agent_id = $1 ORDER BY scheduled_date ASC';
      params = [agent_id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET pickup-schedules error:', err);
    res.status(500).json({ error: 'Failed to fetch pickup schedules' });
  }
});

// POST /api/pickup-schedules — insert or update
router.post('/', async (req, res) => {
  try {
    const {
      farmer_id, farmer_name, village_name,
      scheduled_date, agent_id, agent_name,
      notes, status
    } = req.body;

    if (!farmer_id || !scheduled_date) {
      return res.status(400).json({ error: 'farmer_id and scheduled_date are required' });
    }

    // Try insert first
    const insert = await pool.query(`
      INSERT INTO pickup_schedules
        (farmer_id, farmer_name, village_name, scheduled_date, agent_id, agent_name, notes, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT DO NOTHING
      RETURNING *
    `, [
      farmer_id, farmer_name || null, village_name || null,
      scheduled_date, agent_id || null, agent_name || null,
      notes || null, status || 'SCHEDULED'
    ]);

    if (insert.rows.length > 0) return res.json(insert.rows[0]);

    // Already exists — update it
    const update = await pool.query(`
      UPDATE pickup_schedules
      SET scheduled_date = $1,
          farmer_name    = $2,
          village_name   = $3,
          agent_name     = $4,
          notes          = $5,
          status         = $6
      WHERE farmer_id = $7
        AND (agent_id = $8 OR agent_id IS NULL)
      RETURNING *
    `, [
      scheduled_date, farmer_name || null, village_name || null,
      agent_name || null, notes || null, status || 'SCHEDULED',
      farmer_id, agent_id || null
    ]);

    res.json(update.rows[0]);
  } catch (err) {
    console.error('POST pickup-schedules error:', err);
    res.status(500).json({ error: 'Failed to save pickup schedule' });
  }
});

// DELETE /api/pickup-schedules/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM pickup_schedules WHERE id = $1', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE pickup-schedules error:', err);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

module.exports = router;
