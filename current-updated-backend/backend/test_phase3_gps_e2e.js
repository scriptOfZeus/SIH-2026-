/**
 * Phase 3 Comprehensive Geo/GPS & Location Intelligence Test Suite
 * Tests all Phase 3 endpoints, permissions, privacy safeguards, and multi-tenant scoping
 */

require('dotenv').config();
const assert = require('assert');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('./db/database');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'sahkar-sewa-development-jwt-secret-key-2026-sih';

function sign(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function api(path, opts = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const res = await fetch(url, { ...opts, headers });
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function runPhase3Tests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  PHASE 3: GEO/GPS & LOCATION INTELLIGENCE E2E SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Authenticate Actors
  console.log('1. Actor Setup & Authentication:');

  // Supervising Admin
  const superRes = await api('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' }),
  });
  assert.strictEqual(superRes.status, 200);
  const tokenSuper = superRes.body.data.token;
  console.log('  ✓ Supervising Admin authenticated');

  // Federation Admin (Pilot)
  const fedAdminRes = await api('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'fedadmin@demo.com', password: 'admin123' }),
  });
  assert.strictEqual(fedAdminRes.status, 200);
  const tokenFedAdmin = fedAdminRes.body.data.token;
  const fedAdminProfile = (await api('/admin/federations/current', { headers: { Authorization: `Bearer ${tokenFedAdmin}` } })).body.data;
  console.log(`  ✓ Pilot Federation Admin authenticated (Fed ID: ${fedAdminProfile.id})`);

  // Customer
  const customerId = uuidv4();
  const customerPhone = `+91983${Date.now().toString().slice(-7)}`;
  await db.run('INSERT INTO customers (id, phone, full_name) VALUES (?, ?, ?)', [customerId, customerPhone, 'GPS Customer']);
  const tokenCustomer = sign({ id: customerId, role: 'customer', phone: customerPhone });
  console.log('  ✓ Customer authenticated');

  // Worker Setup with fresh GPS coordinates in Pune/Mumbai
  const workerId = uuidv4();
  const workerPhone = `+91987${Date.now().toString().slice(-7)}`;
  await db.run(`
    INSERT INTO workers (
      id, phone, full_name, skill_category, hourly_rate, experience_years,
      verification_status, final_verification_status, is_available,
      lat, lng, last_location_updated_at, federation_id, worker_type
    ) VALUES (
      ?, ?, 'Sunil Sharma', 'electrician', 450, 6,
      'approved', 'approved', 1,
      19.0760, 72.8777, CURRENT_TIMESTAMP, ?, 'federation'
    )
  `, [workerId, workerPhone, fedAdminProfile.id]);
  const tokenWorker = sign({ id: workerId, role: 'worker', phone: workerPhone, federation_id: fedAdminProfile.id });
  console.log('  ✓ Verified Worker with GPS Telemetry seeded\n');

  // 2. Nearby Worker Discovery Tests
  console.log('2. Nearby Worker Discovery & Privacy Rounding:');

  // 2a. Reject missing coordinates
  const missingCoordRes = await api('/workers/nearby', {
    headers: { Authorization: `Bearer ${tokenCustomer}` },
  });
  assert.strictEqual(missingCoordRes.status, 400);
  console.log('  ✓ [PASS] Missing lat/lng rejected (400 BAD_REQUEST)');

  // 2b. Reject out of bounds coordinates
  const outOfBoundsRes = await api('/workers/nearby?lat=95.0&lng=72.87', {
    headers: { Authorization: `Bearer ${tokenCustomer}` },
  });
  assert.strictEqual(outOfBoundsRes.status, 400);
  console.log('  ✓ [PASS] Out of bounds latitude 95.0 rejected (400 INVALID_COORDINATES)');

  // 2c. Discover nearby workers with approximate privacy coordinates
  const nearbyRes = await api('/workers/nearby?lat=19.0800&lng=72.8800&radius_km=10', {
    headers: { Authorization: `Bearer ${tokenCustomer}` },
  });
  assert.strictEqual(nearbyRes.status, 200);
  assert(nearbyRes.body.data.workers.length > 0);
  const foundWorker = nearbyRes.body.data.workers.find(w => w.id === workerId);
  assert(foundWorker, 'Seeded worker should be found nearby');
  assert(foundWorker.distance_km <= 10, 'Distance should be within 10 km');
  assert(foundWorker.approx_lat !== undefined, 'Approximate latitude should be provided for privacy');
  assert(foundWorker.approx_lng !== undefined, 'Approximate longitude should be provided for privacy');
  console.log(`  ✓ [PASS] Discovered nearby worker (${foundWorker.full_name}, ${foundWorker.distance_km} km away) with privacy-safe coordinates`);

  // 2d. Filter by skill category
  const filteredSkillRes = await api('/workers/nearby?lat=19.0800&lng=72.8800&skill_category=electrician', {
    headers: { Authorization: `Bearer ${tokenCustomer}` },
  });
  assert.strictEqual(filteredSkillRes.status, 200);
  assert(filteredSkillRes.body.data.workers.every(w => w.skill_category === 'electrician'));
  console.log('  ✓ [PASS] Skill category filter strictly enforced\n');

  // 3. Admin Geospatial Operations Map API
  console.log('3. Admin Geospatial Operations Map API:');

  // 3a. Supervising Admin Global Geospatial Query
  const superMapRes = await api('/admin/geo/live-map', {
    headers: { Authorization: `Bearer ${tokenSuper}` },
  });
  assert.strictEqual(superMapRes.status, 200);
  assert.strictEqual(superMapRes.body.data.scope, 'global');
  assert(superMapRes.body.data.summary.total_workers_on_map > 0);
  assert(Array.isArray(superMapRes.body.data.workers));
  assert(Array.isArray(superMapRes.body.data.active_jobs));
  console.log(`  ✓ [PASS] Supervising Admin receives global fleet view (${superMapRes.body.data.summary.total_workers_on_map} workers mapped)`);

  // 3b. Federation Admin Scoped Geospatial Query
  const fedMapRes = await api('/admin/geo/live-map', {
    headers: { Authorization: `Bearer ${tokenFedAdmin}` },
  });
  assert.strictEqual(fedMapRes.status, 200);
  assert.strictEqual(fedMapRes.body.data.scope, 'federation');
  assert(fedMapRes.body.data.workers.every(w => w.federation_id === fedAdminProfile.id));
  console.log('  ✓ [PASS] Federation Admin strictly scoped to own federation workers');

  // 3c. Federation Admin cross-federation tampering blocked
  const crossFedRes = await api('/admin/geo/live-map?federation_id=fake-cross-federation-id', {
    headers: { Authorization: `Bearer ${tokenFedAdmin}` },
  });
  assert.strictEqual(crossFedRes.status, 403);
  console.log('  ✓ [PASS] Federation Admin attempting cross-federation query rejected (403 FORBIDDEN)\n');

  // 4. Worker Telemetry & Timestamping
  console.log('4. Worker Telemetry Updates & Timestamps:');

  // Update worker coordinates via PATCH /workers/me
  const patchWorkerRes = await api('/workers/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenWorker}` },
    body: JSON.stringify({ lat: 19.0850, lng: 72.8850 }),
  });
  assert.strictEqual(patchWorkerRes.status, 200);
  assert.strictEqual(Number(patchWorkerRes.body.data.lat), 19.0850);
  assert(patchWorkerRes.body.data.last_location_updated_at !== null);
  console.log('  ✓ [PASS] Worker coordinates updated with fresh last_location_updated_at timestamp\n');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ALL PHASE 3 GEO/GPS TESTS PASSED SUCCESSFULLY! (100%)');
  console.log('═══════════════════════════════════════════════════════════════');
}

runPhase3Tests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
