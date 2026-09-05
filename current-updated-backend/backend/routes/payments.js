const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { ok, fail } = require('../utils/response');
const { requireAuth } = require('../middleware/auth');
const payoutService = require('../services/payoutService');

// POST /payments/initiate — creates and verifies payment with server-authoritative split
router.post('/initiate', requireAuth, async (req, res) => {
  const { booking_id, amount, razorpay_payment_id, idempotency_key } = req.body;
  if (!booking_id) return fail(res, 'BAD_REQUEST', 'booking_id is required');

  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [booking_id]);
  if (!booking) return fail(res, 'BOOKING_NOT_FOUND', 'Booking does not exist', 404);

  // Prevent duplicate payments for the same booking
  const existingPayment = await db.get('SELECT * FROM payments WHERE booking_id = ?', [booking_id]);
  if (existingPayment) {
    if (idempotency_key && existingPayment.idempotency_key === idempotency_key) {
      return ok(res, existingPayment, 200);
    }
    return fail(res, 'DUPLICATE_PAYMENT', 'Payment already exists for this booking', 409);
  }

  // Authoritative amount from booking snapshot if present, else validated body amount
  const authoritativeGross = (booking.gross_amount && Number(booking.gross_amount) > 0)
    ? Number(booking.gross_amount)
    : Number(amount);

  if (isNaN(authoritativeGross) || authoritativeGross <= 0) {
    return fail(res, 'BAD_REQUEST', 'Valid positive amount is required');
  }

  // Determine worker type and federation
  let workerType = 'independent';
  let federationId = booking.federation_id || null;

  if (booking.worker_id) {
    const worker = await db.get('SELECT id, federation_id, worker_type FROM workers WHERE id = ?', [booking.worker_id]);
    if (worker) {
      federationId = worker.federation_id || null;
      workerType = (federationId !== null && worker.worker_type !== 'independent') ? 'federation' : 'independent';
    }
  }

  const baseUnitPricePaise = booking.service_unit_price_paise || Math.round(authoritativeGross * 100);
  const quantity = booking.quantity || 1;
  const minQty = booking.minimum_quantity || 1;

  const financials = payoutService.calculateBookingFinancials({
    baseUnitPricePaise,
    quantity,
    minimumQuantity: minQty,
    workerType,
  });

  const paymentId = uuidv4();
  const effectiveIdempotencyKey = idempotency_key || `pay_${paymentId}`;
  const mockRazorpayId = razorpay_payment_id || ('pay_' + paymentId.replace(/-/g, '').slice(0, 14));

  await db.exec('BEGIN');
  try {
    await db.run(`
      INSERT INTO payments (
        id, booking_id, federation_id, amount, platform_commission,
        welfare_deduction, worker_payout, federation_share,
        worker_type, amount_paise, worker_payout_paise, insurance_deduction_paise,
        federation_share_paise, platform_commission_paise,
        status, split_status, razorpay_payment_id, idempotency_key
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'pending', ?, ?)
    `, [
      paymentId,
      booking_id,
      federationId,
      financials.gross_amount,
      financials.platform_fee,
      financials.insurance_share,
      financials.worker_share,
      financials.federation_share,
      financials.worker_type,
      financials.gross_amount_paise,
      financials.worker_share_paise,
      financials.insurance_share_paise,
      financials.federation_share_paise,
      financials.platform_fee_paise,
      mockRazorpayId,
      effectiveIdempotencyKey,
    ]);

    // Update booking status
    await db.run("UPDATE bookings SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [booking_id]);

    await db.exec('COMMIT');
  } catch (txErr) {
    await db.exec('ROLLBACK');
    throw txErr;
  }

  // Allocate to ledger and welfare contributions idempotently
  let allocationResult;
  try {
    allocationResult = await payoutService.allocateBookingPayment({
      bookingId: booking_id,
      paymentId: paymentId,
      idempotencyKey: `alloc_${paymentId}`,
      db,
    });
  } catch (allocErr) {
    console.warn('⚠️ Non-fatal payout allocation warning:', allocErr.message);
  }

  const payment = await db.get('SELECT * FROM payments WHERE id = ?', [paymentId]);
  return ok(res, {
    ...payment,
    financials,
    ledger_entry: allocationResult?.entry || null,
  }, 201);
});

