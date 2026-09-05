const BASE = 'http://localhost:5000/api/v1';

async function testPhase1Connectivity() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  RUNNING PHASE 1 CONNECTIVITY & FOUNDATION TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Admin Login to register a fresh worker
  const adminLoginRes = await fetch(`${BASE}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' }),
  });
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.data.token;

  // Register worker via Admin
  const workerPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  const regWorkerRes = await fetch(`${BASE}/admin/workers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      full_name: 'Phase 1 Electrician',
      phone: workerPhone,
      skill_category: 'electrician',
      skill_certificate_number: 'ELEC-P1-9988',
    }),
  });
  const regWorker = await regWorkerRes.json();
  const workerId = regWorker.data.id;

  // Auto-approve worker
  await fetch(`${BASE}/admin/workers/${workerId}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'approved' }),
  });

  // Worker Login via OTP
  await fetch(`${BASE}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: workerPhone, role: 'worker' }),
  });
  const workerAuthRes = await fetch(`${BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: workerPhone, code: '123456', role: 'worker' }),
  });
  const workerAuth = await workerAuthRes.json();
  const workerToken = workerAuth.data.token;
  console.log(`✅ 1. Worker Registered & Authenticated: ID ${workerId}`);

  // Create & verify Customer via OTP
  const custPhone = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
  await fetch(`${BASE}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: custPhone, role: 'customer' }),
  });
  const custAuthRes = await fetch(`${BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: custPhone, code: '123456', role: 'customer' }),
  });
  const custAuth = await custAuthRes.json();
  const custToken = custAuth.data.token;
  const custId = custAuth.data.customer.id;
  console.log(`✅ 2. Customer Registered & Authenticated: ID ${custId}`);

  // 2. Test Worker Availability Toggle (PATCH /workers/me)
  const toggleOffRes = await fetch(`${BASE}/workers/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${workerToken}` },
    body: JSON.stringify({ is_available: 0 }),
  });
  const toggleOff = await toggleOffRes.json();
  if (toggleOff.data.is_available === 0) {
    console.log('✅ 3. Worker Availability set to 0 (offline) persisted in DB');
  } else {
    throw new Error('Worker availability toggle off failed');
  }

  const toggleOnRes = await fetch(`${BASE}/workers/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${workerToken}` },
    body: JSON.stringify({ is_available: 1, lat: 12.9352, lng: 77.6245 }),
  });
  const toggleOn = await toggleOnRes.json();
  if (toggleOn.data.is_available === 1 && toggleOn.data.lat === 12.9352) {
    console.log('✅ 4. Worker Availability set to 1 (online) & location updated in DB');
  } else {
    throw new Error('Worker availability toggle on failed');
  }

  // 3. Create Booking & Assign Worker
  const createBookingRes = await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
    body: JSON.stringify({
      skill_category: 'electrician',
      scheduled_time: 'immediate',
      service_address: '100 Feet Rd, Indiranagar, Bengaluru',
      service_lat: 12.9352,
      service_lng: 77.6245,
    }),
  });
  const bookingData = await createBookingRes.json();
  const bookingId = bookingData.data.id;
  const assignedWorkerId = bookingData.data.worker_id;
  console.log(`✅ 5. Booking Created: ${bookingId}, Assigned Worker: ${assignedWorkerId}`);

  // Fetch assigned worker details via Admin if assignedWorkerId != workerId
  let activeWorkerToken = workerToken;
  if (assignedWorkerId && assignedWorkerId !== workerId) {
    const adminWorkerRes = await fetch(`${BASE}/admin/workers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allWorkers = await adminWorkerRes.json();
    const assignedWorkerObj = allWorkers.data.find(w => w.id === assignedWorkerId);
    if (assignedWorkerObj) {
      await fetch(`${BASE}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: assignedWorkerObj.phone, role: 'worker' }),
      });
      const assignedAuthRes = await fetch(`${BASE}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: assignedWorkerObj.phone, code: '123456', role: 'worker' }),
      });
      const assignedAuth = await assignedAuthRes.json();
      activeWorkerToken = assignedAuth.data.token;
    }
  }

  // Worker Accepts Booking
  await fetch(`${BASE}/bookings/${bookingId}/accept`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${activeWorkerToken}` },
  });
  console.log('✅ 6. Worker Accepted Booking');

  // 4. Test Completion with Parts Fee & Service Notes
  await fetch(`${BASE}/bookings/${bookingId}/complete`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${activeWorkerToken}` },
    body: JSON.stringify({
      parts_fee: 350.0,
      service_notes: 'Replaced damaged 16A MCB switch and tested circuit continuity.',
    }),
  });

  // Customer completes
  const custCompleteRes = await fetch(`${BASE}/bookings/${bookingId}/complete`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${custToken}` },
  });
  const finalBooking = await custCompleteRes.json();
  if (
    finalBooking.data.status === 'completed' &&
    finalBooking.data.parts_fee === 350 &&
    finalBooking.data.service_notes.includes('16A MCB')
  ) {
    console.log('✅ 7. Booking Completed with parts_fee (₹350) and service_notes successfully stored');
  } else {
    throw new Error(`Parts fee & notes mismatch: ${JSON.stringify(finalBooking.data)}`);
  }

  // 5. Payment Initiation
  const payRes = await fetch(`${BASE}/payments/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
    body: JSON.stringify({
      booking_id: bookingId,
      amount: 1200.0,
      payment_method: 'upi',
    }),
  });
  const payData = await payRes.json();
  console.log(`✅ 8. Payment Initiated: ${payData.data.payment_id}, Payout: ₹${payData.data.worker_payout}, Welfare: ₹${payData.data.welfare_deduction}`);

  // 6. Test Worker Real Earnings Aggregation (GET /workers/me/earnings)
  const earningsRes = await fetch(`${BASE}/workers/me/earnings`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${activeWorkerToken}` },
  });
  const earningsData = await earningsRes.json();
  if (
    earningsData.data.today_earnings > 0 &&
    earningsData.data.today_jobs >= 1 &&
    earningsData.data.recent_jobs.length >= 1
  ) {
    console.log(`✅ 9. Worker Real Earnings Aggregated: Today ₹${earningsData.data.today_earnings}, Jobs: ${earningsData.data.today_jobs}, Welfare: ₹${earningsData.data.welfare_contribution}`);
  } else {
    throw new Error(`Earnings data invalid: ${JSON.stringify(earningsData)}`);
  }

  // 7. Test Customer Dispute Submission (POST /disputes)
  const disputeRes = await fetch(`${BASE}/disputes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
    body: JSON.stringify({
      booking_id: bookingId,
      reason: 'Billing discrepancy on extra replacement part pricing.',
    }),
  });
  const disputeData = await disputeRes.json();
  if (disputeData.success && disputeData.data.dispute_number.startsWith('DSP-')) {
    console.log(`✅ 10. Customer Dispute Created in PostgreSQL: ${disputeData.data.dispute_number}`);
  } else {
    throw new Error(`Dispute creation failed: ${JSON.stringify(disputeData)}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ALL 10 PHASE 1 CONNECTIVITY VERIFICATIONS PASSED!  ');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

testPhase1Connectivity().catch(err => {
  console.error('❌ Phase 1 Connectivity Test Error:', err);
  process.exit(1);
});
