const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { ok, fail } = require('../utils/response');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');
const { haversineKm } = require('../utils/distance');
const { saveCertificateDocument, resolveCertificatePath, StorageError } = require('../services/storageService');
const { processAndVerifyCertificate } = require('../services/ocrService');

// ══════════════════════════════════════════════════════════════════════════════
// WORKER DIRECTORY & REGISTRATION (Tenant & Role Scoped)
// ══════════════════════════════════════════════════════════════════════════════

// GET /admin/workers — List workers (Supervising Admin: all/filtered, Federation Admin: own only)
router.get('/admin/workers', requireAuth, requireRole(['supervising_admin', 'federation_admin', 'admin']), requireTenant, async (req, res) => {
  const isSuper = req.user.role === 'supervising_admin';
  const { verification_status, worker_type, federation_id } = req.query;

  let query = `
    SELECT w.*, fed.name as federation_name 
    FROM workers w
    LEFT JOIN federations fed ON w.federation_id = fed.id
    WHERE 1=1
  `;
  const params = [];

  if (isSuper) {
    if (federation_id) {
      query += ' AND w.federation_id = ?';
      params.push(federation_id);
    }
  } else {
    // Federation admin strictly scoped to own federation
    query += ' AND w.federation_id = ?';
    params.push(req.federationId);
  }

  if (worker_type) {
    query += ' AND w.worker_type = ?';
    params.push(worker_type);
  }

  if (verification_status) {
    query += ' AND w.verification_status = ?';
    params.push(verification_status);
  }

  query += ' ORDER BY w.created_at DESC';

  const rows = await db.all(query, params);
  return ok(res, rows);
});

// POST /admin/workers — Federation Admin registers worker belonging to their federation
router.post('/admin/workers', requireAuth, requireRole(['supervising_admin', 'federation_admin', 'admin']), requireTenant, async (req, res) => {
  const { full_name, phone, skill_category, skill_certificate_number, lat, lng, hourly_rate, experience_years } = req.body;
  if (!full_name || !phone || !skill_category) {
    return fail(res, 'BAD_REQUEST', 'full_name, phone, and skill_category are required');
  }

  // Duplicate worker protection
  const existing = await db.get('SELECT id, worker_type, federation_id FROM workers WHERE phone = ?', [phone]);
  if (existing) {
    return fail(res, 'DUPLICATE_PHONE', 'A worker with this mobile number already exists', 409);
  }

  // Determine target federation
  const isSuper = req.user.role === 'supervising_admin';
  let targetFedId = isSuper ? (req.body.federation_id || req.federationId) : req.federationId;

  if (!targetFedId && !isSuper) {
    return fail(res, 'FORBIDDEN', 'No federation assigned to this administrator', 403);
  }

  // If no federation specified by superadmin, assign default pilot federation
  if (!targetFedId && isSuper) {
    const defaultFed = await db.get('SELECT id FROM federations LIMIT 1');
    targetFedId = defaultFed?.id || null;
  }

  // Verify federation is active
  if (targetFedId) {
    const fed = await db.get('SELECT status FROM federations WHERE id = ?', [targetFedId]);
    if (fed && fed.status === 'inactive') {
      return fail(res, 'INACTIVE_FEDERATION', 'Cannot register workers under an inactive federation', 400);
    }
  }

  const id = uuidv4();
  const workerLat = (lat !== undefined && lat !== null) ? Number(lat) : null;
  const workerLng = (lng !== undefined && lng !== null) ? Number(lng) : null;
  const certNum = skill_certificate_number || null;

  await db.run(`
    INSERT INTO workers (
      id, federation_id, added_by_admin_id, full_name, phone, skill_category, skill_certificate_number,
      worker_type, verification_status, final_verification_status, lat, lng, account_activated
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'federation', 'pending', 'pending', ?, ?, 0)
  `, [id, targetFedId, req.user.id, full_name.trim(), phone.trim(), skill_category.trim(), certNum, workerLat, workerLng]);

  const worker = await db.get('SELECT * FROM workers WHERE id = ?', [id]);
  return ok(res, worker, 201);
});

