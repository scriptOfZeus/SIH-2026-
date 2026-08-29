const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { ok, fail } = require('../utils/response');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');
const { generateReallocationSuggestions, fetchBaselines, classifyHotspot } = require('../services/allocationService');

// GET /admin/bookings — filter by status/date range (Tenant Scoped)
router.get('/bookings', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const { status } = req.query;
  const rows = status
    ? await db.all('SELECT * FROM bookings WHERE federation_id = ? AND status = ? ORDER BY created_at DESC', [req.federationId, status])
    : await db.all('SELECT * FROM bookings WHERE federation_id = ? ORDER BY created_at DESC', [req.federationId]);
  return ok(res, rows);
});

// GET /admin/analytics/summary — Tenant Scoped
router.get('/analytics/summary', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const totalBookingsRes = await db.get('SELECT COUNT(*) as c FROM bookings WHERE federation_id = ?', [req.federationId]);
  const totalBookings = parseInt(totalBookingsRes.c);

  const totalRevenueRes = await db.get("SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE federation_id = ? AND status = 'paid'", [req.federationId]);
  const totalRevenue = parseFloat(totalRevenueRes.s);

  const activeWorkersRes = await db.get("SELECT COUNT(*) as c FROM workers WHERE federation_id = ? AND verification_status = 'approved'", [req.federationId]);
  const activeWorkers = parseInt(activeWorkersRes.c);

  const pendingWorkersRes = await db.get("SELECT COUNT(*) as c FROM workers WHERE federation_id = ? AND verification_status = 'pending'", [req.federationId]);
  const pendingWorkers = parseInt(pendingWorkersRes.c);

  return ok(res, { totalBookings, totalRevenue, activeWorkers, pendingWorkers });
});

// GET /admin/analytics/demand-forecast
// Backward-compatible passthrough to the Python AI service.
// If ?include_hotspots=true is requested, enriches forecast items with baseline & hotspot level.
router.get('/analytics/demand-forecast', requireAuth, requireRole('admin'), async (req, res) => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const includeHotspots = req.query.include_hotspots === 'true';

  try {
    const { include_hotspots, ...queryForAi } = req.query;
    const response = await fetch(`${aiServiceUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryForAi),
    });
    if (!response.ok) {
      return fail(res, 'AI_SERVICE_ERROR', `AI service responded with status ${response.status}`, 502);
    }
    const prediction = await response.json();

    // Preserve exact contract when include_hotspots is omitted
    if (!includeHotspots) {
      return ok(res, prediction);
    }

    // Enrich with hotspot classification when requested
    const baselines = await fetchBaselines(aiServiceUrl);
    const enrichedForecast = (prediction.forecast || []).map(fc => {
      const key = `${fc.region}::${fc.skill_category}`;
      const baseline = baselines[key] || fc.predicted_demand;
      const growthPercent = baseline > 0 ? +(((fc.predicted_demand - baseline) / baseline) * 100).toFixed(1) : 0.0;
      const hotspotLevel = classifyHotspot(fc.predicted_demand, baseline);
      return {
        ...fc,
        baseline_demand: baseline,
        growth_percent: growthPercent,
        hotspot_level: hotspotLevel,
      };
    });

    return ok(res, {
      ...prediction,
      forecast: enrichedForecast,
    });
  } catch (err) {
    return fail(res, 'AI_SERVICE_UNREACHABLE', `Could not reach AI service at ${aiServiceUrl}: ${err.message}`, 503);
  }
});

// GET /admin/analytics/reallocation-suggestions
// V2 AI Demand Forecasting + Workforce Allocation Engine (Tenant Scoped)
// Reconciles predicted demand against local verified worker supply.
// Detects demand hotspots and suggests inter-region worker reallocations based on geographic proximity.
router.get('/analytics/reallocation-suggestions', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const federationId = req.federationId; // Strictly JWT-derived
  const horizonDays = parseInt(req.query.horizon_days) || 7;

  try {
    const suggestions = await generateReallocationSuggestions({
      federationId,
      horizonDays,
      aiServiceUrl,
    });
    return ok(res, suggestions);
  } catch (err) {
    return fail(res, 'REALLOCATION_SERVICE_ERROR', err.message, 502);
  }
});

// POST /admin/federations/onboard — Onboard a new federation and initial admin
router.post('/federations/onboard', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, region, admin_name, admin_email, admin_password } = req.body;
  if (!name || !region || !admin_name || !admin_email || !admin_password) {
    return fail(res, 'BAD_REQUEST', 'name, region, admin_name, admin_email, admin_password are required');
  }

  const existingAdmin = await db.get('SELECT id FROM admins WHERE email = ?', [admin_email]);
  if (existingAdmin) {
    return fail(res, 'DUPLICATE_EMAIL', 'An administrator with this email already exists', 409);
  }

  const newFedId = uuidv4();
  const newAdminId = uuidv4();
  const passwordHash = crypto.createHash('sha256').update(admin_password).digest('hex');

  await db.run('INSERT INTO federations (id, name, region) VALUES (?, ?, ?)', [newFedId, name, region]);
  await db.run(
    'INSERT INTO admins (id, federation_id, full_name, email, password_hash) VALUES (?, ?, ?, ?, ?)',
    [newAdminId, newFedId, admin_name, admin_email, passwordHash]
  );

  const createdFed = await db.get('SELECT id, name, region, created_at FROM federations WHERE id = ?', [newFedId]);
  const createdAdmin = await db.get('SELECT id, federation_id, full_name, email, created_at FROM admins WHERE id = ?', [newAdminId]);

  return ok(res, { federation: createdFed, admin: createdAdmin }, 201);
});

// GET /admin/federations/current — Get current authenticated admin's federation details
router.get('/federations/current', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const fed = await db.get('SELECT id, name, region, created_at FROM federations WHERE id = ?', [req.federationId]);
  if (!fed) return fail(res, 'NOT_FOUND', 'Federation record not found', 404);
  return ok(res, fed);
});

module.exports = router;
