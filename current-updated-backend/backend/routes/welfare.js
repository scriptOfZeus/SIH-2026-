/**
 * Worker Welfare & Insurance Routes (V2 Feature #4)
 *
 * Implements:
 *  - Worker policy browsing, enrollment, contributions ledger
 *  - Worker claim submission with document evidence
 *  - Admin policy management, claim review, adjudication, and fund analytics
 *  - Strict tenant isolation across federations
 *  - Authenticated non-public document streaming
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { ok, fail } = require('../utils/response');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');
const { saveClaimDocument, resolveClaimPath, StorageError } = require('../services/storageService');

// ═══════════════════════════════════════════════════════════════════════════
// WORKER ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/v1/welfare/policies — Browse available policies for worker's federation or national mutual
router.get('/welfare/policies', requireAuth, requireRole('worker'), async (req, res) => {
  let targetFedId = req.user.federation_id;
  if (!targetFedId) {
    const pilotFed = await db.get("SELECT id FROM federations WHERE code = 'PILOT-FED' OR name = 'Pilot Federation' LIMIT 1");
    targetFedId = pilotFed ? pilotFed.id : null;
  }

  if (!targetFedId) {
    return fail(res, 'TENANT_REQUIRED', 'No active cooperative welfare schemes found', 400);
  }

  const policies = await db.all(`
    SELECT * FROM insurance_policies
    WHERE federation_id = ? AND status = 'active'
    ORDER BY created_at DESC
  `, [targetFedId]);

  return ok(res, policies);
});

// POST /api/v1/welfare/enroll — Worker enrolls in an active policy
router.post('/welfare/enroll', requireAuth, requireRole('worker'), async (req, res) => {
  const { policy_id } = req.body;
  if (!policy_id) return fail(res, 'BAD_REQUEST', 'policy_id is required');

  const worker = await db.get('SELECT * FROM workers WHERE id = ?', [req.user.id]);
  if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found', 404);

  if (worker.verification_status !== 'approved') {
    return fail(res, 'WORKER_NOT_APPROVED', 'Only approved workers can enroll in cooperative welfare schemes', 400);
  }

  const policy = await db.get('SELECT * FROM insurance_policies WHERE id = ?', [policy_id]);
  if (!policy) return fail(res, 'POLICY_NOT_FOUND', 'Insurance policy not found', 404);

  // Federation isolation: policy must belong to worker's federation (or worker is independent)
  if (worker.federation_id && policy.federation_id !== worker.federation_id) {
    return fail(res, 'FORBIDDEN_TENANT', 'Policy does not belong to your cooperative federation', 403);
  }

  // Duplicate active enrollment check
  const existing = await db.get(`
    SELECT * FROM worker_welfare_enrollments
    WHERE worker_id = ? AND policy_id = ? AND status = 'active'
  `, [worker.id, policy_id]);

  if (existing) {
    return fail(res, 'DUPLICATE_ENROLLMENT', 'You are already actively enrolled in this policy', 409);
  }

  const id = uuidv4();
  await db.run(`
    INSERT INTO worker_welfare_enrollments (id, worker_id, policy_id, federation_id, status, total_contributions_accumulated)
    VALUES (?, ?, ?, ?, 'active', 0.0)
  `, [id, worker.id, policy_id, worker.federation_id || policy.federation_id]);

  const enrollment = await db.get('SELECT * FROM worker_welfare_enrollments WHERE id = ?', [id]);
  return ok(res, enrollment, 201);
});

// GET /welfare/my-enrollment and /welfare/my-enrollments — Worker views active enrollment & accumulated contributions
router.get(['/welfare/my-enrollment', '/welfare/my-enrollments'], requireAuth, requireRole('worker'), async (req, res) => {
  const enrollments = await db.all(`
    SELECT e.*, p.name as policy_name, p.provider_name, p.coverage_amount, p.contribution_rate
    FROM worker_welfare_enrollments e
    JOIN insurance_policies p ON e.policy_id = p.id
    WHERE e.worker_id = ? AND e.status = 'active'
  `, [req.user.id]);

  return ok(res, enrollments);
});

// GET /welfare/my-contributions — Worker views itemized ledger of per-booking micro-deductions
router.get('/welfare/my-contributions', requireAuth, requireRole('worker'), async (req, res) => {
  const contributions = await db.all(`
    SELECT c.*, p.name as policy_name, b.service_address, b.scheduled_time
    FROM welfare_contributions c
    LEFT JOIN insurance_policies p ON c.policy_id = p.id
    LEFT JOIN bookings b ON c.booking_id = b.id
    WHERE c.worker_id = ?
    ORDER BY c.created_at DESC
  `, [req.user.id]);

  return ok(res, contributions);
});

// POST /welfare/claims — Worker submits an insurance claim with evidence document
router.post('/welfare/claims', requireAuth, requireRole('worker'), async (req, res) => {
  const { policy_id, claim_type, amount_requested, incident_date, description, document_base64, file_base64, mime_type } = req.body;
  if (!policy_id || !claim_type || !amount_requested || !incident_date || !description) {
    return fail(res, 'BAD_REQUEST', 'policy_id, claim_type, amount_requested, incident_date, description are required');
  }

  const rawBase64 = document_base64 || file_base64;
  if (!rawBase64 || !mime_type) {
    return fail(res, 'DOCUMENT_REQUIRED', 'Evidence document (document_base64 and mime_type) is required to file a claim');
  }

  const worker = await db.get('SELECT * FROM workers WHERE id = ?', [req.user.id]);
  if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found', 404);

  // Verify active enrollment
  const enrollment = await db.get(`
    SELECT * FROM worker_welfare_enrollments
    WHERE worker_id = ? AND policy_id = ? AND status = 'active'
  `, [worker.id, policy_id]);

  if (!enrollment) {
    return fail(res, 'NO_ACTIVE_ENROLLMENT', 'You must have an active enrollment in this policy to file a claim', 400);
  }

  // Verify policy & maximum coverage limit
  const policy = await db.get('SELECT * FROM insurance_policies WHERE id = ?', [policy_id]);
  if (!policy) return fail(res, 'POLICY_NOT_FOUND', 'Policy not found', 404);

  const numRequested = Number(amount_requested);
  if (isNaN(numRequested) || numRequested <= 0) {
    return fail(res, 'INVALID_AMOUNT', 'amount_requested must be a positive number', 400);
  }
  if (numRequested > Number(policy.coverage_amount)) {
    return fail(res, 'AMOUNT_EXCEEDS_COVERAGE', `amount_requested (${numRequested}) exceeds maximum policy coverage of ${policy.coverage_amount}`, 400);
  }

  // Decode and safely store evidence document
  let buffer;
  try {
    const cleanData = rawBase64.includes(';base64,') ? rawBase64.split(';base64,')[1] : rawBase64;
    buffer = Buffer.from(cleanData, 'base64');
    if (buffer.length === 0) throw new Error('Empty file buffer');
  } catch (err) {
    return fail(res, 'INVALID_BASE64', 'Failed to decode document base64 content', 400);
  }

  const claimId = uuidv4();
  let storageResult;
  try {
    storageResult = saveClaimDocument({
      workerId: worker.id,
      buffer,
      mimeType: mime_type,
      claimId,
    });
  } catch (err) {
    return fail(res, err.code || 'STORAGE_ERROR', err.message, err.statusCode || 400);
  }

  const claimNumber = `CLM-${Math.floor(1000 + Math.random() * 9000)}`;

  await db.run(`
    INSERT INTO welfare_claims (
      id, claim_number, worker_id, policy_id, federation_id, claim_type,
      amount_requested, amount_approved, incident_date, description,
      evidence_document_url, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?, ?, 'submitted')
  `, [claimId, claimNumber, worker.id, policy_id, worker.federation_id, claim_type, numRequested, incident_date, description, storageResult.stored_filename]);

  const claim = await db.get('SELECT * FROM welfare_claims WHERE id = ?', [claimId]);
  return ok(res, claim, 201);
});

// GET /welfare/my-claims — Worker tracks submitted claims
router.get('/welfare/my-claims', requireAuth, requireRole('worker'), async (req, res) => {
  const claims = await db.all(`
    SELECT c.*, p.name as policy_name, p.provider_name
    FROM welfare_claims c
    JOIN insurance_policies p ON c.policy_id = p.id
    WHERE c.worker_id = ?
    ORDER BY c.created_at DESC
  `, [req.user.id]);

  return ok(res, claims);
});

// GET /welfare/claims/:id — View claim details (Owning worker or same-federation admin)
router.get('/welfare/claims/:id', requireAuth, async (req, res) => {
  const claim = await db.get(`
    SELECT c.*, p.name as policy_name, p.provider_name, w.full_name as worker_name, w.phone as worker_phone
    FROM welfare_claims c
    JOIN insurance_policies p ON c.policy_id = p.id
    JOIN workers w ON c.worker_id = w.id
    WHERE c.id = ?
  `, [req.params.id]);

  if (!claim) return fail(res, 'NOT_FOUND', 'Claim not found', 404);

  // Authorization check
  if (req.user.role === 'worker' && claim.worker_id !== req.user.id) {
    return fail(res, 'FORBIDDEN', 'You can only view your own claims', 403);
  }
  if (req.user.role === 'admin' && claim.federation_id !== req.user.federation_id) {
    return fail(res, 'NOT_FOUND', 'Claim not found in your federation', 404);
  }
  if (req.user.role !== 'worker' && req.user.role !== 'admin') {
    return fail(res, 'FORBIDDEN', 'Not authorized to view claims', 403);
  }

  return ok(res, claim);
});

// GET /welfare/claims/:id/document — Authenticated non-public document retrieval
router.get('/welfare/claims/:id/document', requireAuth, async (req, res) => {
  const claim = await db.get('SELECT * FROM welfare_claims WHERE id = ?', [req.params.id]);
  if (!claim) return fail(res, 'NOT_FOUND', 'Claim not found', 404);

  if (req.user.role === 'worker' && claim.worker_id !== req.user.id) {
    return fail(res, 'FORBIDDEN', 'You can only view your own claim documents', 403);
  }
  if (req.user.role === 'admin' && claim.federation_id !== req.user.federation_id) {
    return fail(res, 'NOT_FOUND', 'Claim document not found in your federation', 404);
  }
  if (req.user.role !== 'worker' && req.user.role !== 'admin') {
    return fail(res, 'FORBIDDEN', 'Not authorized to view claim documents', 403);
  }

  const filePath = resolveClaimPath(claim.evidence_document_url);
  if (!filePath || !fs.existsSync(filePath)) {
    return fail(res, 'DOCUMENT_NOT_FOUND', 'Evidence document file could not be found on server', 404);
  }

  return res.sendFile(filePath);
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS (Tenant Scoped)
// ═══════════════════════════════════════════════════════════════════════════

// POST /admin/welfare/policies — Admin creates a cooperative insurance policy
router.post('/admin/welfare/policies', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const { name, provider_name, policy_number, coverage_amount, premium_monthly, contribution_rate } = req.body;
  if (!name || !provider_name || !coverage_amount) {
    return fail(res, 'BAD_REQUEST', 'name, provider_name, coverage_amount are required');
  }

  const id = uuidv4();
  const rate = contribution_rate !== undefined ? Number(contribution_rate) : 0.02;
  const coverage = Number(coverage_amount);
  const premium = premium_monthly !== undefined ? Number(premium_monthly) : 0.0;

  await db.run(`
    INSERT INTO insurance_policies (id, federation_id, name, provider_name, policy_number, coverage_amount, premium_monthly, contribution_rate, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `, [id, req.federationId, name, provider_name, policy_number || `POL-${id.slice(0, 6).toUpperCase()}`, coverage, premium, rate]);

  const policy = await db.get('SELECT * FROM insurance_policies WHERE id = ?', [id]);
  return ok(res, policy, 201);
});

// GET /admin/welfare/policies — Admin lists federation policies
router.get('/admin/welfare/policies', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const policies = await db.all(`
    SELECT * FROM insurance_policies
    WHERE federation_id = ?
    ORDER BY created_at DESC
  `, [req.federationId]);

  return ok(res, policies);
});

// GET /admin/welfare/claims — Admin lists claims in own federation
router.get('/admin/welfare/claims', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const { status } = req.query;
  const query = status
    ? `SELECT c.*, w.full_name as worker_name, w.phone as worker_phone, p.name as policy_name
       FROM welfare_claims c
       JOIN workers w ON c.worker_id = w.id
       JOIN insurance_policies p ON c.policy_id = p.id
       WHERE c.federation_id = ? AND c.status = ?
       ORDER BY c.created_at DESC`
    : `SELECT c.*, w.full_name as worker_name, w.phone as worker_phone, p.name as policy_name
       FROM welfare_claims c
       JOIN workers w ON c.worker_id = w.id
       JOIN insurance_policies p ON c.policy_id = p.id
       WHERE c.federation_id = ?
       ORDER BY c.created_at DESC`;

  const params = status ? [req.federationId, status] : [req.federationId];
  const claims = await db.all(query, params);
  return ok(res, claims);
});

// GET /admin/welfare/claims/:id — Admin views single claim
router.get('/admin/welfare/claims/:id', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const claim = await db.get(`
    SELECT c.*, w.full_name as worker_name, w.phone as worker_phone, p.name as policy_name, p.provider_name
    FROM welfare_claims c
    JOIN workers w ON c.worker_id = w.id
    JOIN insurance_policies p ON c.policy_id = p.id
    WHERE c.id = ? AND c.federation_id = ?
  `, [req.params.id, req.federationId]);

  if (!claim) return fail(res, 'NOT_FOUND', 'Claim not found in your federation', 404);
  return ok(res, claim);
});

// PATCH /admin/welfare/claims/:id/adjudicate — Admin approves or rejects claim
router.patch('/admin/welfare/claims/:id/adjudicate', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const { decision, amount_approved, admin_notes } = req.body;
  if (!decision || !['approved', 'rejected'].includes(decision)) {
    return fail(res, 'BAD_REQUEST', 'decision must be approved or rejected');
  }

  const claim = await db.get('SELECT * FROM welfare_claims WHERE id = ? AND federation_id = ?', [req.params.id, req.federationId]);
  if (!claim) return fail(res, 'NOT_FOUND', 'Claim not found in your federation', 404);

  if (claim.status !== 'submitted') {
    return fail(res, 'ALREADY_ADJUDICATED', `This claim has already been ${claim.status}`, 400);
  }

  let approvedAmount = 0.0;
  if (decision === 'approved') {
    if (amount_approved === undefined || isNaN(Number(amount_approved)) || Number(amount_approved) <= 0) {
      return fail(res, 'INVALID_APPROVED_AMOUNT', 'amount_approved must be a positive number when approving a claim', 400);
    }
    approvedAmount = Number(amount_approved);
    if (approvedAmount > Number(claim.amount_requested)) {
      return fail(res, 'EXCEEDS_REQUESTED_AMOUNT', `amount_approved (${approvedAmount}) cannot exceed amount_requested (${claim.amount_requested})`, 400);
    }
  }

  await db.run(`
    UPDATE welfare_claims
    SET status = ?,
        amount_approved = ?,
        admin_notes = ?,
        adjudicated_by_admin_id = ?,
        adjudicated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND federation_id = ?
  `, [decision, approvedAmount, admin_notes || null, req.user.id, req.params.id, req.federationId]);

  const updatedClaim = await db.get('SELECT * FROM welfare_claims WHERE id = ? AND federation_id = ?', [req.params.id, req.federationId]);
  return ok(res, updatedClaim);
});

// GET /admin/welfare/fund-summary — Admin views tenant-scoped welfare fund metrics
router.get('/admin/welfare/fund-summary', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const contribRes = await db.get(`
    SELECT COALESCE(SUM(amount), 0) as total_contributions
    FROM welfare_contributions
    WHERE federation_id = ?
  `, [req.federationId]);
  const totalContributions = parseFloat(contribRes.total_contributions || '0');

  const claimsRes = await db.get(`
    SELECT COALESCE(SUM(amount_approved), 0) as total_approved
    FROM welfare_claims
    WHERE federation_id = ? AND status = 'approved'
  `, [req.federationId]);
  const totalClaimsApproved = parseFloat(claimsRes.total_approved || '0');

  const enrollmentsRes = await db.get(`
    SELECT COUNT(*) as active_enrollments
    FROM worker_welfare_enrollments
    WHERE federation_id = ? AND status = 'active'
  `, [req.federationId]);
  const activeEnrollments = parseInt(enrollmentsRes.active_enrollments || '0', 10);

  const pendingClaimsRes = await db.get(`
    SELECT COUNT(*) as pending_claims
    FROM welfare_claims
    WHERE federation_id = ? AND status = 'submitted'
  `, [req.federationId]);
  const pendingClaims = parseInt(pendingClaimsRes.pending_claims || '0', 10);

  const netFundReserve = +(totalContributions - totalClaimsApproved).toFixed(2);

  return ok(res, {
    federation_id: req.federationId,
    total_contributions_collected: totalContributions,
    total_claims_approved: totalClaimsApproved,
    net_fund_reserve: netFundReserve,
    active_enrollments: activeEnrollments,
    pending_claims: pendingClaims,
  });
});

module.exports = router;
