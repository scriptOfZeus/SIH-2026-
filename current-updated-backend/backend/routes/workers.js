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

// POST /admin/workers — Admin only — create worker record
router.post('/admin/workers', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const { full_name, phone, skill_category, skill_certificate_number, lat, lng } = req.body;
  if (!full_name || !phone || !skill_category || !skill_certificate_number) {
    return fail(res, 'BAD_REQUEST', 'full_name, phone, skill_category, skill_certificate_number required');
  }
  const existing = await db.get('SELECT id FROM workers WHERE phone = ?', [phone]);
  if (existing) return fail(res, 'DUPLICATE_PHONE', 'A worker with this phone already exists', 409);

  const id = uuidv4();
  const workerLat = (lat !== undefined && lat !== null) ? Number(lat) : null;
  const workerLng = (lng !== undefined && lng !== null) ? Number(lng) : null;

  await db.run(`
    INSERT INTO workers (id, federation_id, added_by_admin_id, full_name, phone, skill_category, skill_certificate_number, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, req.federationId, req.user.id, full_name, phone, skill_category, skill_certificate_number, workerLat, workerLng]);

  const worker = await db.get('SELECT * FROM workers WHERE id = ?', [id]);
  return ok(res, worker, 201);
});

// POST /admin/workers/:id/upload-certificate — Upload & OCR verify certificate document
router.post('/admin/workers/:id/upload-certificate', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const worker = await db.get('SELECT * FROM workers WHERE id = ? AND federation_id = ?', [req.params.id, req.federationId]);
  if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found in your federation', 404);

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

  // 1. Safe storage
  let storageResult;
  try {
    storageResult = saveCertificateDocument({
      workerId: worker.id,
      buffer,
      mimeType: mime_type,
      originalFilename: filename || 'certificate.png',
    });
  } catch (storageErr) {
    return fail(res, storageErr.code || 'STORAGE_ERROR', storageErr.message, storageErr.statusCode || 400);
  }

  // 2. Automated OCR Extraction & Verification
  let ocrResult;
  try {
    ocrResult = await processAndVerifyCertificate({
      buffer,
      mimeType: mime_type,
      worker,
      hints: ocr_hints || mock_ocr || null,
    });
  } catch (ocrErr) {
    return fail(res, 'OCR_PROCESSING_ERROR', `OCR processing failed: ${ocrErr.message}`, 500);
  }

  // 3. Persist OCR extraction and document URL to worker record
  await db.run(`
    UPDATE workers SET
      certificate_document_url = ?,
      ocr_extracted_name = ?,
      ocr_extracted_number = ?,
      ocr_confidence_score = ?,
      ocr_status = ?
    WHERE id = ? AND federation_id = ?
  `, [
    storageResult.document_url,
    ocrResult.ocr_extracted_name,
    ocrResult.ocr_extracted_number,
    ocrResult.ocr_confidence_score,
    ocrResult.ocr_status,
    worker.id,
    req.federationId,
  ]);

  const updatedWorker = await db.get('SELECT * FROM workers WHERE id = ? AND federation_id = ?', [worker.id, req.federationId]);

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

// GET /admin/workers/:id/certificate-document — View stored certificate metadata
router.get('/admin/workers/:id/certificate-document', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const worker = await db.get('SELECT * FROM workers WHERE id = ? AND federation_id = ?', [req.params.id, req.federationId]);
  if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found in your federation', 404);

  if (!worker.certificate_document_url) {
    return fail(res, 'NO_DOCUMENT', 'No certificate document has been uploaded for this worker', 404);
  }

  return ok(res, {
    worker_id: worker.id,
    full_name: worker.full_name,
    document_url: worker.certificate_document_url,
    ocr_status: worker.ocr_status,
    ocr_confidence_score: worker.ocr_confidence_score,
    ocr_extracted_name: worker.ocr_extracted_name,
    ocr_extracted_number: worker.ocr_extracted_number,
  });
});

// PATCH /admin/workers/:id/verify-certificate — Admin only (Tenant Scoped)
router.patch('/admin/workers/:id/verify-certificate', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const worker = await db.get('SELECT * FROM workers WHERE id = ? AND federation_id = ?', [req.params.id, req.federationId]);
  if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found in your federation', 404);

  // Safety guard: prevent accidental bypass if OCR detected a clear mismatch
  if (worker.ocr_status === 'mismatch' && !req.body.override_mismatch) {
    return fail(res, 'OCR_MISMATCH', 'Cannot verify certificate: OCR detected mismatch with worker name or certificate number. Provide override_mismatch=true if manually confirmed.', 400);
  }

  await db.run(`
    UPDATE workers SET skill_certificate_verified = 1, skill_certificate_verified_at = datetime('now')
    WHERE id = ? AND federation_id = ?
  `, [req.params.id, req.federationId]);

  const updatedWorker = await db.get('SELECT * FROM workers WHERE id = ? AND federation_id = ?', [req.params.id, req.federationId]);
  return ok(res, updatedWorker);
});

// PATCH /admin/workers/:id/verify — Admin only — approve/reject (Tenant Scoped)
router.patch('/admin/workers/:id/verify', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const { decision } = req.body; // 'approved' | 'rejected'
  if (!['approved', 'rejected'].includes(decision)) {
    return fail(res, 'BAD_REQUEST', 'decision must be approved or rejected');
  }
  const worker = await db.get('SELECT * FROM workers WHERE id = ? AND federation_id = ?', [req.params.id, req.federationId]);
  if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found in your federation', 404);

  if (decision === 'approved' && !worker.skill_certificate_verified) {
    return fail(res, 'CERT_NOT_VERIFIED', 'Cannot approve before certificate is verified', 400);
  }

  await db.run('UPDATE workers SET verification_status = ? WHERE id = ? AND federation_id = ?', [decision, req.params.id, req.federationId]);
  const updatedWorker = await db.get('SELECT * FROM workers WHERE id = ? AND federation_id = ?', [req.params.id, req.federationId]);
  return ok(res, updatedWorker);
});

// GET /workers/me — worker's own profile
router.get('/workers/me', requireAuth, requireRole('worker'), async (req, res) => {
  const worker = await db.get('SELECT * FROM workers WHERE id = ?', [req.user.id]);
  if (!worker) return fail(res, 'NOT_FOUND', 'Worker not found', 404);
  return ok(res, worker);
});

// PATCH /workers/me — worker updates own location only
router.patch('/workers/me', requireAuth, requireRole('worker'), async (req, res) => {
  const { lat, lng } = req.body;
  if (lat === undefined || lng === undefined) return fail(res, 'BAD_REQUEST', 'lat and lng required');
  await db.run('UPDATE workers SET lat = ?, lng = ? WHERE id = ?', [lat, lng, req.user.id]);
  const updatedWorker = await db.get('SELECT * FROM workers WHERE id = ?', [req.user.id]);
  return ok(res, updatedWorker);
});

// GET /workers/nearby?lat=&lng=&skill_category=&radius_km=
router.get('/workers/nearby', async (req, res) => {
  const { lat, lng, skill_category, radius_km } = req.query;
  if (!lat || !lng || !skill_category || !radius_km) {
    return fail(res, 'BAD_REQUEST', 'lat, lng, skill_category, radius_km are required');
  }
  const candidates = await db.all(`
    SELECT * FROM workers
    WHERE skill_category = ? AND verification_status = 'approved' AND lat IS NOT NULL AND lng IS NOT NULL
  `, [skill_category]);

  const nearby = candidates
    .map(w => ({ ...w, distance_km: haversineKm(+lat, +lng, w.lat, w.lng) }))
    .filter(w => w.distance_km <= +radius_km)
    .sort((a, b) => a.distance_km - b.distance_km);

  return ok(res, nearby);
});

// GET /admin/workers — list all in tenant federation, filter by verification_status
router.get('/admin/workers', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const { verification_status } = req.query;
  const rows = verification_status
    ? await db.all('SELECT * FROM workers WHERE federation_id = ? AND verification_status = ? ORDER BY created_at DESC', [req.federationId, verification_status])
    : await db.all('SELECT * FROM workers WHERE federation_id = ? ORDER BY created_at DESC', [req.federationId]);
  return ok(res, rows);
});

module.exports = router;
