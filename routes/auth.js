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

// Get all users (agents + promoters) with full stats
router.get('/agents', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.user_id, u.full_name, u.username, u.phone, u.password, u.role, u.is_active, u.created_at,
        (SELECT COUNT(*) FROM farmers f WHERE f.added_by_user_id = u.user_id) as farmers_added,
        (SELECT COALESCE(SUM(f.total_acres), 0) FROM farmers f WHERE f.added_by_user_id = u.user_id) as total_acres,
        (SELECT COALESCE(SUM(p.straw_qty_kg), 0) / 1000
         FROM pickups p
         JOIN farmers f ON p.farmer_id = f.farmer_id
         WHERE f.added_by_user_id = u.user_id) as total_straw_tons
      FROM users u
      WHERE u.role IN ('agent', 'promoter')
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new user — role comes from request body (agent or promoter)
router.post('/agents', async (req, res) => {
  const { full_name, username, password, role, phone } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO users (full_name, username, password, role, phone)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [full_name, username, password, role || 'agent', phone || null]
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

// Edit user (update name, phone, username, password)
router.put('/agents/:id', async (req, res) => {
  const { full_name, username, password, role, phone } = req.body;
  try {
    // Build dynamic update — only update password if provided
    if (password) {
      const result = await pool.query(
        `UPDATE users SET full_name = $1, username = $2, password = $3, role = $4, phone = $5
         WHERE user_id = $6 RETURNING user_id, full_name, username, phone, role, is_active`,
        [full_name, username, password, role || 'agent', phone || null, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      res.json(result.rows[0]);
    } else {
      const result = await pool.query(
        `UPDATE users SET full_name = $1, username = $2, role = $3, phone = $4
         WHERE user_id = $5 RETURNING user_id, full_name, username, phone, role, is_active`,
        [full_name, username, role || 'agent', phone || null, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      res.json(result.rows[0]);
    }
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Toggle active/inactive
router.patch('/agents/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE users SET is_active = NOT is_active WHERE user_id = $1 RETURNING *`,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user — unlink farmers first to avoid foreign key error
router.delete('/agents/:id', async (req, res) => {
  try {
    await pool.query(
      'UPDATE farmers SET added_by_user_id = NULL, added_by_name = NULL WHERE added_by_user_id = $1',
      [req.params.id]
    );
    await pool.query('DELETE FROM users WHERE user_id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
