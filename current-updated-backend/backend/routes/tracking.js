/**
 * Live GPS Tracking REST & Streaming Routes
 *
 * Provides:
 *  - Customer tracking consent registration
 *  - Worker GPS location update ingestion
 *  - Latest tracking telemetry retrieval
 *  - Server-Sent Events (SSE) live streaming
 */

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { ok, fail } = require('../utils/response');
const { requireAuth, requireRole } = require('../middleware/auth');
const trackingService = require('../services/trackingService');

// POST /bookings/:id/consent-tracking — Customer grants tracking consent
router.post('/bookings/:id/consent-tracking', requireAuth, requireRole('customer'), async (req, res) => {
  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) {
    return fail(res, 'BOOKING_NOT_FOUND', 'Booking does not exist', 404);
  }

  // Ownership check
  if (booking.customer_id !== req.user.id) {
    return fail(res, 'FORBIDDEN', 'Not authorized to manage this booking', 403);
  }

  // Active status check
  if (booking.status !== 'accepted') {
    return fail(res, 'BOOKING_NOT_ACTIVE', `Cannot grant tracking consent for booking with status '${booking.status}'`, 400);
  }

  await db.run(`
    UPDATE bookings SET
      tracking_consent_given = 1,
      tracking_consent_at = CURRENT_TIMESTAMP,
      tracking_active = 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [booking.id]);

  const updatedBooking = await db.get('SELECT * FROM bookings WHERE id = ?', [booking.id]);
  trackingService.initTrackingSession(updatedBooking);

  return ok(res, {
    booking_id: updatedBooking.id,
    tracking_consent_given: 1,
    tracking_consent_at: updatedBooking.tracking_consent_at,
    tracking_active: 1,
    status: updatedBooking.status,
  });
});

// POST /bookings/:id/location — Assigned worker transmits GPS coordinate update
router.post('/bookings/:id/location', requireAuth, requireRole('worker'), async (req, res) => {
  const { lat, lng, heading, speed_kmh } = req.body;
  if (lat === undefined || lng === undefined) {
    return fail(res, 'BAD_REQUEST', 'lat and lng coordinates are required');
  }

  try {
    const payload = await trackingService.recordLocationUpdate(req.params.id, req.user.id, {
      lat,
      lng,
      heading,
      speed_kmh,
    });
    return ok(res, payload);
  } catch (err) {
    return fail(res, err.code || 'TRACKING_ERROR', err.message, err.statusCode || 400);
  }
});

// GET /bookings/:id/tracking — Query current tracking status and latest coordinates
router.get('/bookings/:id/tracking', requireAuth, async (req, res) => {
  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) {
    return fail(res, 'BOOKING_NOT_FOUND', 'Booking does not exist', 404);
  }

  // Role & Tenant Authorization
  if (req.user.role === 'admin') {
    if (booking.federation_id !== req.user.federation_id) {
      return fail(res, 'BOOKING_NOT_FOUND', 'Booking does not exist in your federation', 404);
    }
  } else if (req.user.role === 'customer') {
    if (booking.customer_id !== req.user.id) {
      return fail(res, 'FORBIDDEN', 'Not authorized to view tracking for this booking', 403);
    }
  } else if (req.user.role === 'worker') {
    if (booking.worker_id !== req.user.id) {
      return fail(res, 'FORBIDDEN', 'Worker not assigned to this booking', 403);
    }
  } else {
    return fail(res, 'FORBIDDEN', 'Unauthorized role', 403);
  }

  // Active status check
  if (booking.status !== 'accepted') {
    return fail(res, 'BOOKING_NOT_ACTIVE', `Tracking is inactive for booking with status '${booking.status}'`, 400);
  }

  // Consent verification for customers
  if (req.user.role === 'customer' && !booking.tracking_consent_given) {
    return fail(res, 'CONSENT_REQUIRED', 'Customer tracking consent must be recorded before location tracking can be accessed', 403);
  }

  const session = trackingService.getTrackingSession(booking.id);

  return ok(res, {
    booking_id: booking.id,
    status: booking.status,
    tracking_active: booking.tracking_active,
    tracking_consent_given: booking.tracking_consent_given,
    destination: {
      address: booking.service_address,
      lat: booking.service_lat,
      lng: booking.service_lng,
    },
    latest_location: session?.latest_location || (booking.worker_id ? {
      lat: null,
      lng: null,
      message: 'Worker has not transmitted initial coordinates yet',
    } : null),
  });
});

// GET /bookings/:id/track-stream — Server-Sent Events (SSE) live location stream
router.get('/bookings/:id/track-stream', requireAuth, async (req, res) => {
  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) {
    return fail(res, 'BOOKING_NOT_FOUND', 'Booking does not exist', 404);
  }

  // Authorization Check
  if (req.user.role === 'customer') {
    if (booking.customer_id !== req.user.id) {
      return fail(res, 'FORBIDDEN', 'Not your booking', 403);
    }
  } else if (req.user.role === 'admin') {
    if (booking.federation_id !== req.user.federation_id) {
      return fail(res, 'BOOKING_NOT_FOUND', 'Cross-federation access denied', 404);
    }
  } else if (req.user.role === 'worker') {
    if (booking.worker_id !== req.user.id) {
      return fail(res, 'FORBIDDEN', 'Not assigned worker', 403);
    }
  }

  if (booking.status !== 'accepted') {
    return fail(res, 'BOOKING_NOT_ACTIVE', 'Tracking stream only available during active booking', 400);
  }

  // Consent verification for customers
  if (req.user.role === 'customer' && !booking.tracking_consent_given) {
    return fail(res, 'CONSENT_REQUIRED', 'Customer tracking consent required', 403);
  }

  let session = trackingService.getTrackingSession(booking.id);
  if (!session) {
    session = trackingService.initTrackingSession(booking);
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Initial event
  res.write(`event: initial_state\ndata: ${JSON.stringify({
    booking_id: booking.id,
    latest_location: session.latest_location,
  })}\n\n`);

  session.listeners.add(res);

  req.on('close', () => {
    session.listeners.delete(res);
  });
});

module.exports = router;
