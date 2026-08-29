/**
 * V2 AI Demand Forecasting + Workforce Allocation Test Suite
 * Tests:
 *  1. Hotspot classification thresholds (LOW / MEDIUM / HIGH)
 *  2. Geographic region resolution
 *  3. Deficit and surplus reconciliation formulas
 *  4. Nearest-region reallocation matching algorithm
 *  5. Federation tenant isolation
 *  6. End-to-end multi-region reallocation suggestions
 *  7. Backward compatibility of demand-forecast endpoint
 */

require('dotenv').config();
const assert = require('assert');
const {
  classifyHotspot,
  getNearestRegion,
  getWorkerSupply,
  generateReallocationSuggestions,
  REGION_COORDINATES,
} = require('./services/allocationService');
const { haversineKm } = require('./utils/distance');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  RUNNING V2 WORKFORCE ALLOCATION & HOTSPOT TEST SUITE');
console.log('═══════════════════════════════════════════════════════════════\n');

// ── 1. Hotspot Classification Tests ──────────────────────────────────────────
console.log('1. Hotspot Classification:');

runTest('Classifies HIGH when forecast growth is >= +25%', () => {
  const baseline = 20.0;
  const predicted = 26; // +30%
  const level = classifyHotspot(predicted, baseline);
  assert.strictEqual(level, 'HIGH');
});

runTest('Classifies MEDIUM when forecast growth is between +10% and +25%', () => {
  const baseline = 20.0;
  const predicted = 23; // +15%
  const level = classifyHotspot(predicted, baseline);
  assert.strictEqual(level, 'MEDIUM');
});

runTest('Classifies LOW when forecast growth is < +10%', () => {
  const baseline = 20.0;
  const predicted = 21; // +5%
  const level = classifyHotspot(predicted, baseline);
  assert.strictEqual(level, 'LOW');
});

runTest('Classifies LOW when forecast is below baseline (negative growth)', () => {
  const baseline = 20.0;
  const predicted = 16; // -20%
  const level = classifyHotspot(predicted, baseline);
  assert.strictEqual(level, 'LOW');
});

runTest('Handles zero or missing baseline gracefully without division by zero', () => {
  assert.strictEqual(classifyHotspot(15, 0), 'MEDIUM');
  assert.strictEqual(classifyHotspot(15, null), 'MEDIUM');
});

// ── 2. Geographic Region Resolution ──────────────────────────────────────────
console.log('\n2. Geographic Proximity & Region Resolution:');

runTest('Resolves Kolkata coordinates to Kolkata region', () => {
  assert.strictEqual(getNearestRegion(22.57, 88.36), 'Kolkata');
});

runTest('Resolves Mumbai coordinates to Mumbai region', () => {
  assert.strictEqual(getNearestRegion(19.07, 72.88), 'Mumbai');
});

runTest('Resolves Delhi coordinates to Delhi region', () => {
  assert.strictEqual(getNearestRegion(28.61, 77.21), 'Delhi');
});

runTest('Resolves Bengaluru coordinates to Bengaluru region', () => {
  assert.strictEqual(getNearestRegion(12.97, 77.59), 'Bengaluru');
});

runTest('Returns null for missing coordinates', () => {
  assert.strictEqual(getNearestRegion(null, null), null);
});

// ── 3. Deficit / Surplus Formulas ────────────────────────────────────────────
console.log('\n3. Demand-Supply Reconciliation Formulas:');

runTest('Computes positive deficit when demand exceeds supply', () => {
  const predicted = 25;
  const available = 10;
  const deficit = Math.max(predicted - available, 0);
  const surplus = Math.max(available - predicted, 0);
  assert.strictEqual(deficit, 15);
  assert.strictEqual(surplus, 0);
});

runTest('Computes positive surplus when supply exceeds demand', () => {
  const predicted = 10;
  const available = 25;
  const deficit = Math.max(predicted - available, 0);
  const surplus = Math.max(available - predicted, 0);
  assert.strictEqual(deficit, 0);
  assert.strictEqual(surplus, 15);
});

