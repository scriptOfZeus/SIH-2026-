const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { ok, fail } = require('../utils/response');
const { requireAuth } = require('../middleware/auth');

// POST /ratings
router.post('/', requireAuth, async (req, res) => {
  const { booking_id, rating, comment } = req.body;
  if (!booking_id || !rating) return fail(res, 'BAD_REQUEST', 'booking_id and rating required');
  if (rating < 1 || rating > 5) return fail(res, 'BAD_REQUEST', 'rating must be 1-5');

  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [booking_id]);
  if (!booking) return fail(res, 'BOOKING_NOT_FOUND', 'Booking does not exist', 404);

  const rated_by = req.user.role; // 'customer' or 'worker'
  const id = uuidv4();
  await db.run(`
    INSERT INTO ratings (id, booking_id, rated_by, rating, comment) VALUES (?, ?, ?, ?, ?)
  `, [id, booking_id, rated_by, rating, comment || null]);

  // if a customer rated, update the worker's avg_rating
  if (rated_by === 'customer' && booking.worker_id) {
    const agg = await db.get(`
      SELECT AVG(r.rating) as avg FROM ratings r
      JOIN bookings b ON b.id = r.booking_id
      WHERE b.worker_id = ? AND r.rated_by = 'customer'
    `, [booking.worker_id]);
    await db.run('UPDATE workers SET avg_rating = ? WHERE id = ?', [Number(Number(agg.avg || 0).toFixed(1)), booking.worker_id]);
  }

  const ratingRecord = await db.get('SELECT * FROM ratings WHERE id = ?', [id]);
  return ok(res, ratingRecord, 201);
});
// GET /ratings/worker/:worker_id
router.get('/worker/:worker_id', async (req, res) => {
  const rows = await db.all(`
    SELECT r.* FROM ratings r
    JOIN bookings b ON b.id = r.booking_id
    WHERE b.worker_id = ?
    ORDER BY r.created_at DESC
  `, [req.params.worker_id]);
  return ok(res, rows);
});

module.exports = router;
