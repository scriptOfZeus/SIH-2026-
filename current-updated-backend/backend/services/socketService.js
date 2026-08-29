/**
 * Socket.IO Realtime Tracking Server
 *
 * Implements JWT authentication, booking-scoped rooms, role-based access control,
 * consent validation, and realtime location streaming.
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { SECRET } = require('../middleware/auth');
const trackingService = require('./trackingService');

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  trackingService.setSocketIO(io);

  // 1. Socket Authentication Middleware
  io.use((socket, next) => {
    const auth = socket.handshake.auth || {};
    const header = socket.handshake.headers['authorization'] || '';
    const token = auth.token || (header.startsWith('Bearer ') ? header.split(' ')[1] : null);

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      socket.user = jwt.verify(token, SECRET);
      next();
    } catch (err) {
      return next(new Error('Invalid or expired authentication token'));
    }
  });

  // 2. Connection and Room Management
  io.on('connection', (socket) => {
    // Automatically join user-specific notification room
    if (socket.user?.role === 'worker') {
      socket.join(`worker:${socket.user.id}`);
    } else if (socket.user?.role === 'customer') {
      socket.join(`customer:${socket.user.id}`);
    }

    // Event: emergency:join — Join emergency booking updates room
    socket.on('emergency:join', async (data, callback = () => {}) => {
      const bookingId = data?.booking_id;
      if (!bookingId) return callback({ success: false, error: 'booking_id is required' });
      try {
        const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        if (!booking) return callback({ success: false, error: 'Booking not found' });
        if (socket.user.role === 'customer' && booking.customer_id !== socket.user.id) {
          return callback({ success: false, error: 'Unauthorized' });
        }
        if (socket.user.role === 'worker' && booking.worker_id !== socket.user.id) {
          return callback({ success: false, error: 'Unauthorized' });
        }
        if (socket.user.role === 'admin' && booking.federation_id !== socket.user.federation_id) {
          return callback({ success: false, error: 'Unauthorized' });
        }
        socket.join(`booking:${bookingId}`);
        callback({ success: true, booking_id: bookingId });
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    // Event: tracking:join — Join booking tracking room
    socket.on('tracking:join', async (data, callback = () => {}) => {
      const bookingId = data?.booking_id;
      if (!bookingId) {
        return callback({ success: false, error: 'booking_id is required' });
      }

      try {
        const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        if (!booking) {
          return callback({ success: false, error: 'Booking not found', code: 'BOOKING_NOT_FOUND' });
        }

        if (booking.status !== 'accepted') {
          return callback({ success: false, error: `Booking is not active (status: ${booking.status})`, code: 'BOOKING_NOT_ACTIVE' });
        }

        // Persona Authorization
        if (socket.user.role === 'customer') {
          if (booking.customer_id !== socket.user.id) {
            return callback({ success: false, error: 'Not authorized for this booking', code: 'FORBIDDEN' });
          }
          if (!booking.tracking_consent_given) {
            return callback({ success: false, error: 'Tracking consent required before tracking', code: 'CONSENT_REQUIRED' });
          }
        } else if (socket.user.role === 'worker') {
          if (booking.worker_id !== socket.user.id) {
            return callback({ success: false, error: 'Worker not assigned to this booking', code: 'FORBIDDEN' });
          }
        } else if (socket.user.role === 'admin') {
          if (booking.federation_id !== socket.user.federation_id) {
            return callback({ success: false, error: 'Cross-federation access denied', code: 'FORBIDDEN' });
          }
        } else {
          return callback({ success: false, error: 'Invalid user role', code: 'FORBIDDEN' });
        }

        // Join room
        socket.join(`booking:${bookingId}`);

        const session = trackingService.getTrackingSession(bookingId);
        callback({
          success: true,
          booking_id: bookingId,
          tracking_active: 1,
          latest_location: session?.latest_location || null,
        });
      } catch (err) {
        callback({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
      }
    });

    // Event: worker:location:update — Worker emits live GPS coordinates
    socket.on('worker:location:update', async (data, callback = () => {}) => {
      if (socket.user.role !== 'worker') {
        return callback({ success: false, error: 'Only assigned workers can transmit GPS coordinates', code: 'FORBIDDEN' });
      }

      const { booking_id, lat, lng, heading, speed_kmh } = data || {};
      if (!booking_id) {
        return callback({ success: false, error: 'booking_id is required', code: 'BAD_REQUEST' });
      }

      try {
        const payload = await trackingService.recordLocationUpdate(booking_id, socket.user.id, {
          lat,
          lng,
          heading,
          speed_kmh,
        });
        callback({ success: true, data: payload });
      } catch (err) {
        callback({ success: false, error: err.message, code: err.code || 'TRACKING_ERROR' });
      }
    });

    // Event: tracking:leave — Leave booking room
    socket.on('tracking:leave', (data) => {
      if (data?.booking_id) {
        socket.leave(`booking:${data.booking_id}`);
      }
    });
  });

  return io;
}

module.exports = { initSocketServer };
