/**
 * Automated Test Suite for V2 Feature #7: Offline / SMS Fallback
 *
 * Covers:
 *  1. Short code generation on booking creation
 *  2. Outbound SMS job dispatch notification logged to sms_logs
 *  3. Inbound ACCEPT <CODE> command transitions booking to 'accepted'
 *  4. Provider Message ID idempotency & replay protection
 *  5. Inbound START <CODE> command updates worker transit state
 *  6. Inbound DONE <CODE> command records worker completion (completed_by_worker = 1)
 *  7. Spoofed / unregistered sender phone number rejected (403 UNAUTHORIZED_SENDER)
 *  8. Cross-federation worker command rejected (403 FORBIDDEN_TENANT)
 *  9. Inbound REJECT <CODE> triggers worker reassignment
 *  10. Offline reconnect catch-up: REST API returns state updated via SMS
 *  11. Admin SMS audit log tenant scoping (GET /api/v1/sms/logs)
 */

require('dotenv').config();
const assert = require('assert');
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
  console.log('  RUNNING OFFLINE / SMS FALLBACK TEST SUITE (V2 FEATURE #7)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── 0. Setup Actors & Federations ─────────────────────────────────────────
  console.log('0. Setting Up Actors & Tenant Contexts:');

  // Admin A (Pilot Federation)
  const loginAdminA = await api('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' }),
  });
  assert.strictEqual(loginAdminA.status, 200);
  const tokenAdminA = loginAdminA.body.data.token;
  const fedA = (await api('/admin/federations/current', { headers: { Authorization: `Bearer ${tokenAdminA}` } })).body.data;

  // Admin B (Maharashtra Federation)
  const loginAdminB = await api('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@maharashtra.coop', password: 'mahaPassword123' }),
  });
  assert.strictEqual(loginAdminB.status, 200);
  const tokenAdminB = loginAdminB.body.data.token;
  const fedB = (await api('/admin/federations/current', { headers: { Authorization: `Bearer ${tokenAdminB}` } })).body.data;

  // Clean prior SMS test data
  await db.run("DELETE FROM sms_logs WHERE booking_id IN (SELECT id FROM bookings WHERE service_address LIKE '%SMS Test%') OR sender_phone LIKE '%9999%' OR recipient_phone LIKE '%9999%'");
  await db.run("DELETE FROM bookings WHERE service_address LIKE '%SMS Test%'");
  await db.run("DELETE FROM workers WHERE full_name LIKE 'SMS Worker%'");
  await db.run("DELETE FROM customers WHERE phone LIKE '%9999000001%'");

  // Customer
  const custId = uuidv4();
  const custPhone = '+919999000001';
  await db.run('INSERT INTO customers (id, phone, full_name) VALUES (?, ?, ?)', [custId, custPhone, 'SMS Test Customer']);
  const tokenCust = sign({ id: custId, role: 'customer', phone: custPhone });

  // Worker 1 (Pilot Federation)
  const w1Id = uuidv4();
  const w1Phone = '+919999000011';
  await db.run(`
    INSERT INTO workers (id, federation_id, full_name, phone, skill_category, verification_status, skill_certificate_verified, lat, lng)
    VALUES (?, ?, 'SMS Worker Alpha', ?, 'painter', 'approved', 1, 28.6350, 77.2200)
  `, [w1Id, fedA.id, w1Phone]);
  const tokenW1 = sign({ id: w1Id, role: 'worker', phone: w1Phone, federation_id: fedA.id });

  // Worker 2 (Pilot Federation - for reassignment)
  const w2Id = uuidv4();
  const w2Phone = '+919999000022';
  await db.run(`
    INSERT INTO workers (id, federation_id, full_name, phone, skill_category, verification_status, skill_certificate_verified, lat, lng)
    VALUES (?, ?, 'SMS Worker Beta', ?, 'painter', 'approved', 1, 28.6400, 77.2250)
  `, [w2Id, fedA.id, w2Phone]);

  // Worker 3 (Maharashtra Federation - cross-tenant)
  const wCrossId = uuidv4();
  const wCrossPhone = '+919999000033';
  await db.run(`
    INSERT INTO workers (id, federation_id, full_name, phone, skill_category, verification_status, skill_certificate_verified, lat, lng)
    VALUES (?, ?, 'SMS Worker Gamma (Maha)', ?, 'painter', 'approved', 1, 19.0760, 72.8777)
  `, [wCrossId, fedB.id, wCrossPhone]);

  console.log(`  -> Customer (${custPhone})`);
  console.log(`  -> Worker Alpha (${w1Phone}) in Pilot Fed`);
  console.log(`  -> Worker Beta (${w2Phone}) in Pilot Fed`);
  console.log(`  -> Worker Gamma (${wCrossPhone}) in Maharashtra Fed\n`);

  // ── 1. Outbound SMS & Short Code Generation ───────────────────────────────
  console.log('1. Booking Creation & Outbound SMS Dispatch:');

  let booking1;
  let shortCode1;

  await test('Booking creation automatically generates 6-digit short_code and logs outbound SMS offer', async () => {
    const res = await api('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCust}` },
      body: JSON.stringify({
        skill_category: 'painter',
        service_address: 'SMS Test Location, Connaught Place',
        service_lat: 28.6315,
        service_lng: 77.2167,
        scheduled_time: '2026-09-05 10:00',
        federation_id: fedA.id,
      }),
    });

    assert.strictEqual(res.status, 201);
    booking1 = res.body.data;
    shortCode1 = booking1.short_code;

    assert(shortCode1, 'Booking must have short_code');
    assert(shortCode1.startsWith('BK'), 'Short code must start with BK');
    assert.strictEqual(booking1.worker_id, w1Id, 'Must assign closest worker W1');

    // Verify outbound SMS log in database
    const smsLog = await db.get('SELECT * FROM sms_logs WHERE booking_id = ? AND direction = \'outbound\'', [booking1.id]);
    assert(smsLog, 'Outbound SMS must be recorded in sms_logs');
    assert.strictEqual(smsLog.recipient_phone, w1Phone);
    assert(smsLog.message_body.includes(shortCode1), 'Message body must include short code');
    assert.strictEqual(smsLog.status, 'sent');
  });

  // ── 2. Inbound SMS Webhook ACCEPT Command ─────────────────────────────────
  console.log('\n2. Inbound SMS Webhook ACCEPT Command:');

  await test('Worker sends ACCEPT <CODE> via SMS webhook -> status transitions to accepted', async () => {
    const res = await api('/sms/webhook', {
      method: 'POST',
      body: JSON.stringify({
        From: w1Phone,
        Body: `ACCEPT ${shortCode1}`,
        MessageSid: 'SM_ACCEPT_001',
      }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.command, 'ACCEPT');
    assert.strictEqual(res.body.data.booking_id, booking1.id);
    assert(res.body.data.reply_message.includes('CONFIRMED'));

    // Verify DB updated
    const updated = await db.get('SELECT status, origin_channel, offline_synced_at FROM bookings WHERE id = ?', [booking1.id]);
    assert.strictEqual(updated.status, 'accepted');
    assert.strictEqual(updated.origin_channel, 'sms');
    assert(updated.offline_synced_at !== null, 'offline_synced_at timestamp must be recorded');
  });

  // ── 3. Idempotency & Replay Protection ────────────────────────────────────
  console.log('\n3. Idempotency & Duplicate Replay Protection:');

  await test('Duplicate webhook with identical MessageSid returns 200 without side effects', async () => {
    const res = await api('/sms/webhook', {
      method: 'POST',
      body: JSON.stringify({
        From: w1Phone,
        Body: `ACCEPT ${shortCode1}`,
        MessageSid: 'SM_ACCEPT_001', // Same provider message id
      }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.idempotent, true);
  });

  await test('Repeated ACCEPT command with new MessageSid replies already accepted safely', async () => {
    const res = await api('/sms/webhook', {
      method: 'POST',
      body: JSON.stringify({
        From: w1Phone,
        Body: `ACCEPT ${shortCode1}`,
        MessageSid: 'SM_ACCEPT_002', // New provider id
      }),
    });

    assert.strictEqual(res.status, 200);
    assert(res.body.data.reply_message.includes('already accepted'));
  });

  // ── 4. Inbound START & DONE Commands ──────────────────────────────────────
  console.log('\n4. Progress Updates (START & DONE):');

  await test('Worker sends START <CODE> -> logs en-route transit state', async () => {
    const res = await api('/sms/webhook', {
      method: 'POST',
      body: JSON.stringify({
        From: w1Phone,
        Body: `START ${shortCode1}`,
        MessageSid: 'SM_START_003',
      }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.command, 'START');
    assert(res.body.data.reply_message.includes('EN ROUTE'));
  });

  await test('Worker sends DONE <CODE> -> sets completed_by_worker = 1', async () => {
    const res = await api('/sms/webhook', {
      method: 'POST',
      body: JSON.stringify({
        From: w1Phone,
        Body: `DONE ${shortCode1}`,
        MessageSid: 'SM_DONE_004',
      }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.command, 'DONE');
    assert(res.body.data.reply_message.includes('COMPLETE'));

    const inDb = await db.get('SELECT completed_by_worker, status FROM bookings WHERE id = ?', [booking1.id]);
    assert.strictEqual(inDb.completed_by_worker, 1);
  });

  // ── 5. Spoofing & Tenant Boundaries ───────────────────────────────────────
  console.log('\n5. Anti-Spoofing & Multi-Federation Isolation:');

  await test('Unregistered phone number rejected (403 UNAUTHORIZED_SENDER)', async () => {
    const res = await api('/sms/webhook', {
      method: 'POST',
      body: JSON.stringify({
        From: '+919999888777', // Unknown attacker phone
        Body: `ACCEPT ${shortCode1}`,
        MessageSid: 'SM_SPOOF_005',
      }),
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED_SENDER');
  });

  await test('Cross-federation worker command rejected (403 FORBIDDEN_TENANT)', async () => {
    const res = await api('/sms/webhook', {
      method: 'POST',
      body: JSON.stringify({
        From: wCrossPhone, // Maharashtra worker attempting command on Pilot Fed booking
        Body: `DONE ${shortCode1}`,
        MessageSid: 'SM_CROSS_006',
      }),
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'FORBIDDEN_TENANT');
  });

  // ── 6. Inbound REJECT & Automatic Reassignment ────────────────────────────
  console.log('\n6. Inbound REJECT & Automatic Reassignment:');

  let booking2;
  let shortCode2;

  await test('Create Booking 2 -> Worker W1 sends REJECT <CODE> -> reassigns to W2', async () => {
    const createRes = await api('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCust}` },
      body: JSON.stringify({
        skill_category: 'painter',
        service_address: 'SMS Test Location 2',
        service_lat: 28.6315,
        service_lng: 77.2167,
        scheduled_time: '2026-09-06 11:00',
        federation_id: fedA.id,
      }),
    });

    assert.strictEqual(createRes.status, 201);
    booking2 = createRes.body.data;
    shortCode2 = booking2.short_code;
    assert.strictEqual(booking2.worker_id, w1Id);

    // Worker 1 rejects via SMS
    const rejectRes = await api('/sms/webhook', {
      method: 'POST',
      body: JSON.stringify({
        From: w1Phone,
        Body: `REJECT ${shortCode2}`,
        MessageSid: 'SM_REJECT_007',
      }),
    });

    assert.strictEqual(rejectRes.status, 200);
    assert.strictEqual(rejectRes.body.data.command, 'REJECT');

    // Verify booking automatically reassigned to W2 in DB
    const inDb = await db.get('SELECT worker_id, status FROM bookings WHERE id = ?', [booking2.id]);
    assert.strictEqual(inDb.worker_id, w2Id, 'Booking 2 must reassign to Worker Beta W2');
    assert.strictEqual(inDb.status, 'requested');
  });

  // ── 7. Offline Reconnect Catch-up & App Synchronization ───────────────────
  console.log('\n7. Offline Reconnect Catch-up (V2 Success Criterion):');

  await test('Worker mobile app regains connectivity -> queries REST API and receives state updated via SMS', async () => {
    // Both sides confirm completion for Booking 1
    await api(`/bookings/${booking1.id}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenCust}` },
    });

    // Worker queries profile/bookings via REST API
    const res = await api(`/bookings/${booking1.id}`, {
      headers: { Authorization: `Bearer ${tokenW1}` },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'completed');
    assert.strictEqual(res.body.data.origin_channel, 'sms');
    assert(res.body.data.offline_synced_at !== null);
  });

  // ── 8. Admin Audit Log Tenant Scoping ─────────────────────────────────────
  console.log('\n8. Admin SMS Audit Log Tenant Scoping:');

  await test('Pilot Federation Admin A can inspect SMS logs for own federation', async () => {
    const res = await api('/sms/logs', {
      headers: { Authorization: `Bearer ${tokenAdminA}` },
    });

    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.body.data));
    assert(res.body.data.length > 0, 'Pilot Federation must have logged SMS messages');
    for (const log of res.body.data) {
      assert.strictEqual(log.federation_id, fedA.id, 'All logs must belong to Pilot Federation');
    }
  });

  await test('Maharashtra Admin B does NOT see Pilot Federation SMS logs', async () => {
    const res = await api('/sms/logs', {
      headers: { Authorization: `Bearer ${tokenAdminB}` },
    });

    assert.strictEqual(res.status, 200);
    for (const log of res.body.data) {
      assert.strictEqual(log.federation_id, fedB.id, 'Must only see Maharashtra logs');
    }
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passedTests} / ${totalTests} Offline/SMS Fallback tests passed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal SMS fallback test error:', err);
  process.exit(1);
});
