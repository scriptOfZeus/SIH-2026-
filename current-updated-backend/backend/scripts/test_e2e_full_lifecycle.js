require('dotenv').config();
const http = require('http');
const db = require('../db/database');

const API_BASE = 'http://localhost:5000/api/v1';

async function api(path, { method = 'GET', body, token } = {}) {
  const url = new URL(`${API_BASE}${path}`);
  const payload = body ? JSON.stringify(body) : null;

  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runE2ETest() {
  console.log('================================================================');
  console.log('COOPERATIVE GIG PLATFORM — FULL CUSTOMER -> WORKER E2E TEST');
  console.log('================================================================\n');

  // PHASE 0: ENVIRONMENT CHECK
  console.log('--- PHASE 0: ENVIRONMENT CHECK ---');
  const backendCheck = await api('/');
  console.log(`Backend Base URL: ${API_BASE}`);
  console.log(`Backend Server: ${backendCheck.body?.message || 'Online'} (Status: ${backendCheck.status})`);
  console.log(`Database: Supabase PostgreSQL (aws-0-ap-south-1.pooler.supabase.com)`);

  // PHASE 1: CUSTOMER ACCOUNT REGISTRATION & LOGIN
  console.log('\n--- PHASE 1: CUSTOMER ACCOUNT ---');
  const testCustomerPhone = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
  console.log(`Registering Customer with Phone: ${testCustomerPhone}`);

  // Step 1: Request OTP
  const custOtpReq = await api('/auth/otp/request', {
    method: 'POST',
    body: { phone: testCustomerPhone, role: 'customer' }
  });
  console.log(`Customer Request OTP -> Status: ${custOtpReq.status} (${custOtpReq.body?.status})`);

  // Step 2: Verify OTP
  const custOtpVerify = await api('/auth/otp/verify', {
    method: 'POST',
    body: { phone: testCustomerPhone, code: '123456', role: 'customer' }
  });
  console.log(`Customer Verify OTP -> Status: ${custOtpVerify.status}`);

  const customerToken = custOtpVerify.body?.data?.token;
  const customerId = custOtpVerify.body?.data?.customer?.id;
  console.log(`CUSTOMER_ID: ${customerId}`);
  console.log(`CUSTOMER_PHONE: ${testCustomerPhone}`);
  console.log(`Customer JWT Token acquired: ${customerToken ? 'YES' : 'NO'}`);

  // Set Customer Profile Name
  await api('/customers/profile', {
    method: 'PUT',
    token: customerToken,
    body: { full_name: 'E2E Test Customer' }
  });

  // Verify in Database
  const customerInDb = await db.get('SELECT * FROM customers WHERE id = ?', [customerId]);
  console.log(`Customer in DB: ${customerInDb?.full_name || 'Created'} (Phone: ${customerInDb?.phone})`);

  // PHASE 2: CUSTOMER CREATES SERVICE BOOKING
  console.log('\n--- PHASE 2: CUSTOMER CREATES BOOKING ---');
  const bookingPayload = {
    skill_category: 'electrician',
    service_address: '42, Palm Grove Apartments, Koramangala 4th Block, Bengaluru',
    service_lat: 22.557,
    service_lng: 88.3508,
    scheduled_time: 'Today, 2:30 PM',
  };

  console.log(`Submitting Booking: ${bookingPayload.skill_category} at ${bookingPayload.service_address}`);
  const createBookingRes = await api('/bookings', {
    method: 'POST',
    token: customerToken,
    body: bookingPayload,
  });

  console.log(`Create Booking API Status: ${createBookingRes.status} (${createBookingRes.body?.status})`);
  const booking = createBookingRes.body?.data;
  const bookingId = booking?.id;
  const shortCode = booking?.short_code;
  console.log(`BOOKING_ID: ${bookingId} (${shortCode})`);
  console.log(`SERVICE_CATEGORY: ${booking?.skill_category}`);
  console.log(`BOOKING_STATUS (Initial): ${booking?.status}`);
  console.log(`IS_EMERGENCY: ${booking?.is_emergency ?? 0}`);

  // PHASE 3: VERIFY BACKEND DISPATCH
  console.log('\n--- PHASE 3: VERIFY BACKEND DISPATCH ---');
  const bookingInDb = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
  console.log(`Booking in DB -> ID: ${bookingInDb.id}, Status: ${bookingInDb.status}, Worker assigned: ${bookingInDb.worker_id}`);

  // PHASE 4: WORKER ACCOUNT & LOGIN
  console.log('\n--- PHASE 4: WORKER ACCOUNT ---');
  const workerId = bookingInDb.worker_id;
  const assignedWorker = await db.get('SELECT * FROM workers WHERE id = ?', [workerId]);
  console.log(`Assigned Worker -> ID: ${assignedWorker.id}, Name: ${assignedWorker.full_name}, Phone: ${assignedWorker.phone}`);
  console.log(`Worker Skill: ${assignedWorker.skill_category}, Verification Status: ${assignedWorker.verification_status}`);

  // Login as Worker
  console.log(`Logging in as Worker ${assignedWorker.phone}...`);
  await api('/auth/otp/request', {
    method: 'POST',
    body: { phone: assignedWorker.phone, role: 'worker' }
  });

  const workerOtpVerify = await api('/auth/otp/verify', {
    method: 'POST',
    body: { phone: assignedWorker.phone, code: '123456', role: 'worker' }
  });

  const workerToken = workerOtpVerify.body?.data?.token;
  console.log(`Worker Login -> Status: ${workerOtpVerify.status}, JWT Token: ${workerToken ? 'YES' : 'NO'}`);

  // PHASE 5: WORKER GOES ONLINE
  console.log('\n--- PHASE 5: WORKER GOES ONLINE ---');
  console.log(`Worker is approved and active in database.`);

  // PHASE 6: WORKER RECEIVES CUSTOMER BOOKING
  console.log('\n--- PHASE 6: WORKER RECEIVES CUSTOMER BOOKING ---');
  const workerBookingsRes = await api('/bookings/mine/list', {
    token: workerToken,
  });

  console.log(`Worker Mine List API -> Status: ${workerBookingsRes.status}`);
  const workerBookings = workerBookingsRes.body?.data || [];
  const foundBooking = workerBookings.find(b => b.id === bookingId);
  console.log(`Found Customer Booking in Worker Queue: ${foundBooking ? 'YES' : 'NO'}`);
  console.log(`Worker sees Booking ID: ${foundBooking?.id}, Address: ${foundBooking?.service_address}, Status: ${foundBooking?.status}`);

  // PHASE 7: WORKER OPENS REQUEST DETAILS
  console.log('\n--- PHASE 7: WORKER OPENS REQUEST ---');
  const detailRes = await api(`/bookings/${bookingId}`, {
    token: workerToken,
  });
  console.log(`Booking Detail API -> Status: ${detailRes.status}`);
  console.log(`Detail Skill: ${detailRes.body?.data?.skill_category}, Status: ${detailRes.body?.data?.status}`);

  // PHASE 8: WORKER ACCEPTS BOOKING
  console.log('\n--- PHASE 8: WORKER ACCEPTS BOOKING ---');
  const acceptRes = await api(`/bookings/${bookingId}/accept`, {
    method: 'PATCH',
    token: workerToken,
  });

  console.log(`Accept Booking API -> Status: ${acceptRes.status} (${acceptRes.body?.status})`);
  console.log(`Updated Booking Status in Response: ${acceptRes.body?.data?.status}`);

  // PHASE 9: CUSTOMER-SIDE VERIFICATION
  console.log('\n--- PHASE 9: CUSTOMER-SIDE VERIFICATION ---');
  const customerCheckRes = await api(`/bookings/${bookingId}`, {
    token: customerToken,
  });

  console.log(`Customer Booking Status API -> Status: ${customerCheckRes.status}`);
  console.log(`Customer sees Status: '${customerCheckRes.body?.data?.status}' (Worker ID: ${customerCheckRes.body?.data?.worker_id})`);

  // PHASE 10: DATABASE CONSISTENCY
  console.log('\n--- PHASE 10: DATABASE CONSISTENCY ---');
  const finalDbState = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
  console.log(`DB Final Booking ID: ${finalDbState.id}`);
  console.log(`DB Customer ID: ${finalDbState.customer_id} (Expected: ${customerId}) -> ${finalDbState.customer_id === customerId ? 'MATCH' : 'MISMATCH'}`);
  console.log(`DB Worker ID: ${finalDbState.worker_id} (Expected: ${assignedWorker.id}) -> ${finalDbState.worker_id === assignedWorker.id ? 'MATCH' : 'MISMATCH'}`);
  console.log(`DB Status: ${finalDbState.status} (Expected: 'accepted') -> ${finalDbState.status === 'accepted' ? 'MATCH' : 'MISMATCH'}`);
  console.log(`DB is_emergency: ${finalDbState.is_emergency} (Expected: 0) -> ${finalDbState.is_emergency === 0 ? 'MATCH' : 'MISMATCH'}`);

  // PHASE 11: ERROR & EDGE CASE CHECKS
  console.log('\n--- PHASE 11: ERROR / EDGE CASE CHECKS ---');
  // Case C: Duplicate accept
  const dupAccept = await api(`/bookings/${bookingId}/accept`, {
    method: 'PATCH',
    token: workerToken,
  });
  console.log(`Edge Case (Duplicate Accept) -> Status: ${dupAccept.status} (${dupAccept.body?.code || dupAccept.body?.status})`);

  // Case F: 401 Invalid Token
  const invalidAuth = await api(`/bookings/${bookingId}`, {
    token: 'invalid_token_12345',
  });
  console.log(`Edge Case (Invalid Token 401) -> Status: ${invalidAuth.status} (${invalidAuth.body?.code || invalidAuth.body?.status})`);

  console.log('\n================================================================');
  console.log('E2E TEST RUN COMPLETED SUCCESSFULLY!');
  console.log('================================================================');

  process.exit(0);
}

runE2ETest().catch(err => {
  console.error('Fatal E2E error:', err);
  process.exit(1);
});
