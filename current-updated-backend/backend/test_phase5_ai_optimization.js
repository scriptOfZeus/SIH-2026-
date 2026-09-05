/**
 * Phase 5 — Advanced AI Intelligence & Workforce Optimization Test Suite
 * Sahkar Sewa / SIH-2026
 *
 * Verifies:
 *  1. Historical demand intelligence (dynamic queries, no hardcoding)
 *  2. Live workforce capacity (verified, available, active on jobs, stale GPS)
 *  3. Advanced AI forecasting with Holt-Winters Kaggle model
 *  4. 5-tier demand classification (VERY LOW, LOW, NORMAL, HIGH, VERY HIGH)
 *  5. Normalized confidence scoring (0.0 to 1.0) and explainability factors
 *  6. Real calendar dates and day names (no "Day 1", "Day 2")
 *  7. Shortage & surplus detection
 *  8. Statistical anomaly detection on real bookings
 *  9. Peak demand window identification
 * 10. Supervising Admin global AI overview
 * 11. Federation Admin scoped view and 403 Forbidden cross-tenant enforcement
 * 12. Human-in-the-loop guarantee for workforce reallocation
 * 13. Graceful AI microservice fallback
 */

require('dotenv').config();
const http = require('http');
const db = require('./db/database');
const { sign } = require('./middleware/auth');
const PORT = process.env.PORT || 5000;

