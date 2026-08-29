const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { ok, fail } = require('../utils/response');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');
const { getSocketIO } = require('../services/trackingService');

// GET /api/v1/admin/disputes
router.get('/', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const disputes = await db.all(`
    SELECT * FROM disputes WHERE federation_id = ? ORDER BY created_at DESC
  `, [req.federationId]);
  return ok(res, disputes);
});

// GET /api/v1/admin/disputes/summary
router.get('/summary', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const summary = await db.all(`
    SELECT status, COUNT(*) as count 
    FROM disputes 
    WHERE federation_id = ? 
    GROUP BY status
  `, [req.federationId]);
  
  const refundRes = await db.get(`
    SELECT COALESCE(SUM(refund_amount), 0) as total_refunded
    FROM disputes 
    WHERE federation_id = ? AND resolution_action = 'refund'
  `, [req.federationId]);

  return ok(res, {
    status_counts: summary,
    total_refunded: refundRes.total_refunded
  });
});

// GET /api/v1/admin/disputes/:id
router.get('/:id', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const dispute = await db.get('SELECT * FROM disputes WHERE id = ? AND federation_id = ?', [req.params.id, req.federationId]);
  if (!dispute) return fail(res, 'NOT_FOUND', 'Dispute not found in your federation', 404);
  return ok(res, dispute);
});

// PATCH /api/v1/admin/disputes/:id/review
router.patch('/:id/review', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const dispute = await db.get('SELECT * FROM disputes WHERE id = ? AND federation_id = ?', [req.params.id, req.federationId]);
  if (!dispute) return fail(res, 'NOT_FOUND', 'Dispute not found in your federation', 404);

  if (dispute.status !== 'raised') {
    return fail(res, 'INVALID_STATE', `Cannot transition to under_review from ${dispute.status}`, 400);
  }

  await db.run(`
    UPDATE disputes SET status = 'under_review', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `, [req.params.id]);

  const updated = await db.get('SELECT * FROM disputes WHERE id = ?', [req.params.id]);
  return ok(res, updated);
});

// PATCH /api/v1/admin/disputes/:id/resolve
router.patch('/:id/resolve', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const { resolution_action, resolution_notes, refund_amount } = req.body;
  if (!['none', 'refund', 'warning', 'suspension'].includes(resolution_action)) {
    return fail(res, 'BAD_REQUEST', 'Invalid resolution_action');
  }

  const dispute = await db.get('SELECT * FROM disputes WHERE id = ? AND federation_id = ?', [req.params.id, req.federationId]);
  if (!dispute) return fail(res, 'NOT_FOUND', 'Dispute not found in your federation', 404);

  if (dispute.status === 'resolved' || dispute.status === 'dismissed') {
    return fail(res, 'INVALID_STATE', 'Dispute is already resolved or dismissed', 400);
  }

  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [dispute.booking_id]);
  
  let finalRefundAmount = 0.0;
  let finalStatus = resolution_action === 'none' ? 'dismissed' : 'resolved';

  await db.exec('BEGIN');
  try {
    if (resolution_action === 'refund') {
      const numRefund = Number(refund_amount);
      if (isNaN(numRefund) || numRefund <= 0) {
        throw new Error('Valid positive refund_amount is required');
      }
      
      const payment = await db.get('SELECT * FROM payments WHERE booking_id = ?', [dispute.booking_id]);
      if (!payment) {
        throw new Error('No payment found for this booking to refund');
      }

      const refundable = payment.amount - payment.refunded_amount;
      if (numRefund > refundable) {
        throw new Error(`Refund amount (${numRefund}) exceeds remaining refundable amount (${refundable})`);
      }

      finalRefundAmount = numRefund;
      const newRefundedTotal = payment.refunded_amount + finalRefundAmount;
      const newRefundStatus = newRefundedTotal >= payment.amount ? 'full' : 'partial';

      await db.run(`
        UPDATE payments 
        SET refund_status = ?, refunded_amount = ? 
        WHERE id = ?
      `, [newRefundStatus, newRefundedTotal, payment.id]);
    } else if (resolution_action === 'warning') {
      if (booking.worker_id) {
        await db.run(`
          UPDATE workers 
          SET reliability_score = GREATEST(0, reliability_score - 10) 
          WHERE id = ?
        `, [booking.worker_id]);
      }
    } else if (resolution_action === 'suspension') {
      if (booking.worker_id) {
        await db.run(`
          UPDATE workers 
          SET verification_status = 'suspended' 
          WHERE id = ?
        `, [booking.worker_id]);
      }
    }

    await db.run(`
      UPDATE disputes 
      SET status = ?, resolution_action = ?, resolution_notes = ?, refund_amount = ?, 
          adjudicated_by_admin_id = ?, adjudicated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [finalStatus, resolution_action, resolution_notes || null, finalRefundAmount, req.user.id, dispute.id]);

    await db.exec('COMMIT');
  } catch (txErr) {
    await db.exec('ROLLBACK');
    return fail(res, 'RESOLUTION_ERROR', txErr.message, 400);
  }

  const updated = await db.get('SELECT * FROM disputes WHERE id = ?', [dispute.id]);
  
  const io = getSocketIO();
  if (io) {
    io.to(`booking:${dispute.booking_id}`).emit('dispute:resolved', { dispute: updated });
  }

  return ok(res, updated);
});

module.exports = router;
