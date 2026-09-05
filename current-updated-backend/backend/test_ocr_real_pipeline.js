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

async function testRealOcrPipeline() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  TESTING REAL CERTIFICATE OCR EXTRACTION & VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Authenticate Admin
  const loginRes = await api('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' }),
  });
  assert.strictEqual(loginRes.status, 200);
  const token = loginRes.body.data.token;
  console.log('✅ 1. Admin authenticated successfully.\n');

  // 2. Register test worker: Ramesh Kumar
  const workerRes = await api('/admin/workers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      full_name: 'Ramesh Kumar',
      phone: `+9196${Date.now().toString().slice(-8)}`,
      skill_category: 'electrician',
      skill_certificate_number: 'NSDC-ELEC-2026-8839',
    }),
  });
  assert.strictEqual(workerRes.status, 201);
  const worker = workerRes.body.data;
  console.log(`✅ 2. Registered Worker Partner: ${worker.full_name} (${worker.skill_certificate_number}) - ID: ${worker.id}\n`);

  // 3. Upload REAL readable Certificate Image (NO mock_ocr / NO ocr_hints passed)
  const realCertPath = path.join(__dirname, 'test_fixtures/cert_ramesh_kumar.png');
  const realCertBuffer = fs.readFileSync(realCertPath);
  const realCertBase64 = realCertBuffer.toString('base64');

  console.log('Step 3: Uploading REAL readable PNG certificate to OCR pipeline (no hints/mocks)...');
  const uploadRes = await api(`/admin/workers/${worker.id}/upload-certificate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      document_base64: realCertBase64,
      mime_type: 'image/png',
      filename: 'ramesh_kumar_certificate.png',
      // Notice: NO ocr_hints or mock_ocr provided!
    }),
  });

  assert.strictEqual(uploadRes.status, 200);
  const ocr = uploadRes.body.data.ocr_verification;
  const updatedWorker = uploadRes.body.data.worker;

  console.log('  -> OCR Extracted Name:', ocr.ocr_extracted_name);
  console.log('  -> OCR Extracted Number:', ocr.ocr_extracted_number);
  console.log('  -> OCR Confidence Score:', (ocr.ocr_confidence_score * 100).toFixed(1) + '%');
  console.log('  -> OCR Status:', ocr.ocr_status);
  console.log('  -> Decision Reason:', ocr.decision_reason);
  console.log('  -> Document URL:', uploadRes.body.data.document.document_url);

  assert.strictEqual(ocr.ocr_status, 'matched', 'Real certificate text must match database record');
  assert(ocr.ocr_extracted_name.toLowerCase().includes('ramesh'), 'Extracted name must contain Ramesh');
  assert(ocr.ocr_extracted_number.toUpperCase().includes('NSDC'), 'Extracted number must contain NSDC');
  assert.strictEqual(updatedWorker.skill_certificate_verified, 0, 'Newly uploaded cert must be unverified until approved');
  console.log('✅ 3. Real Certificate OCR extraction and automated match PASSED!\n');

  // 4. Inspect Document Metadata Endpoint
  console.log('Step 4: Fetching stored certificate document metadata...');
  const docRes = await api(`/admin/workers/${worker.id}/certificate-document`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(docRes.status, 200);
  assert.strictEqual(docRes.body.data.ocr_status, 'matched');
  assert.strictEqual(docRes.body.data.ocr_extracted_name, ocr.ocr_extracted_name);
  console.log('✅ 4. Certificate document metadata endpoint verified.\n');

  // 5. Test Mismatched Real Certificate Image
  console.log('Step 5: Uploading Mismatched Certificate Image (Suresh Patil vs Ramesh Kumar)...');
  const mismatchCertPath = path.join(__dirname, 'test_fixtures/cert_mismatched_suresh.png');
  const mismatchBuffer = fs.readFileSync(mismatchCertPath);
  const mismatchBase64 = mismatchBuffer.toString('base64');

  const mismatchRes = await api(`/admin/workers/${worker.id}/upload-certificate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      document_base64: mismatchBase64,
      mime_type: 'image/png',
      filename: 'suresh_mismatch_cert.png',
    }),
  });

  assert.strictEqual(mismatchRes.status, 200);
  const mismatchOcr = mismatchRes.body.data.ocr_verification;
  console.log('  -> OCR Extracted Name:', mismatchOcr.ocr_extracted_name);
  console.log('  -> OCR Extracted Number:', mismatchOcr.ocr_extracted_number);
  console.log('  -> OCR Status:', mismatchOcr.ocr_status);
  console.log('  -> Decision Reason:', mismatchOcr.decision_reason);
  assert.strictEqual(mismatchOcr.ocr_status, 'mismatch', 'Mismatched certificate must be flagged as mismatch');
  console.log('✅ 5. Mismatched certificate detection PASSED!\n');

  // 6. Test Unreadable / Noisy Image
  console.log('Step 6: Uploading Unreadable / Noisy Image...');
  const noisyCertPath = path.join(__dirname, 'test_fixtures/cert_unreadable_noisy.png');
  const noisyBuffer = fs.readFileSync(noisyCertPath);
  const noisyBase64 = noisyBuffer.toString('base64');

  const noisyRes = await api(`/admin/workers/${worker.id}/upload-certificate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      document_base64: noisyBase64,
      mime_type: 'image/png',
      filename: 'noisy_scan.png',
    }),
  });

  assert.strictEqual(noisyRes.status, 200);
  const noisyOcr = noisyRes.body.data.ocr_verification;
  console.log('  -> OCR Status:', noisyOcr.ocr_status);
  console.log('  -> Extracted Name:', noisyOcr.ocr_extracted_name);
  console.log('  -> Extracted Number:', noisyOcr.ocr_extracted_number);
  assert.strictEqual(noisyOcr.ocr_status, 'manual_review_needed', 'Unreadable image must flag manual_review_needed');
  console.log('✅ 6. Unreadable image handling PASSED!\n');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ALL REAL OCR EXTRACTION PIPELINE TESTS SUCCEEDED! (100%)');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

testRealOcrPipeline().catch((err) => {
  console.error('❌ OCR Pipeline Test Failure:', err);
  process.exit(1);
});
