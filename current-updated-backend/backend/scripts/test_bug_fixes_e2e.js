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

async function runTests() {
  console.log('================================================================');
  console.log('🔍 RUNNING COMPREHENSIVE BUG 1 & BUG 2 VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // BUG 1: WORKER ONBOARDING & TWO-PATH ROUTING TESTS
  // -------------------------------------------------------------
  console.log('--- TESTING BUG 1: WORKER ONBOARDING PATHS ---');

  // Test 1.1: Unknown phone on Federation Worker path -> Must be rejected (404)
  const randomFedPhone = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
  console.log(`1.1 Testing unknown phone (${randomFedPhone}) on Federation path...`);
  const reqFedRes = await request('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone: randomFedPhone, role: 'worker' }),
  });
  assert.strictEqual(reqFedRes.status, 404, 'Unknown federation phone must return 404 on OTP request');
  assert(reqFedRes.data?.error?.message?.includes('not registered by a federation'));
  console.log('✅ 1.1 Unknown phone on Federation path correctly rejected with 404.\n');

  // Test 1.2: Seeded/Registered Federation worker -> Login succeeds, profile_completed = true
  const fedWorkerPhone = '+917000000099';
  console.log(`1.2 Testing registered federation worker (${fedWorkerPhone})...`);
  const reqRegFed = await request('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone: fedWorkerPhone, role: 'worker' }),
  });
  assert.strictEqual(reqRegFed.status, 200);

  const verRegFed = await request('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone: fedWorkerPhone, code: '123456', role: 'worker' }),
  });
  assert.strictEqual(verRegFed.status, 200);
  assert.strictEqual(verRegFed.data.data.is_new, false);
  assert.strictEqual(verRegFed.data.data.is_independent, false);
  assert.strictEqual(verRegFed.data.data.profile_completed, true);
  assert(verRegFed.data.data.token, 'Token must be issued');
  console.log('✅ 1.2 Registered federation worker logs in directly (profile_completed: true).\n');

  // Test 1.3: New/Random phone on Independent Worker path -> OTP succeeds, is_new: true, profile_completed: false
  const randomIndepPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  console.log(`1.3 Testing new phone (${randomIndepPhone}) on Independent Worker path...`);
  const reqIndep = await request('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone: randomIndepPhone, role: 'independent_worker' }),
  });
  assert.strictEqual(reqIndep.status, 200);

  const verIndep = await request('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone: randomIndepPhone, code: '123456', role: 'independent_worker' }),
  });
  assert.strictEqual(verIndep.status, 200);
  assert.strictEqual(verIndep.data.data.is_new, true, 'Brand new independent worker must have is_new = true');
  assert.strictEqual(verIndep.data.data.is_independent, true);
  assert.strictEqual(verIndep.data.data.profile_completed, false, 'New independent worker must have profile_completed = false');
  const indepToken = verIndep.data.data.token;
  assert(indepToken, 'Onboarding token must be provided');
  console.log('✅ 1.3 New independent worker correctly flagged for profiling (is_new: true, profile_completed: false).\n');

  // Test 1.4: Independent Worker completes profiling via PATCH /workers/me
  console.log('1.4 Testing Independent Worker profile completion...');
  const patchProfile = await request('/workers/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${indepToken}` },
    body: JSON.stringify({
      full_name: 'Ananya Deshmukh',
      skill_category: 'electrician',
      hourly_rate: 550,
      experience_years: 5,
      address: 'Shivaji Nagar, Pune, Maharashtra',
      pincode: '411005',
    }),
  });
  assert.strictEqual(patchProfile.status, 200);
  assert.strictEqual(patchProfile.data.data.full_name, 'Ananya Deshmukh');
  assert.strictEqual(patchProfile.data.data.skill_category, 'electrician');
  assert.strictEqual(patchProfile.data.data.hourly_rate, 550);
  console.log('✅ 1.4 Independent worker profile details successfully persisted.\n');

  // Test 1.5: Subsequent login for now-completed Independent Worker -> profile_completed = true
  console.log('1.5 Testing subsequent login for established Independent Worker...');
  const verIndep2 = await request('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone: randomIndepPhone, code: '123456', role: 'independent_worker' }),
  });
  assert.strictEqual(verIndep2.status, 200);
  assert.strictEqual(verIndep2.data.data.is_new, false, 'Established independent worker is not new');
  assert.strictEqual(verIndep2.data.data.profile_completed, true, 'Profile is now complete');
  console.log('✅ 1.5 Established independent worker logs in with profile_completed = true.\n');

  // Test 1.6: Duplicate Prevention: Attempting to register existing Federation Worker phone as Independent
  console.log(`1.6 Testing duplicate block: Registering ${fedWorkerPhone} as Independent Worker...`);
  const dupReq = await request('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone: fedWorkerPhone, role: 'independent_worker' }),
  });
  assert.strictEqual(dupReq.status, 409, 'Must return 409 Conflict when federation phone tries independent registration');
  console.log('✅ 1.6 Duplicate worker registration properly blocked with 409 Conflict.\n');

  // -------------------------------------------------------------
  // BUG 2: ADMIN LOGIN & AUTHENTICATION STATE TESTS
  // -------------------------------------------------------------
  console.log('--- TESTING BUG 2: ADMIN AUTH & FEDERATION INITIALIZATION ---');

  // Test 2.1: Supervising Admin Login
  console.log('2.1 Testing Supervising Admin login...');
  const superLogin = await request('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' }),
  });
  assert.strictEqual(superLogin.status, 200);
  assert(superLogin.data.data.token, 'Token required');
  assert.strictEqual(superLogin.data.data.admin.role, 'supervising_admin');
  assert.strictEqual(superLogin.data.data.admin.federation_id, null);
  const superToken = superLogin.data.data.token;
  console.log('✅ 2.1 Supervising Admin login successful (role: supervising_admin, federation_id: null).\n');

  // Test 2.2: Supervising Admin calls /admin/federations/current -> Returns 200 OK Global View (no 404/401)
  console.log('2.2 Testing /admin/federations/current for Supervising Admin...');
  const superCurrentFed = await request('/admin/federations/current', {
    headers: { Authorization: `Bearer ${superToken}` },
  });
  assert.strictEqual(superCurrentFed.status, 200);
  assert.strictEqual(superCurrentFed.data.data.id, null);
  assert(superCurrentFed.data.data.name.includes('Global') || superCurrentFed.data.data.name.includes('All Federations'));
  console.log('✅ 2.2 Supervising Admin /federations/current safely returns 200 OK Global View without error.\n');

  // Test 2.3: Supervising Admin fetches all federations
  console.log('2.3 Testing /admin/federations for Supervising Admin...');
  const allFeds = await request('/admin/federations', {
    headers: { Authorization: `Bearer ${superToken}` },
  });
  assert.strictEqual(allFeds.status, 200);
  assert(Array.isArray(allFeds.data.data));
  console.log(`✅ 2.3 Supervising Admin retrieved ${allFeds.data.data.length} federations.\n`);

  // Test 2.4: Federation Admin Login
  console.log('2.4 Testing Federation Admin login...');
  const fedAdminLogin = await request('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'fedadmin@demo.com', password: 'admin123' }),
  });
  assert.strictEqual(fedAdminLogin.status, 200);
  assert.strictEqual(fedAdminLogin.data.data.admin.role, 'federation_admin');
  assert(fedAdminLogin.data.data.admin.federation_id !== null);
  const fedAdminToken = fedAdminLogin.data.data.token;
  console.log('✅ 2.4 Federation Admin login successful (role: federation_admin).\n');

  // Test 2.5: Federation Admin calls /admin/federations/current -> Returns 200 OK with their federation
  console.log('2.5 Testing /admin/federations/current for Federation Admin...');
  const fedAdminCurrentFed = await request('/admin/federations/current', {
    headers: { Authorization: `Bearer ${fedAdminToken}` },
  });
  assert.strictEqual(fedAdminCurrentFed.status, 200);
  assert.strictEqual(fedAdminCurrentFed.data.data.id, fedAdminLogin.data.data.admin.federation_id);
  console.log(`✅ 2.5 Federation Admin /federations/current returned assigned federation (${fedAdminCurrentFed.data.data.name}).\n`);

  // Test 2.6: Protected Dashboard data fetches work under both Admin tokens
  console.log('2.6 Testing protected dashboard summary endpoints...');
  const [workersRes, bookingsRes, summaryRes] = await Promise.all([
    request('/admin/workers', { headers: { Authorization: `Bearer ${superToken}` } }),
    request('/admin/bookings', { headers: { Authorization: `Bearer ${superToken}` } }),
    request('/admin/analytics/summary', { headers: { Authorization: `Bearer ${superToken}` } }),
  ]);
  assert.strictEqual(workersRes.status, 200);
  assert.strictEqual(bookingsRes.status, 200);
  assert.strictEqual(summaryRes.status, 200);
  console.log('✅ 2.6 Protected dashboard analytics endpoints successfully accessible.\n');

  console.log('================================================================');
  console.log('🎉 ALL BUG 1 AND BUG 2 END-TO-END VALIDATIONS PASSED (100%)');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
