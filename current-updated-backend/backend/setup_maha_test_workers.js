/**
 * Setup Script: Maharashtra Cooperative Federation Test Workers
 *
 * Authenticates as admin@maharashtra.coop, creates and approves test workers
 * in Mumbai for 'painter' and 'electrician' skills, establishing an operational
 * surplus in Mumbai while other regions experience deficits.
 *
 * Then calls the V2 Reallocation API and verifies actionable recommendations.
 */

require('dotenv').config();
const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api/v1';

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const json = await res.json();
  return { status: res.status, ok: res.ok, body: json };
}

const VALID_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  CREATING TEST WORKERS FOR MAHARASHTRA COOP FEDERATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Authenticate as Maharashtra Cooperative Federation Admin
  console.log('Step 1: Authenticating as Maharashtra Admin (admin@maharashtra.coop)...');
  const loginRes = await api('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@maharashtra.coop', password: 'mahaPassword123' }),
  });
  if (loginRes.status !== 200) {
    throw new Error(`Login failed with status ${loginRes.status}: ${JSON.stringify(loginRes.body)}`);
  }
  const token = loginRes.body.data.token;
  console.log('  -> Authenticated successfully. JWT acquired.\n');

  // Verify Federation Profile
  const fedRes = await api('/admin/federations/current', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const fed = fedRes.body.data;
  console.log(`  -> Federation: ${fed.name} (${fed.id}) in Region: ${fed.region}\n`);

  // 2. Define test workers
  // Mumbai painter demand is ~7-8. 16 painters will produce a surplus of ~8-9.
  // Mumbai electrician demand is ~27. 35 electricians will produce a surplus of ~8.
  const workersToCreate = [
    // 16 Painters in Mumbai (Surplus expected)
    ...Array.from({ length: 16 }, (_, i) => ({
      full_name: `MH Painter ${i + 1}`,
      phone: `+91982010${(100 + i).toString().slice(1)}`,
      skill_category: 'painter',
      skill_certificate_number: `NSDC_MH_PNT_${1001 + i}`,
      lat: 19.0760 + (i * 0.002),
      lng: 72.8777 + (i * 0.002),
    })),
    // 35 Electricians in Mumbai (Surplus expected)
    ...Array.from({ length: 35 }, (_, i) => ({
      full_name: `MH Electrician ${i + 1}`,
      phone: `+91982020${(100 + i).toString().slice(1)}`,
      skill_category: 'electrician',
      skill_certificate_number: `NSDC_MH_ELE_${2001 + i}`,
      lat: 19.0760 + (i * 0.001),
      lng: 72.8777 + (i * 0.001),
    })),
  ];

  console.log(`Step 2: Provisioning ${workersToCreate.length} test workers via authenticated API...`);
  let createdCount = 0;
  let approvedCount = 0;

  for (const w of workersToCreate) {
    // 2a. Create worker record
    let createRes = await api('/admin/workers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(w),
    });

    let workerId;
    if (createRes.status === 201) {
      workerId = createRes.body.data.id;
      createdCount++;
    } else if (createRes.status === 409) {
      // Worker already exists from prior run, query worker id
      const listRes = await api('/admin/workers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const existing = (listRes.body.data || []).find(ew => ew.phone === w.phone);
      if (existing) workerId = existing.id;
    } else {
      console.warn(`  Failed to create ${w.full_name}: ${createRes.body.error?.message}`);
      continue;
    }

    if (!workerId) continue;

    // 2b. Upload OCR certificate (matched)
    await api(`/admin/workers/${workerId}/upload-certificate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        document_base64: VALID_PNG_BASE64,
        mime_type: 'image/png',
        filename: `${w.full_name.replace(/\s+/g, '_')}_cert.png`,
        ocr_hints: {
          name: w.full_name,
          number: w.skill_certificate_number,
          confidence: 0.95,
        },
      }),
    });

    // 2c. Verify certificate
    await api(`/admin/workers/${workerId}/verify-certificate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ override_mismatch: false }),
    });

    // 2d. Approve worker
    const approveRes = await api(`/admin/workers/${workerId}/verify`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ decision: 'approved' }),
    });

    if (approveRes.status === 200 && approveRes.body.data.verification_status === 'approved') {
      approvedCount++;
    }
  }

  console.log(`  -> Created / Located: ${createdCount} workers`);
  console.log(`  -> Verified & Approved: ${approvedCount} workers in Mumbai under ${fed.name}\n`);

  // 3. Query Reallocation API
  console.log('Step 3: Querying GET /admin/analytics/reallocation-suggestions as Maharashtra Admin...');
  const reallocRes = await api('/admin/analytics/reallocation-suggestions?horizon_days=7', {
    headers: { Authorization: `Bearer ${token}` },
  });

  assert.strictEqual(reallocRes.status, 200, 'Reallocation API must return 200');
  const data = reallocRes.body.data;

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  REALLOCATION API RESPONSE SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Federation ID:             ${data.federation_id}`);
  console.log(`  Regions Evaluated:         ${data.regions_evaluated.join(', ')}`);
  console.log(`  Total Deficit:             ${data.summary.total_deficit}`);
  console.log(`  Total Surplus:             ${data.summary.total_surplus}`);
  console.log(`  Hotspots Detected:         ${data.summary.hotspots_detected}`);
  console.log(`  Recommendations Generated: ${data.summary.recommendations_count}`);

  // Display Mumbai regional balance entries
  console.log('\n  Mumbai Regional Balance:');
  for (const b of data.regional_balance) {
    if (b.region === 'Mumbai') {
      console.log(`    - ${b.region} / ${b.skill_category}: Demand=${b.predicted_demand}, Available=${b.available_workers}, Surplus=${b.surplus}, Deficit=${b.deficit}, Hotspot=${b.hotspot_level}`);
    }
  }

  // Display Reallocation Recommendations
  console.log('\n  Reallocation Recommendations:');
  assert(data.reallocation_recommendations.length > 0, 'Must have at least one reallocation recommendation');

  for (let i = 0; i < data.reallocation_recommendations.length; i++) {
    const r = data.reallocation_recommendations[i];
    console.log(`    [${i + 1}] ${r.message}`);
    console.log(`        Source:     ${r.source_region} -> Target: ${r.target_region}`);
    console.log(`        Category:   ${r.skill_category} (Count: ${r.reallocate_count}, Distance: ${r.distance_km} km)`);
    console.log(`        Status:     ${r.status}`);
    console.log(`        Reason:     ${r.reason}`);
    assert.strictEqual(r.status, 'pending_approval', 'Recommendation status must be pending_approval');
  }

  console.log('\n✅ Verification Complete: Real reallocation recommendations successfully generated!');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