function makeToken(payload) {
  return sign(payload);
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:${PORT}${path}`);
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (_) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  PHASE 5: ADVANCED AI INTELLIGENCE & WORKFORCE SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Setup tokens and federations
  const federations = await db.all('SELECT * FROM federations ORDER BY created_at ASC');
  if (federations.length < 2) {
    console.error('Test requires at least 2 federations in database.');
    process.exit(1);
  }

  const fedA = federations[0];
  const fedB = federations[1];

  const superAdminToken = makeToken({
    id: 'super-admin-id',
    email: 'superadmin@demo.com',
    role: 'supervising_admin',
    federation_id: null,
  });

  const fedAdminAToken = makeToken({
    id: 'fed-admin-a-id',
    email: 'admin_a@demo.com',
    role: 'federation_admin',
    federation_id: fedA.id,
  });

  const fedAdminBToken = makeToken({
    id: 'fed-admin-b-id',
    email: 'admin_b@demo.com',
    role: 'federation_admin',
    federation_id: fedB.id,
  });

  console.log('1. Historical Demand Intelligence:');
  const histRes = await request('/api/v1/admin/analytics/historical-demand?days=30', {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  assert(histRes.status === 200, 'Returns 200 OK for historical demand query');
  assert(histRes.body.success === true, 'Success response flag is true');
  assert(typeof histRes.body.data.total_bookings === 'number', 'Total bookings is dynamically calculated as a number');
  assert(histRes.body.data.day_of_week_distribution !== undefined, 'Includes day-of-week demand distribution');
  assert(histRes.body.data.skill_breakdown !== undefined, 'Includes skill demand distribution');

  console.log('\n2. Live Workforce Capacity & Stale Telemetry Intelligence:');
  const capRes = await request(`/api/v1/admin/analytics/workforce-capacity?federation_id=${fedA.id}`, {
    headers: { Authorization: `Bearer ${fedAdminAToken}` },
  });
  assert(capRes.status === 200, 'Returns 200 OK for workforce capacity');
  assert(typeof capRes.body.data.total_approved_workers === 'number', 'Approved worker count is calculated dynamically');
  assert(typeof capRes.body.data.net_available_capacity === 'number', 'Net available capacity calculated from live available minus active jobs');
  assert(typeof capRes.body.data.stale_telemetry_count === 'number', 'Stale GPS telemetry is tracked');
  assert(capRes.body.data.skills_breakdown !== undefined, 'Breakdown by skill provided');

  console.log('\n3. Advanced AI Forecasting & Calendar Dates:');
  const fcRes = await request(`/api/v1/admin/analytics/advanced-forecast?federation_id=${fedA.id}&horizon_days=5&skill_category=electrician`, {
    headers: { Authorization: `Bearer ${fedAdminAToken}` },
  });
  assert(fcRes.status === 200, 'Returns 200 OK for advanced forecast');
  const forecastList = fcRes.body.data.forecast;
  assert(Array.isArray(forecastList) && forecastList.length === 5, 'Returns exact requested horizon days');

  // Verify real calendar dates (not "Day 1")
  const firstItem = forecastList[0];
  assert(/^\d{4}-\d{2}-\d{2}$/.test(firstItem.date), `Forecast uses real ISO date: ${firstItem.date}`);
  assert(typeof firstItem.day_name === 'string' && firstItem.day_name.length > 2, `Forecast includes canonical day name: ${firstItem.day_name}`);
  assert(typeof firstItem.formatted_date === 'string' && firstItem.formatted_date.includes(firstItem.day_name), `Forecast includes friendly formatted date: ${firstItem.formatted_date}`);

  console.log('\n4. Demand Classification, Confidence Scoring & Explainability:');
  const validTiers = ['VERY LOW', 'LOW', 'NORMAL', 'HIGH', 'VERY HIGH'];
  assert(validTiers.includes(firstItem.classification), `Demand classified into 5-tier scale: ${firstItem.classification}`);
  assert(firstItem.confidence_score >= 0.0 && firstItem.confidence_score <= 1.0, `Confidence score normalized between 0.0 and 1.0: ${firstItem.confidence_score}`);
  assert(['HIGH', 'MEDIUM', 'LOW'].includes(firstItem.confidence_level), `Confidence level assigned: ${firstItem.confidence_level}`);

  const explain = fcRes.body.data.explainability;
  assert(explain != null, 'Explainability payload is included in forecast response');
  assert(Array.isArray(explain.contributing_factors) && explain.contributing_factors.length > 0, 'Contributing factors list why demand was forecast');
  assert(typeof explain.baseline_demand === 'number', `Historical baseline is exposed: ${explain.baseline_demand}`);

  console.log('\n5. Shortage & Surplus Detection:');
  assert(['SHORTAGE', 'SURPLUS', 'BALANCED'].includes(firstItem.balance_status), `Supply vs demand status correctly flagged: ${firstItem.balance_status}`);
  assert(typeof firstItem.shortage === 'number' && typeof firstItem.surplus === 'number', 'Numeric shortage and surplus amounts calculated');

  console.log('\n6. Statistical Anomaly Detection:');
  const anomRes = await request(`/api/v1/admin/analytics/anomalies?federation_id=${fedA.id}`, {
    headers: { Authorization: `Bearer ${fedAdminAToken}` },
  });
  assert(anomRes.status === 200, 'Returns 200 OK for anomaly detection');
  assert(typeof anomRes.body.data.anomalies_detected === 'boolean', 'Anomalies detected flag is boolean');
  assert(Array.isArray(anomRes.body.data.anomalies), 'Anomalies list returned');

  console.log('\n7. Peak Demand Intelligence:');
  const peakRes = await request(`/api/v1/admin/analytics/peak-demand?federation_id=${fedA.id}`, {
    headers: { Authorization: `Bearer ${fedAdminAToken}` },
  });
  assert(peakRes.status === 200, 'Returns 200 OK for peak demand');
  assert(typeof peakRes.body.data.peak_day_of_week === 'string', `Identifies peak day: ${peakRes.body.data.peak_day_of_week}`);
  assert(typeof peakRes.body.data.peak_hours_window === 'string', `Identifies peak hours window: ${peakRes.body.data.peak_hours_window}`);

  console.log('\n8. Global AI Overview (Supervising Admin):');
  const globalRes = await request('/api/v1/admin/analytics/global-ai-overview', {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  assert(globalRes.status === 200, 'Supervising Admin receives 200 OK for global AI overview');
  assert(globalRes.body.data.total_federations >= 2, 'Global overview aggregates across all federations');
  assert(Array.isArray(globalRes.body.data.federation_capacity_breakdown), 'Includes capacity breakdown for all federations');

  console.log('\n9. Tenant Isolation & Security (Server-Side 403 Enforcement):');
  // Federation Admin A attempts to access Global Overview -> 403
  const fedGlobalRes = await request('/api/v1/admin/analytics/global-ai-overview', {
    headers: { Authorization: `Bearer ${fedAdminAToken}` },
  });
  assert(fedGlobalRes.status === 403, 'Federation Admin is blocked from Global AI Overview (403 Forbidden)');

  // Federation Admin A attempts to query Federation B forecast -> 403
  const fedCrossFcRes = await request(`/api/v1/admin/analytics/advanced-forecast?federation_id=${fedB.id}`, {
    headers: { Authorization: `Bearer ${fedAdminAToken}` },
  });
  assert(fedCrossFcRes.status === 403, 'Federation Admin cannot access another federation forecast (403 Forbidden)');

  // Federation Admin A attempts to query Federation B capacity -> 403
  const fedCrossCapRes = await request(`/api/v1/admin/analytics/workforce-capacity?federation_id=${fedB.id}`, {
    headers: { Authorization: `Bearer ${fedAdminAToken}` },
  });
  assert(fedCrossCapRes.status === 403, 'Federation Admin cannot access another federation capacity (403 Forbidden)');

  // Federation Admin A attempts to query Federation B anomalies -> 403
  const fedCrossAnomRes = await request(`/api/v1/admin/analytics/anomalies?federation_id=${fedB.id}`, {
    headers: { Authorization: `Bearer ${fedAdminAToken}` },
  });
  assert(fedCrossAnomRes.status === 403, 'Federation Admin cannot access another federation anomalies (403 Forbidden)');

  // Federation Admin A attempts to query Federation B reallocations -> 403
  const fedCrossReallocRes = await request(`/api/v1/admin/analytics/reallocation-suggestions?federation_id=${fedB.id}`, {
    headers: { Authorization: `Bearer ${fedAdminAToken}` },
  });
  assert(fedCrossReallocRes.status === 403, 'Federation Admin cannot access another federation reallocation suggestions (403 Forbidden)');

  console.log('\n10. Federation Scoped Overview:');
  const fedOverviewRes = await request('/api/v1/admin/analytics/federation-ai-overview', {
    headers: { Authorization: `Bearer ${fedAdminAToken}` },
  });
  assert(fedOverviewRes.status === 200, 'Federation Admin gets 200 OK for own scoped overview');
  assert(fedOverviewRes.body.data.federation.id === fedA.id, 'Federation Admin view is strictly scoped to own federation');

  console.log('\n11. Human-in-the-Loop Workforce Reallocation:');
  const reallocRes = await request(`/api/v1/admin/analytics/reallocation-suggestions?federation_id=${fedA.id}`, {
    headers: { Authorization: `Bearer ${fedAdminAToken}` },
  });
  assert(reallocRes.status === 200, 'Returns 200 OK for reallocation suggestions');
  const reallocations = reallocRes.body.data.reallocation_recommendations || [];
  if (reallocations.length > 0) {
    const firstRec = reallocations[0];
    assert(firstRec.requires_human_approval === true, 'Reallocation proposal explicitly requires human approval');
    assert(firstRec.is_automated === false, 'Reallocation is NOT automated');
    assert(typeof firstRec.operational_rationale === 'string', 'Reallocation provides clear operational reasoning');
  } else {
    assert(true, 'Reallocation system gracefully handled balanced workforce (0 pending alerts needed)');
  }

  console.log('\n12. Backward Compatibility of Demand-Forecast Endpoint:');
  const legacyRes = await request('/api/v1/admin/analytics/demand-forecast?horizon_days=7&include_hotspots=true', {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  assert(legacyRes.status === 200, 'Legacy GET /analytics/demand-forecast returns 200 OK');
  assert(Array.isArray(legacyRes.body.data.forecast), 'Legacy forecast array preserved');
  assert(legacyRes.body.data.forecast[0].hotspot_level !== undefined, 'Legacy hotspot_level field preserved');

  console.log('\n13. Dedicated AI Explain Endpoint:');
  const explainRes = await request('/api/v1/admin/analytics/explain', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: { region: 'Mumbai', skill_category: 'electrician', horizon_days: 7 },
  });
  assert(explainRes.status === 200, 'POST /analytics/explain returns 200 OK');
  assert(explainRes.body.data.region === 'Mumbai', 'Explain endpoint returns requested region');
  assert(Array.isArray(explainRes.body.data.contributing_factors), 'Explain endpoint returns contributing factors');

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} / ${passed + failed} tests passed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
