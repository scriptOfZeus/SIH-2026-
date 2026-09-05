const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { ok, fail } = require('../utils/response');
const { requestOtp, verifyOtp } = require('../utils/otp');
const { sign } = require('../middleware/auth');

// Helper to find worker across phone format variants
async function findWorkerByPhone(phone) {
  if (!phone) return null;
  const clean = phone.toString().replace(/[\s-]/g, '');
  const digits = clean.replace(/\D/g, '');
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  const variants = [
    clean,
    `+91${last10}`,
    `91${last10}`,
    last10,
    `+${digits}`,
    `+91 ${last10}`,
  ];

  for (const v of variants) {
    const w = await db.get('SELECT * FROM workers WHERE phone = ?', [v]);
    if (w) return w;
  }

  if (last10.length === 10) {
    const w = await db.get('SELECT * FROM workers WHERE phone LIKE ?', [`%${last10}%`]);
    if (w) return w;
  }

  return null;
}

// Helper to find customer across phone format variants
async function findCustomerByPhone(phone) {
  if (!phone) return null;
  const clean = phone.toString().replace(/[\s-]/g, '');
  const digits = clean.replace(/\D/g, '');
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  const variants = [
    clean,
    `+91${last10}`,
    `91${last10}`,
    last10,
    `+${digits}`,
    `+91 ${last10}`,
  ];

  for (const v of variants) {
    const c = await db.get('SELECT * FROM customers WHERE phone = ?', [v]);
    if (c) return c;
  }

  if (last10.length === 10) {
    const c = await db.get('SELECT * FROM customers WHERE phone LIKE ?', [`%${last10}%`]);
    if (c) return c;
  }

  return null;
}

// POST /auth/otp/request
router.post('/otp/request', async (req, res) => {
  try {
    const { phone } = req.body;
    const role = (req.body.path === 'independent' || req.body.role === 'independent_worker') ? 'independent_worker' : req.body.role;
    if (!phone || !role) return fail(res, 'BAD_REQUEST', 'phone and role/path are required');

    // Path A: Federation Worker Login (must be pre-registered by Federation Admin)
    if (role === 'worker') {
      const worker = await findWorkerByPhone(phone);
      if (!worker) {
        return fail(res, 'UNKNOWN_NUMBER', 'Your number is not registered by a federation. Please contact your Federation Admin.', 404);
      }

      // If worker belongs to a federation, verify federation is active
      if (worker.federation_id) {
        const fed = await db.get('SELECT status FROM federations WHERE id = ?', [worker.federation_id]);
        if (fed && fed.status === 'inactive') {
          return fail(res, 'INACTIVE_FEDERATION', 'Your federation is currently inactive. Please contact support.', 403);
        }
      }
    }

    // Path B: Independent Worker Registration / Login
    if (role === 'independent_worker') {
      const existingWorker = await findWorkerByPhone(phone);
      if (existingWorker && existingWorker.worker_type === 'federation') {
        return fail(res, 'DUPLICATE_ACCOUNT', 'This mobile number is already registered under a Federation. Please use Federation Worker login.', 409);
      }
    }

    requestOtp(phone);
    return ok(res, { message: 'OTP sent (check server console in dev mode)' });
  } catch (err) {
    console.error('Error in /auth/otp/request:', err);
    return fail(res, 'INTERNAL_ERROR', err.message, 500);
  }
});

// POST /auth/otp/verify
router.post('/otp/verify', async (req, res) => {
  try {
    const { phone } = req.body;
    const code = req.body.code || req.body.otp;
    const role = (req.body.path === 'independent' || req.body.role === 'independent_worker') ? 'independent_worker' : req.body.role;

    if (!phone || !code || !role) return fail(res, 'BAD_REQUEST', 'phone, code/otp, role required');

    if (!verifyOtp(phone, code)) {
      return fail(res, 'INVALID_OTP', 'OTP is incorrect or expired', 401);
    }

    // Path A: Federation Worker Login
    if (role === 'worker') {
      let worker = await findWorkerByPhone(phone);
      if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found. Your number is not registered by a federation. Please contact your Federation Admin.', 404);
      if (!worker.account_activated) {
        await db.run('UPDATE workers SET account_activated = 1 WHERE id = ?', [worker.id]);
        worker = await db.get('SELECT * FROM workers WHERE id = ?', [worker.id]);
      }
      const token = sign({
        id: worker.id,
        role: 'worker',
        worker_type: worker.worker_type || 'federation',
        phone: worker.phone || phone,
        federation_id: worker.federation_id,
      });
      return ok(res, {
        token,
        worker,
        is_new: false,
        is_independent: false,
        profile_completed: true,
      });
    }

    // Path B: Independent Worker Registration / Login
    if (role === 'independent_worker') {
      let worker = await findWorkerByPhone(phone);
      if (worker && worker.worker_type === 'federation') {
        return fail(res, 'DUPLICATE_ACCOUNT', 'This mobile number is already registered under a Federation.', 409);
      }

      const isNew = !worker || worker.full_name === 'Independent Partner' || worker.skill_category === 'general';

      if (!worker) {
        const id = uuidv4();
        await db.run(`
          INSERT INTO workers (id, federation_id, full_name, phone, skill_category, worker_type, verification_status, final_verification_status, account_activated)
          VALUES (?, NULL, 'Independent Partner', ?, 'general', 'independent', 'pending', 'pending', 1)
        `, [id, phone]);
        worker = await db.get('SELECT * FROM workers WHERE id = ?', [id]);
      } else if (!worker.account_activated) {
        await db.run('UPDATE workers SET account_activated = 1 WHERE id = ?', [worker.id]);
        worker = await db.get('SELECT * FROM workers WHERE id = ?', [worker.id]);
      }

      const token = sign({
        id: worker.id,
        role: 'worker',
        worker_type: 'independent',
        phone: worker.phone || phone,
        federation_id: null,
      });
      return ok(res, {
        token,
        worker,
        is_new: isNew,
        is_independent: true,
        profile_completed: !isNew,
      });
    }

    // Customer Login
    if (role === 'customer') {
      let customer = await findCustomerByPhone(phone);
      if (!customer) {
        const id = uuidv4();
        await db.run('INSERT INTO customers (id, phone) VALUES (?, ?)', [id, phone]);
        customer = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
      }
      const token = sign({ id: customer.id, role: 'customer', phone: customer.phone || phone });
      return ok(res, { token, customer });
    }

    return fail(res, 'BAD_REQUEST', 'role must be worker, independent_worker, or customer');
  } catch (err) {
    console.error('Error in /auth/otp/verify:', err);
    return fail(res, 'INTERNAL_ERROR', err.message, 500);
  }
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

  const role = admin.role || (admin.federation_id ? 'federation_admin' : 'supervising_admin');
  const token = sign({
    id: admin.id,
    role: role,
    federation_id: admin.federation_id || null,
  });

  return ok(res, {
    token,
    admin: {
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      role: role,
      federation_id: admin.federation_id || null,
    },
  });
});

module.exports = router;
