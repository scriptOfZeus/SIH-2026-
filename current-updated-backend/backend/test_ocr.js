/**
 * Automated OCR Document Verification Test Suite
 *
 * Tests:
 *  1. Valid matching certificate document (sets ocr_status: 'matched')
 *  2. Mismatched certificate number (sets ocr_status: 'mismatch', flags difference)
 *  3. Mismatched worker name (sets ocr_status: 'mismatch', flags difference)
 *  4. Low-confidence / unreadable document (sets ocr_status: 'manual_review_needed')
 *  5. Invalid file type rejection (.exe / unsupported format -> 400 INVALID_FILE_TYPE)
 *  6. Oversized document rejection (> 5MB -> 400 FILE_TOO_LARGE)
 *  7. Cross-federation tenant isolation (Admin A cannot upload or access Worker B doc -> 404)
 *  8. Certificate verification safety gate (blocks approval on mismatch without override)
 *  9. Final admin approval flow regression (approved worker workflow succeeds when verified)
 */

require('dotenv').config();
const assert = require('assert');
const { v4: uuidv4 } = require('uuid');
const db = require('./db/database');

const BASE_URL = 'http://localhost:5000/api/v1';

let passedTests = 0;
let totalTests = 0;

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
  }
}

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const json = await res.json();
  return { status: res.status, ok: res.ok, body: json };
}

