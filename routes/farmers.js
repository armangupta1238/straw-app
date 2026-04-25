const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all farmers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, v.village_name, v.district 
       FROM farmers f
       LEFT JOIN villages v ON f.village_id = v.village_id
       ORDER BY f.full_name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new farmer
router.post('/', async (req, res) => {
  const { full_name, phone, village_id, total_acres, straw_per_acre_kg,
          farm_lat, farm_lng, farm_distance_km, transport_cost_per_trip,
          added_by_user_id, added_by_name } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO farmers (full_name, phone, village_id, total_acres, straw_per_acre_kg,
        farm_lat, farm_lng, farm_distance_km, transport_cost_per_trip,
        added_by_user_id, added_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [full_name, phone, village_id, total_acres, straw_per_acre_kg,
       farm_lat, farm_lng, farm_distance_km, transport_cost_per_trip,
       added_by_user_id || null, added_by_name || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Get one farmer by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, v.village_name, v.district 
       FROM farmers f
       LEFT JOIN villages v ON f.village_id = v.village_id
       WHERE f.farmer_id = $1`,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;