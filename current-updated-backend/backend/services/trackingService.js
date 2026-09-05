/**
 * V2 Live GPS Tracking Service
 *
 * Manages active tracking sessions, rate limits, coordinate validation,
 * plausibility checks, distance/ETA re-computation, and session teardown.
 */

const db = require('../db/database');
const { haversineKm } = require('../utils/distance');

const RATE_LIMIT_MS = 3000; // 3 seconds between GPS updates
const MAX_PLAUSIBLE_SPEED_KMH = 150; // Reject teleports > 150 km/h
const AVERAGE_URBAN_SPEED_KMH = 25;  // Base speed for ETA estimation

class TrackingError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

// In-memory active tracking sessions: Map<bookingId, SessionState>
const activeSessions = new Map();

// Reference to Socket.IO server (set on startup)
let ioInstance = null;

function setSocketIO(io) {
  ioInstance = io;
}

function getSocketIO() {
  return ioInstance;
}

/**
 * Initializes or refreshes an active tracking session for an accepted booking.
 */
function initTrackingSession(booking) {
  if (!booking || booking.status !== 'accepted') return null;

  let session = activeSessions.get(booking.id);
  if (!session) {
    session = {
      booking_id: booking.id,
      customer_id: booking.customer_id,
      worker_id: booking.worker_id,
      federation_id: booking.federation_id,
      destination_lat: booking.service_lat ? Number(booking.service_lat) : null,
      destination_lng: booking.service_lng ? Number(booking.service_lng) : null,
      last_update_timestamp: 0,
      latest_location: null,
      listeners: new Set(), // For SSE connections
    };
    activeSessions.set(booking.id, session);
  }
  return session;
}

/**
 * Retrieves the in-memory tracking session.
 */
function getTrackingSession(bookingId) {
  return activeSessions.get(bookingId) || null;
}

/**
 * Validates worker GPS coordinates and checks for rate-limiting and teleportation.
 */
function validateLocationUpdate(session, { lat, lng, speed_kmh }) {
  const numLat = Number(lat);
  const numLng = Number(lng);

  // 1. Coordinate Range Validation
  if (isNaN(numLat) || numLat < -90 || numLat > 90) {
    throw new TrackingError('Latitude must be a valid number between -90 and 90', 'INVALID_COORDINATES', 400);
  }
  if (isNaN(numLng) || numLng < -180 || numLng > 180) {
    throw new TrackingError('Longitude must be a valid number between -180 and 180', 'INVALID_COORDINATES', 400);
  }

  const now = Date.now();

  // 2. Rate-Limiting Check (approx 3 seconds)
  if (session.last_update_timestamp && (now - session.last_update_timestamp) < RATE_LIMIT_MS) {
    const waitSeconds = Math.ceil((RATE_LIMIT_MS - (now - session.last_update_timestamp)) / 1000);
    throw new TrackingError(`Location update rate limit exceeded. Please wait ${waitSeconds}s before next update.`, 'TOO_MANY_REQUESTS', 429);
  }

  // 3. Implausible Location Jump / Teleportation Prevention
  if (session.latest_location && session.last_update_timestamp) {
    const elapsedHours = (now - session.last_update_timestamp) / (1000 * 60 * 60);
    if (elapsedHours > 0) {
      const distanceMovedKm = haversineKm(session.latest_location.lat, session.latest_location.lng, numLat, numLng);
      const calculatedSpeedKmh = distanceMovedKm / elapsedHours;

      // If jump exceeds 10 km within 10 seconds or calculated speed > 150 km/h
      if (distanceMovedKm > 10 && calculatedSpeedKmh > MAX_PLAUSIBLE_SPEED_KMH) {
        throw new TrackingError(`Implausible location jump detected: ${distanceMovedKm.toFixed(1)} km in ${((now - session.last_update_timestamp)/1000).toFixed(1)}s`, 'IMPLAUSIBLE_LOCATION_JUMP', 400);
      }
    }
  }

  return { numLat, numLng, now };
}

/**
 * Updates worker's live location for an active booking.
 */