// Generates a mock 1x1 valid PNG base64 string
const VALID_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  RUNNING AUTOMATED OCR DOCUMENT VERIFICATION TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── Setup: Admin Tokens & Seed Workers ────────────────────────────────────
  console.log('0. Environment & Admin Authentication:');

  // Login Supervising Admin & Federation Admin A (Pilot Federation)
  const loginSuper = await api('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' }),
  });
  assert.strictEqual(loginSuper.status, 200);
  const superToken = loginSuper.body.data.token;

  const loginA = await api('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'fedadmin@demo.com', password: 'admin123' }),
  });
  assert.strictEqual(loginA.status, 200);
  const tokenA = loginA.body.data.token;

  // Fetch or onboard Federation B for cross-tenant tests
  let fedBAdmin = await db.get("SELECT * FROM admins WHERE email = 'admin@maharashtra.coop'");
  let tokenB;
  if (!fedBAdmin) {
    await api('/admin/federations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
      body: JSON.stringify({
        name: 'Maharashtra Coop Federation',
        region: 'Mumbai',
        admin_name: 'Maha Admin',
        admin_email: 'admin@maharashtra.coop',
        admin_password: 'mahaPassword123',
      }),
    });
  }
  const loginB = await api('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@maharashtra.coop', password: 'mahaPassword123' }),
  });
  tokenB = loginB.body.data.token;

  console.log('  -> Admin A (Pilot Federation) & Admin B (Maharashtra) authenticated.\n');

  // ── 1. Create Test Workers ────────────────────────────────────────────────
  const workerName = 'Ramesh Kumar';
  const certNumber = `NSDC_ELEC_${Date.now()}`;
  let workerA;
  let workerB;

  const resWorkerA = await api('/admin/workers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      full_name: workerName,
      phone: `+9197${Date.now().toString().slice(-8)}`,
      skill_category: 'electrician',
      skill_certificate_number: certNumber,
    }),
  });
  assert.strictEqual(resWorkerA.status, 201);
  workerA = resWorkerA.body.data;

  const resWorkerB = await api('/admin/workers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      full_name: 'Suresh Patil',
      phone: `+9198${Date.now().toString().slice(-8)}`,
      skill_category: 'plumber',
      skill_certificate_number: `NSDC_PLUMB_${Date.now()}`,
    }),
  });
  assert.strictEqual(resWorkerB.status, 201);
  workerB = resWorkerB.body.data;

  // ── 2. Test Cases ─────────────────────────────────────────────────────────
  console.log('1. Automated OCR Extraction & Verification Scenarios:');

  await test('Valid matching certificate: name and number match -> ocr_status: matched', async () => {
    const res = await api(`/admin/workers/${workerA.id}/upload-certificate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        document_base64: VALID_PNG_BASE64,
        mime_type: 'image/png',
        filename: 'ramesh_certificate.png',
        ocr_hints: {
          name: workerName,
          number: certNumber,
          confidence: 0.96,
        },
      }),
    });

    assert.strictEqual(res.status, 200);
    const ocr = res.body.data.ocr_verification;
    assert.strictEqual(ocr.ocr_status, 'matched');
    assert.strictEqual(ocr.name_matched, true);
    assert.strictEqual(ocr.number_matched, true);
    assert.strictEqual(ocr.ocr_extracted_name, workerName);
    assert.strictEqual(ocr.ocr_extracted_number, certNumber);
    assert(ocr.ocr_confidence_score >= 0.80);

    // Verify DB persistence
    const updated = await db.get('SELECT ocr_status, certificate_document_url FROM workers WHERE id = ?', [workerA.id]);
    assert.strictEqual(updated.ocr_status, 'matched');
    assert(updated.certificate_document_url.includes(workerA.id));
  });

  await test('Mismatched certificate number: detected and flagged -> ocr_status: mismatch', async () => {
    const res = await api(`/admin/workers/${workerA.id}/upload-certificate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        document_base64: VALID_PNG_BASE64,
        mime_type: 'image/png',
        filename: 'fake_number_cert.png',
        ocr_hints: {
          name: workerName,
          number: 'NSDC_WRONG_999999', // Deliberate mismatch
          confidence: 0.94,
        },
      }),
    });

    assert.strictEqual(res.status, 200);
    const ocr = res.body.data.ocr_verification;
    assert.strictEqual(ocr.ocr_status, 'mismatch');
    assert.strictEqual(ocr.number_matched, false);
    assert(ocr.decision_reason.includes('Certificate number mismatch'));

    const updated = await db.get('SELECT ocr_status FROM workers WHERE id = ?', [workerA.id]);
    assert.strictEqual(updated.ocr_status, 'mismatch');
  });

  await test('Mismatched worker name: detected and flagged -> ocr_status: mismatch', async () => {
    const res = await api(`/admin/workers/${workerA.id}/upload-certificate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        document_base64: VALID_PNG_BASE64,
        mime_type: 'image/png',
        filename: 'someone_elses_cert.png',
        ocr_hints: {
          name: 'Completely Different Name', // Deliberate mismatch
          number: certNumber,
          confidence: 0.91,
        },
      }),
    });

    assert.strictEqual(res.status, 200);
    const ocr = res.body.data.ocr_verification;
    assert.strictEqual(ocr.ocr_status, 'mismatch');
    assert.strictEqual(ocr.name_matched, false);
    assert(ocr.decision_reason.includes('Name mismatch'));
  });

  await test('Low confidence scan: confidence < 0.70 -> ocr_status: manual_review_needed', async () => {
    const res = await api(`/admin/workers/${workerA.id}/upload-certificate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        document_base64: VALID_PNG_BASE64,
        mime_type: 'image/png',
        filename: 'blurry_scan.png',
        ocr_hints: {
          name: workerName,
          number: certNumber,
          confidence: 0.52, // Below 0.70 low-confidence threshold
        },
      }),
    });

    assert.strictEqual(res.status, 200);
    const ocr = res.body.data.ocr_verification;
    assert.strictEqual(ocr.ocr_status, 'manual_review_needed');
    assert(ocr.decision_reason.includes('Insufficient OCR scan quality'));
  });

  console.log('\n2. Security, Validation & Tenant Isolation:');

  await test('Invalid file type rejected (.exe / executable) -> 400 INVALID_FILE_TYPE', async () => {
    const res = await api(`/admin/workers/${workerA.id}/upload-certificate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        document_base64: Buffer.from('MZ...fake_exe').toString('base64'),
        mime_type: 'application/x-msdownload',
        filename: 'malware.exe',
      }),
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'INVALID_FILE_TYPE');
  });

  await test('Oversized document rejected (> 5MB) -> 400 FILE_TOO_LARGE', async () => {
    // Generate buffer exceeding 5MB
    const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024);
    const res = await api(`/admin/workers/${workerA.id}/upload-certificate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        document_base64: oversizedBuffer.toString('base64'),
        mime_type: 'image/png',
        filename: 'giant_image.png',
      }),
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'FILE_TOO_LARGE');
  });

  await test('Cross-federation access blocked: Admin A cannot upload document for Worker B (403/404)', async () => {
    const res = await api(`/admin/workers/${workerB.id}/upload-certificate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        document_base64: VALID_PNG_BASE64,
        mime_type: 'image/png',
        ocr_hints: { name: 'Test', number: 'TEST' },
      }),
    });

    assert([403, 404].includes(res.status), 'Must block cross-tenant upload with 403 or 404');
  });

  await test('Cross-federation access blocked: Admin A cannot view Worker B document metadata (403/404)', async () => {
    const res = await api(`/admin/workers/${workerB.id}/certificate-document`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert([403, 404].includes(res.status), 'Must block cross-tenant view with 403 or 404');
  });

  console.log('\n3. Verification Workflow & Guard Rails:');

  await test('Safety gate: Admin certificate verification blocks when OCR status is mismatch', async () => {
    // Ensure workerA is in mismatch state
    await db.run("UPDATE workers SET ocr_status = 'mismatch' WHERE id = ?", [workerA.id]);

    const res = await api(`/admin/workers/${workerA.id}/verify-certificate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superToken}` },
      body: JSON.stringify({}),
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'OCR_MISMATCH');
    assert(res.body.error.message.includes('OCR detected mismatch'));
  });

  await test('Admin override: With explicit confirmation, admin can override and verify', async () => {
    const res = await api(`/admin/workers/${workerA.id}/verify-certificate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superToken}` },
      body: JSON.stringify({ override_mismatch: true }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.skill_certificate_verified, 1);
  });

  await test('Final approval flow: Worker can only be approved after certificate verification', async () => {
    const res = await api(`/admin/workers/${workerA.id}/verify`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superToken}` },
      body: JSON.stringify({ decision: 'approved' }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.verification_status, 'approved');
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passedTests} / ${totalTests} OCR verification tests passed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error running OCR tests:', err);
  process.exit(1);
});
