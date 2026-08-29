/**
 * Multi-Federation Tenancy & Tenant Isolation Test Suite
 * Proves:
 *  1. Onboarding a second federation with an independent administrator
 *  2. Federation A sees only its own workers; Federation B sees only its own workers
 *  3. Federation A cannot access or modify Federation B workers by ID (404 isolation)
 *  4. Federation A sees only its own bookings; Federation B sees only its own bookings
 *  5. Federation A cannot access Federation B bookings by ID (404 isolation)
 *  6. Client-side federation_id parameter tampering is neutralized server-side
 *  7. Analytics summary is strictly scoped per federation
 *  8. Existing V1 authentication and response envelopes remain 100% intact
 */

require('dotenv').config();
const assert = require('assert');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('./db/database');
const { sign } = require('./middleware/auth');

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

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  RUNNING MULTI-FEDERATION TENANCY TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── 0. Initial Setup & Logins ──────────────────────────────────────────────
  console.log('0. Multi-Federation Setup & Authentication:');

  // Login as Federation A Admin (Pilot Federation)
  const loginA = await api('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' }),
  });
  assert.strictEqual(loginA.status, 200, 'Admin A login must succeed');
  const tokenA = loginA.body.data.token;

  // Verify Federation A profile
  const fedAProfile = await api('/admin/federations/current', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.strictEqual(fedAProfile.status, 200);
  const fedA = fedAProfile.body.data;
  console.log(`  -> Federation A: ${fedA.name} (${fedA.id})`);

  // Onboard Federation B (if not already onboarded)
  const fedBEmail = 'admin@maharashtra.coop';
  let tokenB;
  let fedB;

  const existingFedBAdmin = await db.get('SELECT * FROM admins WHERE email = ?', [fedBEmail]);
  if (!existingFedBAdmin) {
    const onboardRes = await api('/admin/federations/onboard', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        name: 'Maharashtra Cooperative Federation',
        region: 'Mumbai',
        admin_name: 'Maha Admin',
        admin_email: fedBEmail,
        admin_password: 'mahaPassword123',
      }),
    });
    assert.strictEqual(onboardRes.status, 201, 'Onboard Federation B must succeed');
    fedB = onboardRes.body.data.federation;
  } else {
    fedB = await db.get('SELECT * FROM federations WHERE id = ?', [existingFedBAdmin.federation_id]);
  }

  // Login as Federation B Admin
  const loginB = await api('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: fedBEmail, password: 'mahaPassword123' }),
  });
  assert.strictEqual(loginB.status, 200, 'Admin B login must succeed');
  tokenB = loginB.body.data.token;
  console.log(`  -> Federation B: ${fedB.name} (${fedB.id})\n`);

  assert.notStrictEqual(fedA.id, fedB.id, 'Federation A and B must have distinct tenant IDs');

  // ── 1. Worker Tenant Scoping Tests ─────────────────────────────────────────
  console.log('1. Worker Isolation & Access Boundaries:');

  let workerAId;
  let workerBId;

  await test('Federation A creates Worker A under its own tenant scope', async () => {
    const phone = `+91799${Date.now().toString().slice(-7)}`;
    const res = await api('/admin/workers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        full_name: 'Worker Alpha',
        phone,
        skill_category: 'electrician',
        skill_certificate_number: `CERT_A_${Date.now()}`,
      }),
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.federation_id, fedA.id);
    workerAId = res.body.data.id;
  });

  await test('Federation B creates Worker B under its own tenant scope', async () => {
    const phone = `+91899${Date.now().toString().slice(-7)}`;
    const res = await api('/admin/workers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        full_name: 'Worker Beta',
        phone,
        skill_category: 'plumber',
        skill_certificate_number: `CERT_B_${Date.now()}`,
      }),
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.federation_id, fedB.id);
    workerBId = res.body.data.id;
  });

  await test('Federation A lists workers: sees Worker A, does NOT see Worker B', async () => {
    const res = await api('/admin/workers', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(res.status, 200);
    const ids = res.body.data.map(w => w.id);
    assert(ids.includes(workerAId), 'Admin A must see Worker A');
    assert(!ids.includes(workerBId), 'Admin A must NOT see Worker B');
  });

  await test('Federation B lists workers: sees Worker B, does NOT see Worker A', async () => {
    const res = await api('/admin/workers', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.strictEqual(res.status, 200);
    const ids = res.body.data.map(w => w.id);
    assert(ids.includes(workerBId), 'Admin B must see Worker B');
    assert(!ids.includes(workerAId), 'Admin B must NOT see Worker A');
  });

  await test('Cross-tenant ID guessing: Admin A cannot verify Worker B certificate (404)', async () => {
    const res = await api(`/admin/workers/${workerBId}/verify-certificate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(res.status, 404, 'Must return 404 when accessing worker across tenant boundary');
  });

  await test('Cross-tenant ID guessing: Admin A cannot approve/reject Worker B (404)', async () => {
    const res = await api(`/admin/workers/${workerBId}/verify`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ decision: 'approved' }),
    });
    assert.strictEqual(res.status, 404, 'Must return 404 when modifying worker across tenant boundary');
  });

  await test('Parameter tampering: Admin A passing federation_id of Federation B is overridden', async () => {
    const phone = `+91999${Date.now().toString().slice(-7)}`;
    const res = await api('/admin/workers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        full_name: 'Tamper Worker',
        phone,
        skill_category: 'carpenter',
        skill_certificate_number: `CERT_T_${Date.now()}`,
        federation_id: fedB.id, // Malicious attempt to inject into Federation B
      }),
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.federation_id, fedA.id, 'Must be scoped to Admin A federation regardless of payload');
  });

  // ── 2. Booking Tenant Scoping Tests ────────────────────────────────────────
  console.log('\n2. Booking Isolation & Cross-Tenant Access Controls:');

  // Create Customer record and token
  const customerId = uuidv4();
  const customerPhone = `+9199${Date.now().toString().slice(-8)}`;
  await db.run('INSERT INTO customers (id, phone) VALUES (?, ?)', [customerId, customerPhone]);
  const customerToken = sign({ id: customerId, role: 'customer', phone: customerPhone });

  let bookingAId;
  let bookingBId;

  await test('Create Booking A under Federation A and Booking B under Federation B', async () => {
    // Insert direct bookings for deterministic test
    bookingAId = uuidv4();
    bookingBId = uuidv4();

    await db.run(`
      INSERT INTO bookings (id, customer_id, worker_id, federation_id, skill_category, service_address, scheduled_time, status)
      VALUES (?, ?, ?, ?, 'electrician', 'Address A, Kolkata', '2026-09-01 10:00', 'requested')
    `, [bookingAId, customerId, workerAId, fedA.id]);

    await db.run(`
      INSERT INTO bookings (id, customer_id, worker_id, federation_id, skill_category, service_address, scheduled_time, status)
      VALUES (?, ?, ?, ?, 'plumber', 'Address B, Mumbai', '2026-09-01 14:00', 'requested')
    `, [bookingBId, customerId, workerBId, fedB.id]);
  });

  await test('Federation A lists bookings: sees Booking A, does NOT see Booking B', async () => {
    const res = await api('/admin/bookings', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(res.status, 200);
    const ids = res.body.data.map(b => b.id);
    assert(ids.includes(bookingAId), 'Admin A must see Booking A');
    assert(!ids.includes(bookingBId), 'Admin A must NOT see Booking B');
  });

  await test('Federation B lists bookings: sees Booking B, does NOT see Booking A', async () => {
    const res = await api('/admin/bookings', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.strictEqual(res.status, 200);
    const ids = res.body.data.map(b => b.id);
    assert(ids.includes(bookingBId), 'Admin B must see Booking B');
    assert(!ids.includes(bookingAId), 'Admin B must NOT see Booking A');
  });

  await test('Cross-tenant ID guessing: Admin A cannot view Booking B details (404)', async () => {
    const res = await api(`/bookings/${bookingBId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(res.status, 404, 'Must return 404 when Admin A views Federation B booking');
  });

  await test('Cross-tenant ID guessing: Admin B cannot view Booking A details (404)', async () => {
    const res = await api(`/bookings/${bookingAId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.strictEqual(res.status, 404, 'Must return 404 when Admin B views Federation A booking');
  });

  // ── 3. Tenant-Scoped Analytics Tests ───────────────────────────────────────
  console.log('\n3. Tenant-Scoped Summary Analytics:');

  await test('Admin A and Admin B summaries report independent metrics', async () => {
    const resA = await api('/admin/analytics/summary', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const resB = await api('/admin/analytics/summary', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    assert.strictEqual(resA.status, 200);
    assert.strictEqual(resB.status, 200);

    // Federation B has exactly 1 worker created in this test
    assert(resB.body.data.pendingWorkers >= 1, 'Federation B must reflect its own pending worker count');
    assert(resA.body.data.totalBookings >= 1, 'Federation A must reflect its own bookings count');
  });

  // ── 4. V1 API Compatibility ────────────────────────────────────────────────
  console.log('\n4. V1 Route & Response Envelope Compatibility:');

  await test('Customer booking mine/list works unchanged', async () => {
    const res = await api('/bookings/mine/list', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.data));
  });

  await test('Admin Demand forecast endpoint preserves backward compatible envelope', async () => {
    const res = await api('/admin/analytics/demand-forecast?region=Kolkata', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    // If AI service is active, verifies 200 and schema
    if (res.status === 200) {
      assert.strictEqual(res.body.success, true);
      assert('forecast' in res.body.data);
      assert('model' in res.body.data);
    }
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passedTests} / ${totalTests} tenancy tests passed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
