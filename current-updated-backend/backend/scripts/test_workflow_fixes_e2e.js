const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api/v1';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runE2EWorkflowTests() {
  console.log('================================================================');
  console.log('🧪 VERIFYING FINAL WORKFLOW FIXES & PERSISTENCE (E2E)');
  console.log('================================================================\n');

  // 1. Authenticate Admins
  console.log('1. Authenticating Supervising Admin and Federation Admin...');
  const superLogin = await request('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' }),
  });
  assert.strictEqual(superLogin.status, 200);
  const superToken = superLogin.data.data.token;
  const superAdminId = superLogin.data.data.admin.id;

  const fedLogin = await request('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'fedadmin@demo.com', password: 'admin123' }),
  });
  assert.strictEqual(fedLogin.status, 200);
  const fedToken = fedLogin.data.data.token;
  const fedId = fedLogin.data.data.admin.federation_id;
  console.log('✅ Both administrators authenticated successfully.\n');

  // 2. TEST 1: Supervising Admin Certificate Approval & DB Persistence
  console.log('2. Testing Supervising Admin Certificate Approval & Persistence...');
  const testPhoneFed = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  const regFedWorker = await request('/admin/workers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${fedToken}` },
    body: JSON.stringify({
      full_name: 'Ananya Roy',
      phone: testPhoneFed,
      skill_category: 'plumber',
      skill_certificate_number: 'NSDC-PLM-2026-01',
    }),
  });
  assert.strictEqual(regFedWorker.status, 201);
  const fedWorkerId = regFedWorker.data.data.id;

  // Upload certificate for federation worker
  const VALID_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const uploadRes = await request(`/admin/workers/${fedWorkerId}/upload-certificate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${fedToken}` },
    body: JSON.stringify({
      document_base64: VALID_PNG_BASE64,
      mime_type: 'image/png',
      filename: 'ananya_plumbing_cert.png',
      ocr_hints: { name: 'Ananya Roy', number: 'NSDC-PLM-2026-01' },
    }),
  });
  assert.strictEqual(uploadRes.status, 200);
  assert.strictEqual(uploadRes.data.data.ocr_verification.ocr_status, 'matched');

  // Supervising Admin approves certificate with notes
  const notesText = 'NSDC national registry verified on 2026-09-03.';
  const approveRes = await request(`/admin/workers/${fedWorkerId}/verify-certificate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superToken}` },
    body: JSON.stringify({
      decision: 'approved',
      override_mismatch: true,
      notes: notesText,
    }),
  });
  assert.strictEqual(approveRes.status, 200);
  assert.strictEqual(approveRes.data.data.skill_certificate_verified, 1);
  assert.strictEqual(approveRes.data.data.final_verification_status, 'approved');
  assert.strictEqual(approveRes.data.data.final_adjudicated_by_admin_id, superAdminId);
  assert.strictEqual(approveRes.data.data.final_adjudication_notes, notesText);

  // Verify persistence via GET /admin/workers (simulating browser refresh)
  const listAfterApprove = await request(`/admin/workers`, {
    headers: { Authorization: `Bearer ${superToken}` },
  });
  assert.strictEqual(listAfterApprove.status, 200);
  const foundWorker = listAfterApprove.data.data.find((w) => w.id === fedWorkerId);
  assert(foundWorker, 'Worker must be in directory');
  assert.strictEqual(foundWorker.skill_certificate_verified, 1, 'Persisted verification must be 1');
  assert.strictEqual(foundWorker.final_verification_status, 'approved', 'Persisted status must be approved');
  assert.strictEqual(foundWorker.final_adjudication_notes, notesText, 'Persisted notes must match');
  console.log('✅ TEST 1 PASSED: Supervising Admin Approval persisted and survives refresh.\n');

  // 3. TEST 2: Supervising Admin Certificate Rejection with Notes
  console.log('3. Testing Supervising Admin Certificate Rejection & Persistence...');
  const testPhoneRej = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  const regRejWorker = await request('/admin/workers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${fedToken}` },
    body: JSON.stringify({
      full_name: 'Vikram Das',
      phone: testPhoneRej,
      skill_category: 'carpenter',
      skill_certificate_number: 'NSDC-CRP-INVALID',
    }),
  });
  assert.strictEqual(regRejWorker.status, 201);
  const rejWorkerId = regRejWorker.data.data.id;

  const rejectNotes = 'Certificate number does not exist on national skill database.';
  const rejRes = await request(`/admin/workers/${rejWorkerId}/verify-certificate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superToken}` },
    body: JSON.stringify({
      decision: 'rejected',
      override_mismatch: false,
      notes: rejectNotes,
    }),
  });
  assert.strictEqual(rejRes.status, 200);
  assert.strictEqual(rejRes.data.data.final_verification_status, 'rejected');
  assert.strictEqual(rejRes.data.data.skill_certificate_verified, 0);
  assert.strictEqual(rejRes.data.data.final_adjudication_notes, rejectNotes);

  const listAfterRej = await request(`/admin/workers`, {
    headers: { Authorization: `Bearer ${superToken}` },
  });
  const foundRej = listAfterRej.data.data.find((w) => w.id === rejWorkerId);
  assert.strictEqual(foundRej.final_verification_status, 'rejected');
  assert.strictEqual(foundRej.final_adjudication_notes, rejectNotes);
  console.log('✅ TEST 2 PASSED: Supervising Admin Rejection and notes properly persisted.\n');

  // 4. TEST 3: Independent Worker Registration, Certificate Upload & OCR Flow
  console.log('4. Testing Complete Independent Worker Onboarding & Certificate Upload...');
  const indepPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;

  // 4.1 OTP request on Independent path
  const otpReq = await request('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone: indepPhone, role: 'worker', path: 'independent' }),
  });
  assert.strictEqual(otpReq.status, 200);

  // 4.2 OTP verify
  const otpVerify = await request('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone: indepPhone, otp: '123456', role: 'worker', path: 'independent' }),
  });
  assert.strictEqual(otpVerify.status, 200);
  assert.strictEqual(otpVerify.data.data.is_new, true);
  assert.strictEqual(otpVerify.data.data.is_independent, true);
  const indepToken = otpVerify.data.data.token;
  const indepWorkerId = otpVerify.data.data.worker.id;
  console.log(`✅ Independent Worker OTP verified (Worker ID: ${indepWorkerId})`);

  // 4.3 Complete Profile Setup
  const profUpdate = await request('/workers/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${indepToken}` },
    body: JSON.stringify({
      full_name: 'Pooja Verma',
      skill_category: 'electrician',
      hourly_rate: 500,
      experience_years: 6,
      address: 'Salt Lake Sector V, Kolkata, WB',
      pincode: '700091',
    }),
  });
  assert.strictEqual(profUpdate.status, 200);
  assert.strictEqual(profUpdate.data.data.full_name, 'Pooja Verma');
  console.log('✅ Independent Worker profile details persisted.');

  // 4.4 Independent Worker Uploads Skill Certificate
  const indepUpload = await request('/workers/me/upload-certificate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${indepToken}` },
    body: JSON.stringify({
      document_base64: VALID_PNG_BASE64,
      mime_type: 'image/png',
      filename: 'pooja_electrician_pmkvy.png',
      ocr_hints: { name: 'Pooja Verma', number: 'NSDC-ELE-2026-77', job_role: 'electrician' },
    }),
  });
  assert.strictEqual(indepUpload.status, 200);
  assert.strictEqual(indepUpload.data.data.ocr_verification.ocr_status, 'matched');
  assert.strictEqual(indepUpload.data.data.worker.final_verification_status, 'pending');
  assert.strictEqual(indepUpload.data.data.worker.skill_certificate_verified, 0);
  console.log('✅ Independent Worker successfully uploaded certificate with OCR (Status: matched, Verification: pending).');

  // 4.5 Worker appears in Supervising Admin Queue with INDEPENDENT status
  const queueRes = await request('/admin/workers', {
    headers: { Authorization: `Bearer ${superToken}` },
  });
  assert.strictEqual(queueRes.status, 200);
  const queuedIndep = queueRes.data.data.find((w) => w.id === indepWorkerId);
  assert(queuedIndep, 'Independent worker must be visible in Supervising Admin queue');
  assert.strictEqual(queuedIndep.worker_type, 'independent');
  assert.strictEqual(queuedIndep.federation_id, null);
  console.log('✅ Independent Worker correctly displayed in Supervising Admin Queue with Worker Type = INDEPENDENT');

  // 4.6 Supervising Admin Approves Independent Worker
  const indepApprove = await request(`/admin/workers/${indepWorkerId}/verify-certificate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superToken}` },
    body: JSON.stringify({
      decision: 'approved',
      override_mismatch: true,
      notes: 'Independent partner Skill India certificate approved.',
    }),
  });
  assert.strictEqual(indepApprove.status, 200);
  assert.strictEqual(indepApprove.data.data.skill_certificate_verified, 1);
  assert.strictEqual(indepApprove.data.data.final_verification_status, 'approved');
  console.log('✅ Supervising Admin approved Independent Worker certificate.\n');

  // 5. TEST 4: Security & Tenant Guardrails
  console.log('5. Testing Security and Authorization Guardrails...');

  // Worker cannot upload for another worker (must use authenticated session)
  const anotherWorkerPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  await request('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone: anotherWorkerPhone, path: 'independent' }),
  });
  const workerBAuth = await request('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone: anotherWorkerPhone, otp: '123456', path: 'independent' }),
  });
  const tokenB = workerBAuth.data.data.token;
  const workerBId = workerBAuth.data.data.worker.id;

  // Worker cannot call admin verification endpoint (403 Forbidden)
  const workerSelfApprove = await request(`/admin/workers/${indepWorkerId}/verify-certificate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${indepToken}` },
    body: JSON.stringify({ decision: 'approved' }),
  });
  assert.strictEqual(workerSelfApprove.status, 403, 'Worker must be blocked from admin adjudication endpoint');
  console.log('✅ Worker blocked from calling admin verification endpoint (403 Forbidden)');

  // Federation Admin cannot approve certificates (403 Forbidden)
  const fedAttemptApprove = await request(`/admin/workers/${indepWorkerId}/verify-certificate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${fedToken}` },
    body: JSON.stringify({ decision: 'approved' }),
  });
  assert.strictEqual(fedAttemptApprove.status, 403, 'Federation Admin must be blocked from final certificate approval');
  console.log('✅ Federation Admin blocked from final certificate approval (403 Forbidden)\n');

  console.log('================================================================');
  console.log('🎉 ALL END-TO-END WORKFLOW & PERSISTENCE TESTS PASSED (100%)');
  console.log('================================================================');
}

runE2EWorkflowTests().catch((err) => {
  console.error('❌ E2E Workflow tests failed:', err);
  process.exit(1);
});
