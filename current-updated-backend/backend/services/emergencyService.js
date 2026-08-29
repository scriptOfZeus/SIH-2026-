/**
 * Emergency / On-Demand Booking Dispatch Engine (V2 Feature #2)
 *
 * Implements:
 *  - High-priority candidate discovery (same federation, approved, non-busy, un-rejected)
 *  - Nearest worker ranking via Haversine distance
 *  - Configurable acceptance timer (default 60s, configurable in tests)
 *  - In-memory per-booking concurrency lock / mutex
 *  - Automatic multi-hop reassignment on worker rejection or timeout
 *  - Automatic exhaustion handling ('unassigned' status when candidates run out)
 *  - Realtime Socket.IO notifications
 */

const db = require('../db/database');
const { haversineKm } = require('../utils/distance');
const trackingService = require('./trackingService');

class EmergencyError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

// In-memory per-booking dispatch lock to prevent race conditions
const dispatchLocks = new Set();

// In-memory active emergency acceptance timers: Map<bookingId, { timer, workerId, expiresAt, timeoutSeconds }>
const activeTimers = new Map();

// Anti-spam customer lock: Map<customerId, timestamp>
const customerLastEmergencyTime = new Map();
const CUSTOMER_SPAM_COOLDOWN_MS = 5000; // 5s minimum between emergency bookings from same customer

/**
 * Checks and prevents rapid-fire emergency spam from same customer.
 */
function checkCustomerSpam(customerId) {
  const lastTime = customerLastEmergencyTime.get(customerId);
  const now = Date.now();
  if (lastTime && (now - lastTime) < CUSTOMER_SPAM_COOLDOWN_MS) {
    const waitSec = Math.ceil((CUSTOMER_SPAM_COOLDOWN_MS - (now - lastTime)) / 1000);
    throw new EmergencyError(`Emergency booking rate limit. Please wait ${waitSec}s before submitting another emergency request.`, 'RATE_LIMITED', 429);
  }
  customerLastEmergencyTime.set(customerId, now);
}

/**
 * Candidate Discovery:
 * Finds the nearest approved worker who:
 * 1. Matches skill_category
 * 2. Matches federation_id (Strict tenant isolation)
 * 3. Is approved and has coordinates
 * 4. Is NOT currently engaged in an active accepted booking
 * 5. Has NOT already timed out or rejected this specific booking
 */
async function findNextEmergencyWorker({ serviceLat, serviceLng, skillCategory, federationId, rejectedWorkerIds = [] }) {
  if (!serviceLat || !serviceLng || !skillCategory || !federationId) {
    return null;
  }

  // Query approved, non-busy workers within the exact same federation
  const candidates = await db.all(`
    SELECT * FROM workers
    WHERE skill_category = ?
      AND federation_id = ?
      AND verification_status = 'approved'
      AND lat IS NOT NULL AND lng IS NOT NULL
      AND id NOT IN (
        SELECT worker_id FROM bookings
        WHERE status = 'accepted' AND worker_id IS NOT NULL
      )
  `, [skillCategory, federationId]);

  const rejectedSet = new Set(rejectedWorkerIds);
  const eligible = candidates.filter(w => !rejectedSet.has(w.id));

  if (eligible.length === 0) return null;

  // Rank by Haversine distance (closest first)
  const ranked = eligible
    .map(w => ({ ...w, distance_km: +haversineKm(serviceLat, serviceLng, w.lat, w.lng).toFixed(2) }))
    .sort((a, b) => a.distance_km - b.distance_km);

  return ranked[0] || null;
}

/**
 * Dispatches an emergency booking to the closest eligible candidate.
 * If no candidates remain, marks status = 'unassigned'.
 */
