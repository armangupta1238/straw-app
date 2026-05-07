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

    // Upsert: update if farmer+agent combo exists, else insert
    const result = await pool.query(`
      INSERT INTO pickup_schedules
        (farmer_id, farmer_name, village_name, scheduled_date, agent_id, agent_name, notes, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (farmer_id, agent_id)
      DO UPDATE SET
        scheduled_date = EXCLUDED.scheduled_date,
        farmer_name    = EXCLUDED.farmer_name,
        village_name   = EXCLUDED.village_name,
        agent_name     = EXCLUDED.agent_name,
        notes          = EXCLUDED.notes,
        status         = EXCLUDED.status
      RETURNING *
    `, [
      farmer_id, farmer_name || null, village_name || null,
      scheduled_date, agent_id || null, agent_name || null,
      notes || null, status || 'SCHEDULED'
    ]);

    res.json(result.rows[0]);
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
