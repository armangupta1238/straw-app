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
    warehouse_id, farmer_compensation, acres_picked
  } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO pickups (
        farmer_id, pickup_date, straw_qty_kg, transport_cost,
        vehicle_no, agent_name, pickup_lat, pickup_lng, notes,
        labour_count, labour_cost_per_person, next_pickup_date,
        warehouse_id, farmer_compensation, acres_picked
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        farmer_id, pickup_date, straw_qty_kg, transport_cost || null,
        vehicle_no, agent_name, pickup_lat || null, pickup_lng || null, notes || null,
        labour_count || null, labour_cost_per_person || null, next_pickup_date || null,
        warehouse_id || null, farmer_compensation || null, acres_picked || null
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit a pickup
router.put('/:id', async (req, res) => {
  const {
    pickup_date, straw_qty_kg, transport_cost,
    vehicle_no, agent_name, notes,
    labour_count, labour_cost_per_person, next_pickup_date,
    warehouse_id, farmer_compensation, acres_picked
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE pickups SET
        pickup_date            = COALESCE($1, pickup_date),
        straw_qty_kg           = COALESCE($2, straw_qty_kg),
        transport_cost         = $3,
        vehicle_no             = COALESCE($4, vehicle_no),
        agent_name             = $5,
        notes                  = $6,
        labour_count           = $7,
        labour_cost_per_person = $8,
        next_pickup_date       = $9,
        warehouse_id           = $10,
        farmer_compensation    = $11,
        acres_picked           = $12
       WHERE pickup_id = $13
       RETURNING *`,
      [
        pickup_date, straw_qty_kg, transport_cost || null,
        vehicle_no, agent_name || null, notes || null,
        labour_count || null, labour_cost_per_person || null, next_pickup_date || null,
        warehouse_id || null, farmer_compensation || null, acres_picked || null,
        req.params.id
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pickup not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a pickup
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM pickups WHERE pickup_id = $1', [req.params.id]);
    res.json({ message: 'Pickup deleted' });
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
