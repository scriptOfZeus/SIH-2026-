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

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('🧪 VERIFYING AI FORECASTING, REALLOCATION & OCR REGRESSION FIXES');
  console.log('================================================================\n');

  // 1. Authenticate Supervising Admin & Federation Admin
  console.log('1. Authenticating Administrators...');
  const superLogin = await request('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' }),
  });
  assert.strictEqual(superLogin.status, 200);
  const superToken = superLogin.data.data.token;

  const fedLogin = await request('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'fedadmin@demo.com', password: 'admin123' }),
  });
  assert.strictEqual(fedLogin.status, 200);
  const fedToken = fedLogin.data.data.token;
  const fedId = fedLogin.data.data.admin.federation_id;
  console.log(`✅ Admins authenticated (Supervising Admin + Federation Admin for fed_id: ${fedId})\n`);

  // 2. Test AI Demand Forecasting Endpoint (GET /admin/analytics/demand-forecast)
  console.log('2. Testing AI Demand Forecasting (GET /admin/analytics/demand-forecast)...');
  const forecastSuper = await request('/admin/analytics/demand-forecast?horizon_days=7&include_hotspots=true', {
    headers: { Authorization: `Bearer ${superToken}` },
  });
  assert.strictEqual(forecastSuper.status, 200, 'Supervising Admin demand forecast must return 200 OK');
  assert(Array.isArray(forecastSuper.data.data.forecast), 'Forecast items array required');
  assert(forecastSuper.data.data.forecast.length > 0, 'Forecast items must not be empty');
  const sampleFc = forecastSuper.data.data.forecast[0];
  assert(sampleFc.date, 'Date required');
  assert(sampleFc.day_name, 'Day name required');
  assert(sampleFc.predicted_demand !== undefined, 'Predicted demand required');
  assert(sampleFc.hotspot_level !== undefined, 'Hotspot level required');
  console.log(`✅ Supervising Admin Demand Forecast: ${forecastSuper.data.data.forecast.length} items (First item: ${sampleFc.day_name}, ${sampleFc.date} -> ${sampleFc.predicted_demand} predicted, Hotspot: ${sampleFc.hotspot_level})`);

  const forecastFed = await request('/admin/analytics/demand-forecast?horizon_days=7&include_hotspots=true', {
    headers: { Authorization: `Bearer ${fedToken}` },
  });
  assert.strictEqual(forecastFed.status, 200, 'Federation Admin demand forecast must return 200 OK');
  assert(forecastFed.data.data.forecast.length > 0);
  console.log(`✅ Federation Admin Demand Forecast: ${forecastFed.data.data.forecast.length} items successfully loaded\n`);

  // 3. Test Workforce Reallocation Suggestions (GET /admin/analytics/reallocation-suggestions)
  console.log('3. Testing Workforce Reallocation Matrix (GET /admin/analytics/reallocation-suggestions)...');
  const reallocSuper = await request('/admin/analytics/reallocation-suggestions?horizon_days=7', {
    headers: { Authorization: `Bearer ${superToken}` },
  });
  assert.strictEqual(reallocSuper.status, 200, 'Supervising Admin reallocation must return 200 OK');
  assert(reallocSuper.data.data.summary !== undefined);
  assert(Array.isArray(reallocSuper.data.data.regional_balance), 'Regional balance array required');
  console.log(`✅ Supervising Admin Reallocation computed: Deficit ${reallocSuper.data.data.summary.total_deficit}, Surplus ${reallocSuper.data.data.summary.total_surplus}, Recommendations: ${reallocSuper.data.data.reallocation_recommendations.length}`);

  const reallocFed = await request('/admin/analytics/reallocation-suggestions?horizon_days=7', {
    headers: { Authorization: `Bearer ${fedToken}` },
  });
  assert.strictEqual(reallocFed.status, 200, 'Federation Admin reallocation must return 200 OK');
  console.log(`✅ Federation Admin Reallocation computed successfully for own federation scope\n`);

  // 4. Test Worker Verification & OCR for BOTH Federation Admin and Supervising Admin
  console.log('4. Testing Worker Verification & OCR Workflows...');

  // 4.1 Register a new test worker under Pilot Federation
  const testPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  const regWorker = await request('/admin/workers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${fedToken}` },
    body: JSON.stringify({
      full_name: 'Siddharth Sharma',
      phone: testPhone,
      skill_category: 'electrician',
      skill_certificate_number: 'NSDC-ELE-2026-99',
    }),
  });
  assert.strictEqual(regWorker.status, 201);
  const workerId = regWorker.data.data.id;
  console.log(`✅ Worker registered under Pilot Federation: ${regWorker.data.data.full_name} (ID: ${workerId})`);

  // 4.2 Federation Admin uploads certificate for their worker & triggers OCR
  const VALID_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const uploadFed = await request(`/admin/workers/${workerId}/upload-certificate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${fedToken}` },
    body: JSON.stringify({
      document_base64: VALID_PNG_BASE64,
      mime_type: 'image/png',
      filename: 'siddharth_cert.png',
      ocr_hints: { name: 'Siddharth Sharma', number: 'NSDC-ELE-2026-99' },
    }),
  });
  assert.strictEqual(uploadFed.status, 200, 'Federation Admin certificate upload must return 200 OK');
  assert.strictEqual(uploadFed.data.data.ocr_verification.ocr_status, 'matched');
  assert.strictEqual(uploadFed.data.data.worker.final_verification_status, 'pending', 'Final verification must reset to pending on new upload');
  console.log(`✅ Federation Admin successfully uploaded certificate & executed OCR (Status: ${uploadFed.data.data.ocr_verification.ocr_status})`);

  // 4.3 Federation Admin attempts final adjudication -> Must be blocked (403 Forbidden)
  const fedAdjudicate = await request(`/admin/workers/${workerId}/verify-certificate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${fedToken}` },
    body: JSON.stringify({ decision: 'approved', override_mismatch: true }),
  });
  assert.strictEqual(fedAdjudicate.status, 403, 'Federation Admin must be blocked from final verification');
  console.log('✅ Federation Admin correctly blocked from final certificate approval (403 Forbidden)');

  // 4.4 Supervising Admin performs Final Human Adjudication (Approves certificate)
  const superAdjudicate = await request(`/admin/workers/${workerId}/verify-certificate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superToken}` },
    body: JSON.stringify({
      decision: 'approved',
      override_mismatch: true,
      notes: 'Certificate verified against national portal.',
    }),
  });
  assert.strictEqual(superAdjudicate.status, 200, 'Supervising Admin adjudication must return 200 OK');
  assert.strictEqual(superAdjudicate.data.data.skill_certificate_verified, 1);
  assert.strictEqual(superAdjudicate.data.data.final_verification_status, 'approved');
  assert.strictEqual(superAdjudicate.data.data.final_adjudication_notes, 'Certificate verified against national portal.');
  console.log('✅ Supervising Admin successfully performed Final Human Adjudication (Status: approved)');

  // 4.5 Supervising Admin activates worker partner
  const superVerify = await request(`/admin/workers/${workerId}/verify`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superToken}` },
    body: JSON.stringify({ decision: 'approved', notes: 'Activated partner.' }),
  });
  assert.strictEqual(superVerify.status, 200);
  assert.strictEqual(superVerify.data.data.verification_status, 'approved');
  console.log('✅ Supervising Admin activated worker account for dispatch\n');

  console.log('================================================================');
  console.log('🎉 ALL AI FORECASTING, REALLOCATION & OCR REGRESSION TESTS PASSED!');
  console.log('================================================================');
}

runRegressionSuite().catch((err) => {
  console.error('❌ Regression suite failed:', err);
  process.exit(1);
});
