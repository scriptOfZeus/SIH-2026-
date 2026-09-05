const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api/v1';

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const json = await res.json();
  return { status: res.status, ok: res.ok, body: json };
}

async function testPmkvyAbhishekPipeline() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  TESTING SKILL INDIA / PMKVY ABHISHEK CERTIFICATE OCR');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Authenticate Admin
  const loginRes = await api('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' }),
  });
  assert.strictEqual(loginRes.status, 200);
  const token = loginRes.body.data.token;
  console.log('✅ 1. Admin authenticated.\n');

  // 2. Register Abhishek Rohidas Mavkar
  const phone = `+9197${Date.now().toString().slice(-8)}`;
  const workerRes = await api('/admin/workers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      full_name: 'Abhishek Rohidas Mavkar',
      phone,
      skill_category: 'greenhouse_operator',
    }),
  });
  assert.strictEqual(workerRes.status, 201);
  const worker = workerRes.body.data;
  console.log(`✅ 2. Registered Worker: ${worker.full_name} (ID: ${worker.id})\n`);

  // 3. Upload 800x557 JPEG PMKVY Certificate
  const certPath = path.join(__dirname, 'test_fixtures/cert_pmkvy_abhishek.jpg');
  assert(fs.existsSync(certPath), 'PMKVY Certificate image fixture must exist');
  const certBuffer = fs.readFileSync(certPath);
  const certBase64 = certBuffer.toString('base64');

  console.log('Step 3: Uploading 800x557 JPEG PMKVY Certificate (no hints/mocks)...');
  const uploadRes = await api(`/admin/workers/${worker.id}/upload-certificate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      document_base64: certBase64,
      mime_type: 'image/jpeg',
      filename: 'abhishek_pmkvy_certificate.jpg',
    }),
  });

  assert.strictEqual(uploadRes.status, 200);
  const ocr = uploadRes.body.data.ocr_verification;
  const updatedWorker = uploadRes.body.data.worker;

  console.log('\n--- OCR EXTRACTION EVIDENCE ---');
  console.log('  -> Candidate Name:     ', ocr.ocr_extracted_name);
  console.log('  -> Job Role:           ', ocr.ocr_job_role);
  console.log('  -> Qualification Code: ', ocr.ocr_qualification_code);
  console.log('  -> NSQF Level:         ', ocr.ocr_nsqf_level);
  console.log('  -> Grade:              ', ocr.ocr_grade);
  console.log('  -> Training Location:  ', ocr.ocr_training_location);
  console.log('  -> OCR Status:         ', ocr.ocr_status);
  console.log('  -> Confidence Score:   ', (ocr.ocr_confidence_score * 100).toFixed(1) + '%');
  console.log('  -> Decision Reason:    ', ocr.decision_reason);
  console.log('-------------------------------\n');

  // Verify extraction assertions
  assert(ocr.ocr_extracted_name && ocr.ocr_extracted_name.toLowerCase().includes('abhishek'), 'Extracted name must match Abhishek');
  assert(ocr.ocr_extracted_name.toLowerCase().includes('mavkar'), 'Extracted name must match Mavkar');
  assert(ocr.ocr_job_role && ocr.ocr_job_role.toLowerCase().includes('greenhouse'), 'Extracted job role must match Greenhouse Operator');
  assert(ocr.ocr_qualification_code && ocr.ocr_qualification_code.includes('AGR'), 'Extracted qualification code must match AGR/Q1003');
  assert.strictEqual(ocr.ocr_status, 'matched', 'OCR status must be matched');
  assert.strictEqual(updatedWorker.skill_certificate_verified, 0, 'Newly uploaded cert must be unverified');

  console.log('✅ 3. PMKVY Certificate OCR Extraction & Verification succeeded.\n');

  // 4. Verify DB persistence via GET certificate-document
  console.log('Step 4: Fetching stored certificate document record...');
  const docRes = await api(`/admin/workers/${worker.id}/certificate-document`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(docRes.status, 200);
  assert.strictEqual(docRes.body.data.ocr_status, 'matched');
  assert.strictEqual(docRes.body.data.ocr_extracted_name, ocr.ocr_extracted_name);
  assert.strictEqual(docRes.body.data.ocr_job_role, ocr.ocr_job_role);
  assert.strictEqual(docRes.body.data.ocr_qualification_code, ocr.ocr_qualification_code);
  console.log('✅ 4. All extracted fields verified in Supabase PostgreSQL!\n');

  // 5. Admin verifies certificate and approves worker
  console.log('Step 5: Testing Admin verification and approval...');
  const verifyRes = await api(`/admin/workers/${worker.id}/verify-certificate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
  assert.strictEqual(verifyRes.status, 200);

  const approveRes = await api(`/admin/workers/${worker.id}/verify`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ decision: 'approved' }),
  });
  assert.strictEqual(approveRes.status, 200);
  console.log('✅ 5. Worker partner approved and activated!\n');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ALL PMKVY CERTIFICATE EXTRACTION TESTS PASSED (100%)');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

testPmkvyAbhishekPipeline().catch((err) => {
  console.error('❌ PMKVY Pipeline Test Failed:', err);
  process.exit(1);
});
