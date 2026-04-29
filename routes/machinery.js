const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================
// GET /api/machinery — list all machines
// Optional query: ?type=tractor or ?type=baler
// Optional query: ?ownership=owned or ?ownership=rented
// ============================================
router.get('/', async (req, res) => {
  try {
    const { type, ownership } = req.query;
    const conditions = ['m.is_active = TRUE'];
    const values = [];

    if (type) {
      values.push(type);
      conditions.push(`m.machine_type = $${values.length}`);
    }
    if (ownership) {
      values.push(ownership);
      conditions.push(`m.ownership_type = $${values.length}`);
    }

    const sql = `
      SELECT
        m.*,
        w.name AS warehouse_name
      FROM machinery m
      LEFT JOIN warehouses w ON m.warehouse_id = w.warehouse_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY m.machine_type, m.created_at DESC
    `;

    const result = await pool.query(sql, values);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/machinery error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// GET /api/machinery/:id — single machine
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, w.name AS warehouse_name
       FROM machinery m
       LEFT JOIN warehouses w ON m.warehouse_id = w.warehouse_id
       WHERE m.machine_id = $1 AND m.is_active = TRUE`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/machinery/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// POST /api/machinery — create new machine
// ============================================
router.post('/', async (req, res) => {
  try {
    const {
      machine_type,
      name,
      registration_no,
      ownership_type,
      owner_name,
      owner_phone,
      rent_amount,
      rent_unit,
      warehouse_id,
      status,
      notes
    } = req.body;

    // Basic validation
    if (!machine_type || !name || !ownership_type) {
      return res.status(400).json({
        error: 'machine_type, name, and ownership_type are required'
      });
    }
    if (!['tractor', 'baler'].includes(machine_type)) {
      return res.status(400).json({ error: 'Invalid machine_type' });
    }
    if (!['owned', 'rented'].includes(ownership_type)) {
      return res.status(400).json({ error: 'Invalid ownership_type' });
    }

    // For rented machines, owner_name and rent_amount are expected
    if (ownership_type === 'rented') {
      if (!owner_name) {
        return res.status(400).json({ error: 'owner_name is required for rented machines' });
      }
    }

    const result = await pool.query(
      `INSERT INTO machinery
        (machine_type, name, registration_no, ownership_type,
         owner_name, owner_phone, rent_amount, rent_unit,
         warehouse_id, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        machine_type,
        name,
        registration_no || null,
        ownership_type,
        ownership_type === 'rented' ? owner_name : null,
        ownership_type === 'rented' ? (owner_phone || null) : null,
        ownership_type === 'rented' ? (rent_amount || null) : null,
        ownership_type === 'rented' ? (rent_unit || null) : null,
        warehouse_id || null,
        status || 'active',
        notes || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/machinery error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// PUT /api/machinery/:id — update machine
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const {
      machine_type,
      name,
      registration_no,
      ownership_type,
      owner_name,
      owner_phone,
      rent_amount,
      rent_unit,
      warehouse_id,
      status,
      notes
    } = req.body;

    const result = await pool.query(
      `UPDATE machinery SET
        machine_type = COALESCE($1, machine_type),
        name = COALESCE($2, name),
        registration_no = $3,
        ownership_type = COALESCE($4, ownership_type),
        owner_name = $5,
        owner_phone = $6,
        rent_amount = $7,
        rent_unit = $8,
        warehouse_id = $9,
        status = COALESCE($10, status),
        notes = $11
       WHERE machine_id = $12 AND is_active = TRUE
       RETURNING *`,
      [
        machine_type,
        name,
        registration_no || null,
        ownership_type,
        ownership_type === 'rented' ? owner_name : null,
        ownership_type === 'rented' ? (owner_phone || null) : null,
        ownership_type === 'rented' ? (rent_amount || null) : null,
        ownership_type === 'rented' ? (rent_unit || null) : null,
        warehouse_id || null,
        status,
        notes || null,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/machinery/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// PATCH /api/machinery/:id/status — quick status toggle
// ============================================
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'maintenance', 'idle'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE machinery SET status = $1
       WHERE machine_id = $2 AND is_active = TRUE
       RETURNING *`,
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /api/machinery/:id/status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// PATCH /api/machinery/:id/location — refresh GPS location
// (Placeholder for future GPS integration. For now updates timestamp only
//  if lat/lng are passed. Returns current row.)
// ============================================
router.patch('/:id/location', async (req, res) => {
  try {
    const { current_lat, current_lng, current_location_label } = req.body;

    if (current_lat != null && current_lng != null) {
      const result = await pool.query(
        `UPDATE machinery SET
          current_lat = $1,
          current_lng = $2,
          current_location_label = $3,
          last_location_update_at = NOW()
         WHERE machine_id = $4 AND is_active = TRUE
         RETURNING *`,
        [current_lat, current_lng, current_location_label || null, req.params.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Machine not found' });
      }
      return res.json(result.rows[0]);
    }

    // No coords supplied — just return current row (acts as a "fetch latest" call)
    const result = await pool.query(
      `SELECT * FROM machinery WHERE machine_id = $1 AND is_active = TRUE`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /api/machinery/:id/location error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// DELETE /api/machinery/:id — soft delete
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE machinery SET is_active = FALSE
       WHERE machine_id = $1
       RETURNING machine_id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    res.json({ success: true, machine_id: result.rows[0].machine_id });
  } catch (err) {
    console.error('DELETE /api/machinery/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
