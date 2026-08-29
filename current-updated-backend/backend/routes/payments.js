const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { ok, fail } = require('../utils/response');
const { requireAuth } = require('../middleware/auth');

const COMMISSION_RATE = 0.15; // 15% platform commission, adjust as needed

// POST /payments/initiate — creates a payment record.
// Real version would call Razorpay's order API here and return an order_id
// for the client SDK to open the checkout. For demo speed, we mark it paid
// immediately — swap this block for a real Razorpay call later.
router.post('/initiate', requireAuth, async (req, res) => {
  const { booking_id, amount } = req.body;
  if (!booking_id || !amount) return fail(res, 'BAD_REQUEST', 'booking_id and amount required');

  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [booking_id]);
  if (!booking) return fail(res, 'BOOKING_NOT_FOUND', 'Booking does not exist', 404);

  const commission = +(amount * COMMISSION_RATE).toFixed(2);
  const payout = +(amount - commission).toFixed(2);
  const id = uuidv4();
  const mockRazorpayId = 'pay_mock_' + id.slice(0, 8);

  await db.run(`
    INSERT INTO payments (id, booking_id, federation_id, amount, platform_commission, worker_payout, status, razorpay_payment_id)
    VALUES (?, ?, ?, ?, ?, ?, 'paid', ?)
  `, [id, booking_id, booking.federation_id, amount, commission, payout, mockRazorpayId]);

  const payment = await db.get('SELECT * FROM payments WHERE id = ?', [id]);
  return ok(res, payment, 201);
});

// POST /payments/webhook — placeholder for real Razorpay webhook signature verification later
router.post('/webhook', (req, res) => {
  // In production: verify Razorpay signature header, update payment.status from the event payload.
  return ok(res, { received: true });
});

// GET /payments/:booking_id
router.get('/:booking_id', requireAuth, async (req, res) => {
  const payment = await db.get('SELECT * FROM payments WHERE booking_id = ?', [req.params.booking_id]);
  if (!payment) return fail(res, 'NOT_FOUND', 'No payment for this booking', 404);

  // Tenant scoping for admins
  if (req.user.role === 'admin' && payment.federation_id && payment.federation_id !== req.user.federation_id) {
    return fail(res, 'NOT_FOUND', 'No payment found in your federation', 404);
  }

  return ok(res, payment);
});

module.exports = router;
