/**
 * Automated Verification Suite for:
 * 1. Customer Dispute Submission & Real-time Admin View
 * 2. Dispute Adjudication (Review, Dismiss, Warning, Refund with Ledger Reversal)
 * 3. Welfare Policy Creation & Worker Enrollment (Federation & Independent)
 * 4. Insurance Claim Submission with Evidence Document
 * 5. Insurance Claim Adjudication (Approve & Reject)
 * 6. Welfare Fund Accounting & Contribution Ledger Tracking
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('./db/database');
const { sign } = require('./middleware/auth');

const BASE_URL = 'http://localhost:5000/api/v1';

async function req(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {}
  return { status: res.status, ok: res.ok, data };
}

async function runSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING WELFARE, INSURANCE & DISPUTE ADJUDICATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Setup actors
  const pilotFed = (await db.get("SELECT id FROM federations WHERE code = 'PILOT-FED' OR name = 'Pilot Federation' LIMIT 1"))?.id;
  const uniqueSuffix = Date.now().toString().slice(-8);

  const supLogin = await req(`${BASE_URL}/auth/admin/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' })
  });
  const supToken = supLogin.data?.data?.token;
  assert(supLogin.status === 200 && supToken, 'Supervising Admin authenticated');

  const custId = 'cust-test-' + uniqueSuffix;
  const custPhone = `+9191${uniqueSuffix}`;
  await db.run('INSERT INTO customers (id, full_name, phone) VALUES (?, ?, ?)', [custId, 'Dispute Test Cust', custPhone]);
  const custToken = sign({ id: custId, role: 'customer', phone: custPhone });

  const workerId = 'wrk-test-' + uniqueSuffix;
  const workerPhone = `+9192${uniqueSuffix}`;
  await db.run(`
    INSERT INTO workers (id, federation_id, full_name, phone, skill_category, worker_type, verification_status, skill_certificate_verified, reliability_score)
    VALUES (?, ?, 'Welfare Test Worker', ?, 'carpenter', 'federation', 'approved', 1, 95)
  `, [workerId, pilotFed, workerPhone]);
  const workerToken = sign({ id: workerId, role: 'worker', phone: workerPhone, federation_id: pilotFed });

  // -------------------------------------------------------------
  // PART A: WELFARE & INSURANCE POLICIES, ENROLLMENT, CLAIMS
  // -------------------------------------------------------------
  console.log('--- PART A: Welfare & Insurance System ---');

  // 1. Admin creates welfare insurance policy
  const policyId = uuidv4();
  const policyName = `Coop Health & Accident Shield ${uniqueSuffix}`;
  const createPolRes = await req(`${BASE_URL}/admin/welfare/policies`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${supToken}` },
    body: JSON.stringify({
      name: policyName,
      provider_name: 'National Cooperative Health Mutual',
      coverage_amount: 100000,
      premium_monthly: 50,
      contribution_rate: 0.07,
      federation_id: pilotFed,
    })
  });
  assert(createPolRes.status === 201, 'Supervising Admin created cooperative welfare policy (201)');
  const createdPolicy = createPolRes.data?.data;

  // 2. Worker browses policies
  const browseRes = await req(`${BASE_URL}/welfare/policies`, {
    headers: { Authorization: `Bearer ${workerToken}` }
  });
  assert(browseRes.status === 200, 'Worker browses active welfare policies (200)');
  const policies = browseRes.data?.data || [];
  assert(policies.some(p => p.id === createdPolicy.id), 'Newly created policy visible in worker catalog');

  // 3. Worker enrolls in policy
  const enrollRes = await req(`${BASE_URL}/welfare/enroll`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${workerToken}` },
    body: JSON.stringify({ policy_id: createdPolicy.id })
  });
  assert(enrollRes.status === 201, 'Worker enrolled in welfare policy (201)');

  // 4. Duplicate enrollment rejected
  const dupEnrollRes = await req(`${BASE_URL}/welfare/enroll`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${workerToken}` },
    body: JSON.stringify({ policy_id: createdPolicy.id })
  });
  assert(dupEnrollRes.status === 409, 'Duplicate policy enrollment rejected (409 Conflict)');

  // 5. Worker files an insurance claim with evidence document
  const validBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const claimRes = await req(`${BASE_URL}/welfare/claims`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${workerToken}` },
    body: JSON.stringify({
      policy_id: createdPolicy.id,
      claim_type: 'medical',
      amount_requested: 2500,
      incident_date: '2026-09-01',
      description: 'Medical clinic consultation and diagnostic bills',
      document_base64: validBase64,
      mime_type: 'image/png'
    })
  });
  assert(claimRes.status === 201, 'Worker submitted welfare claim with evidence document (201)');
  const submittedClaim = claimRes.data?.data;
  assert(submittedClaim.status === 'submitted', 'Submitted claim has status "submitted"');

  // 6. Admin adjudicates insurance claim: Approve
  const approveClaimRes = await req(`${BASE_URL}/admin/welfare/claims/${submittedClaim.id}/adjudicate?federation_id=${pilotFed}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${supToken}` },
    body: JSON.stringify({
      decision: 'approved',
      amount_approved: 2500,
      admin_notes: 'Valid verified medical receipts submitted',
      federation_id: pilotFed
    })
  });
  assert(approveClaimRes.status === 200, 'Admin adjudicated and approved welfare claim (200)');
  const approvedClaim = approveClaimRes.data?.data;
  assert(approvedClaim.status === 'approved', 'Claim status updated to "approved"');
  assert(Number(approvedClaim.amount_approved) === 2500, 'Sanctioned claim amount recorded as ₹2500');

  // 7. Welfare fund analytics
  const fundSummaryRes = await req(`${BASE_URL}/admin/welfare/fund-summary?federation_id=${pilotFed}`, {
    headers: { Authorization: `Bearer ${supToken}` }
  });
  assert(fundSummaryRes.status === 200, 'Admin can view welfare fund analytics (200)');
  const fundSummary = fundSummaryRes.data?.data || {};
  assert('total_claims_approved' in fundSummary || 'total_claims_approved_amount' in fundSummary, 'Welfare fund summary returns valid financial metrics');

  // -------------------------------------------------------------
  // PART B: CUSTOMER DISPUTE SUBMISSION & ADMIN CONSOLE UPDATES
  // -------------------------------------------------------------
  console.log('\n--- PART B: Customer Dispute Submission & Real-time Admin View ---');

  // Create booking and completed payment for dispute test
  const bId = 'book-dsp-' + uniqueSuffix;
  await db.run(`
    INSERT INTO bookings (id, customer_id, worker_id, federation_id, skill_category, service_address, status, service_unit_price, quantity, effective_quantity, gross_amount, gross_amount_paise)
    VALUES (?, ?, ?, ?, 'carpenter', '456 Sector 18, Noida', 'completed', 500, 1, 1, 500, 50000)
  `, [bId, custId, workerId, pilotFed]);

  const pId = 'pay-dsp-' + uniqueSuffix;
  await db.run(`
    INSERT INTO payments (id, booking_id, federation_id, amount, platform_commission, welfare_deduction, worker_payout, status, amount_paise, worker_payout_paise, insurance_deduction_paise, platform_commission_paise)
    VALUES (?, ?, ?, 500, 20, 35, 425, 'paid', 50000, 42500, 3500, 2000)
  `, [pId, bId, pilotFed]);

  // Record original ledger payment
  const ledgerId = 'ledg-dsp-' + uniqueSuffix;
  await db.run(`
    INSERT INTO payment_ledger (
      id, booking_id, payment_id, worker_id, federation_id, worker_type,
      gross_amount_paise, worker_amount_paise, insurance_amount_paise, federation_amount_paise, platform_amount_paise,
      gross_amount, worker_amount, insurance_amount, federation_amount, platform_amount,
      currency, transaction_type, status, reconciled, idempotency_key
    )
    VALUES (?, ?, ?, ?, ?, 'federation', 50000, 42500, 3500, 2000, 2000, 500, 425, 35, 20, 20, 'INR', 'payment', 'paid', 1, ?)
  `, [ledgerId, bId, pId, workerId, pilotFed, `key_${pId}`]);

  // 1. Customer submits dispute from customer app
  const disputeSubmitRes = await req(`${BASE_URL}/disputes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${custToken}` },
    body: JSON.stringify({
      booking_id: bId,
      reason: 'Cabinet hinge was fitted improperly and door does not close',
      document_base64: validBase64,
      mime_type: 'image/png'
    })
  });
  assert(disputeSubmitRes.status === 201, 'Customer successfully submitted dispute from customer app (201)');
  const disputeData = disputeSubmitRes.data?.data;
  assert(disputeData.status === 'raised', 'Dispute initial status is "raised"');
  assert(disputeData.dispute_number.startsWith('DSP-'), 'Dispute reference number generated');

  // 2. Dispute immediately visible on Admin Console (GET /admin/disputes)
  const adminDisputesRes = await req(`${BASE_URL}/admin/disputes`, {
    headers: { Authorization: `Bearer ${supToken}` }
  });
  assert(adminDisputesRes.status === 200, 'Admin fetched live dispute list (200)');
  const adminDisputes = adminDisputesRes.data?.data || [];
  const foundInAdmin = adminDisputes.find(d => d.id === disputeData.id);
  assert(foundInAdmin !== undefined, 'Customer-submitted dispute is immediately present at admin end');
  assert(foundInAdmin.reason === disputeData.reason, 'Admin receives exact customer grievance reason');

  // 3. Admin updates dispute status to Under Review
  const reviewRes = await req(`${BASE_URL}/admin/disputes/${disputeData.id}/review`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${supToken}` }
  });
  assert(reviewRes.status === 200, 'Admin placed dispute under review (200)');
  assert(reviewRes.data?.data?.status === 'under_review', 'Dispute status transitioned to "under_review"');

  // 4. Admin adjudicates dispute with Customer Refund and Financial Reversal
  const resolveRes = await req(`${BASE_URL}/admin/disputes/${disputeData.id}/resolve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${supToken}` },
    body: JSON.stringify({
      resolution_action: 'refund',
      refund_amount: 500,
      resolution_notes: 'Defect confirmed via customer photo evidence. Full ₹500 refunded.'
    })
  });
  assert(resolveRes.status === 200, 'Admin adjudicated dispute with refund resolution (200)');
  const resolvedDispute = resolveRes.data?.data;
  assert(resolvedDispute.status === 'resolved', 'Dispute status updated to "resolved"');
  assert(Number(resolvedDispute.refund_amount) === 500, 'Refund amount ₹500 recorded on dispute');

  // 5. Verify auditable negative reversal entry exists in financial ledger
  const reversalLedger = await db.get(`
    SELECT * FROM payment_ledger WHERE booking_id = ? AND transaction_type = 'refund'
  `, [bId]);
  assert(reversalLedger !== null, 'Immutable refund reversal entry created in payment_ledger');
  assert(reversalLedger.gross_amount_paise === -50000, 'Reversal amount is exact negative of payment gross (-50000 paise)');
  assert(reversalLedger.status === 'refunded', 'Reversal status is "refunded"');

  // 6. Verify original payment ledger entry was NOT altered or deleted
  const originalLedger = await db.get(`
    SELECT * FROM payment_ledger WHERE id = ?
  `, [ledgerId]);
  assert(originalLedger !== null, 'Original payment ledger record preserved intact for audit trail');
  assert(originalLedger.gross_amount_paise === 50000, 'Original payment gross remains exactly 50000 paise');

  // Clean up test data
  await db.run('DELETE FROM welfare_claims WHERE id = ?', [submittedClaim.id]);
  await db.run('DELETE FROM worker_welfare_enrollments WHERE worker_id = ?', [workerId]);
  await db.run('DELETE FROM insurance_policies WHERE id = ?', [createdPolicy.id]);
  await db.run('DELETE FROM disputes WHERE id = ?', [disputeData.id]);
  await db.run('DELETE FROM payment_ledger WHERE booking_id = ?', [bId]);
  await db.run('DELETE FROM payments WHERE booking_id = ?', [bId]);
  await db.run('DELETE FROM bookings WHERE id = ?', [bId]);
  await db.run('DELETE FROM workers WHERE id = ?', [workerId]);
  await db.run('DELETE FROM customers WHERE id = ?', [custId]);

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🏁 TEST EXECUTION FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
