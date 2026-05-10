const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// Auto-create table on boot
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS business_rules (
      id         INTEGER PRIMARY KEY DEFAULT 1,
      settings   JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      updated_by VARCHAR(255)
    )
  `);
}
ensureTable().catch(console.error);

// GET /api/business-rules
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM business_rules WHERE id = 1');
    if (result.rows.length === 0) return res.json(null);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET business-rules error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/business-rules
router.post('/', async (req, res) => {
  try {
    const { settings, updated_by } = req.body;
    if (!settings) return res.status(400).json({ error: 'settings required' });

    const result = await pool.query(`
      INSERT INTO business_rules (id, settings, updated_at, updated_by)
      VALUES (1, $1, NOW(), $2)
      ON CONFLICT (id) DO UPDATE
        SET settings   = EXCLUDED.settings,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
      RETURNING *
    `, [JSON.stringify(settings), updated_by || null]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('POST business-rules error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
