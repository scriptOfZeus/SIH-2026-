const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { ok, fail } = require('../utils/response');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /admin/bookings — filter by status/date range
router.get('/bookings', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.query;
  const rows = status
    ? await db.all('SELECT * FROM bookings WHERE status = ? ORDER BY created_at DESC', [status])
    : await db.all('SELECT * FROM bookings ORDER BY created_at DESC');
  return ok(res, rows);
});

// GET /admin/analytics/summary
router.get('/analytics/summary', requireAuth, requireRole('admin'), async (req, res) => {
  const totalBookingsRes = await db.get('SELECT COUNT(*) as c FROM bookings');
  const totalBookings = parseInt(totalBookingsRes.c);

  const totalRevenueRes = await db.get("SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE status = 'paid'");
  const totalRevenue = parseFloat(totalRevenueRes.s);

  const activeWorkersRes = await db.get("SELECT COUNT(*) as c FROM workers WHERE verification_status = 'approved'");
  const activeWorkers = parseInt(activeWorkersRes.c);

  const pendingWorkersRes = await db.get("SELECT COUNT(*) as c FROM workers WHERE verification_status = 'pending'");
  const pendingWorkers = parseInt(pendingWorkersRes.c);

  return ok(res, { totalBookings, totalRevenue, activeWorkers, pendingWorkers });
});

// GET /admin/analytics/demand-forecast
// Thin passthrough to the AI/ML teammate's separate service (Flask/FastAPI, its own port).
// Runs independently of this backend — swap AI_SERVICE_URL in .env once his service is up.
// Fails gracefully with a clear error if that service isn't running yet, so this never breaks the demo.
router.get('/analytics/demand-forecast', requireAuth, requireRole('admin'), async (req, res) => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  try {
    const response = await fetch(`${aiServiceUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.query), // e.g. ?region=Kolkata&skill_category=electrician
    });
    if (!response.ok) {
      return fail(res, 'AI_SERVICE_ERROR', `AI service responded with status ${response.status}`, 502);
    }
    const prediction = await response.json();
    return ok(res, prediction);
  } catch (err) {
    return fail(res, 'AI_SERVICE_UNREACHABLE', `Could not reach AI service at ${aiServiceUrl}: ${err.message}`, 503);
  }
});

module.exports = router;
