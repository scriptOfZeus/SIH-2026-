/**
 * Automated Live GPS Tracking Test Suite (V2 Feature #1)
 *
 * Covers:
 *  1. Tracking denied before customer consent (403 CONSENT_REQUIRED)
 *  2. Customer tracking consent registration (POST /consent-tracking)
 *  3. Tracking allowed after valid consent
 *  4. Authorized worker location update succeeds with distance and dynamic ETA computation
 *  5. Unauthorized worker location update rejected (403 UNAUTHORIZED_WORKER)
 *  6. Unrelated customer cannot track booking (403 FORBIDDEN)
 *  7. Cross-federation admin access rejected (404 BOOKING_NOT_FOUND)
 *  8. Own federation admin access permitted
 *  9. Invalid GPS coordinates rejected (400 INVALID_COORDINATES)
 *  10. Excessive update frequency rate-limited (429 TOO_MANY_REQUESTS)
 *  11. Implausible teleportation jump rejected (400 IMPLAUSIBLE_LOCATION_JUMP)
 *  12. Realtime Socket.IO room join & location event broadcast
 *  13. Tracking terminates upon booking completion (400 BOOKING_NOT_ACTIVE)
 *  14. Tracking terminates upon booking cancellation (400 BOOKING_NOT_ACTIVE)
 */

require('dotenv').config();
const assert = require('assert');
const { v4: uuidv4 } = require('uuid');
const { io: ioClient } = require('socket.io-client');
const db = require('./db/database');
const { sign } = require('./middleware/auth');