async function recordLocationUpdate(bookingId, workerId, { lat, lng, heading = 0, speed_kmh = 0 }) {
  // 1. Verify booking exists in DB and is active
  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
  if (!booking) {
    throw new TrackingError('Booking does not exist', 'BOOKING_NOT_FOUND', 404);
  }

  if (booking.status !== 'accepted') {
    throw new TrackingError(`Cannot track inactive booking with status '${booking.status}'`, 'BOOKING_NOT_ACTIVE', 400);
  }

  if (booking.worker_id !== workerId) {
    throw new TrackingError('Worker is not assigned to this booking', 'UNAUTHORIZED_WORKER', 403);
  }

  // 2. Get or initialize session
  let session = activeSessions.get(bookingId);
  if (!session) {
    session = initTrackingSession(booking);
  }

  // 3. Validate coordinates, rate-limiting, and jump limits
  const { numLat, numLng, now } = validateLocationUpdate(session, { lat, lng, speed_kmh });

  // 4. Compute remaining distance and dynamic ETA to customer service address
  let remainingDistanceKm = null;
  let etaMinutes = null;

  if (booking.service_lat && booking.service_lng) {
    remainingDistanceKm = +haversineKm(numLat, numLng, booking.service_lat, booking.service_lng).toFixed(2);
    etaMinutes = Math.max(1, Math.round((remainingDistanceKm / AVERAGE_URBAN_SPEED_KMH) * 60));
  }

  const locationPayload = {
    booking_id: bookingId,
    worker_id: workerId,
    lat: numLat,
    lng: numLng,
    heading: Number(heading) || 0,
    speed_kmh: Number(speed_kmh) || 0,
    remaining_distance_km: remainingDistanceKm,
    eta_minutes: etaMinutes,
    updated_at: new Date(now).toISOString(),
  };

  // Update session state
  session.last_update_timestamp = now;
  session.latest_location = locationPayload;

  // 5. Update worker record in database with latest known location and timestamp
  await db.run('UPDATE workers SET lat = ?, lng = ?, last_location_updated_at = CURRENT_TIMESTAMP WHERE id = ?', [numLat, numLng, workerId]);

  // 6. Broadcast to Socket.IO room if attached
  if (ioInstance) {
    ioInstance.to(`booking:${bookingId}`).emit('location:update', locationPayload);
  }

  // 7. Broadcast to SSE listeners
  if (session.listeners) {
    const dataString = `data: ${JSON.stringify(locationPayload)}\n\n`;
    for (const res of session.listeners) {
      res.write(dataString);
    }
  }

  return locationPayload;
}

/**
 * Tears down an active tracking session when booking reaches 'completed' or 'cancelled'.
 */
function teardownTrackingSession(bookingId) {
  const session = activeSessions.get(bookingId);
  if (session) {
    // Notify Socket.IO room
    if (ioInstance) {
      ioInstance.to(`booking:${bookingId}`).emit('tracking:closed', {
        booking_id: bookingId,
        message: 'Tracking session ended',
        closed_at: new Date().toISOString(),
      });
      // Force all sockets to leave the booking room
      const room = ioInstance.sockets.adapter.rooms.get(`booking:${bookingId}`);
      if (room) {
        for (const socketId of room) {
          const socket = ioInstance.sockets.sockets.get(socketId);
          if (socket) socket.leave(`booking:${bookingId}`);
        }
      }
    }

    // Close any SSE listeners
    if (session.listeners) {
      for (const res of session.listeners) {
        res.write(`event: tracking_closed\ndata: ${JSON.stringify({ booking_id: bookingId, message: 'Tracking terminated' })}\n\n`);
        res.end();
      }
      session.listeners.clear();
    }

    // Purge in-memory state
    activeSessions.delete(bookingId);
  }
}

module.exports = {
  RATE_LIMIT_MS,
  MAX_PLAUSIBLE_SPEED_KMH,
  TrackingError,
  setSocketIO,
  getSocketIO,
  initTrackingSession,
  getTrackingSession,
  validateLocationUpdate,
  recordLocationUpdate,
  teardownTrackingSession,
};