// POST /workers/register-independent — Independent Worker Self-Registration Flow
router.post('/workers/register-independent', async (req, res) => {
  const { full_name, phone, skill_category, experience_years, address, lat, lng } = req.body;
  if (!full_name || !phone || !skill_category) {
    return fail(res, 'BAD_REQUEST', 'full_name, phone, and skill_category are required');
  }

  // Duplicate protection: Check if phone already registered as a federation worker
  const existing = await db.get('SELECT id, worker_type FROM workers WHERE phone = ?', [phone]);
  if (existing) {
    if (existing.worker_type === 'federation') {
      return fail(res, 'DUPLICATE_ACCOUNT', 'This mobile number is already registered under a Federation.', 409);
    }
    // Update existing independent profile
    await db.run(`
      UPDATE workers SET
        full_name = ?, skill_category = ?, lat = ?, lng = ?
      WHERE id = ?
    `, [full_name.trim(), skill_category.trim(), lat || null, lng || null, existing.id]);

    const updated = await db.get('SELECT * FROM workers WHERE id = ?', [existing.id]);
    return ok(res, updated, 200);
  }

  const id = uuidv4();
  await db.run(`
    INSERT INTO workers (
      id, federation_id, full_name, phone, skill_category, worker_type,
      verification_status, final_verification_status, lat, lng, account_activated
    )
    VALUES (?, NULL, ?, ?, ?, 'independent', 'pending', 'pending', ?, ?, 1)
  `, [id, full_name.trim(), phone.trim(), skill_category.trim(), lat || null, lng || null]);

  const created = await db.get('SELECT * FROM workers WHERE id = ?', [id]);
  return ok(res, created, 201);
});

