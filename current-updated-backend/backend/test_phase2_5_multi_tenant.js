/**
 * Phase 2.5 Multi-Tenant, Supervising Admin, Worker Onboarding & Forecast Distribution Test Suite
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000/api/v1';

async function req(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${endpoint}`, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING PHASE 2.5 MULTI-TENANT & SUPERVISING ADMIN SUITE');
  console.log('================================================================');

  let superToken, fedAToken, fedBToken;
  let fedAId, fedBId;
  let workerAlphaId, independentWorkerId;

  // 1. Supervising Admin Login
  console.log('\n[1] Supervising Admin Login...');
  const superLogin = await req('POST', '/auth/admin/login', {
    email: 'admin@demo.com',
    password: 'admin123',
  });
  assert.strictEqual(superLogin.status, 200, 'Supervising Admin login failed');
  assert.strictEqual(superLogin.data.data.admin.role, 'supervising_admin', 'Role must be supervising_admin');
  superToken = superLogin.data.data.token;
  console.log('✅ Supervising Admin logged in successfully with global role');

  // 2. Supervising Admin creates Federation A
  console.log('\n[2] Supervising Admin creates Federation A...');
  const codeA = `FED-A-${Date.now().toString().slice(-4)}`;
  const createFedA = await req('POST', '/admin/federations', {
    name: 'Maharashtra Skill Federation',
    code: codeA,
    region: 'Western Zone',
    location: 'Pune, Maharashtra',
    admin_name: 'Fed A Admin',
    admin_email: `feda_${Date.now()}@demo.com`,
    admin_password: 'admin123',
  }, superToken);
  assert.strictEqual(createFedA.status, 201, 'Federation A creation failed');
  fedAId = createFedA.data.data.federation.id;
  const fedAEmail = createFedA.data.data.admin.email;
  console.log(`✅ Federation A created (ID: ${fedAId}, Admin: ${fedAEmail})`);

  // 3. Duplicate Federation Code Rejection
  console.log('\n[3] Testing duplicate federation code rejection...');
  const dupCode = await req('POST', '/admin/federations', {
    name: 'Duplicate Fed',
    code: codeA,
  }, superToken);
  assert.strictEqual(dupCode.status, 409, 'Duplicate code should return 409');
  console.log('✅ Duplicate federation code properly rejected (409 Conflict)');

  // 4. Supervising Admin creates Federation B
  console.log('\n[4] Supervising Admin creates Federation B...');
  const codeB = `FED-B-${Date.now().toString().slice(-4)}`;
  const createFedB = await req('POST', '/admin/federations', {
    name: 'Bengaluru Tech Federation',
    code: codeB,
    region: 'Southern Zone',
    location: 'Bengaluru, Karnataka',
    admin_name: 'Fed B Admin',
    admin_email: `fedb_${Date.now()}@demo.com`,
    admin_password: 'admin123',
  }, superToken);
  assert.strictEqual(createFedB.status, 201, 'Federation B creation failed');
  fedBId = createFedB.data.data.federation.id;
  const fedBEmail = createFedB.data.data.admin.email;
  console.log(`✅ Federation B created (ID: ${fedBId}, Admin: ${fedBEmail})`);

  // 5. Federation Admins Login
  console.log('\n[5] Federation Admins Login & Scoping...');
  const fedALogin = await req('POST', '/auth/admin/login', {
    email: fedAEmail,
    password: 'admin123',
  });
  assert.strictEqual(fedALogin.status, 200);
  assert.strictEqual(fedALogin.data.data.admin.role, 'federation_admin');
  assert.strictEqual(fedALogin.data.data.admin.federation_id, fedAId);
  fedAToken = fedALogin.data.data.token;

  const fedBLogin = await req('POST', '/auth/admin/login', {
    email: fedBEmail,
    password: 'admin123',
  });
  assert.strictEqual(fedBLogin.status, 200);
  fedBToken = fedBLogin.data.data.token;
  console.log('✅ Both Federation Admins authenticated with strict federation_id scoping');

  // 6. Federation Admin cannot create federations
  console.log('\n[6] Security: Federation Admin cannot create federations...');
  const fedCreateAttempt = await req('POST', '/admin/federations', {
    name: 'Unauthorized Fed',
  }, fedAToken);
  assert.strictEqual(fedCreateAttempt.status, 403, 'Federation Admin must receive 403 Forbidden');
  console.log('✅ Blocked Federation Admin from creating federations (403 Forbidden)');

  // 7. Federation Admin A queries federations (sees only Federation A)
  console.log('\n[7] Tenant Isolation: Federation Admin list query...');
  const fedAList = await req('GET', '/admin/federations', null, fedAToken);
  assert.strictEqual(fedAList.status, 200);
  assert.strictEqual(fedAList.data.data.length, 1, 'Fed Admin A must see only 1 federation');
  assert.strictEqual(fedAList.data.data[0].id, fedAId);
  console.log('✅ Federation Admin list query strictly returns only own federation');

  // 8. Cross-Tenant Attempt: Federation Admin A cannot query Federation B workers
  console.log('\n[8] Security: Cross-tenant worker access blocked...');
  const crossTenantAttempt = await req('GET', `/admin/workers?federation_id=${fedBId}`, null, fedAToken);
  assert.strictEqual(crossTenantAttempt.status, 403, 'Cross-tenant worker query must fail with 403');
  console.log('✅ Cross-tenant worker query rejected with 403 Forbidden');

  // 9. Federation Admin A registers Worker Alpha
  console.log('\n[9] Federation Admin A registers Worker Alpha...');
  const alphaPhone = `9822${Date.now().toString().slice(-6)}`;
  const regWorker = await req('POST', '/admin/workers', {
    full_name: 'Abhishek Mavkar',
    phone: `+91${alphaPhone}`,
    skill_category: 'agriculture',
    skill_certificate_number: 'PMKVY-AGR-2021-999',
    lat: 18.5204,
    lng: 73.8567,
  }, fedAToken);
  assert.strictEqual(regWorker.status, 201);
  assert.strictEqual(regWorker.data.data.federation_id, fedAId, 'Worker must belong to Fed A');
  assert.strictEqual(regWorker.data.data.worker_type, 'federation', 'Worker type must be federation');
  workerAlphaId = regWorker.data.data.id;
  console.log(`✅ Worker Alpha registered under Federation A (ID: ${workerAlphaId})`);

  // 10. Worker Alpha logs in via Mobile OTP
  console.log('\n[10] Worker Alpha logs in via Mobile OTP...');
  const otpReq = await req('POST', '/auth/otp/request', {
    phone: `+91${alphaPhone}`,
    role: 'worker',
  });
  assert.strictEqual(otpReq.status, 200);

  const otpVer = await req('POST', '/auth/otp/verify', {
    phone: `+91${alphaPhone}`,
    code: '123456',
    role: 'worker',
  });
  assert.strictEqual(otpVer.status, 200);
  assert.strictEqual(otpVer.data.data.worker.id, workerAlphaId);
  console.log('✅ Worker Alpha successfully authenticated via Mobile OTP without duplicate account');

  // 11. Unregistered Phone cannot log in as Federation Worker
  console.log('\n[11] Unregistered Phone Federation Login Check...');
  const unregOtp = await req('POST', '/auth/otp/request', {
    phone: '+919999988888',
    role: 'worker',
  });
  assert.strictEqual(unregOtp.status, 404);
  console.log('✅ Unregistered phone correctly rejected (404 UNKNOWN_NUMBER)');

  // 12. Independent Worker Self-Registration
  console.log('\n[12] Independent Worker Self-Registration...');
  const indepPhone = `9977${Date.now().toString().slice(-6)}`;
  const indepReg = await req('POST', '/workers/register-independent', {
    full_name: 'Suresh Kumar',
    phone: `+91${indepPhone}`,
    skill_category: 'electrician',
    lat: 12.9716,
    lng: 77.5946,
  });
  assert.strictEqual(indepReg.status, 201);
  assert.strictEqual(indepReg.data.data.worker_type, 'independent');
  assert.strictEqual(indepReg.data.data.federation_id, null, 'Independent worker federation_id must be null');
  independentWorkerId = indepReg.data.data.id;
  console.log(`✅ Independent worker self-registered (ID: ${independentWorkerId}, federation_id: null)`);

  // 13. Duplicate Account Prevention: Federation worker cannot self-register as independent
  console.log('\n[13] Duplicate Account Prevention...');
  const dupAttempt = await req('POST', '/workers/register-independent', {
    full_name: 'Abhishek Mavkar Clone',
    phone: `+91${alphaPhone}`,
    skill_category: 'electrician',
  });
  assert.strictEqual(dupAttempt.status, 409, 'Must prevent duplicate registration');
  console.log('✅ Duplicate account prevented (409 Conflict)');

  // 14. Real Certificate Upload & OCR Trigger
  console.log('\n[14] Real Certificate Upload & OCR Trigger...');
  const certFixturePath = path.join(__dirname, 'test_fixtures', 'cert_pmkvy_abhishek.jpg');
  let certBase64 = '';
  if (fs.existsSync(certFixturePath)) {
    certBase64 = fs.readFileSync(certFixturePath).toString('base64');
  } else {
    certBase64 = Buffer.from('FAKE-CERTIFICATE-FOR-TESTING').toString('base64');
  }

  const uploadRes = await req('POST', `/admin/workers/${workerAlphaId}/upload-certificate`, {
    document_base64: certBase64,
    mime_type: 'image/jpeg',
    filename: 'cert_pmkvy_abhishek.jpg',
  }, superToken);
  assert.strictEqual(uploadRes.status, 200);
  assert.strictEqual(uploadRes.data.data.worker.skill_certificate_verified, 0, 'Must NOT auto-approve certificate');
  assert.strictEqual(uploadRes.data.data.worker.final_verification_status, 'pending');
  console.log(`✅ OCR executed. Status: ${uploadRes.data.data.worker.ocr_status}, Final verification remains pending (0)`);

  // 15. Federation Admin cannot perform final certificate verification
  console.log('\n[15] Security: Federation Admin cannot perform final certificate verification...');
  const fedVerifyAttempt = await req('PATCH', `/admin/workers/${workerAlphaId}/verify-certificate`, {
    decision: 'approved',
  }, fedAToken);
  assert.strictEqual(fedVerifyAttempt.status, 403, 'Federation Admin must receive 403');
  console.log('✅ Federation Admin blocked from final certificate approval (403 Forbidden)');

  // 16. Supervising Admin performs Final Approval
  console.log('\n[16] Supervising Admin performs Final Approval...');
  const superVerify = await req('PATCH', `/admin/workers/${workerAlphaId}/verify-certificate`, {
    decision: 'approved',
    override_mismatch: true,
    notes: 'Verified against Skill India PMKVY registry by Supervising Admin',
  }, superToken);
  assert.strictEqual(superVerify.status, 200);
  assert.strictEqual(superVerify.data.data.skill_certificate_verified, 1);
  assert.strictEqual(superVerify.data.data.final_verification_status, 'approved');
  console.log('✅ Certificate finally approved by Supervising Admin');

  // 17. AI Demand Forecast Generation with Dates & Day Names
  console.log('\n[17] AI Demand Forecast Generation with Dates & Day Names...');
  const genForecast = await req('POST', '/admin/forecasts/generate', {
    federation_id: fedAId,
    skill_category: 'agriculture',
    horizon_days: 7,
  }, superToken);
  assert.strictEqual(genForecast.status, 200);
  const items = genForecast.data.data.forecast;
  assert(items.length > 0, 'Forecast items must not be empty');
  assert(items[0].date.match(/^\d{4}-\d{2}-\d{2}$/), 'Must contain canonical date string');
  assert(typeof items[0].day_name === 'string' && items[0].day_name.length > 0, 'Must contain day name');
  console.log(`✅ Forecast generated: ${items[0].day_name}, ${items[0].date} (Predicted: ${items[0].predicted_demand})`);

  // 18. Supervising Admin Publishes Forecast to Federation A
  console.log('\n[18] Supervising Admin Publishes Forecast to Federation A...');
  const pubRes = await req('POST', '/admin/forecasts/publish', {
    federation_id: fedAId,
    items: items,
  }, superToken);
  assert.strictEqual(pubRes.status, 200);
  console.log('✅ Forecast published to Federation A');

  // 19. Tenant Isolation: Federation Admin A sees forecast, Federation Admin B does NOT
  console.log('\n[19] Forecast Visibility Isolation...');
  const fedAForecasts = await req('GET', '/admin/forecasts', null, fedAToken);
  assert.strictEqual(fedAForecasts.status, 200);
  assert(fedAForecasts.data.data.length > 0, 'Fed A must see published forecasts');

  const fedBForecasts = await req('GET', '/admin/forecasts', null, fedBToken);
  assert.strictEqual(fedBForecasts.status, 200);
  assert.strictEqual(fedBForecasts.data.data.length, 0, 'Fed B must see 0 forecasts');
  console.log(`✅ Fed A sees ${fedAForecasts.data.data.length} forecasts, Fed B sees 0 forecasts (Isolated)`);

  // 20. Federation Deactivation Lifecycle
  console.log('\n[20] Federation Deactivation Lifecycle...');
  const deactRes = await req('PATCH', `/admin/federations/${fedBId}`, {
    status: 'inactive',
  }, superToken);
  assert.strictEqual(deactRes.status, 200);
  assert.strictEqual(deactRes.data.data.status, 'inactive');

  const blockedWorkerReg = await req('POST', '/admin/workers', {
    full_name: 'Blocked Worker',
    phone: `+918888${Date.now().toString().slice(-6)}`,
    skill_category: 'plumber',
  }, fedBToken);
  assert.strictEqual(blockedWorkerReg.status, 400, 'Must block worker registration in inactive federation');
  console.log('✅ Inactive federation blocks new worker registrations (400 INACTIVE_FEDERATION)');

  console.log('\n================================================================');
  console.log('🎉 ALL 20 PHASE 2.5 MULTI-TENANT & SECURITY TESTS PASSED!');
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