async function dispatchEmergencyBooking(bookingId, customTimeoutSeconds = null) {
  // 1. Acquire in-memory dispatch mutex
  if (dispatchLocks.has(bookingId)) {
    return { locked: true };
  }
  dispatchLocks.add(bookingId);

  try {
    const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (!booking) {
      throw new EmergencyError('Booking does not exist', 'BOOKING_NOT_FOUND', 404);
    }

    if (booking.status !== 'requested') {
      // Booking already accepted or cancelled, do not dispatch
      return { assigned: false, status: booking.status };
    }

    const timeoutSeconds = customTimeoutSeconds || booking.emergency_timeout_seconds || 60;
    const rejectedWorkerIds = JSON.parse(booking.rejected_worker_ids || '[]');

    // 2. Discover next eligible candidate
    const nextWorker = await findNextEmergencyWorker({
      serviceLat: booking.service_lat,
      serviceLng: booking.service_lng,
      skillCategory: booking.skill_category,
      federationId: booking.federation_id,
      rejectedWorkerIds,
    });

    // 3. Candidate Found -> Assign and Start Timer
    if (nextWorker) {
      // Clear previous timer if any
      clearEmergencyTimer(bookingId);

      await db.run(`
        UPDATE bookings SET
          worker_id = ?,
          status = 'requested',
          dispatch_attempts = dispatch_attempts + 1,
          emergency_timeout_seconds = ?,
          estimated_distance_km = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [nextWorker.id, timeoutSeconds, nextWorker.distance_km, bookingId]);

      const updatedBooking = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);

      // Start Acceptance Timer
      const timeoutMs = timeoutSeconds * 1000;
      const timer = setTimeout(() => handleEmergencyTimeout(bookingId), timeoutMs);
      activeTimers.set(bookingId, {
        timer,
        workerId: nextWorker.id,
        expiresAt: Date.now() + timeoutMs,
        timeoutSeconds,
      });

      // Emit Realtime Socket.IO Events
      const io = trackingService.getSocketIO();
      if (io) {
        // Send dispatch offer to candidate worker
        io.to(`worker:${nextWorker.id}`).emit('emergency:dispatch_offer', {
          booking_id: bookingId,
          skill_category: booking.skill_category,
          service_address: booking.service_address,
          distance_km: nextWorker.distance_km,
          emergency_fee: booking.emergency_fee,
          timeout_seconds: timeoutSeconds,
          expires_at: new Date(Date.now() + timeoutMs).toISOString(),
        });

        // Notify customer on booking channel
        io.to(`booking:${bookingId}`).emit('emergency:status_update', {
          booking_id: bookingId,
          status: 'requested',
          worker_assigned: true,
          dispatch_attempts: updatedBooking.dispatch_attempts,
          timeout_seconds: timeoutSeconds,
        });
      }

      return {
        assigned: true,
        worker: {
          id: nextWorker.id,
          full_name: nextWorker.full_name,
          phone: nextWorker.phone,
          distance_km: nextWorker.distance_km,
        },
        booking: updatedBooking,
      };
    }

    // 4. No Candidate Available -> Exhausted
    clearEmergencyTimer(bookingId);

    await db.run(`
      UPDATE bookings SET
        worker_id = NULL,
        status = 'unassigned',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [bookingId]);

    const exhaustedBooking = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);

    const io = trackingService.getSocketIO();
    if (io) {
      io.to(`booking:${bookingId}`).emit('emergency:exhausted', {
        booking_id: bookingId,
        status: 'unassigned',
        message: 'No available approved workers could accept within the service area.',
      });
    }

    return {
      assigned: false,
      status: 'unassigned',
      reason: 'NO_WORKERS_AVAILABLE',
      booking: exhaustedBooking,
    };
  } finally {
    dispatchLocks.delete(bookingId);
  }
}

/**
 * Handles expiration of worker acceptance timer.
 * Automatically records timeout and reassigns to next nearest candidate.
 */
