const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { ok, fail } = require('../utils/response');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /customers/me
router.get('/me', requireAuth, requireRole('customer'), async (req, res) => {
  const customer = await db.get('SELECT * FROM customers WHERE id = ?', [req.user.id]);
  if (!customer) return fail(res, 'NOT_FOUND', 'Customer not found', 404);
  return ok(res, customer);
});

// PATCH /customers/me — update profile/default address
router.patch('/me', requireAuth, requireRole('customer'), async (req, res) => {
  const { full_name, default_address, default_lat, default_lng } = req.body;
  await db.run(`
    UPDATE customers SET
      full_name = COALESCE(?, full_name),
      default_address = COALESCE(?, default_address),
      default_lat = COALESCE(?, default_lat),
      default_lng = COALESCE(?, default_lng)
    WHERE id = ?
  `, [full_name, default_address, default_lat, default_lng, req.user.id]);
  
  const updatedCustomer = await db.get('SELECT * FROM customers WHERE id = ?', [req.user.id]);
  return ok(res, updatedCustomer);
});

module.exports = router;
