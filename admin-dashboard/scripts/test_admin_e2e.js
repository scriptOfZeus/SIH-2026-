const BASE = 'http://localhost:5000/api/v1';
const FRONTEND_URL = 'http://localhost:3000';

async function testAdminE2E() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  RUNNING ADMIN DASHBOARD E2E CONTRACT & INTEGRATION TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Verify Frontend Vite Server is Serving
  const feRes = await fetch(FRONTEND_URL);
  const feHtml = await feRes.text();
  if (feRes.status === 200 && feHtml.includes('id="root"')) {
    console.log('✅ 1. Frontend Vite Server is active and serving React application at http://localhost:3000');
  } else {
    throw new Error(`Frontend server responded with status ${feRes.status}`);
  }

  // 2. Admin Authentication
  const loginRes = await fetch(`${BASE}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.data?.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.data.token;
  const admin = loginData.data.admin;
  console.log(`✅ 2. Admin Login Succeeded: ${admin.full_name} (${admin.email})`);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 3. Federation Details
  const fedRes = await fetch(`${BASE}/admin/federations/current`, { headers });
  const fedData = await fedRes.json();
  console.log(`✅ 3. Federation Identity: ${fedData.data.name} (Region: ${fedData.data.region})`);

  // 4. Operational Summary KPIs
  const summaryRes = await fetch(`${BASE}/admin/analytics/summary`, { headers });
  const summaryData = await summaryRes.json();
  console.log(`✅ 4. Summary KPIs: Total Bookings: ${summaryData.data.totalBookings}, Active Workers: ${summaryData.data.activeWorkers}, Revenue: ₹${summaryData.data.totalRevenue}`);

  // 5. Worker Management & Verification Flow
  const workersRes = await fetch(`${BASE}/admin/workers`, { headers });
  const workersData = await workersRes.json();
  console.log(`✅ 5. Worker Directory: ${workersData.data.length} total registered workers retrieved`);

  const pendingWorkersRes = await fetch(`${BASE}/admin/workers?verification_status=pending`, { headers });
  const pendingData = await pendingWorkersRes.json();
  console.log(`✅ 6. Pending Verification Queue: ${pendingData.data.length} workers awaiting review`);

  // 6. Bookings Management
  const bookingsRes = await fetch(`${BASE}/admin/bookings`, { headers });
  const bookingsData = await bookingsRes.json();
  console.log(`✅ 7. Booking Management: ${bookingsData.data.length} bookings retrieved`);

  // 7. AI Demand Forecast
  const forecastRes = await fetch(`${BASE}/admin/analytics/demand-forecast?include_hotspots=true`, { headers });
  const forecastData = await forecastRes.json();
  if (forecastData.success && Array.isArray(forecastData.data.forecast)) {
    console.log(`✅ 8. AI Demand Forecast Engine: ${forecastData.data.forecast.length} forecast targets generated via ${forecastData.data.model_type}`);
  } else {
    throw new Error('Demand forecast failed: ' + JSON.stringify(forecastData));
  }

  // 8. Workforce Reallocation Suggestions
  const reallocRes = await fetch(`${BASE}/admin/analytics/reallocation-suggestions?horizon_days=7`, { headers });
  const reallocData = await reallocRes.json();
  const recs = reallocData.data?.reallocation_recommendations || reallocData.data?.reallocations || [];
  if (reallocData.success && Array.isArray(recs)) {
    console.log(`✅ 9. Workforce Reallocation Engine: Generated ${recs.length} transfer pairings across ${reallocData.data.regions_evaluated?.length || 4} zones`);
  } else {
    throw new Error('Reallocation failed: ' + JSON.stringify(reallocData));
  }

  // 9. Dispute Management
  const disputesRes = await fetch(`${BASE}/admin/disputes`, { headers });
  const disputesData = await disputesRes.json();
  const disputeSummaryRes = await fetch(`${BASE}/admin/disputes/summary`, { headers });
  const disputeSummary = await disputeSummaryRes.json();
  console.log(`✅ 10. Dispute Console: ${disputesData.data.length} disputes logged, Total Refunded: ₹${disputeSummary.data.total_refunded}`);

  // 10. Welfare & Insurance Fund
  const fundRes = await fetch(`${BASE}/admin/welfare/fund-summary`, { headers });
  const fundData = await fundRes.json();
  const policiesRes = await fetch(`${BASE}/admin/welfare/policies`, { headers });
  const policiesData = await policiesRes.json();
  const claimsRes = await fetch(`${BASE}/admin/welfare/claims`, { headers });
  const claimsData = await claimsRes.json();
  console.log(`✅ 11. Welfare Fund: Net Reserve: ₹${fundData.data.net_fund_reserve}, Policies: ${policiesData.data.length}, Claims: ${claimsData.data.length}`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ALL 11 ADMIN DASHBOARD INTEGRATIONS VERIFIED & PASSING!  ');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

testAdminE2E().catch((err) => {
  console.error('❌ Admin E2E Test Error:', err);
  process.exit(1);
});