async function handleEmergencyTimeout(bookingId) {
  if (dispatchLocks.has(bookingId)) {
    // If locked by another concurrent action, retry shortly
    setTimeout(() => handleEmergencyTimeout(bookingId), 100);
    return;
  }

  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
  if (!booking || booking.status !== 'requested') {
    clearEmergencyTimer(bookingId);
    return;
  }

  const timerInfo = activeTimers.get(bookingId);
  const timedOutWorkerId = timerInfo?.workerId || booking.worker_id;

  // Append timed out worker to rejected list
  const rejectedList = JSON.parse(booking.rejected_worker_ids || '[]');
  if (timedOutWorkerId && !rejectedList.includes(timedOutWorkerId)) {
    rejectedList.push(timedOutWorkerId);
  }

  await db.run(`
    UPDATE bookings SET
      rejected_worker_ids = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [JSON.stringify(rejectedList), bookingId]);

  clearEmergencyTimer(bookingId);

  // Notify of timeout
  const io = trackingService.getSocketIO();
  if (io && timedOutWorkerId) {
    io.to(`worker:${timedOutWorkerId}`).emit('emergency:offer_expired', {
      booking_id: bookingId,
      message: 'Emergency dispatch acceptance window has expired.',
    });
  }

  // Trigger next candidate reassignment
  await dispatchEmergencyBooking(bookingId, booking.emergency_timeout_seconds);
}

/**
 * Handles explicit worker rejection of an emergency booking.
 */
async function handleEmergencyRejection(bookingId, workerId) {
  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
  if (!booking) {
    throw new EmergencyError('Booking not found', 'BOOKING_NOT_FOUND', 404);
  }

  if (booking.worker_id !== workerId) {
    throw new EmergencyError('Worker is not assigned to this booking', 'FORBIDDEN', 403);
  }

  if (booking.status !== 'requested') {
    throw new EmergencyError(`Cannot reject booking with status '${booking.status}'`, 'BAD_REQUEST', 400);
  }

  // Append to rejected list
  const rejectedList = JSON.parse(booking.rejected_worker_ids || '[]');
  if (!rejectedList.includes(workerId)) {
    rejectedList.push(workerId);
  }

  await db.run(`
    UPDATE bookings SET
      rejected_worker_ids = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [JSON.stringify(rejectedList), bookingId]);

  clearEmergencyTimer(bookingId);

  // Trigger immediate reassignment
  return await dispatchEmergencyBooking(bookingId, booking.emergency_timeout_seconds);
}

/**
 * Clears active acceptance timer.
 */
function clearEmergencyTimer(bookingId) {
  const timerInfo = activeTimers.get(bookingId);
  if (timerInfo) {
    clearTimeout(timerInfo.timer);
    activeTimers.delete(bookingId);
  }
}

/**
 * Handles worker acceptance: validates status, clears timer, sets accepted.
 */
async function handleEmergencyAcceptance(bookingId, workerId) {
  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
  if (!booking) {
    throw new EmergencyError('Booking not found', 'BOOKING_NOT_FOUND', 404);
  }

  if (booking.worker_id !== workerId) {
    throw new EmergencyError('Worker not assigned to this booking', 'FORBIDDEN', 403);
  }

  if (booking.status === 'accepted') {
    throw new EmergencyError('Booking has already been accepted', 'ALREADY_ACCEPTED', 409);
  }

  if (booking.status !== 'requested') {
    throw new EmergencyError(`Cannot accept booking with status '${booking.status}'`, 'BAD_REQUEST', 400);
  }

  // Clear timer
  clearEmergencyTimer(bookingId);

  await db.run(`
    UPDATE bookings SET
      status = 'accepted',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [bookingId]);

  const updatedBooking = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);

  // Initialize live tracking session
  trackingService.initTrackingSession(updatedBooking);

  // Notify customer
  const io = trackingService.getSocketIO();
  if (io) {
    io.to(`booking:${bookingId}`).emit('emergency:accepted', {
      booking_id: bookingId,
      worker_id: workerId,
      status: 'accepted',
    });
  }

  return updatedBooking;
}

module.exports = {
  EmergencyError,
  checkCustomerSpam,
  findNextEmergencyWorker,
  dispatchEmergencyBooking,
  handleEmergencyTimeout,
  handleEmergencyRejection,
  handleEmergencyAcceptance,
  clearEmergencyTimer,
  activeTimers,
};
