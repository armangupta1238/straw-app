const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET all warehouses
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM warehouses ORDER BY created_at ASC'
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST create warehouse
router.post('/', async (req, res) => {
  const { name, address, lat, lng, distance_km } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO warehouses (name, address, lat, lng, distance_km)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, address || null, lat || null, lng || null, distance_km || null]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT update warehouse
router.put('/:id', async (req, res) => {
  const { name, address, lat, lng, distance_km } = req.body;
  try {
    const result = await pool.query(
      `UPDATE warehouses
       SET name = $1, address = $2, lat = $3, lng = $4, distance_km = $5
       WHERE warehouse_id = $6 RETURNING *`,
      [name, address || null, lat || null, lng || null, distance_km || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH toggle active
router.patch('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE warehouses SET is_active = NOT is_active
       WHERE warehouse_id = $1 RETURNING *`,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE warehouse
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM warehouses WHERE warehouse_id = $1', [req.params.id]);
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