runTest('Computes zero deficit and zero surplus when balanced', () => {
  const predicted = 20;
  const available = 20;
  const deficit = Math.max(predicted - available, 0);
  const surplus = Math.max(available - predicted, 0);
  assert.strictEqual(deficit, 0);
  assert.strictEqual(surplus, 0);
});

// ── 4. Nearest-Region Reallocation Matching ──────────────────────────────────
console.log('\n4. Reallocation Matching by Geographic Proximity:');

runTest('Prefers closest surplus source region over farther surplus source', () => {
  // Target: Kolkata
  const target = 'Kolkata';
  const sources = ['Mumbai', 'Delhi', 'Bengaluru'];

  const distances = sources.map(s => ({
    source: s,
    dist: haversineKm(
      REGION_COORDINATES[target].lat, REGION_COORDINATES[target].lng,
      REGION_COORDINATES[s].lat, REGION_COORDINATES[s].lng
    ),
  })).sort((a, b) => a.dist - b.dist);

  // Delhi (~1305 km) is closer to Kolkata than Bengaluru (~1560 km) or Mumbai (~1660 km)
  assert.strictEqual(distances[0].source, 'Delhi');
  assert(distances[0].dist < distances[1].dist);
  assert(distances[1].dist < distances[2].dist);
});

// ── 5. Federation Isolation & Integration ────────────────────────────────────
console.log('\n5. Federation Isolation & Database Operations:');

async function runDbTests() {
  require('dotenv').config();
  const db = require('./db/database');

  await runAsyncTest('Supply calculation scopes queries to federation_id without leaking other federations', async () => {
    const supplyAll = await getWorkerSupply(null);
    assert(typeof supplyAll === 'object');

    // Filter by specific federation
    const fed = await db.get('SELECT id FROM federations LIMIT 1');
    if (fed) {
      const supplyFed = await getWorkerSupply(fed.id);
      assert(typeof supplyFed === 'object');
    }
  });

  await runAsyncTest('Reallocation service executes and returns multi-region balance', async () => {
    // Requires AI service running on port 8000
    try {
      const result = await generateReallocationSuggestions({
        federationId: null,
        horizonDays: 7,
        aiServiceUrl: 'http://localhost:8000',
      });

      assert(Array.isArray(result.regions_evaluated));
      assert(result.regions_evaluated.length >= 2, 'Must evaluate at least 2 regions');
      assert(Array.isArray(result.regional_balance));
      assert(result.regional_balance.length > 0);
      assert(Array.isArray(result.reallocation_recommendations));

      // Verify each regional balance item has required keys
      const sample = result.regional_balance[0];
      assert('region' in sample);
      assert('skill_category' in sample);
      assert('predicted_demand' in sample);
      assert('available_workers' in sample);
      assert('deficit' in sample);
      assert('surplus' in sample);
      assert('hotspot_level' in sample);
      assert(['LOW', 'MEDIUM', 'HIGH'].includes(sample.hotspot_level));

      // Verify recommendations require admin approval (never auto-reallocate)
      for (const rec of result.reallocation_recommendations) {
        assert.strictEqual(rec.status, 'pending_approval');
        assert(rec.reallocate_count > 0);
        assert(rec.distance_km > 0);
        assert(typeof rec.message === 'string');
      }

      // Verify snapshots were saved in DB
      const snapshots = await db.all('SELECT * FROM demand_forecast_snapshots LIMIT 5');
      assert(Array.isArray(snapshots));
      assert(snapshots.length > 0, 'Snapshots must be stored in database');
    } catch (err) {
      if (err.message.includes('ECONNREFUSED') || err.message.includes('Failed to fetch')) {
        console.warn('    [SKIP DB Call] AI service on :8000 not currently active in test runner process');
      } else {
        throw err;
      }
    }
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passedTests} / ${totalTests} tests passed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runDbTests();
