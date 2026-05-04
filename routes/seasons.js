const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all seasons for a farmer
router.get('/:farmer_id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM harvest_seasons WHERE farmer_id = $1',
      [req.params.farmer_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a season for a farmer
router.post('/', async (req, res) => {
  const { farmer_id, season_name, month_start, month_end, expected_straw_kg } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO harvest_seasons (farmer_id, season_name, month_start, month_end, expected_straw_kg)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [farmer_id, season_name, month_start, month_end, expected_straw_kg]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update season fields (season_name, month_start, month_end, expected_straw_kg)
router.patch('/:season_id', async (req, res) => {
  const { expected_straw_kg, season_name, month_start, month_end } = req.body;
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    if (expected_straw_kg !== undefined) { fields.push(`expected_straw_kg = $${idx++}`); values.push(expected_straw_kg); }
    if (season_name       !== undefined) { fields.push(`season_name = $${idx++}`);       values.push(season_name); }
    if (month_start       !== undefined) { fields.push(`month_start = $${idx++}`);       values.push(month_start); }
    if (month_end         !== undefined) { fields.push(`month_end = $${idx++}`);         values.push(month_end); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(req.params.season_id);
    const result = await pool.query(
      `UPDATE harvest_seasons SET ${fields.join(', ')} WHERE season_id = $${idx} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Season not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a season
router.delete('/:season_id', async (req, res) => {
  try {
    await pool.query('DELETE FROM harvest_seasons WHERE season_id = $1', [req.params.season_id]);
    res.json({ message: 'Season deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
