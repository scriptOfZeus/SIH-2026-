const express = require('express');
const router = express.Router();
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { ok, fail } = require('../utils/response');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');
const { saveDisputeEvidence, resolveDisputePath } = require('../services/storageService');
const { getSocketIO } = require('../services/trackingService');

// POST /api/v1/disputes
router.post('/', requireAuth, async (req, res) => {
  const { booking_id, reason, document_base64, mime_type } = req.body;
  if (!booking_id || !reason) {
    return fail(res, 'BAD_REQUEST', 'booking_id and reason are required');
  }

  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [booking_id]);
  if (!booking) return fail(res, 'NOT_FOUND', 'Booking not found', 404);

  // Ownership verification
  if (req.user.role === 'customer' && booking.customer_id !== req.user.id) {
    return fail(res, 'FORBIDDEN', 'Not your booking', 403);
  }
  if (req.user.role === 'worker' && booking.worker_id !== req.user.id) {
    return fail(res, 'FORBIDDEN', 'Not your booking', 403);
  }
  if (req.user.role !== 'customer' && req.user.role !== 'worker') {
    return fail(res, 'FORBIDDEN', 'Only customers or workers can raise a dispute', 403);
  }

  // Check for existing active dispute by this participant
  const existing = await db.get(`
    SELECT id FROM disputes 
    WHERE booking_id = ? AND raised_by_id = ? AND status IN ('raised', 'under_review')
  `, [booking_id, req.user.id]);
  if (existing) {
    return fail(res, 'DUPLICATE_DISPUTE', 'You already have an active dispute for this booking', 409);
  }

  const disputeId = uuidv4();
  let storageResult = null;

  if (document_base64 && mime_type) {
    try {
      const cleanData = document_base64.includes(';base64,') ? document_base64.split(';base64,')[1] : document_base64;
      const buffer = Buffer.from(cleanData, 'base64');
      if (buffer.length === 0) throw new Error('Empty file buffer');
      storageResult = saveDisputeEvidence({ buffer, mimeType: mime_type, disputeId });
    } catch (err) {
      return fail(res, err.code || 'STORAGE_ERROR', err.message, err.statusCode || 400);
    }
  }

  const disputeNumber = `DSP-${Math.floor(10000 + Math.random() * 90000)}`;

  await db.run(`
    INSERT INTO disputes (
      id, dispute_number, booking_id, raised_by_id, raised_by_role, federation_id, 
      reason, evidence_document_url, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'raised')
  `, [
    disputeId, disputeNumber, booking_id, req.user.id, req.user.role, 
    booking.federation_id, reason, storageResult ? storageResult.stored_filename : null
  ]);

  const dispute = await db.get('SELECT * FROM disputes WHERE id = ?', [disputeId]);

  const io = getSocketIO();
  if (io) {
    io.to(`booking:${booking_id}`).emit('dispute:raised', { dispute });
  }

  return ok(res, dispute, 201);
});

// GET /api/v1/disputes/my-disputes
router.get('/my-disputes', requireAuth, async (req, res) => {
  const disputes = await db.all(`
    SELECT * FROM disputes WHERE raised_by_id = ? ORDER BY created_at DESC
  `, [req.user.id]);
  return ok(res, disputes);
});

// GET /api/v1/disputes/:id
router.get('/:id', requireAuth, async (req, res) => {
  const dispute = await db.get('SELECT * FROM disputes WHERE id = ?', [req.params.id]);
  if (!dispute) return fail(res, 'NOT_FOUND', 'Dispute not found', 404);

  // Ownership check
  if (req.user.role === 'customer' || req.user.role === 'worker') {
    const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [dispute.booking_id]);
    if (!booking) return fail(res, 'NOT_FOUND', 'Booking not found', 404);
    if (booking.customer_id !== req.user.id && booking.worker_id !== req.user.id) {
      return fail(res, 'FORBIDDEN', 'Not authorized to view this dispute', 403);
    }
  } else {
    return fail(res, 'FORBIDDEN', 'Use admin routes for admin access', 403);
  }

  return ok(res, dispute);
});

// GET /api/v1/disputes/:id/evidence
router.get('/:id/evidence', requireAuth, async (req, res) => {
  const dispute = await db.get('SELECT * FROM disputes WHERE id = ?', [req.params.id]);
  if (!dispute) return fail(res, 'NOT_FOUND', 'Dispute not found', 404);

  // Auth check
  if (req.user.role === 'customer' || req.user.role === 'worker') {
    const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [dispute.booking_id]);
    if (!booking) return fail(res, 'NOT_FOUND', 'Booking not found', 404);
    if (booking.customer_id !== req.user.id && booking.worker_id !== req.user.id) {
      return fail(res, 'FORBIDDEN', 'Not authorized to view this evidence', 403);
    }
  } else if (req.user.role === 'admin') {
    if (dispute.federation_id !== req.user.federation_id) {
      return fail(res, 'NOT_FOUND', 'Dispute not found in your federation', 404);
    }
  } else {
    return fail(res, 'FORBIDDEN', 'Not authorized', 403);
  }

  const filePath = resolveDisputePath(dispute.evidence_document_url);
  if (!filePath || !fs.existsSync(filePath)) {
    return fail(res, 'DOCUMENT_NOT_FOUND', 'Evidence document not found', 404);
  }

  return res.sendFile(filePath);
});

module.exports = router;
