const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { ok, fail } = require('../utils/response');
const { requireAuth, requireRole } = require('../middleware/auth');
const { haversineKm } = require('../utils/distance');

// POST /bookings — customer creates a booking
router.post('/', requireAuth, requireRole('customer'), async (req, res) => {
  const { skill_category, service_address, service_lat, service_lng, scheduled_time } = req.body;
  if (!skill_category || !service_address || !scheduled_time) {
    return fail(res, 'BAD_REQUEST', 'skill_category, service_address, scheduled_time required');
  }
  const fed = await db.get('SELECT id FROM federations LIMIT 1');
  const id = uuidv4();

  // simple auto-match: nearest approved worker in category, if location given
  let worker_id = null;
  let estimated_distance_km = null;
  if (service_lat && service_lng) {
    const candidates = await db.all(`
      SELECT * FROM workers WHERE skill_category = ? AND verification_status = 'approved'
      AND lat IS NOT NULL AND lng IS NOT NULL
    `, [skill_category]);
    const withDist = candidates
      .map(w => ({ ...w, d: haversineKm(service_lat, service_lng, w.lat, w.lng) }))
      .sort((a, b) => a.d - b.d);
    if (withDist[0]) {
      worker_id = withDist[0].id;
      estimated_distance_km = withDist[0].d;
    }
  }

  await db.run(`
    INSERT INTO bookings (id, customer_id, worker_id, federation_id, skill_category, service_address, service_lat, service_lng, scheduled_time, estimated_distance_km)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, req.user.id, worker_id, fed.id, skill_category, service_address, service_lat, service_lng, scheduled_time, estimated_distance_km]);

  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [id]);
  return ok(res, booking, 201);
});

// GET /bookings/:id
router.get('/:id', requireAuth, async (req, res) => {
  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) return fail(res, 'BOOKING_NOT_FOUND', 'Booking does not exist', 404);
  return ok(res, booking);
});

// GET /bookings/mine
router.get('/mine/list', requireAuth, async (req, res) => {
  const col = req.user.role === 'worker' ? 'worker_id' : 'customer_id';
  const rows = await db.all(`SELECT * FROM bookings WHERE ${col} = ? ORDER BY created_at DESC`, [req.user.id]);
  return ok(res, rows);
});

// PATCH /bookings/:id/accept — worker accepts
router.patch('/:id/accept', requireAuth, requireRole('worker'), async (req, res) => {
  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) return fail(res, 'BOOKING_NOT_FOUND', 'Booking does not exist', 404);
  if (booking.worker_id !== req.user.id) return fail(res, 'FORBIDDEN', 'Not your booking', 403);

  await db.run("UPDATE bookings SET status = 'accepted', updated_at = datetime('now') WHERE id = ?", [req.params.id]);
  const updatedBooking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  return ok(res, updatedBooking);
});

// PATCH /bookings/:id/reject — worker rejects, triggers re-match
router.patch('/:id/reject', requireAuth, requireRole('worker'), async (req, res) => {
  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) return fail(res, 'BOOKING_NOT_FOUND', 'Booking does not exist', 404);
  if (booking.worker_id !== req.user.id) return fail(res, 'FORBIDDEN', 'Not your booking', 403);

  // simple re-match: find next nearest approved worker excluding this one
  let newWorkerId = null;
  if (booking.service_lat && booking.service_lng) {
    const candidates = await db.all(`
      SELECT * FROM workers WHERE skill_category = ? AND verification_status = 'approved'
      AND lat IS NOT NULL AND lng IS NOT NULL AND id != ?
    `, [booking.skill_category, req.user.id]);
    const withDist = candidates
      .map(w => ({ ...w, d: haversineKm(booking.service_lat, booking.service_lng, w.lat, w.lng) }))
      .sort((a, b) => a.d - b.d);
    if (withDist[0]) newWorkerId = withDist[0].id;
  }

  await db.run(`
    UPDATE bookings SET status = 'requested', worker_id = ?, updated_at = datetime('now') WHERE id = ?
  `, [newWorkerId, req.params.id]);
  
  const updatedBooking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  return ok(res, updatedBooking);
});

// PATCH /bookings/:id/complete — requires both-side confirmation
router.patch('/:id/complete', requireAuth, async (req, res) => {
  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) return fail(res, 'BOOKING_NOT_FOUND', 'Booking does not exist', 404);

  const isCustomer = req.user.role === 'customer' && booking.customer_id === req.user.id;
  const isWorker = req.user.role === 'worker' && booking.worker_id === req.user.id;
  if (!isCustomer && !isWorker) return fail(res, 'FORBIDDEN', 'Not your booking', 403);

  const field = isCustomer ? 'completed_by_customer' : 'completed_by_worker';
  await db.run(`UPDATE bookings SET ${field} = 1, updated_at = datetime('now') WHERE id = ?`, [req.params.id]);

  let updated = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (updated.completed_by_customer && updated.completed_by_worker) {
    await db.run("UPDATE bookings SET status = 'completed', updated_at = datetime('now') WHERE id = ?", [req.params.id]);
    updated = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  }
  return ok(res, updated);
});

// PATCH /bookings/:id/cancel — before completion only
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) return fail(res, 'BOOKING_NOT_FOUND', 'Booking does not exist', 404);
  if (booking.status === 'completed') return fail(res, 'ALREADY_COMPLETED', 'Cannot cancel a completed booking', 400);

  await db.run("UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?", [req.params.id]);
  const updatedBooking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  return ok(res, updatedBooking);
});

module.exports = router;