const BASE_URL = 'http://localhost:5000/api/v1';
const SOCKET_URL = 'http://localhost:5000';

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  RUNNING LIVE GPS TRACKING TEST SUITE (V2 FEATURE #1)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── 0. Environment & Actor Setup ──────────────────────────────────────────
  console.log('0. Setting Up Actors & Authentications:');

  // 0a. Admin A (Pilot Federation Admin)
  const loginAdminA = await api('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'fedadmin@demo.com', password: 'admin123' }),
  });
  assert.strictEqual(loginAdminA.status, 200);
  const tokenAdminA = loginAdminA.body.data.token;
  const fedA = (await api('/admin/federations/current', { headers: { Authorization: `Bearer ${tokenAdminA}` } })).body.data;

  // 0a-2. Supervising Admin (Global Access)
  const loginSuper = await api('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' }),
  });
  assert.strictEqual(loginSuper.status, 200);
  const tokenSuperAdmin = loginSuper.body.data.token;

  // 0b. Admin B (Maharashtra Federation Admin)
  const loginAdminB = await api('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@maharashtra.coop', password: 'mahaPassword123' }),
  });
  assert.strictEqual(loginAdminB.status, 200);
  const tokenAdminB = loginAdminB.body.data.token;
  const fedB = (await api('/admin/federations/current', { headers: { Authorization: `Bearer ${tokenAdminB}` } })).body.data;

  // 0c. Customer A (Owns Booking)
  const customerAId = uuidv4();
  const customerAPhone = `+91991${Date.now().toString().slice(-7)}`;
  await db.run('INSERT INTO customers (id, phone, full_name) VALUES (?, ?, ?)', [customerAId, customerAPhone, 'Customer Alice']);
  const tokenCustomerA = sign({ id: customerAId, role: 'customer', phone: customerAPhone });

  // 0d. Customer B (Unrelated Customer)
  const customerBId = uuidv4();
  const customerBPhone = `+91992${Date.now().toString().slice(-7)}`;
  await db.run('INSERT INTO customers (id, phone, full_name) VALUES (?, ?, ?)', [customerBId, customerBPhone, 'Customer Bob']);
  const tokenCustomerB = sign({ id: customerBId, role: 'customer', phone: customerBPhone });

  // 0e. Worker A (Pilot Federation — Assigned to Booking 1)
  const workerAId = uuidv4();
  const workerAPhone = `+91981${Date.now().toString().slice(-7)}`;
  await db.run(`
    INSERT INTO workers (id, federation_id, full_name, phone, skill_category, skill_certificate_number, verification_status, skill_certificate_verified, lat, lng)
    VALUES (?, ?, 'Worker Alpha', ?, 'electrician', 'CERT_ALPHA_01', 'approved', 1, 22.5600, 88.3500)
  `, [workerAId, fedA.id, workerAPhone]);
  const tokenWorkerA = sign({ id: workerAId, role: 'worker', phone: workerAPhone, federation_id: fedA.id });

  // 0f. Worker B (Maharashtra Federation — Unrelated Worker)
  const workerBId = uuidv4();
  const workerBPhone = `+91982${Date.now().toString().slice(-7)}`;
  await db.run(`
    INSERT INTO workers (id, federation_id, full_name, phone, skill_category, skill_certificate_number, verification_status, skill_certificate_verified, lat, lng)
    VALUES (?, ?, 'Worker Beta', ?, 'electrician', 'CERT_BETA_02', 'approved', 1, 19.0760, 72.8777)
  `, [workerBId, fedB.id, workerBPhone]);
  const tokenWorkerB = sign({ id: workerBId, role: 'worker', phone: workerBPhone, federation_id: fedB.id });

  // 0g. Create Active Booking 1
  const booking1Id = uuidv4();
  await db.run(`
    INSERT INTO bookings (id, customer_id, worker_id, federation_id, skill_category, service_address, service_lat, service_lng, scheduled_time, status)
    VALUES (?, ?, ?, ?, 'electrician', '10 Park Street, Kolkata', 22.5530, 88.3510, '2026-09-01 10:00', 'requested')
  `, [booking1Id, customerAId, workerAId, fedA.id]);

  console.log(`  -> Customer Alice (${customerAId})`);
  console.log(`  -> Worker Alpha (${workerAId})`);
  console.log(`  -> Booking 1 (${booking1Id}) in 'requested' state\n`);

  // ── 1. Consent Gate & Inactive Booking Restrictions ─────────────────────────
  console.log('1. Consent Enforcement & Booking State Validation:');

  await test('Tracking denied while booking is in requested/unaccepted state', async () => {
    const res = await api(`/bookings/${booking1Id}/tracking`, {
      headers: { Authorization: `Bearer ${tokenCustomerA}` },
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'BOOKING_NOT_ACTIVE');
  });

  await test('Worker accepts booking -> status transitions to accepted', async () => {
    const res = await api(`/bookings/${booking1Id}/accept`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenWorkerA}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'accepted');
  });

  await test('Tracking denied before customer consent (403 CONSENT_REQUIRED)', async () => {
    const res = await api(`/bookings/${booking1Id}/tracking`, {
      headers: { Authorization: `Bearer ${tokenCustomerA}` },
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'CONSENT_REQUIRED');
  });

  await test('Unrelated Customer Bob cannot grant tracking consent for Alice booking (403)', async () => {
    const res = await api(`/bookings/${booking1Id}/consent-tracking`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCustomerB}` },
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'FORBIDDEN');
  });

  await test('Customer Alice grants tracking consent -> records opt-in & timestamp', async () => {
    const res = await api(`/bookings/${booking1Id}/consent-tracking`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCustomerA}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.tracking_consent_given, 1);
    assert.strictEqual(res.body.data.tracking_active, 1);
    assert(res.body.data.tracking_consent_at !== null);

    // Verify DB persistence
    const inDb = await db.get('SELECT tracking_consent_given, tracking_active FROM bookings WHERE id = ?', [booking1Id]);
    assert.strictEqual(inDb.tracking_consent_given, 1);
    assert.strictEqual(inDb.tracking_active, 1);
  });

  await test('Tracking allowed after valid consent -> returns initial tracking state', async () => {
    const res = await api(`/bookings/${booking1Id}/tracking`, {
      headers: { Authorization: `Bearer ${tokenCustomerA}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.tracking_consent_given, 1);
    assert.strictEqual(res.body.data.tracking_active, 1);
  });

  // ── 2. Worker Location Updates & Geometry Validation ───────────────────────
  console.log('\n2. Worker GPS Telemetry Ingestion & Validation:');

  await test('Unauthorized Worker Beta cannot transmit coordinates for Booking 1 (403)', async () => {
    const res = await api(`/bookings/${booking1Id}/location`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenWorkerB}` },
      body: JSON.stringify({ lat: 22.5600, lng: 88.3500 }),
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED_WORKER');
  });

  await test('Invalid coordinates rejected: lat 105.0 is out of bounds (400)', async () => {
    const res = await api(`/bookings/${booking1Id}/location`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenWorkerA}` },
      body: JSON.stringify({ lat: 105.0, lng: 88.3500 }),
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'INVALID_COORDINATES');
  });

  let initialUpdate;

  await test('Authorized Worker Alpha transmits valid GPS coordinate -> computes distance & ETA', async () => {
    const res = await api(`/bookings/${booking1Id}/location`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenWorkerA}` },
      body: JSON.stringify({
        lat: 22.5600,
        lng: 88.3500,
        heading: 180,
        speed_kmh: 22.5,
      }),
    });

    assert.strictEqual(res.status, 200);
    initialUpdate = res.body.data;
    assert.strictEqual(initialUpdate.lat, 22.5600);
    assert.strictEqual(initialUpdate.lng, 88.3500);
    assert(initialUpdate.remaining_distance_km > 0, 'Distance to service location must be calculated');
    assert(initialUpdate.eta_minutes > 0, 'Dynamic ETA must be calculated');
    assert(initialUpdate.updated_at !== null);

    // Verify workers table lat/lng updated
    const updatedWorker = await db.get('SELECT lat, lng FROM workers WHERE id = ?', [workerAId]);
    assert.strictEqual(updatedWorker.lat, 22.5600);
    assert.strictEqual(updatedWorker.lng, 88.3500);
  });

  await test('Customer Alice queries tracking: receives latest worker coordinates and ETA', async () => {
    const res = await api(`/bookings/${booking1Id}/tracking`, {
      headers: { Authorization: `Bearer ${tokenCustomerA}` },
    });
    assert.strictEqual(res.status, 200);
    const loc = res.body.data.latest_location;
    assert.strictEqual(loc.lat, 22.5600);
    assert.strictEqual(loc.lng, 88.3500);
    assert.strictEqual(loc.remaining_distance_km, initialUpdate.remaining_distance_km);
    assert.strictEqual(loc.eta_minutes, initialUpdate.eta_minutes);
  });

  await test('Rapid updates rate-limited: second update sent within 1s rejected (429)', async () => {
    const res = await api(`/bookings/${booking1Id}/location`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenWorkerA}` },
      body: JSON.stringify({ lat: 22.5590, lng: 88.3505 }),
    });
    assert.strictEqual(res.status, 429);
    assert.strictEqual(res.body.error.code, 'TOO_MANY_REQUESTS');
  });

  await test('Implausible jump rejected: 50 km jump in 3 seconds flagged (400)', async () => {
    // Wait for rate-limit cooldown
    await sleep(3100);

    // Attempt 50km teleport jump
    const res = await api(`/bookings/${booking1Id}/location`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenWorkerA}` },
      body: JSON.stringify({ lat: 23.0000, lng: 88.9000 }), // ~70 km away
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'IMPLAUSIBLE_LOCATION_JUMP');
  });

  // ── 3. Authorization & Tenant Boundaries ───────────────────────────────────
  console.log('\n3. Authorization & Multi-Federation Boundaries:');

  await test('Unrelated Customer Bob cannot view Alice tracking (403 FORBIDDEN)', async () => {
    const res = await api(`/bookings/${booking1Id}/tracking`, {
      headers: { Authorization: `Bearer ${tokenCustomerB}` },
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'FORBIDDEN');
  });

  await test('Cross-federation Admin B (Maharashtra) cannot view Pilot Federation tracking (404)', async () => {
    const res = await api(`/bookings/${booking1Id}/tracking`, {
      headers: { Authorization: `Bearer ${tokenAdminB}` },
    });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error.code, 'BOOKING_NOT_FOUND');
  });

  await test('Home Federation Admin A can inspect active tracking for Booking 1 (200)', async () => {
    const res = await api(`/bookings/${booking1Id}/tracking`, {
      headers: { Authorization: `Bearer ${tokenAdminA}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.booking_id, booking1Id);
    assert(res.body.data.latest_location !== null);
  });

  await test('Supervising Admin can inspect active tracking across any federation (200)', async () => {
    const res = await api(`/bookings/${booking1Id}/tracking`, {
      headers: { Authorization: `Bearer ${tokenSuperAdmin}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.booking_id, booking1Id);
    assert(res.body.data.latest_location !== null);
  });

  // ── 4. Socket.IO Realtime Streaming ────────────────────────────────────────
  console.log('\n4. Realtime Socket.IO Streaming:');

  await test('Socket.IO client authenticates and receives live location:update event', async () => {
    return new Promise((resolve, reject) => {
      const client = ioClient(SOCKET_URL, {
        auth: { token: tokenCustomerA },
        transports: ['websocket'],
      });

      const timeout = setTimeout(() => {
        client.disconnect();
        reject(new Error('Socket.IO tracking update timeout'));
      }, 7000);

      client.on('connect', () => {
        // Join booking room
        client.emit('tracking:join', { booking_id: booking1Id }, async (ack) => {
          assert.strictEqual(ack.success, true, 'Socket join must succeed');

          // Trigger an authorized location update after cooldown
          await sleep(3100);
          await api(`/bookings/${booking1Id}/location`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${tokenWorkerA}` },
            body: JSON.stringify({
              lat: 22.5570,
              lng: 88.3508,
              heading: 175,
              speed_kmh: 18.0,
            }),
          });
        });
      });

      client.on('location:update', (payload) => {
        clearTimeout(timeout);
        assert.strictEqual(payload.booking_id, booking1Id);
        assert.strictEqual(payload.lat, 22.5570);
        assert.strictEqual(payload.lng, 88.3508);
        client.disconnect();
        resolve();
      });

      client.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  });

  // ── 5. Tracking Teardown: Completion & Cancellation ────────────────────────
  console.log('\n5. Tracking Teardown & Invalidation:');

  await test('Booking completes -> tracking terminates immediately', async () => {
    // Both sides confirm completion
    await api(`/bookings/${booking1Id}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenCustomerA}` },
    });
    const completeRes = await api(`/bookings/${booking1Id}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenWorkerA}` },
    });
    assert.strictEqual(completeRes.status, 200);
    assert.strictEqual(completeRes.body.data.status, 'completed');

    // Verify tracking is marked inactive in DB
    const inDb = await db.get('SELECT tracking_active FROM bookings WHERE id = ?', [booking1Id]);
    assert.strictEqual(inDb.tracking_active, 0);

    // Attempting further tracking updates must be rejected
    const locRes = await api(`/bookings/${booking1Id}/location`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenWorkerA}` },
      body: JSON.stringify({ lat: 22.5500, lng: 88.3500 }),
    });
    assert.strictEqual(locRes.status, 400);
    assert.strictEqual(locRes.body.error.code, 'BOOKING_NOT_ACTIVE');

    // Customer query now rejected
    const trackRes = await api(`/bookings/${booking1Id}/tracking`, {
      headers: { Authorization: `Bearer ${tokenCustomerA}` },
    });
    assert.strictEqual(trackRes.status, 400);
    assert.strictEqual(trackRes.body.error.code, 'BOOKING_NOT_ACTIVE');
  });

  await test('Booking cancellation -> tracking terminates immediately', async () => {
    // Create Booking 2
    const booking2Id = uuidv4();
    await db.run(`
      INSERT INTO bookings (id, customer_id, worker_id, federation_id, skill_category, service_address, scheduled_time, status)
      VALUES (?, ?, ?, ?, 'electrician', 'Cancellation Test Address', '2026-09-02 12:00', 'requested')
    `, [booking2Id, customerAId, workerAId, fedA.id]);

    await api(`/bookings/${booking2Id}/accept`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenWorkerA}` },
    });
    await api(`/bookings/${booking2Id}/consent-tracking`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCustomerA}` },
    });

    // Cancel booking
    const cancelRes = await api(`/bookings/${booking2Id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenCustomerA}` },
    });
    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelRes.body.data.status, 'cancelled');

    // Verify tracking_active = 0
    const inDb = await db.get('SELECT tracking_active FROM bookings WHERE id = ?', [booking2Id]);
    assert.strictEqual(inDb.tracking_active, 0);

    // Attempting to send location rejected
    const locRes = await api(`/bookings/${booking2Id}/location`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenWorkerA}` },
      body: JSON.stringify({ lat: 22.5500, lng: 88.3500 }),
    });
    assert.strictEqual(locRes.status, 400);
    assert.strictEqual(locRes.body.error.code, 'BOOKING_NOT_ACTIVE');
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passedTests} / ${totalTests} GPS tracking tests passed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal GPS tracking test error:', err);
  process.exit(1);
});