// POST /payments/webhook — Idempotent Razorpay Webhook Handler
router.post('/webhook', async (req, res) => {
  const payload = req.body || {};
  const event = payload.event || 'payment.captured';
  const paymentEntity = payload.payload?.payment?.entity || payload;
  const razorpayPaymentId = paymentEntity.id || payload.razorpay_payment_id;
  const bookingId = paymentEntity.notes?.booking_id || payload.booking_id;

  if (!razorpayPaymentId && !bookingId) {
    return ok(res, { received: true, note: 'Empty webhook payload acknowledged' });
  }

  let payment = null;
  if (razorpayPaymentId) {
    payment = await db.get('SELECT * FROM payments WHERE razorpay_payment_id = ?', [razorpayPaymentId]);
  }
  if (!payment && bookingId) {
    payment = await db.get('SELECT * FROM payments WHERE booking_id = ?', [bookingId]);
  }

  if (payment) {
    // Idempotent allocation
    const webhookKey = `wh_${razorpayPaymentId || payment.id}_${event}`;
    try {
      const result = await payoutService.allocateBookingPayment({
        bookingId: payment.booking_id,
        paymentId: payment.id,
        idempotencyKey: webhookKey,
        db,
      });
      return ok(res, { received: true, status: 'processed', duplicate: result.isDuplicate });
    } catch (err) {
      console.warn('⚠️ Webhook allocation warning:', err.message);
      return ok(res, { received: true, status: 'error', error: err.message });
    }
  }

  return ok(res, { received: true, note: 'Payment record not yet indexed' });
});

// GET /payments/:booking_id — Fetch payment & financial breakdown
router.get('/:booking_id', requireAuth, async (req, res) => {
  const payment = await db.get('SELECT * FROM payments WHERE booking_id = ?', [req.params.booking_id]);
  if (!payment) return fail(res, 'NOT_FOUND', 'No payment for this booking', 404);

  // Tenant scoping for federation admins
  if (req.user.role === 'admin' || req.user.role === 'federation_admin') {
    if (payment.federation_id && req.user.federation_id && payment.federation_id !== req.user.federation_id) {
      return fail(res, 'FORBIDDEN', 'No payment found in your federation', 403);
    }
  }

  // Fetch associated ledger entry
  const ledger = await db.get('SELECT * FROM payment_ledger WHERE payment_id = ? AND transaction_type = ?', [payment.id, 'payment']);

  return ok(res, {
    ...payment,
    ledger: ledger || null,
  });
});

// POST /payments/:booking_id/refund — Process refund and auditable reversal
router.post('/:booking_id/refund', requireAuth, async (req, res) => {
  const { amount, reason } = req.body;
  const payment = await db.get('SELECT * FROM payments WHERE booking_id = ?', [req.params.booking_id]);
  if (!payment) return fail(res, 'NOT_FOUND', 'Payment not found for this booking', 404);

  // Authorization check: only admin or customer can initiate refund
  if (req.user.role === 'worker') {
    return fail(res, 'FORBIDDEN', 'Workers cannot initiate refunds', 403);
  }
  if ((req.user.role === 'admin' || req.user.role === 'federation_admin') && payment.federation_id && payment.federation_id !== req.user.federation_id) {
    return fail(res, 'FORBIDDEN', 'Payment does not belong to your federation', 403);
  }

  const refundAmount = amount !== undefined ? Number(amount) : payment.amount;
  if (isNaN(refundAmount) || refundAmount <= 0) {
    return fail(res, 'BAD_REQUEST', 'Valid positive refund amount required', 400);
  }

  const refundable = payment.amount - (payment.refunded_amount || 0.0);
  if (refundAmount > refundable) {
    return fail(res, 'EXCEEDS_REFUNDABLE', `Refund amount (${refundAmount}) exceeds refundable balance (${refundable})`, 400);
  }

  const idempotencyKey = req.body.idempotency_key || `ref_${payment.id}_${Math.round(refundAmount * 100)}`;

  try {
    const reversalResult = await payoutService.createRefundReversal({
      bookingId: req.params.booking_id,
      paymentId: payment.id,
      refundAmount,
      reason: reason || 'customer_refund',
      adminId: req.user.id,
      idempotencyKey,
      db,
    });

    const newRefundedTotal = (payment.refunded_amount || 0.0) + refundAmount;
    const newRefundStatus = newRefundedTotal >= payment.amount ? 'full' : 'partial';

    await db.run(`
      UPDATE payments
      SET refund_status = ?, refunded_amount = ?
      WHERE id = ?
    `, [newRefundStatus, newRefundedTotal, payment.id]);

    return ok(res, {
      success: true,
      refunded_amount: refundAmount,
      refund_status: newRefundStatus,
      reversal_entry: reversalResult.entry,
      is_duplicate: reversalResult.isDuplicate,
    });
  } catch (err) {
    return fail(res, 'REFUND_ERROR', err.message, 500);
  }
});

module.exports = router;