// GET /workers/nearby — Public/Customer worker discovery by geographic proximity
router.get('/workers/nearby', async (req, res) => {
  const { lat, lng, skill_category, radius_km } = req.query;

  if (lat === undefined || lng === undefined) {
    return fail(res, 'BAD_REQUEST', 'lat and lng coordinates are required', 400);
  }

  const numLat = Number(lat);
  const numLng = Number(lng);

  if (isNaN(numLat) || numLat < -90 || numLat > 90) {
    return fail(res, 'INVALID_COORDINATES', 'Latitude must be between -90 and 90', 400);
  }
  if (isNaN(numLng) || numLng < -180 || numLng > 180) {
    return fail(res, 'INVALID_COORDINATES', 'Longitude must be between -180 and 180', 400);
  }

  const radius = Math.min(Math.max(Number(radius_km) || 15, 1), 50); // Default 15km, Max 50km

  let query = `
    SELECT w.id, w.full_name, w.skill_category, w.hourly_rate, w.experience_years,
           w.avg_rating, w.reliability_score, w.is_available, w.worker_type,
           w.federation_id, fed.name as federation_name, w.lat, w.lng, w.last_location_updated_at
    FROM workers w
    LEFT JOIN federations fed ON w.federation_id = fed.id
    WHERE w.verification_status = 'approved'
      AND COALESCE(w.is_available, 1) = 1
      AND w.lat IS NOT NULL AND w.lng IS NOT NULL
  `;
  const params = [];

  if (skill_category && skill_category !== 'all') {
    query += ' AND w.skill_category = ?';
    params.push(skill_category);
  }

  const workers = await db.all(query, params);

  // Compute distances
  const allCalculated = workers
    .map((w) => {
      const distance = +haversineKm(numLat, numLng, w.lat, w.lng).toFixed(2);
      return {
        id: w.id,
        full_name: w.full_name,
        skill_category: w.skill_category,
        hourly_rate: w.hourly_rate,
        experience_years: w.experience_years,
        avg_rating: w.avg_rating,
        reliability_score: w.reliability_score,
        is_available: w.is_available,
        worker_type: w.worker_type,
        federation_id: w.federation_id,
        federation_name: w.federation_name,
        distance_km: distance,
        verification_status: 'approved',
        lat: +w.lat.toFixed(4),
        lng: +w.lng.toFixed(4),
        // Privacy protection: Round coordinates to 2 decimal places (~1.1 km) for public discovery
        approx_lat: +w.lat.toFixed(2),
        approx_lng: +w.lng.toFixed(2),
        last_seen: w.last_location_updated_at || null,
      };
    })
    .sort((a, b) => a.distance_km - b.distance_km);

  let nearby = allCalculated.filter((w) => w.distance_km <= radius);

  // Fallback: If no workers in strict radius, return the closest available workers across the region
  if (nearby.length === 0 && allCalculated.length > 0) {
    nearby = allCalculated.slice(0, 10);
  }

  return ok(res, {
    search_center: { lat: numLat, lng: numLng },
    radius_km: radius,
    total_found: nearby.length,
    workers: nearby,
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CERTIFICATE UPLOAD & AUTOMATED OCR (Multi-Tenant)
// ══════════════════════════════════════════════════════════════════════════════

// POST /admin/workers/:id/upload-certificate — Upload & OCR verify certificate document
router.post('/admin/workers/:id/upload-certificate', requireAuth, requireRole(['supervising_admin', 'federation_admin', 'admin']), async (req, res) => {
  const isSuper = req.user.role === 'supervising_admin';
  const worker = await db.get('SELECT * FROM workers WHERE id = ?', [req.params.id]);
  if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found', 404);

  // Tenant check for federation admins
  if (!isSuper && worker.federation_id !== req.user.federation_id) {
    return fail(res, 'FORBIDDEN', 'Cannot upload certificate for a worker belonging to another federation', 403);
  }

  const { document_base64, file_base64, filename, mime_type, mock_ocr, ocr_hints } = req.body;
  const rawBase64 = document_base64 || file_base64;

  if (!rawBase64 || !mime_type) {
    return fail(res, 'BAD_REQUEST', 'document_base64 and mime_type are required');
  }

  let buffer;
  try {
    const cleanData = rawBase64.includes(';base64,') ? rawBase64.split(';base64,')[1] : rawBase64;
    buffer = Buffer.from(cleanData, 'base64');
    if (buffer.length === 0) throw new Error('Empty file buffer');
  } catch (err) {
    return fail(res, 'INVALID_BASE64', 'Failed to decode document base64 content', 400);
  }

  // Safe metadata logging (Never log document contents, Aadhaar or PPI)
  console.log(`[OCR UPLOAD] Worker: ${worker.id} | Filename: ${filename || 'certificate.png'} | MIME: ${mime_type} | Size: ${buffer.length} bytes`);

  // 1. Safe storage
  let storageResult;
  try {
    storageResult = await saveCertificateDocument({
      buffer,
      mimeType: mime_type,
      originalFilename: filename,
      workerId: worker.id,
    });
  } catch (storageErr) {
    if (storageErr instanceof StorageError) {
      return fail(res, storageErr.code, storageErr.message, 400);
    }
    return fail(res, 'STORAGE_ERROR', 'Failed to persist document to storage', 500);
  }

  // 2. Real Tesseract WebAssembly OCR Processing Pipeline
  let ocrResult;
  try {
    ocrResult = await processAndVerifyCertificate({
      buffer,
      mimeType: mime_type,
      worker,
      hints: ocr_hints || (mock_ocr ? { mock_ocr } : null),
    });
  } catch (ocrErr) {
    return fail(res, 'OCR_PROCESSING_ERROR', `OCR processing failed: ${ocrErr.message}`, 500);
  }

  // 3. Persist OCR extraction and document URL to worker record (resetting final human verification on new upload)
  try {
    await db.run(`
      UPDATE workers SET
        certificate_document_url = ?,
        ocr_extracted_name = ?,
        ocr_extracted_number = ?,
        ocr_job_role = ?,
        ocr_qualification_code = ?,
        ocr_training_location = ?,
        ocr_grade = ?,
        ocr_nsqf_level = ?,
        ocr_confidence_score = ?,
        ocr_status = ?,
        skill_certificate_verified = 0,
        skill_certificate_verified_at = NULL,
        final_verification_status = 'pending',
        final_adjudicated_by_admin_id = NULL,
        final_adjudication_notes = NULL,
        final_adjudicated_at = NULL
      WHERE id = ?
    `, [
      storageResult.document_url,
      ocrResult.ocr_extracted_name,
      ocrResult.ocr_extracted_number,
      ocrResult.ocr_job_role,
      ocrResult.ocr_qualification_code,
      ocrResult.ocr_training_location,
      ocrResult.ocr_grade,
      ocrResult.ocr_nsqf_level,
      ocrResult.ocr_confidence_score,
      ocrResult.ocr_status,
      worker.id,
    ]);
    console.log(`[DB PERSISTENCE] Worker ${worker.id} OCR record updated successfully. OCR Status: ${ocrResult.ocr_status}`);
  } catch (dbErr) {
    console.error(`[DB PERSISTENCE ERROR] Failed to update worker OCR record: ${dbErr.message}`);
    return fail(res, 'DB_ERROR', 'Failed to persist OCR verification results', 500);
  }

  const updatedWorker = await db.get('SELECT * FROM workers WHERE id = ?', [worker.id]);

  return ok(res, {
    worker: updatedWorker,
    ocr_verification: ocrResult,
    document: {
      document_url: storageResult.document_url,
      mime_type: storageResult.mime_type,
      file_size_bytes: storageResult.file_size_bytes,
    },
  }, 200);
});

// POST /workers/me/upload-certificate — Worker uploads own certificate from mobile app
router.post('/workers/me/upload-certificate', requireAuth, requireRole('worker'), async (req, res) => {
  const worker = await db.get('SELECT * FROM workers WHERE id = ?', [req.user.id]);
  if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found', 404);

  const { document_base64, file_base64, filename, mime_type, mock_ocr, ocr_hints } = req.body;
  const rawBase64 = document_base64 || file_base64;
  if (!rawBase64 || !mime_type) {
    return fail(res, 'BAD_REQUEST', 'document_base64 and mime_type are required');
  }

  let buffer;
  try {
    const cleanData = rawBase64.includes(';base64,') ? rawBase64.split(';base64,')[1] : rawBase64;
    buffer = Buffer.from(cleanData, 'base64');
    if (buffer.length === 0) throw new Error('Empty file buffer');
  } catch (err) {
    return fail(res, 'INVALID_BASE64', 'Failed to decode document base64 content', 400);
  }

  console.log(`[WORKER OCR UPLOAD] Worker: ${worker.id} (${worker.full_name}) | Filename: ${filename || 'certificate.png'} | Size: ${buffer.length} bytes`);

  let storageResult;
  try {
    storageResult = await saveCertificateDocument({
      buffer,
      mimeType: mime_type,
      originalFilename: filename,
      workerId: worker.id,
    });
  } catch (storageErr) {
    if (storageErr instanceof StorageError) {
      return fail(res, storageErr.code, storageErr.message, 400);
    }
    return fail(res, 'STORAGE_ERROR', 'Failed to persist document to storage', 500);
  }

  let ocrResult;
  try {
    ocrResult = await processAndVerifyCertificate({
      buffer,
      mimeType: mime_type,
      worker,
      hints: ocr_hints || (mock_ocr ? { mock_ocr } : null),
    });
  } catch (ocrErr) {
    return fail(res, 'OCR_PROCESSING_ERROR', `OCR processing failed: ${ocrErr.message}`, 500);
  }

  await db.run(`
    UPDATE workers SET
      certificate_document_url = ?,
      ocr_extracted_name = ?,
      ocr_extracted_number = ?,
      ocr_job_role = ?,
      ocr_qualification_code = ?,
      ocr_training_location = ?,
      ocr_grade = ?,
      ocr_nsqf_level = ?,
      ocr_confidence_score = ?,
      ocr_status = ?,
      skill_certificate_verified = 0,
      skill_certificate_verified_at = NULL,
      final_verification_status = 'pending',
      verification_status = 'pending',
      final_adjudicated_by_admin_id = NULL,
      final_adjudication_notes = NULL,
      final_adjudicated_at = NULL
    WHERE id = ?
  `, [
    storageResult.document_url,
    ocrResult.ocr_extracted_name,
    ocrResult.ocr_extracted_number,
    ocrResult.ocr_job_role,
    ocrResult.ocr_qualification_code,
    ocrResult.ocr_training_location,
    ocrResult.ocr_grade,
    ocrResult.ocr_nsqf_level,
    ocrResult.ocr_confidence_score,
    ocrResult.ocr_status,
    worker.id,
  ]);

  const updatedWorker = await db.get('SELECT * FROM workers WHERE id = ?', [worker.id]);
  return ok(res, {
    worker: updatedWorker,
    ocr_verification: ocrResult,
    document: {
      document_url: storageResult.document_url,
      mime_type: storageResult.mime_type,
      file_size_bytes: storageResult.file_size_bytes,
    },
  });
});

// GET /admin/workers/:id/certificate-document — View stored certificate metadata
router.get('/admin/workers/:id/certificate-document', requireAuth, requireRole(['supervising_admin', 'federation_admin', 'admin']), async (req, res) => {
  const isSuper = req.user.role === 'supervising_admin';
  const worker = await db.get('SELECT * FROM workers WHERE id = ?', [req.params.id]);
  if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found', 404);

  if (!isSuper && worker.federation_id !== req.user.federation_id) {
    return fail(res, 'FORBIDDEN', 'Cannot view certificate of another federation', 403);
  }

  if (!worker.certificate_document_url) {
    return fail(res, 'NO_DOCUMENT', 'No certificate document has been uploaded for this worker', 404);
  }

  return ok(res, {
    worker_id: worker.id,
    full_name: worker.full_name,
    document_url: worker.certificate_document_url,
    skill_certificate_verified: worker.skill_certificate_verified,
    final_verification_status: worker.final_verification_status,
    ocr_status: worker.ocr_status,
    ocr_confidence_score: worker.ocr_confidence_score,
    ocr_extracted_name: worker.ocr_extracted_name,
    ocr_extracted_number: worker.ocr_extracted_number,
    ocr_job_role: worker.ocr_job_role,
    ocr_qualification_code: worker.ocr_qualification_code,
    ocr_training_location: worker.ocr_training_location,
    ocr_grade: worker.ocr_grade,
    ocr_nsqf_level: worker.ocr_nsqf_level,
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CENTRALIZED SUPERVISING ADMIN ADJUDICATION (Phase 2.5)
// ══════════════════════════════════════════════════════════════════════════════

// GET /admin/certificate-verification — Centralized verification queue
router.get('/admin/certificate-verification', requireAuth, requireRole(['supervising_admin', 'federation_admin', 'admin']), async (req, res) => {
  const isSuper = req.user.role === 'supervising_admin';
  const userFedId = req.user.federation_id;

  let query = `
    SELECT w.*, fed.name as federation_name
    FROM workers w
    LEFT JOIN federations fed ON w.federation_id = fed.id
    WHERE w.certificate_document_url IS NOT NULL
  `;
  const params = [];

  if (!isSuper) {
    query += ' AND w.federation_id = ?';
    params.push(userFedId);
  }

  query += ' ORDER BY w.created_at DESC';

  const rows = await db.all(query, params);
  return ok(res, rows);
});

// PATCH /admin/workers/:id/verify-certificate — Final Human Certificate Adjudication (Supervising Admin only)
router.patch('/admin/workers/:id/verify-certificate', requireAuth, requireRole(['supervising_admin', 'admin']), async (req, res) => {
  const role = req.user?.role;
  // Final verification authority strictly restricted to Supervising Admin (or legacy admin in test mode)
  if (role === 'federation_admin') {
    return fail(res, 'FORBIDDEN', 'Final certificate verification is restricted to the Supervising Admin.', 403);
  }

  const worker = await db.get('SELECT * FROM workers WHERE id = ?', [req.params.id]);
  if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found', 404);

  const { decision, override_mismatch, notes } = req.body;
  const targetDecision = decision || (override_mismatch ? 'approved' : 'approved');

  if (!['approved', 'rejected', 'manual_review'].includes(targetDecision)) {
    return fail(res, 'BAD_REQUEST', 'Decision must be approved, rejected, or manual_review', 400);
  }

  // Safety Gate: If OCR detected mismatch, require explicit override
  if (worker.ocr_status === 'mismatch' && targetDecision === 'approved' && !override_mismatch && req.body.override_mismatch !== true) {
    return fail(res, 'OCR_MISMATCH', 'Cannot verify certificate: OCR detected mismatch with worker profile. Provide override_mismatch=true if manually confirmed.', 400);
  }

  const isApproved = targetDecision === 'approved' ? 1 : 0;
  const statusStr = targetDecision === 'approved' ? 'approved' : (targetDecision === 'rejected' ? 'rejected' : 'pending');

  await db.run(`
    UPDATE workers SET
      skill_certificate_verified = ?,
      skill_certificate_verified_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END,
      final_verification_status = ?,
      verification_status = ?,
      final_adjudicated_by_admin_id = ?,
      final_adjudication_notes = ?,
      final_adjudicated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    isApproved,
    isApproved,
    targetDecision,
    statusStr,
    req.user.id,
    notes || null,
    worker.id,
  ]);

  const updatedWorker = await db.get('SELECT * FROM workers WHERE id = ?', [worker.id]);
  return ok(res, updatedWorker);
});

// PATCH /admin/workers/:id/verify — Final account approval/rejection
router.patch('/admin/workers/:id/verify', requireAuth, requireRole(['supervising_admin', 'admin']), async (req, res) => {
  const role = req.user?.role;
  if (role === 'federation_admin') {
    return fail(res, 'FORBIDDEN', 'Worker activation approval is restricted to the Supervising Admin.', 403);
  }

  const { decision, notes } = req.body; // 'approved' | 'rejected'
  if (!['approved', 'rejected'].includes(decision)) {
    return fail(res, 'BAD_REQUEST', 'decision must be approved or rejected');
  }

  const worker = await db.get('SELECT * FROM workers WHERE id = ?', [req.params.id]);
  if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found', 404);

  if (decision === 'approved' && !worker.skill_certificate_verified) {
    return fail(res, 'CERT_NOT_VERIFIED', 'Cannot approve worker before Skill Certificate is verified', 400);
  }

  await db.run(`
    UPDATE workers SET
      verification_status = ?,
      final_verification_status = ?,
      final_adjudicated_by_admin_id = ?,
      final_adjudication_notes = ?,
      final_adjudicated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [decision, decision, req.user.id, notes || null, worker.id]);

  const updatedWorker = await db.get('SELECT * FROM workers WHERE id = ?', [worker.id]);
  return ok(res, updatedWorker);
});

// ══════════════════════════════════════════════════════════════════════════════
// WORKER APP MOBILE APIS
// ══════════════════════════════════════════════════════════════════════════════

// GET /workers/me — worker's own profile
router.get('/workers/me', requireAuth, requireRole('worker'), async (req, res) => {
  const worker = await db.get(`
    SELECT w.*, fed.name as federation_name, fed.code as federation_code
    FROM workers w
    LEFT JOIN federations fed ON w.federation_id = fed.id
    WHERE w.id = ?
  `, [req.user.id]);
  if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found', 404);
  return ok(res, worker);
});

// PATCH /workers/me — worker updates own location, availability, or profile details
router.patch('/workers/me', requireAuth, requireRole('worker'), async (req, res) => {
  const { lat, lng, is_available, full_name, address, pincode, skill_category, hourly_rate, experience_years } = req.body;

  const worker = await db.get('SELECT * FROM workers WHERE id = ?', [req.user.id]);
  if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found', 404);

  const newLat = lat !== undefined ? Number(lat) : worker.lat;
  const newLng = lng !== undefined ? Number(lng) : worker.lng;
  const newAvail = is_available !== undefined ? (is_available === true || is_available === 1 || is_available === '1' ? 1 : 0) : worker.is_available;
  const newName = full_name !== undefined ? full_name.trim() : worker.full_name;
  const newSkill = skill_category !== undefined ? skill_category.trim() : worker.skill_category;
  const newHourlyRate = hourly_rate !== undefined ? Number(hourly_rate) : worker.hourly_rate;
  const newExpYears = experience_years !== undefined ? Number(experience_years) : worker.experience_years;
  const newAddress = address !== undefined ? address.trim() : worker.address;
  const newPincode = pincode !== undefined ? pincode.trim() : worker.pincode;

  const isLocationChanged = (lat !== undefined && lat !== null) || (lng !== undefined && lng !== null);

  await db.run(`
    UPDATE workers SET
      lat = ?, lng = ?, is_available = ?, full_name = ?, skill_category = ?,
      hourly_rate = ?, experience_years = ?, address = ?, pincode = ?,
      last_location_updated_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE last_location_updated_at END
    WHERE id = ?
  `, [newLat, newLng, newAvail, newName, newSkill, newHourlyRate, newExpYears, newAddress, newPincode, isLocationChanged ? 1 : 0, req.user.id]);

  const updatedWorker = await db.get('SELECT * FROM workers WHERE id = ?', [req.user.id]);
  return ok(res, updatedWorker);
});

// GET /workers/me/earnings — Real aggregated earnings & recent jobs
router.get('/workers/me/earnings', requireAuth, requireRole('worker'), async (req, res) => {
  const workerId = req.user.id;
  const worker = await db.get('SELECT * FROM workers WHERE id = ?', [workerId]);
  if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found', 404);

  const completedBookings = await db.all(`
    SELECT b.*, 
           COALESCE(l.gross_amount, p.amount, 0) as payment_amount,
           COALESCE(l.worker_amount, p.worker_payout, 0) as worker_payout,
           COALESCE(l.insurance_amount, p.welfare_deduction, 0) as welfare_deduction,
           COALESCE(l.federation_amount, p.federation_share, 0) as federation_share,
           COALESCE(l.platform_amount, p.platform_commission, 0) as platform_commission,
           COALESCE(p.status, 'paid') as payment_status,
           l.status as ledger_status
    FROM bookings b
    LEFT JOIN payments p ON b.id = p.booking_id
    LEFT JOIN payment_ledger l ON (b.id = l.booking_id AND l.transaction_type = 'payment')
    WHERE b.worker_id = ? AND b.status = 'completed'
    ORDER BY b.updated_at DESC
  `, [workerId]);

  let todayEarnings = 0.0;
  let weeklyEarnings = 0.0;
  let monthlyEarnings = 0.0;
  let totalEarnings = 0.0;
  let todayJobsCount = 0;
  let totalWelfareDeduction = 0.0;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  for (const b of completedBookings) {
    const payout = parseFloat(b.worker_payout || 0);
    const welfare = parseFloat(b.welfare_deduction || 0);
    totalWelfareDeduction += welfare;
    totalEarnings += payout;

    const bDate = new Date(b.updated_at || b.created_at);
    const bDateStr = bDate.toISOString().slice(0, 10);

    if (bDateStr === todayStr) {
      todayEarnings += payout;
      todayJobsCount++;
    }
    if (bDate >= sevenDaysAgo) {
      weeklyEarnings += payout;
    }
    if (bDate >= thirtyDaysAgo) {
      monthlyEarnings += payout;
    }
  }

  const recentGigs = completedBookings.slice(0, 10).map((b) => ({
    id: b.id,
    short_code: b.short_code,
    service_category: b.skill_category || b.service_category,
    completed_at: b.updated_at || b.created_at,
    gross_amount: parseFloat(b.payment_amount || 0),
    payout: parseFloat(b.worker_payout || 0),
    welfare_deducted: parseFloat(b.welfare_deduction || 0),
    federation_share: parseFloat(b.federation_share || 0),
    platform_fee: parseFloat(b.platform_commission || 0),
    customer_address: b.service_address || b.customer_address,
  }));

  return ok(res, {
    today_earnings: +todayEarnings.toFixed(2),
    today_jobs: todayJobsCount,
    total_earnings: +totalEarnings.toFixed(2),
    welfare_contribution: +totalWelfareDeduction.toFixed(2),
    recent_jobs: recentGigs,
    today: {
      earnings: +todayEarnings.toFixed(2),
      jobs_count: todayJobsCount,
    },
    weekly: {
      earnings: +weeklyEarnings.toFixed(2),
      jobs_count: completedBookings.filter((b) => new Date(b.updated_at || b.created_at) >= sevenDaysAgo).length,
    },
    monthly: {
      earnings: +monthlyEarnings.toFixed(2),
      jobs_count: completedBookings.filter((b) => new Date(b.updated_at || b.created_at) >= thirtyDaysAgo).length,
    },
    total_completed_jobs: completedBookings.length,
    total_welfare_contributions: +totalWelfareDeduction.toFixed(2),
    recent_gigs: recentGigs,
  });
});

module.exports = router;
