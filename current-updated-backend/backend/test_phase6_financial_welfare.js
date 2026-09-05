/**
 * Phase 6 - Service Pricing, Payment Split, Worker Payout, Insurance/Welfare & Financial Ledger
 * Verification Test Suite
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { calculateBookingFinancials } = require('./services/payoutService');
const { sign } = require('./middleware/auth');
const db = require('./db/database');

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
  } catch (e) {
    // not json
  }
  return { status: res.status, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 STARTING PHASE 6 COMPREHENSIVE TEST SUITE');
  console.log('====================================================\n');

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

  // -------------------------------------------------------------
  // Test 1: CSV Validation & Integrity
  // -------------------------------------------------------------
  console.log('--- TEST 1: CSV Validation & Integrity ---');
  const csvPath = path.resolve(__dirname, '../../docs/final_worker_payout_master_india.csv');
  assert(fs.existsSync(csvPath), `CSV exists at ${csvPath}`);

  const rawCsv = fs.readFileSync(csvPath, 'utf-8');
  const lines = rawCsv.split(/\r?\n/).filter(line => line.trim().length > 0);
  assert(lines.length === 250, `CSV has exactly 250 lines (1 header + 249 services) [Actual: ${lines.length}]`);

  const headers = lines[0].split(',').map(h => h.trim());
  const requiredColumns = [
    'service_id', 'category', 'job_name', 'pricing_unit',
    'fixed_worker_payout_inr', 'minimum_quantity', 'payout_scope', 'notes'
  ];
  const allColsExist = requiredColumns.every(col => headers.includes(col));
  assert(allColsExist, 'All required CSV header columns are present');

  // Check database catalog endpoint
  try {
    const srvRes = await req(`${BASE_URL}/services`);
    assert(srvRes.status === 200, 'GET /services returns HTTP 200');
    assert(Array.isArray(srvRes.data?.data), 'GET /services returns data array');
    const serviceList = srvRes.data?.data || [];
    assert(serviceList.length === 249, `Database contains 249 services [Actual: ${serviceList.length}]`);
    
    // Check specific service from CSV
    const sampleService = serviceList.find(s => s.service_id === 'SRV-001' || s.job_name.includes('Ceiling Fan'));
    assert(sampleService !== undefined, 'Sample service found in catalog');
  } catch (err) {
    assert(false, `GET /services failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 2: Pricing Engine — Federation Worker (85 / 7 / 4 / 4)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Pricing Engine — Federation Worker Split ---');
  const fed300 = calculateBookingFinancials({
    baseUnitPricePaise: 30000,
    quantity: 1,
    minimumQuantity: 1,
    workerType: 'federation'
  });
  assert(fed300.worker_share_paise === 25500, '₹300 Federation Worker payout = ₹255 (25500 paise)');
  assert(fed300.insurance_share_paise === 2100, '₹300 Federation Insurance = ₹21 (2100 paise)');
  assert(fed300.federation_share_paise === 1200, '₹300 Federation Share = ₹12 (1200 paise)');
  assert(fed300.platform_fee_paise === 1200, '₹300 Platform Fee = ₹12 (1200 paise)');
  assert(
    fed300.worker_share_paise + fed300.insurance_share_paise + fed300.federation_share_paise + fed300.platform_fee_paise === 30000,
    '₹300 Federation sum equals gross amount exactly (30000 paise)'
  );

  const fed900 = calculateBookingFinancials({
    baseUnitPricePaise: 30000,
    quantity: 3,
    minimumQuantity: 1,
    workerType: 'federation'
  });
  assert(fed900.worker_share_paise === 76500, '₹900 Federation Worker payout = ₹765 (76500 paise)');
  assert(fed900.insurance_share_paise === 6300, '₹900 Federation Insurance = ₹63 (6300 paise)');
  assert(fed900.federation_share_paise === 3600, '₹900 Federation Share = ₹36 (3600 paise)');
  assert(fed900.platform_fee_paise === 3600, '₹900 Platform Fee = ₹36 (3600 paise)');
  assert(
    fed900.worker_share_paise + fed900.insurance_share_paise + fed900.federation_share_paise + fed900.platform_fee_paise === 90000,
    '₹900 Federation sum equals gross amount exactly (90000 paise)'
  );

  // -------------------------------------------------------------
  // Test 3: Pricing Engine — Independent Worker (85 / 10 / 0 / 5)
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Pricing Engine — Independent Worker Split ---');
  const ind300 = calculateBookingFinancials({
    baseUnitPricePaise: 30000,
    quantity: 1,
    minimumQuantity: 1,
    workerType: 'independent'
  });
  assert(ind300.worker_share_paise === 25500, '₹300 Independent Worker payout = ₹255 (25500 paise)');
  assert(ind300.insurance_share_paise === 3000, '₹300 Independent Insurance = ₹30 (3000 paise)');
  assert(ind300.federation_share_paise === 0, '₹300 Independent Federation Share = ₹0 (0 paise)');
  assert(ind300.platform_fee_paise === 1500, '₹300 Platform Fee = ₹15 (1500 paise)');
  assert(
    ind300.worker_share_paise + ind300.insurance_share_paise + ind300.federation_share_paise + ind300.platform_fee_paise === 30000,
    '₹300 Independent sum equals gross amount exactly (30000 paise)'
  );

  const ind900 = calculateBookingFinancials({
    baseUnitPricePaise: 30000,
    quantity: 3,
    minimumQuantity: 1,
    workerType: 'independent'
  });
  assert(ind900.worker_share_paise === 76500, '₹900 Independent Worker payout = ₹765 (76500 paise)');
  assert(ind900.insurance_share_paise === 9000, '₹900 Independent Insurance = ₹90 (9000 paise)');
  assert(ind900.federation_share_paise === 0, '₹900 Independent Federation Share = ₹0 (0 paise)');
  assert(ind900.platform_fee_paise === 4500, '₹900 Platform Fee = ₹45 (4500 paise)');
  assert(
    ind900.worker_share_paise + ind900.insurance_share_paise + ind900.federation_share_paise + ind900.platform_fee_paise === 90000,
    '₹900 Independent sum equals gross amount exactly (90000 paise)'
  );

  // -------------------------------------------------------------
  // Test 4: Zero-Discrepancy Rounding / Invariant Proof
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Zero-Discrepancy Rounding on Odd Amounts ---');
  const oddAmounts = [100, 700, 1100, 9900, 10100, 29900, 33333, 77777, 99999, 1234567];
  let allInvariantsHold = true;

  for (const amt of oddAmounts) {
    const fSplit = calculateBookingFinancials({
      baseUnitPricePaise: amt,
      quantity: 1,
      minimumQuantity: 1,
      workerType: 'federation'
    });
    const iSplit = calculateBookingFinancials({
      baseUnitPricePaise: amt,
      quantity: 1,
      minimumQuantity: 1,
      workerType: 'independent'
    });

    const fSum = fSplit.worker_share_paise + fSplit.insurance_share_paise + fSplit.federation_share_paise + fSplit.platform_fee_paise;
    const iSum = iSplit.worker_share_paise + iSplit.insurance_share_paise + iSplit.federation_share_paise + iSplit.platform_fee_paise;

    if (fSum !== amt || iSum !== amt) {
      allInvariantsHold = false;
      console.error(`Discrepancy at ${amt}: FedSum=${fSum}, IndSum=${iSum}`);
    }
  }
  assert(allInvariantsHold, `Invariant (Worker + Insurance + Federation + Platform === Gross) holds for all ${oddAmounts.length} odd amounts`);

  // -------------------------------------------------------------
  // Test 5: Quantity and Minimum Quantity Logic
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Quantity and Minimum Quantity Logic ---');
  const minQtyCheck1 = calculateBookingFinancials({
    baseUnitPricePaise: 10000,
    quantity: 1,
    minimumQuantity: 2,
    workerType: 'federation'
  });
  assert(minQtyCheck1.effective_quantity === 2, 'Requested quantity 1 < min quantity 2 → effective quantity = 2');
  assert(minQtyCheck1.gross_amount_paise === 20000, 'Gross amount = ₹200 (20000 paise)');

  const minQtyCheck2 = calculateBookingFinancials({
    baseUnitPricePaise: 30000,
    quantity: 3,
    minimumQuantity: 1,
    workerType: 'federation'
  });
  assert(minQtyCheck2.effective_quantity === 3, 'Requested quantity 3 >= min quantity 1 → effective quantity = 3');
  assert(minQtyCheck2.gross_amount_paise === 90000, 'Gross amount = ₹900 (90000 paise)');

  // -------------------------------------------------------------
  // Test 6: API Integration — Admin Login & Tenant-Scoped Financials
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Admin Login & Tenant-Scoped Financials ---');
  let supervisingToken = '';
  let fedAdminToken = '';

  try {
    const supLogin = await req(`${BASE_URL}/auth/admin/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' })
    });
    supervisingToken = supLogin.data?.data?.token;
    assert(supLogin.status === 200 && supervisingToken, 'Supervising Admin logged in successfully');

    const finSummary = await req(`${BASE_URL}/admin/financial-summary`, {
      headers: { Authorization: `Bearer ${supervisingToken}` }
    });
    assert(finSummary.status === 200, 'Supervising Admin can view global financial summary');
    const summaryData = finSummary.data?.data || finSummary.data;
    assert('gross_revenue_paise' in summaryData, 'Financial summary contains gross_revenue_paise');
    assert('worker_payouts_paise' in summaryData, 'Financial summary contains worker_payouts_paise');
    assert('insurance_contributions_paise' in summaryData, 'Financial summary contains insurance_contributions_paise');
    assert('platform_revenue_paise' in summaryData, 'Financial summary contains platform_revenue_paise');

    const ledgerRes = await req(`${BASE_URL}/admin/financial-ledger`, {
      headers: { Authorization: `Bearer ${supervisingToken}` }
    });
    assert(ledgerRes.status === 200, 'Supervising Admin can view financial ledger');
    assert(Array.isArray(ledgerRes.data?.data), 'Financial ledger returns list of records');

    // Test Federation Admin login & tenant scoping
    const fedLogin = await req(`${BASE_URL}/auth/admin/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@maharashtra.coop', password: 'mahaPassword123' })
    });
    if (fedLogin.status === 200) {
      fedAdminToken = fedLogin.data?.data?.token;
      assert(fedAdminToken, 'Federation Admin logged in successfully');

      // Attempt cross-tenant query: requesting another federation ID
      const crossRes = await req(`${BASE_URL}/admin/financial-summary?federation_id=some-other-fed-id`, {
        headers: { Authorization: `Bearer ${fedAdminToken}` }
      });
      assert(crossRes.status === 403, 'Federation Admin attempting cross-tenant financial query receives HTTP 403');
    }
  } catch (err) {
    assert(false, `Admin financial endpoints failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 7: Welfare Policies & Independent Worker Access
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Welfare Policies & Independent Worker Access ---');
  try {
    // Create an independent worker token
    const indWorkerToken = sign({
      id: 'ind-test-worker-id',
      role: 'worker',
      worker_type: 'independent',
      phone: '+919999000099',
      federation_id: null
    });

    const policiesRes = await req(`${BASE_URL}/welfare/policies`, {
      headers: { Authorization: `Bearer ${indWorkerToken}` }
    });
    assert(policiesRes.status === 200, 'GET /welfare/policies returns 200 for independent worker');
    assert(Array.isArray(policiesRes.data?.data), 'Independent worker can access active welfare policies');
  } catch (err) {
    assert(false, `GET /welfare/policies failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 8: E2E Booking Snapshot, Payment, Idempotency & Reversal
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: E2E Booking Snapshot, Payment, Idempotency & Reversal ---');
  try {
    const uniqueSuffix = Date.now().toString().slice(-8);
    const custPhone = `+9199${uniqueSuffix}`;
    const workerPhone = `+9188${uniqueSuffix}`;
    const custId = 'cust-test-p6-' + Date.now();
    const workerId = 'wrk-test-p6-' + Date.now();
    const pilotFed = (await db.get("SELECT id FROM federations WHERE code = 'PILOT-FED' OR name = 'Pilot Federation' LIMIT 1"))?.id;

    // Seed customer and federation worker
    await db.run('INSERT INTO customers (id, full_name, phone) VALUES (?, ?, ?)', [custId, 'P6 Test Customer', custPhone]);
    await db.run(`
      INSERT INTO workers (id, federation_id, full_name, phone, skill_category, worker_type, verification_status, skill_certificate_verified)
      VALUES (?, ?, ?, ?, 'electrician', 'federation', 'approved', 1)
    `, [workerId, pilotFed, 'P6 Fed Worker', workerPhone]);

    const custToken = sign({ id: custId, role: 'customer', phone: custPhone });
    const wrkToken = sign({ id: workerId, role: 'worker', phone: workerPhone, federation_id: pilotFed });

    // Step 1: Customer creates booking using catalog service SVC-001 (or first catalog item)
    const catalogItem = await db.get('SELECT * FROM service_catalog WHERE is_active = 1 LIMIT 1');
    assert(catalogItem !== null, 'Found active service in catalog');

    const bookRes = await req(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({
        service_id: catalogItem.service_id,
        skill_category: catalogItem.category || 'electrician',
        scheduled_time: new Date(Date.now() + 3600000).toISOString(),
        quantity: 3,
        service_address: '123 Test Street, New Delhi',
        service_lat: 28.6139,
        service_lng: 77.2090,
      })
    });
    assert(bookRes.status === 201, 'Booking created successfully (201)');
    const booking = bookRes.data?.data;
    assert(booking.service_id === catalogItem.service_id, 'Booking contains service_id snapshot');
    assert(booking.effective_quantity === Math.max(3, catalogItem.minimum_quantity), 'Booking records effective_quantity snapshot');
    assert(booking.gross_amount_paise > 0, 'Booking records gross_amount_paise snapshot');

    // Step 2: Assign worker and complete booking
    await db.run('UPDATE bookings SET worker_id = ?, status = ? WHERE id = ?', [workerId, 'in_progress', booking.id]);

    // Customer completes
    await req(`${BASE_URL}/bookings/${booking.id}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({ rating: 5 })
    });
    // Worker completes (dual completion)
    const wrkCompRes = await req(`${BASE_URL}/bookings/${booking.id}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${wrkToken}` }
    });
    assert(wrkCompRes.status === 200, 'Dual completion accepted');

    // Step 3: Payment initiation
    const payRes = await req(`${BASE_URL}/payments/initiate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({
        booking_id: booking.id,
        amount: booking.gross_amount,
        razorpay_payment_id: 'pay_test_' + Date.now()
      })
    });
    assert(payRes.status === 201, 'Payment initiated and recorded (201)');
    const payment = payRes.data?.data;
    assert(payment.status === 'paid', 'Payment status is paid');

    // Step 4: Verify ledger entry created
    const ledgerEntry = await db.get('SELECT * FROM payment_ledger WHERE booking_id = ? AND transaction_type = ?', [booking.id, 'payment']);
    assert(ledgerEntry !== null, 'Authoritative payment ledger entry created');
    assert(
      ledgerEntry.worker_amount_paise + ledgerEntry.insurance_amount_paise + ledgerEntry.federation_amount_paise + ledgerEntry.platform_amount_paise === ledgerEntry.gross_amount_paise,
      'Payment ledger invariant holds exactly (Worker + Insurance + Federation + Platform === Gross)'
    );

    // Step 5: Webhook idempotency — trigger webhook twice
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: payment.razorpay_payment_id,
            notes: { booking_id: booking.id }
          }
        }
      }
    };
    const wh1 = await req(`${BASE_URL}/payments/webhook`, { method: 'POST', body: JSON.stringify(webhookPayload) });
    const wh2 = await req(`${BASE_URL}/payments/webhook`, { method: 'POST', body: JSON.stringify(webhookPayload) });
    assert(wh1.status === 200 && wh2.status === 200, 'Duplicate webhook deliveries handled safely (HTTP 200)');

    const countLedger = await db.get('SELECT COUNT(*) as c FROM payment_ledger WHERE booking_id = ? AND transaction_type = ?', [booking.id, 'payment']);
    assert(parseInt(countLedger.c) === 1, 'Idempotency guarantee: exactly ONE payment ledger entry exists despite duplicate webhook deliveries');

    // Step 6: Refund reversal integration
    const supLogin = await req(`${BASE_URL}/auth/admin/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' })
    });
    const supToken = supLogin.data?.data?.token;

    const refundRes = await req(`${BASE_URL}/payments/${booking.id}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${supToken}` },
      body: JSON.stringify({ reason: 'Customer cancellation dispute' })
    });
    assert(refundRes.status === 200, 'Admin payment refund processed successfully (200)');

    const refundEntry = await db.get('SELECT * FROM payment_ledger WHERE booking_id = ? AND transaction_type = ?', [booking.id, 'refund']);
    assert(refundEntry !== null, 'Authoritative refund reversal created in financial ledger');
    assert(refundEntry.gross_amount_paise === -ledgerEntry.gross_amount_paise, 'Refund gross amount is exact negative of payment gross');

    // Clean up test booking in correct dependency order
    await db.run('DELETE FROM welfare_contributions WHERE booking_id = ?', [booking.id]);
    await db.run('DELETE FROM payment_ledger WHERE booking_id = ?', [booking.id]);
    await db.run('DELETE FROM payments WHERE booking_id = ?', [booking.id]);
    await db.run('DELETE FROM bookings WHERE id = ?', [booking.id]);
    await db.run('DELETE FROM workers WHERE id = ?', [workerId]);
    await db.run('DELETE FROM customers WHERE id = ?', [custId]);
  } catch (err) {
    console.error('Test 8 Error details:', err);
    assert(false, `E2E payment & ledger test failed: ${err.message || err}`);
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`🏁 TEST EXECUTION FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
