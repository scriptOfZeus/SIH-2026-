const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/database');
const { ok, fail } = require('../utils/response');
const { requestOtp, verifyOtp } = require('../utils/otp');
const { sign } = require('../middleware/auth');

// POST /auth/otp/request
// Worker phone must already exist on an admin-created record (per API-Spec-V1.md)
router.post('/otp/request', async (req, res) => {
  const { phone, role } = req.body; // role: 'worker' | 'customer'
  if (!phone || !role) return fail(res, 'BAD_REQUEST', 'phone and role are required');

  if (role === 'worker') {
    const worker = await db.get('SELECT id FROM workers WHERE phone = ?', [phone]);
    if (!worker) {
      return fail(res, 'UNKNOWN_NUMBER', 'This phone is not registered by any admin', 404);
    }
  }
  requestOtp(phone);
  return ok(res, { message: 'OTP sent (check server console in dev mode)' });
});

// POST /auth/otp/verify
router.post('/otp/verify', async (req, res) => {
  const { phone, code, role } = req.body;
  if (!phone || !code || !role) return fail(res, 'BAD_REQUEST', 'phone, code, role required');

  if (!verifyOtp(phone, code)) {
    return fail(res, 'INVALID_OTP', 'OTP is incorrect or expired', 401);
  }

  if (role === 'worker') {
    let worker = await db.get('SELECT * FROM workers WHERE phone = ?', [phone]);
    if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found', 404);
    if (!worker.account_activated) {
      await db.run('UPDATE workers SET account_activated = 1 WHERE id = ?', [worker.id]);
      worker = await db.get('SELECT * FROM workers WHERE id = ?', [worker.id]);
    }
    const token = sign({ id: worker.id, role: 'worker', phone });
    return ok(res, { token, worker });
  }

  if (role === 'customer') {
    let customer = await db.get('SELECT * FROM customers WHERE phone = ?', [phone]);
    if (!customer) {
      // first-time customer: create a bare record, they fill profile via /customers/me
      const { v4: uuidv4 } = require('uuid');
      const id = uuidv4();
      await db.run('INSERT INTO customers (id, phone) VALUES (?, ?)', [id, phone]);
      customer = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
    }
    const token = sign({ id: customer.id, role: 'customer', phone });
    return ok(res, { token, customer });
  }

  return fail(res, 'BAD_REQUEST', 'role must be worker or customer');
});

// POST /auth/admin/login
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return fail(res, 'BAD_REQUEST', 'email and password required');

  const admin = await db.get('SELECT * FROM admins WHERE email = ?', [email]);
  if (!admin) return fail(res, 'INVALID_CREDENTIALS', 'No such admin', 401);

  const hash = crypto.createHash('sha256').update(password).digest('hex');
  if (hash !== admin.password_hash) {
    return fail(res, 'INVALID_CREDENTIALS', 'Wrong password', 401);
  }

  const token = sign({ id: admin.id, role: 'admin', federation_id: admin.federation_id });
  return ok(res, { token, admin: { id: admin.id, email: admin.email, full_name: admin.full_name } });
});

module.exports = router;
