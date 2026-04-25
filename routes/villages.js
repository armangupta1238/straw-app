const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all villages
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM villages ORDER BY village_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new village
router.post('/', async (req, res) => {
  const { village_name, district, distance_km, transport_cost_per_ton, village_lat, village_lng } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO villages (village_name, district, distance_km, transport_cost_per_ton, village_lat, village_lng)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [village_name, district, distance_km, transport_cost_per_ton, village_lat, village_lng]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;