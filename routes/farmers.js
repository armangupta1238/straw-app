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
          added_by_user_id, added_by_name, warehouse_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO farmers (full_name, phone, village_id, total_acres, straw_per_acre_kg,
        farm_lat, farm_lng, farm_distance_km, transport_cost_per_trip,
        added_by_user_id, added_by_name, warehouse_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [full_name, phone, village_id, total_acres, straw_per_acre_kg,
       farm_lat, farm_lng, farm_distance_km, transport_cost_per_trip,
       added_by_user_id || null, added_by_name || null, warehouse_id || null]
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

// Edit farmer
router.patch('/:id', async (req, res) => {
  const { full_name, phone, total_acres, straw_per_acre_kg,
          farm_distance_km, transport_cost_per_trip,
          village_name, district } = req.body;
  try {
    // Find existing village or create new one
    let village_id = null;
    if (village_name && district) {
      const existing = await pool.query(
        `SELECT village_id FROM villages WHERE village_name = $1 AND district = $2 LIMIT 1`,
        [village_name, district]
      );
      if (existing.rows.length > 0) {
        village_id = existing.rows[0].village_id;
      } else {
        const newV = await pool.query(
          `INSERT INTO villages (village_name, district) VALUES ($1, $2) RETURNING village_id`,
          [village_name, district]
        );
        village_id = newV.rows[0].village_id;
      }
    }

    const result = await pool.query(
      `UPDATE farmers SET
        full_name               = COALESCE($1, full_name),
        phone                   = $2,
        total_acres             = COALESCE($3, total_acres),
        straw_per_acre_kg       = $4,
        farm_distance_km        = $5,
        transport_cost_per_trip = $6,
        village_id              = COALESCE($7, village_id)
       WHERE farmer_id = $8
       RETURNING *`,
      [full_name, phone || null, total_acres, straw_per_acre_kg || null,
       farm_distance_km || null, transport_cost_per_trip || null,
       village_id, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete farmer
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM harvest_seasons WHERE farmer_id = $1', [req.params.id]);
    await pool.query('DELETE FROM farmers WHERE farmer_id = $1', [req.params.id]);
    res.json({ message: 'Farmer deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;