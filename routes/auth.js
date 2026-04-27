const express = require('express');
const router = express.Router();
const pool = require('../db');

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND password = $2 AND is_active = true',
      [username, password]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const user = result.rows[0];
    res.json({
      success: true,
      user_id:   user.user_id,
      full_name: user.full_name,
      username:  user.username,
      role:      user.role
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all agents with full stats
router.get('/agents', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.user_id, u.full_name, u.username, u.role, u.is_active, u.created_at,
        COUNT(DISTINCT f.farmer_id) as farmers_added,
        COALESCE(SUM(f.total_acres), 0) as total_acres,
        COALESCE(SUM(p.straw_qty_kg) / 1000, 0) as total_straw_tons
      FROM users u
      LEFT JOIN farmers f ON f.added_by_user_id = u.user_id
      LEFT JOIN pickups p ON p.farmer_id = f.farmer_id
      WHERE u.role = 'agent'
      GROUP BY u.user_id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new agent
router.post('/agents', async (req, res) => {
  const { full_name, username, password } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO users (full_name, username, password, role)
       VALUES ($1, $2, $3, 'agent') RETURNING *`,
      [full_name, username, password]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Toggle agent active/inactive
router.patch('/agents/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE users SET is_active = NOT is_active 
       WHERE user_id = $1 RETURNING *`,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete agent — unlink farmers first to avoid foreign key error
router.delete('/agents/:id', async (req, res) => {
  try {
    await pool.query(
      'UPDATE farmers SET added_by_user_id = NULL, added_by_name = NULL WHERE added_by_user_id = $1',
      [req.params.id]
    );
    await pool.query('DELETE FROM users WHERE user_id = $1', [req.params.id]);
    res.json({ message: 'Agent deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
