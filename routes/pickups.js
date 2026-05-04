const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all pickups
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, f.full_name, v.village_name
       FROM pickups p
       LEFT JOIN farmers f ON p.farmer_id = f.farmer_id
       LEFT JOIN villages v ON f.village_id = v.village_id
       ORDER BY p.pickup_date DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new pickup
router.post('/', async (req, res) => {
  const {
    farmer_id, pickup_date, straw_qty_kg, transport_cost,
    vehicle_no, agent_name, pickup_lat, pickup_lng, notes,
    labour_count, labour_cost_per_person, next_pickup_date,
    warehouse_id, farmer_compensation
  } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO pickups (
        farmer_id, pickup_date, straw_qty_kg, transport_cost,
        vehicle_no, agent_name, pickup_lat, pickup_lng, notes,
        labour_count, labour_cost_per_person, next_pickup_date,
        warehouse_id, farmer_compensation
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        farmer_id, pickup_date, straw_qty_kg, transport_cost || null,
        vehicle_no, agent_name, pickup_lat || null, pickup_lng || null, notes || null,
        labour_count || null, labour_cost_per_person || null, next_pickup_date || null,
        warehouse_id || null, farmer_compensation || null
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all pickups for one farmer
router.get('/farmer/:farmer_id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pickups WHERE farmer_id = $1 ORDER BY pickup_date DESC',
      [req.params.farmer_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
