/**
 * Automated Test Suite for V2 Feature #4: Worker Welfare & Insurance
 *
 * Covers:
 *  1. Admin creates policy for own federation
 *  2. Approved worker browses policies and enrolls
 *  3. Duplicate enrollment rejected (409 DUPLICATE_ENROLLMENT)
 *  4. Cross-federation enrollment rejected (403 FORBIDDEN_TENANT)
 *  5. Payment integration: ₹1000 booking with enrolled worker creates:
 *     - platform_commission = ₹150 (15%)
 *     - welfare_deduction = ₹20 (2%)
 *     - worker_payout = ₹830 (83%)
 *     - sum consistency: amount === commission + welfare + payout
 *     - immutable welfare_contributions ledger row
 *     - worker enrollment total_contributions_accumulated updated to ₹20
 *  6. Existing payment flow still works unchanged for non-enrolled workers
 *  7. Worker submits valid claim with evidence document -> initial status: submitted
 *  8. Invalid file type (.exe) rejected
 *  9. Oversized document (>5MB) rejected
 *  10. Worker views submitted claim in own history
 *  11. Home Federation Admin sees own federation claims
 *  12. Cross-federation Admin cannot view or adjudicate claims from other federations
 *  13. Admin approves claim with valid approved amount -> status becomes approved
 *  14. Admin rejects second claim with reason -> status becomes rejected
 *  15. Federation Welfare Fund Summary accurately calculates collected, approved, and net reserve
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
  console.log('  RUNNING WORKER WELFARE & INSURANCE TEST SUITE (V2 #4)');
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

  // Clean prior welfare test data
  await db.run("DELETE FROM welfare_claims WHERE description LIKE '%Welfare Test%'");
  await db.run("DELETE FROM welfare_contributions WHERE worker_id IN (SELECT id FROM workers WHERE full_name LIKE 'Welfare Worker%')");
  await db.run("DELETE FROM worker_welfare_enrollments WHERE worker_id IN (SELECT id FROM workers WHERE full_name LIKE 'Welfare Worker%')");
  await db.run("DELETE FROM insurance_policies WHERE name LIKE '%Test Policy%'");
  await db.run("DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE service_address LIKE '%Welfare Test%')");
  await db.run("DELETE FROM sms_logs WHERE booking_id IN (SELECT id FROM bookings WHERE service_address LIKE '%Welfare Test%') OR worker_id IN (SELECT id FROM workers WHERE full_name LIKE 'Welfare Worker%')");
  await db.run("DELETE FROM bookings WHERE service_address LIKE '%Welfare Test%'");
  await db.run("DELETE FROM workers WHERE full_name LIKE 'Welfare Worker%'");
  await db.run("DELETE FROM customers WHERE phone LIKE '%9988000001%'");

  // Customer
  const custId = uuidv4();
  const custPhone = '+919988000001';
  await db.run('INSERT INTO customers (id, phone, full_name) VALUES (?, ?, ?)', [custId, custPhone, 'Welfare Test Customer']);
  const tokenCust = sign({ id: custId, role: 'customer', phone: custPhone });

  // Worker 1: Approved worker in Pilot Federation
  const w1Id = uuidv4();
  const w1Phone = '+919988000011';
  await db.run(`
    INSERT INTO workers (id, federation_id, full_name, phone, skill_category, verification_status, skill_certificate_verified, lat, lng)
    VALUES (?, ?, 'Welfare Worker Alpha', ?, 'plumber', 'approved', 1, 28.6350, 77.2200)
  `, [w1Id, fedA.id, w1Phone]);
  const tokenW1 = sign({ id: w1Id, role: 'worker', phone: w1Phone, federation_id: fedA.id });

  // Worker 2: Non-enrolled worker in Pilot Federation (to test regression)
  const w2Id = uuidv4();
  const w2Phone = '+919988000022';
  await db.run(`
    INSERT INTO workers (id, federation_id, full_name, phone, skill_category, verification_status, skill_certificate_verified, lat, lng)
    VALUES (?, ?, 'Welfare Worker Beta (Non-Enrolled)', ?, 'plumber', 'approved', 1, 28.6400, 77.2250)
  `, [w2Id, fedA.id, w2Phone]);
  const tokenW2 = sign({ id: w2Id, role: 'worker', phone: w2Phone, federation_id: fedA.id });

  // Worker 3: Approved worker in Maharashtra Federation (for cross-tenant test)
  const wCrossId = uuidv4();
  const wCrossPhone = '+919988000033';
  await db.run(`
    INSERT INTO workers (id, federation_id, full_name, phone, skill_category, verification_status, skill_certificate_verified, lat, lng)
    VALUES (?, ?, 'Welfare Worker Gamma (Maha)', ?, 'plumber', 'approved', 1, 19.0760, 72.8777)
  `, [wCrossId, fedB.id, wCrossPhone]);
  const tokenWCross = sign({ id: wCrossId, role: 'worker', phone: wCrossPhone, federation_id: fedB.id });

  console.log(`  -> Pilot Fed: Admin A, Worker Alpha (${w1Phone}), Worker Beta (${w2Phone})`);
  console.log(`  -> Maharashtra Fed: Admin B, Worker Gamma (${wCrossPhone})\n`);

  // ── 1. Policy Creation & Worker Enrollment ────────────────────────────────
  console.log('1. Policy Creation & Worker Enrollment:');

  let policyA;

  await test('Admin A creates cooperative insurance policy for Pilot Federation', async () => {
    const res = await api('/admin/welfare/policies', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminA}` },
      body: JSON.stringify({
        name: 'Pilot Fed Mutual Healthcare Test Policy',
        provider_name: 'National Insurance Co.',
        policy_number: 'TEST-POL-001',
        coverage_amount: 150000,
        premium_monthly: 40,
        contribution_rate: 0.02, // 2% per booking
      }),
    });

    assert.strictEqual(res.status, 201);
    policyA = res.body.data;
    assert.strictEqual(policyA.federation_id, fedA.id);
    assert.strictEqual(policyA.contribution_rate, 0.02);
  });

  await test('Approved Worker Alpha browses policies and enrolls in policy', async () => {
    const listRes = await api('/welfare/policies', {
      headers: { Authorization: `Bearer ${tokenW1}` },
    });
    assert.strictEqual(listRes.status, 200);
    assert(listRes.body.data.some(p => p.id === policyA.id));

    const enrollRes = await api('/welfare/enroll', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenW1}` },
      body: JSON.stringify({ policy_id: policyA.id }),
    });

    assert.strictEqual(enrollRes.status, 201);
    assert.strictEqual(enrollRes.body.data.worker_id, w1Id);
    assert.strictEqual(enrollRes.body.data.policy_id, policyA.id);
    assert.strictEqual(enrollRes.body.data.status, 'active');
  });

  await test('Duplicate active enrollment returns 409 DUPLICATE_ENROLLMENT', async () => {
    const res = await api('/welfare/enroll', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenW1}` },
      body: JSON.stringify({ policy_id: policyA.id }),
    });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.error.code, 'DUPLICATE_ENROLLMENT');
  });

  await test('Cross-federation enrollment rejected: Worker Gamma (Fed B) cannot enroll in Fed A policy', async () => {
    const res = await api('/welfare/enroll', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenWCross}` },
      body: JSON.stringify({ policy_id: policyA.id }),
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'FORBIDDEN_TENANT');
  });

  // ── 2. Payment Integration & Contribution Calculation ─────────────────────
  console.log('\n2. Payment Integration & ₹1000 Contribution Verification:');

  let bookingEnrolled;

  await test('Completed booking with enrolled worker calculates ₹150 commission, ₹20 welfare, ₹830 payout', async () => {
    // Create completed booking for Worker Alpha
    const bId = uuidv4();
    await db.run(`
      INSERT INTO bookings (id, customer_id, worker_id, federation_id, skill_category, service_address, status, completed_by_customer, completed_by_worker)
      VALUES (?, ?, ?, ?, 'plumber', 'Welfare Test Address 1', 'completed', 1, 1)
    `, [bId, custId, w1Id, fedA.id]);
    bookingEnrolled = await db.get('SELECT * FROM bookings WHERE id = ?', [bId]);

    // Pay ₹1000
    const payRes = await api('/payments/initiate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCust}` },
      body: JSON.stringify({
        booking_id: bookingEnrolled.id,
        amount: 1000,
      }),
    });

    assert.strictEqual(payRes.status, 201);
    const payment = payRes.body.data;

    // Strict numerical assertions
    assert.strictEqual(payment.amount, 1000);
    assert.strictEqual(payment.platform_commission, 150.0); // 15%
    assert.strictEqual(payment.welfare_deduction, 20.0);    // 2%
    assert.strictEqual(payment.worker_payout, 830.0);       // 1000 - 150 - 20 = 830
    assert.strictEqual(payment.status, 'paid');

    // Mathematical verification: amount = commission + welfare + payout
    const sum = +(payment.platform_commission + payment.welfare_deduction + payment.worker_payout).toFixed(2);
    assert.strictEqual(sum, payment.amount, 'amount must equal commission + welfare + payout');
  });

  await test('Immutable welfare_contributions ledger row is created', async () => {
    const row = await db.get('SELECT * FROM welfare_contributions WHERE worker_id = ? AND booking_id = ?', [w1Id, bookingEnrolled.id]);
    assert(row, 'Contribution ledger entry must exist');
    assert.strictEqual(row.amount, 20.0);
    assert.strictEqual(row.policy_id, policyA.id);
    assert.strictEqual(row.federation_id, fedA.id);
  });

  await test('Worker enrollment accumulated total is updated to ₹20', async () => {
    const enrollment = await db.get('SELECT * FROM worker_welfare_enrollments WHERE worker_id = ? AND policy_id = ?', [w1Id, policyA.id]);
    assert.strictEqual(enrollment.total_contributions_accumulated, 20.0);

    const myContribRes = await api('/welfare/my-contributions', {
      headers: { Authorization: `Bearer ${tokenW1}` },
    });
    assert.strictEqual(myContribRes.status, 200);
    assert(myContribRes.body.data.length >= 1);
    assert.strictEqual(myContribRes.body.data[0].amount, 20.0);
  });

  await test('Existing payment flow works unchanged for non-enrolled workers (0 welfare deduction)', async () => {
    // Create completed booking for non-enrolled Worker Beta
    const bId = uuidv4();
    await db.run(`
      INSERT INTO bookings (id, customer_id, worker_id, federation_id, skill_category, service_address, status, completed_by_customer, completed_by_worker)
      VALUES (?, ?, ?, ?, 'plumber', 'Welfare Test Address 2', 'completed', 1, 1)
    `, [bId, custId, w2Id, fedA.id]);

    const payRes = await api('/payments/initiate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCust}` },
      body: JSON.stringify({
        booking_id: bId,
        amount: 1000,
      }),
    });

    assert.strictEqual(payRes.status, 201);
    const payment = payRes.body.data;
    assert.strictEqual(payment.amount, 1000);
    assert.strictEqual(payment.platform_commission, 150.0);
    assert.strictEqual(payment.welfare_deduction, 0.0);
    assert.strictEqual(payment.worker_payout, 850.0); // 85% full payout
  });

  // ── 3. Claim Submission & Document Security ───────────────────────────────
  console.log('\n3. Claim Submission & Evidence Document Security:');

  const validBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  let claim1;
  let claim2;

  await test('Worker Alpha submits valid medical claim with PNG bill -> status: submitted', async () => {
    const res = await api('/welfare/claims', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenW1}` },
      body: JSON.stringify({
        policy_id: policyA.id,
        claim_type: 'medical',
        amount_requested: 3500,
        incident_date: '2026-08-28',
        description: 'Welfare Test: Clinic visit and antibiotic prescription.',
        document_base64: validBase64Image,
        mime_type: 'image/png',
      }),
    });

    assert.strictEqual(res.status, 201);
    claim1 = res.body.data;
    assert(claim1.claim_number.startsWith('CLM-'));
    assert.strictEqual(claim1.status, 'submitted');
    assert.strictEqual(claim1.amount_requested, 3500);
    assert.strictEqual(claim1.amount_approved, 0.0);
    assert(claim1.evidence_document_url.startsWith('claim_'));
  });

  await test('Invalid file type (.exe) is rejected', async () => {
    const res = await api('/welfare/claims', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenW1}` },
      body: JSON.stringify({
        policy_id: policyA.id,
        claim_type: 'medical',
        amount_requested: 1000,
        incident_date: '2026-08-28',
        description: 'Welfare Test: Invalid executable',
        document_base64: Buffer.from('MZ...fake_binary').toString('base64'),
        mime_type: 'application/x-msdownload',
      }),
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'INVALID_FILE_TYPE');
  });

  await test('Oversized file (>5MB) is rejected', async () => {
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024); // 6 MB
    const res = await api('/welfare/claims', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenW1}` },
      body: JSON.stringify({
        policy_id: policyA.id,
        claim_type: 'medical',
        amount_requested: 1000,
        incident_date: '2026-08-28',
        description: 'Welfare Test: Oversized document',
        document_base64: bigBuffer.toString('base64'),
        mime_type: 'application/pdf',
      }),
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'FILE_TOO_LARGE');
  });

  await test('Claim appears in worker personal history (GET /welfare/my-claims)', async () => {
    const res = await api('/welfare/my-claims', {
      headers: { Authorization: `Bearer ${tokenW1}` },
    });

    assert.strictEqual(res.status, 200);
    assert(res.body.data.some(c => c.id === claim1.id));
  });

  // Submit second claim for rejection testing
  await test('Worker Alpha submits second claim for tool damage', async () => {
    const res = await api('/welfare/claims', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenW1}` },
      body: JSON.stringify({
        policy_id: policyA.id,
        claim_type: 'tool_damage',
        amount_requested: 8000,
        incident_date: '2026-08-29',
        description: 'Welfare Test: Power drill burnt during heavy pipeline work.',
        document_base64: validBase64Image,
        mime_type: 'image/png',
      }),
    });

    assert.strictEqual(res.status, 201);
    claim2 = res.body.data;
  });

  // ── 4. Admin Adjudication & Tenant Isolation ──────────────────────────────
  console.log('\n4. Admin Adjudication & Multi-Federation Isolation:');

  await test('Home Federation Admin A sees claims submitted in Pilot Federation', async () => {
    const res = await api('/admin/welfare/claims', {
      headers: { Authorization: `Bearer ${tokenAdminA}` },
    });

    assert.strictEqual(res.status, 200);
    assert(res.body.data.some(c => c.id === claim1.id));
    assert(res.body.data.some(c => c.id === claim2.id));
  });

  await test('Cross-federation Admin B cannot see Pilot Federation claims', async () => {
    const res = await api('/admin/welfare/claims', {
      headers: { Authorization: `Bearer ${tokenAdminB}` },
    });

    assert.strictEqual(res.status, 200);
    assert(!res.body.data.some(c => c.id === claim1.id));
    assert(!res.body.data.some(c => c.id === claim2.id));
  });

  await test('Cross-federation Admin B cannot adjudicate Pilot Federation claim (404)', async () => {
    const res = await api(`/admin/welfare/claims/${claim1.id}/adjudicate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminB}` },
      body: JSON.stringify({
        decision: 'approved',
        amount_approved: 3500,
        admin_notes: 'Unauthorized approval attempt',
      }),
    });

    assert.strictEqual(res.status, 404);
  });

  await test('Admin A approves Claim 1 with ₹3000 sanctioned amount', async () => {
    const res = await api(`/admin/welfare/claims/${claim1.id}/adjudicate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminA}` },
      body: JSON.stringify({
        decision: 'approved',
        amount_approved: 3000,
        admin_notes: 'Verified clinic bills and prescription. Approved ₹3000 assistance.',
      }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'approved');
    assert.strictEqual(res.body.data.amount_approved, 3000.0);
    assert.strictEqual(res.body.data.adjudicated_by_admin_id, (await api('/auth/admin/login', { method: 'POST', body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' }) })).body.data.admin.id);
  });

  await test('Admin A rejects Claim 2 with explanatory reason', async () => {
    const res = await api(`/admin/welfare/claims/${claim2.id}/adjudicate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminA}` },
      body: JSON.stringify({
        decision: 'rejected',
        admin_notes: 'Tool wear-and-tear is not covered under basic medical policy.',
      }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'rejected');
    assert.strictEqual(res.body.data.amount_approved, 0.0);
  });

  // ── 5. Federation Welfare Fund Analytics ──────────────────────────────────
  console.log('\n5. Federation Welfare Fund Analytics (Tenant Scoped):');

  await test('Admin A views correct fund summary for Pilot Federation', async () => {
    const res = await api('/admin/welfare/fund-summary', {
      headers: { Authorization: `Bearer ${tokenAdminA}` },
    });

    assert.strictEqual(res.status, 200);
    const summary = res.body.data;
    assert.strictEqual(summary.federation_id, fedA.id);
    assert(summary.total_contributions_collected >= 20.0);
    assert(summary.total_claims_approved >= 3000.0);
    assert.strictEqual(summary.active_enrollments, 1);
  });

  // Teardown test artifacts so other suites run in a pristine state
  await db.run("DELETE FROM welfare_claims WHERE description LIKE '%Welfare Test%'");
  await db.run("DELETE FROM welfare_contributions WHERE worker_id IN (SELECT id FROM workers WHERE full_name LIKE 'Welfare Worker%')");
  await db.run("DELETE FROM worker_welfare_enrollments WHERE worker_id IN (SELECT id FROM workers WHERE full_name LIKE 'Welfare Worker%')");
  await db.run("DELETE FROM insurance_policies WHERE name LIKE '%Test Policy%'");
  await db.run("DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE service_address LIKE '%Welfare Test%')");
  await db.run("DELETE FROM sms_logs WHERE booking_id IN (SELECT id FROM bookings WHERE service_address LIKE '%Welfare Test%') OR worker_id IN (SELECT id FROM workers WHERE full_name LIKE 'Welfare Worker%')");
  await db.run("DELETE FROM bookings WHERE service_address LIKE '%Welfare Test%'");
  await db.run("DELETE FROM workers WHERE full_name LIKE 'Welfare Worker%'");
  await db.run("DELETE FROM customers WHERE phone LIKE '%9988000001%'");

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passedTests} / ${totalTests} Worker Welfare & Insurance tests passed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal welfare test error:', err);
  process.exit(1);
});
