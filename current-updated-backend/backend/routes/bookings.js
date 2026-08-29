const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { ok, fail } = require('../utils/response');
const { requireAuth, requireRole } = require('../middleware/auth');
const { haversineKm } = require('../utils/distance');
const trackingService = require('../services/trackingService');
const emergencyService = require('../services/emergencyService');
const smsService = require('../services/smsService');

// POST /bookings/emergency — customer creates an on-demand emergency booking
router.post('/emergency', requireAuth, requireRole('customer'), async (req, res) => {
  const { skill_category, service_address, service_lat, service_lng, emergency_fee, timeout_seconds, federation_id } = req.body;
  if (!skill_category || !service_address || !service_lat || !service_lng) {
    return fail(res, 'BAD_REQUEST', 'skill_category, service_address, service_lat, service_lng are required for emergency booking');
  }

  // Anti-spam rate limiting
  try {
    emergencyService.checkCustomerSpam(req.user.id);
  } catch (err) {
    return fail(res, err.code || 'RATE_LIMITED', err.message, err.statusCode || 429);
  }

  // Safe Federation Resolution
  let bookingFederationId = federation_id || null;
  if (bookingFederationId) {
    const fed = await db.get('SELECT id FROM federations WHERE id = ?', [bookingFederationId]);
    if (!fed) bookingFederationId = null;
  }

  if (!bookingFederationId) {
    // Check nearest approved worker to infer local federation
    const candidates = await db.all(`
      SELECT federation_id, lat, lng FROM workers
      WHERE skill_category = ? AND verification_status = 'approved' AND lat IS NOT NULL AND lng IS NOT NULL
    `, [skill_category]);

    if (candidates.length > 0) {
      const sorted = candidates
        .map(w => ({ ...w, d: haversineKm(service_lat, service_lng, w.lat, w.lng) }))
        .sort((a, b) => a.d - b.d);
      bookingFederationId = sorted[0].federation_id;
    }
  }

  if (!bookingFederationId) {
    const fallbackFed = await db.get('SELECT id FROM federations ORDER BY created_at ASC LIMIT 1');
    bookingFederationId = fallbackFed ? fallbackFed.id : null;
  }

  const id = uuidv4();
  const shortCode = smsService.generateShortCode();
  const timeoutSec = Number(timeout_seconds) || 60;
  const fee = (emergency_fee !== undefined && !isNaN(Number(emergency_fee))) ? Number(emergency_fee) : 50.0;

  await db.run(`
    INSERT INTO bookings (
      id, customer_id, federation_id, skill_category, service_address, service_lat, service_lng,
      scheduled_time, is_emergency, emergency_timeout_seconds, emergency_fee, status, rejected_worker_ids, short_code
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'immediate', 1, ?, ?, 'requested', '[]', ?)
  `, [id, req.user.id, bookingFederationId, skill_category, service_address, service_lat, service_lng, timeoutSec, fee, shortCode]);

  // Dispatch immediately to closest eligible candidate
  const dispatchResult = await emergencyService.dispatchEmergencyBooking(id, timeoutSec);
  const updatedBooking = await db.get('SELECT * FROM bookings WHERE id = ?', [id]);

  // Trigger outbound SMS offer to assigned candidate
  if (dispatchResult && dispatchResult.worker && dispatchResult.worker.phone) {
    await smsService.sendSms({
      to: dispatchResult.worker.phone,
      message: `EMERGENCY GIG: ${skill_category.toUpperCase()} needed at ${service_address} (${dispatchResult.worker.distance_km}km). Pay: Rs ${fee}. Reply ACCEPT ${shortCode} within ${timeoutSec}s or REJECT ${shortCode}`,
      bookingId: id,
      workerId: dispatchResult.worker.id,
      federationId: bookingFederationId,
      command: 'OFFER',
    });
  }

  return ok(res, {
    booking: updatedBooking,
    dispatch: dispatchResult,
  }, 201);
});

