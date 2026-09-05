const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { haversineKm } = require('../utils/distance');

// Platform-supported geographic regional centers
const REGION_COORDINATES = {
  Kolkata: { lat: 22.5726, lng: 88.3639 },
  Mumbai: { lat: 19.0760, lng: 72.8777 },
  Delhi: { lat: 28.6139, lng: 77.2090 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
};

// Configurable, transparent hotspot classification thresholds (% increase above baseline)
const HOTSPOT_THRESHOLDS = {
  HIGH: 25.0,   // >= +25% above baseline indicates a high-demand hotspot
  MEDIUM: 10.0, // >= +10% and < +25% indicates medium demand
  LOW: 0.0,     // < +10% indicates normal / low demand
};

/**
 * Classify demand based on percentage growth over historical baseline.
 * Returns: 'LOW' | 'MEDIUM' | 'HIGH'
 */
function classifyHotspot(predictedDemand, baselineDemand) {
  if (!baselineDemand || baselineDemand <= 0) {
    return 'MEDIUM';
  }
  const growthPercent = ((predictedDemand - baselineDemand) / baselineDemand) * 100;
  if (growthPercent >= HOTSPOT_THRESHOLDS.HIGH) return 'HIGH';
  if (growthPercent >= HOTSPOT_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

/**
 * Determine the closest supported platform region for a given lat/lng.
 */
function getNearestRegion(lat, lng) {
  if (lat == null || lng == null) return null;
  let nearestRegion = null;
  let minDistance = Infinity;

  for (const [region, coords] of Object.entries(REGION_COORDINATES)) {
    const dist = haversineKm(lat, lng, coords.lat, coords.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestRegion = region;
    }
  }
  return nearestRegion;
}

/**
 * Fetch approved worker supply grouped by region and skill_category.
 * Enforces federation boundary when federationId is provided.
 */
async function getWorkerSupply(federationId = null) {
  let query = `
    SELECT w.id, w.federation_id, w.skill_category, w.lat, w.lng, f.region as fed_region
    FROM workers w
    LEFT JOIN federations f ON f.id = w.federation_id
    WHERE w.verification_status = 'approved'
  `;
  const params = [];

  if (federationId) {
    query += ' AND w.federation_id = ?';
    params.push(federationId);
  }

  const workers = await db.all(query, params);

  // Group count by (region, skill_category)
  const supplyMap = {};
  for (const w of workers) {
    // Resolve region: from coordinates nearest match, or fallback to federation region
    let region = getNearestRegion(w.lat, w.lng);
    if (!region && w.fed_region && REGION_COORDINATES[w.fed_region]) {
      region = w.fed_region;
    }
    if (!region) {
      region = 'Kolkata'; // fallback to pilot region
    }

    const key = `${region}::${w.skill_category}`;
    supplyMap[key] = (supplyMap[key] || 0) + 1;
  }

  return supplyMap;
}

/**
 * Fetch baseline demand from AI service or compute from default historical averages.
 */
async function fetchBaselines(aiServiceUrl = 'http://localhost:8000') {
  try {
    const res = await fetch(`${aiServiceUrl}/baselines`);
    if (res.ok) {
      const data = await res.json();
      const map = {};
      for (const item of data.baselines) {
        map[`${item.region}::${item.skill_category}`] = item.baseline_demand;
      }
      return map;
    }
  } catch (err) {
    console.warn(`[AllocationService] Could not fetch baselines from AI service: ${err.message}. Using built-in synthetic baselines.`);
  }

  // Fallback defaults matching synthetic generator means
  return {
    'Bengaluru::carpenter': 8.5, 'Bengaluru::cleaner': 20.3, 'Bengaluru::electrician': 27.6, 'Bengaluru::painter': 7.1, 'Bengaluru::plumber': 21.0,
    'Delhi::carpenter': 9.2, 'Delhi::cleaner': 22.8, 'Delhi::electrician': 30.1, 'Delhi::painter': 7.9, 'Delhi::plumber': 23.4,
    'Kolkata::carpenter': 7.8, 'Kolkata::cleaner': 18.2, 'Kolkata::electrician': 19.5, 'Kolkata::painter': 6.4, 'Kolkata::plumber': 18.9,
    'Mumbai::carpenter': 9.8, 'Mumbai::cleaner': 24.1, 'Mumbai::electrician': 32.5, 'Mumbai::painter': 8.3, 'Mumbai::plumber': 25.2,
  };
}

/**
 * Core Reconciliation & Reallocation Engine.
 * 1. Computes deficit and surplus for each region + category.
 * 2. Matches deficit regions with the geographically closest surplus region.
 * 3. Generates pending reallocation recommendations requiring admin approval.
 * 4. Persists snapshots and alerts to PostgreSQL.
 */
async function generateReallocationSuggestions({ federationId = null, horizonDays = 7, aiServiceUrl = 'http://localhost:8000' } = {}) {
  // 1. Get forecasts from AI service for all regions
  let forecasts = [];
  let modelType = 'holt_winters';
  try {
    const res = await fetch(`${aiServiceUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ horizon_days: horizonDays }),
    });
    if (res.ok) {
      const forecastData = await res.json();
      forecasts = forecastData.forecast || [];
      modelType = forecastData.model || 'holt_winters';
    }
  } catch (err) {
    console.warn(`[AllocationService] AI service unreachable at ${aiServiceUrl}: ${err.message}. Using statistical baselines.`);
  }

  const baselines = await fetchBaselines(aiServiceUrl);
  if (forecasts.length === 0) {
    // Fallback: Generate statistical forecasts based on baselines
    const regions = ['Bengaluru', 'Delhi', 'Kolkata', 'Mumbai'];
    const skills = ['carpenter', 'cleaner', 'electrician', 'painter', 'plumber'];
    const today = new Date();
    for (const region of regions) {
      for (const skill of skills) {
        const base = baselines[`${region}::${skill}`] || 20;
        for (let d = 0; d < horizonDays; d++) {
          const fcDate = new Date(today.getTime() + d * 24 * 60 * 60 * 1000);
          const pred = Math.round(base * (1 + 0.15 * Math.sin(d)));
          forecasts.push({
            date: fcDate.toISOString().slice(0, 10),
            region,
            skill_category: skill,
            predicted_demand: pred,
            lower_bound: Math.max(1, Math.round(pred * 0.8)),
            upper_bound: Math.round(pred * 1.2),
          });
        }
      }
    }
  }

  const supplyMap = await getWorkerSupply(federationId);

  // 2. Aggregate forecast per region and category (average daily predicted demand over horizon)
  const groupedForecast = {};
  for (const fc of forecasts) {
    const key = `${fc.region}::${fc.skill_category}`;
    if (!groupedForecast[key]) {
      groupedForecast[key] = {
        region: fc.region,
        skill_category: fc.skill_category,
        total_predicted: 0,
        count: 0,
        lower_sum: 0,
        upper_sum: 0,
      };
    }
    groupedForecast[key].total_predicted += fc.predicted_demand;
    groupedForecast[key].lower_sum += fc.lower_bound;
    groupedForecast[key].upper_sum += fc.upper_bound;
    groupedForecast[key].count += 1;
  }

  // 3. Reconcile supply and demand
  const regionalBalance = [];
  const snapshotRows = [];
  let totalDeficit = 0;
  let totalSurplus = 0;
  let hotspotsDetected = 0;

  for (const [key, item] of Object.entries(groupedForecast)) {
    const avgPredicted = Math.round(item.total_predicted / item.count);
    const avgLower = Math.round(item.lower_sum / item.count);
    const avgUpper = Math.round(item.upper_sum / item.count);
    const baseline = baselines[key] || avgPredicted;
    const growthPercent = baseline > 0 ? +(((avgPredicted - baseline) / baseline) * 100).toFixed(1) : 0.0;
    const hotspotLevel = classifyHotspot(avgPredicted, baseline);

    if (hotspotLevel === 'HIGH') hotspotsDetected++;

    const availableWorkers = supplyMap[key] || 0;
    const deficit = Math.max(avgPredicted - availableWorkers, 0);
    const surplus = Math.max(availableWorkers - avgPredicted, 0);

    totalDeficit += deficit;
    totalSurplus += surplus;

    const balanceEntry = {
      region: item.region,
      skill_category: item.skill_category,
      baseline_demand: baseline,
      predicted_demand: avgPredicted,
      growth_percent: growthPercent,
      hotspot_level: hotspotLevel,
      available_workers: availableWorkers,
      deficit,
      surplus,
    };
    regionalBalance.push(balanceEntry);

    snapshotRows.push({
      id: uuidv4(),
      federation_id: federationId,
      region: item.region,
      skill_category: item.skill_category,
      forecast_date: new Date().toISOString().slice(0, 10),
      predicted_demand: avgPredicted,
      lower_bound: avgLower,
      upper_bound: avgUpper,
      baseline_demand: baseline,
      growth_percent: growthPercent,
      hotspot_level: hotspotLevel,
      model_type: modelType || 'holt_winters',
    });
  }

  // 4. Generate Reallocation Recommendations by Skill Category
  const recommendations = [];
  const categories = [...new Set(regionalBalance.map(r => r.skill_category))];

  for (const category of categories) {
    const deficitRegions = regionalBalance
      .filter(r => r.skill_category === category && r.deficit > 0)
      .map(r => ({ ...r, remainingDeficit: r.deficit }));

    const surplusRegions = regionalBalance
      .filter(r => r.skill_category === category && r.surplus > 0)
      .map(r => ({ ...r, remainingSurplus: r.surplus }));

    for (const d of deficitRegions) {
      if (d.remainingDeficit <= 0) continue;

      // Sort surplus regions by distance to deficit region (closest first)
      const sortedSurplus = surplusRegions
        .filter(s => s.remainingSurplus > 0 && s.region !== d.region)
        .map(s => {
          const dCoords = REGION_COORDINATES[d.region] || { lat: 0, lng: 0 };
          const sCoords = REGION_COORDINATES[s.region] || { lat: 0, lng: 0 };
          const dist = +haversineKm(dCoords.lat, dCoords.lng, sCoords.lat, sCoords.lng).toFixed(1);
          return { ...s, distance_km: dist };
        })
        .sort((a, b) => a.distance_km - b.distance_km);

      for (const s of sortedSurplus) {
        if (d.remainingDeficit <= 0) break;
        if (s.remainingSurplus <= 0) continue;

        const countToReallocate = Math.min(d.remainingDeficit, s.remainingSurplus);
        d.remainingDeficit -= countToReallocate;
        s.remainingSurplus -= countToReallocate;

        const alertId = uuidv4();
        const reason = `High demand hotspot in ${d.region} (${d.hotspot_level} level, demand: ${d.predicted_demand}, local supply: ${d.available_workers}). Source ${s.region} has ${s.surplus} surplus workers.`;
        const message = `Reallocate ${countToReallocate} ${category} workers from ${s.region} to ${d.region} (${s.distance_km} km).`;

        recommendations.push({
          id: alertId,
          federation_id: federationId,
          skill_category: category,
          source_region: s.region,
          target_region: d.region,
          reallocate_count: countToReallocate,
          distance_km: s.distance_km,
          message,
          reason,
          status: 'pending_approval',
        });
      }
    }
  }

  // 5. Persist Snapshots & Alerts to DB (Safe asynchronous insertion)
  try {
    for (const snap of snapshotRows.slice(0, 20)) {
      await db.run(`
        INSERT INTO demand_forecast_snapshots
          (id, federation_id, region, skill_category, forecast_date, predicted_demand, lower_bound, upper_bound, baseline_demand, growth_percent, hotspot_level, model_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [snap.id, snap.federation_id, snap.region, snap.skill_category, snap.forecast_date, snap.predicted_demand, snap.lower_bound, snap.upper_bound, snap.baseline_demand, snap.growth_percent, snap.hotspot_level, snap.model_type]);
    }

    for (const rec of recommendations) {
      await db.run(`
        INSERT INTO reallocation_alerts
          (id, federation_id, skill_category, source_region, target_region, reallocate_count, distance_km, reason, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [rec.id, rec.federation_id, rec.skill_category, rec.source_region, rec.target_region, rec.reallocate_count, rec.distance_km, rec.reason, rec.status]);
    }
  } catch (dbErr) {
    console.warn(`[AllocationService] DB snapshot persistence note: ${dbErr.message}`);
  }

  return {
    generated_at: new Date().toISOString(),
    federation_id: federationId,
    regions_evaluated: Object.keys(REGION_COORDINATES),
    summary: {
      total_deficit: totalDeficit,
      total_surplus: totalSurplus,
      hotspots_detected: hotspotsDetected,
      recommendations_count: recommendations.length,
    },
    regional_balance: regionalBalance,
    reallocation_recommendations: recommendations,
  };
}

module.exports = {
  REGION_COORDINATES,
  HOTSPOT_THRESHOLDS,
  classifyHotspot,
  getNearestRegion,
  getWorkerSupply,
  fetchBaselines,
  generateReallocationSuggestions,
};
