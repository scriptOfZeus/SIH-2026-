const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { ok, fail } = require('../utils/response');
const { requireAuth, requireRole } = require('../middleware/auth');
const { haversineKm } = require('../utils/distance');

// POST /admin/workers — Admin only — create worker record
router.post('/admin/workers', requireAuth, requireRole('admin'), async (req, res) => {
  const { full_name, phone, skill_category, skill_certificate_number } = req.body;
  if (!full_name || !phone || !skill_category || !skill_certificate_number) {
    return fail(res, 'BAD_REQUEST', 'full_name, phone, skill_category, skill_certificate_number required');
  }
  const existing = await db.get('SELECT id FROM workers WHERE phone = ?', [phone]);
  if (existing) return fail(res, 'DUPLICATE_PHONE', 'A worker with this phone already exists', 409);

  const id = uuidv4();
  const fed = await db.get('SELECT id FROM federations LIMIT 1');
  await db.run(`
    INSERT INTO workers (id, federation_id, added_by_admin_id, full_name, phone, skill_category, skill_certificate_number)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [id, fed.id, req.user.id, full_name, phone, skill_category, skill_certificate_number]);

  const worker = await db.get('SELECT * FROM workers WHERE id = ?', [id]);
  return ok(res, worker, 201);
});

// PATCH /admin/workers/:id/verify-certificate — Admin only
router.patch('/admin/workers/:id/verify-certificate', requireAuth, requireRole('admin'), async (req, res) => {
  const worker = await db.get('SELECT * FROM workers WHERE id = ?', [req.params.id]);
  if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found', 404);

  await db.run(`
    UPDATE workers SET skill_certificate_verified = 1, skill_certificate_verified_at = datetime('now')
    WHERE id = ?
  `, [req.params.id]);

  const updatedWorker = await db.get('SELECT * FROM workers WHERE id = ?', [req.params.id]);
  return ok(res, updatedWorker);
});

// PATCH /admin/workers/:id/verify — Admin only — approve/reject (blocked until cert verified)
router.patch('/admin/workers/:id/verify', requireAuth, requireRole('admin'), async (req, res) => {
  const { decision } = req.body; // 'approved' | 'rejected'
  if (!['approved', 'rejected'].includes(decision)) {
    return fail(res, 'BAD_REQUEST', 'decision must be approved or rejected');
  }
  const worker = await db.get('SELECT * FROM workers WHERE id = ?', [req.params.id]);
  if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found', 404);

  if (decision === 'approved' && !worker.skill_certificate_verified) {
    return fail(res, 'CERT_NOT_VERIFIED', 'Cannot approve before certificate is verified', 400);
  }

  await db.run('UPDATE workers SET verification_status = ? WHERE id = ?', [decision, req.params.id]);
  const updatedWorker = await db.get('SELECT * FROM workers WHERE id = ?', [req.params.id]);
  return ok(res, updatedWorker);
});

// GET /workers/me — worker's own profile
router.get('/workers/me', requireAuth, requireRole('worker'), async (req, res) => {
  const worker = await db.get('SELECT * FROM workers WHERE id = ?', [req.user.id]);
  if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found', 404);
  return ok(res, worker);
});

// PATCH /workers/me — worker updates own location only
router.patch('/workers/me', requireAuth, requireRole('worker'), async (req, res) => {
  const { lat, lng } = req.body;
  if (lat === undefined || lng === undefined) return fail(res, 'BAD_REQUEST', 'lat and lng required');
  await db.run('UPDATE workers SET lat = ?, lng = ? WHERE id = ?', [lat, lng, req.user.id]);
  const updatedWorker = await db.get('SELECT * FROM workers WHERE id = ?', [req.user.id]);
  return ok(res, updatedWorker);
});

// GET /workers/nearby?lat=&lng=&skill_category=&radius_km=
router.get('/workers/nearby', async (req, res) => {
  const { lat, lng, skill_category, radius_km } = req.query;
  if (!lat || !lng || !skill_category || !radius_km) {
    return fail(res, 'BAD_REQUEST', 'lat, lng, skill_category, radius_km are required');
  }
  const candidates = await db.all(`
    SELECT * FROM workers
    WHERE skill_category = ? AND verification_status = 'approved' AND lat IS NOT NULL AND lng IS NOT NULL
  `, [skill_category]);

  const nearby = candidates
    .map(w => ({ ...w, distance_km: haversineKm(+lat, +lng, w.lat, w.lng) }))
    .filter(w => w.distance_km <= +radius_km)
    .sort((a, b) => a.distance_km - b.distance_km);

  return ok(res, nearby);
});

// GET /admin/workers — list all, filter by verification_status
router.get('/admin/workers', requireAuth, requireRole('admin'), async (req, res) => {
  const { verification_status } = req.query;
  const rows = verification_status
    ? await db.all('SELECT * FROM workers WHERE verification_status = ?', [verification_status])
    : await db.all('SELECT * FROM workers');
  return ok(res, rows);
});

module.exports = router;