// POST /bookings — customer creates a booking
router.post('/', requireAuth, requireRole('customer'), async (req, res) => {
  const { skill_category, service_address, service_lat, service_lng, scheduled_time, federation_id } = req.body;
  if (!skill_category || !service_address || !scheduled_time) {
    return fail(res, 'BAD_REQUEST', 'skill_category, service_address, scheduled_time required');
  }
  const id = uuidv4();
  const shortCode = smsService.generateShortCode();

  // simple auto-match: nearest approved worker in category, if location given
  let worker_id = null;
  let estimated_distance_km = null;
  let bookingFederationId = federation_id || null;

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
      // Inherit worker's federation for consistent tenant accountability
      bookingFederationId = withDist[0].federation_id;
    }
  }

  // Fallback to designated federation if none matched from worker
  if (!bookingFederationId) {
    const fallbackFed = await db.get('SELECT id FROM federations ORDER BY created_at ASC LIMIT 1');
    bookingFederationId = fallbackFed ? fallbackFed.id : null;
  }

  await db.run(`
    INSERT INTO bookings (id, customer_id, worker_id, federation_id, skill_category, service_address, service_lat, service_lng, scheduled_time, estimated_distance_km, short_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, req.user.id, worker_id, bookingFederationId, skill_category, service_address, service_lat, service_lng, scheduled_time, estimated_distance_km, shortCode]);

  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [id]);

  // Outbound SMS notification to matched candidate worker
  if (worker_id) {
    const worker = await db.get('SELECT phone FROM workers WHERE id = ?', [worker_id]);
    if (worker && worker.phone) {
      await smsService.sendSms({
        to: worker.phone,
        message: `NEW GIG OFFER: ${skill_category.toUpperCase()} at ${service_address} (${scheduled_time}). Reply ACCEPT ${shortCode} or REJECT ${shortCode}`,
        bookingId: id,
        workerId: worker_id,
        federationId: bookingFederationId,
        command: 'OFFER',
      });
    }
  }

  return ok(res, booking, 201);
});

// GET /bookings/:id
router.get('/:id', requireAuth, async (req, res) => {
  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) return fail(res, 'BOOKING_NOT_FOUND', 'Booking does not exist', 404);

  // Tenant scoping & role-based access control
  if (req.user.role === 'admin' && booking.federation_id !== req.user.federation_id) {
    return fail(res, 'BOOKING_NOT_FOUND', 'Booking does not exist in your federation', 404);
  }
  if (req.user.role === 'customer' && booking.customer_id !== req.user.id) {
    return fail(res, 'FORBIDDEN', 'Not authorized to view this booking', 403);
  }
  if (req.user.role === 'worker' && booking.worker_id !== req.user.id) {
    return fail(res, 'FORBIDDEN', 'Not authorized to view this booking', 403);
  }

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

  if (booking.is_emergency) {
    try {
      const updatedBooking = await emergencyService.handleEmergencyAcceptance(req.params.id, req.user.id);
      return ok(res, updatedBooking);
    } catch (err) {
      return fail(res, err.code || 'ACCEPT_ERROR', err.message, err.statusCode || 400);
    }
  }

  await db.run("UPDATE bookings SET status = 'accepted', updated_at = datetime('now') WHERE id = ?", [req.params.id]);
  const updatedBooking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  trackingService.initTrackingSession(updatedBooking);
  return ok(res, updatedBooking);
});

// PATCH /bookings/:id/reject — worker rejects, triggers re-match
router.patch('/:id/reject', requireAuth, requireRole('worker'), async (req, res) => {
  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) return fail(res, 'BOOKING_NOT_FOUND', 'Booking does not exist', 404);
  if (booking.worker_id !== req.user.id) return fail(res, 'FORBIDDEN', 'Not your booking', 403);

  if (booking.is_emergency) {
    try {
      const dispatchResult = await emergencyService.handleEmergencyRejection(req.params.id, req.user.id);
      const updatedBooking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
      return ok(res, { booking: updatedBooking, dispatch: dispatchResult });
    } catch (err) {
      return fail(res, err.code || 'REJECT_ERROR', err.message, err.statusCode || 400);
    }
  }

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
    await db.run("UPDATE bookings SET status = 'completed', tracking_active = 0, updated_at = datetime('now') WHERE id = ?", [req.params.id]);
    trackingService.teardownTrackingSession(req.params.id);
    emergencyService.clearEmergencyTimer(req.params.id);
    updated = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  }
  return ok(res, updated);
});

// PATCH /bookings/:id/cancel — before completion only
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) return fail(res, 'BOOKING_NOT_FOUND', 'Booking does not exist', 404);
  if (booking.status === 'completed') return fail(res, 'ALREADY_COMPLETED', 'Cannot cancel a completed booking', 400);

  await db.run("UPDATE bookings SET status = 'cancelled', tracking_active = 0, updated_at = datetime('now') WHERE id = ?", [req.params.id]);
  trackingService.teardownTrackingSession(req.params.id);
  emergencyService.clearEmergencyTimer(req.params.id);
  const updatedBooking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  return ok(res, updatedBooking);
});

module.exports = router;
