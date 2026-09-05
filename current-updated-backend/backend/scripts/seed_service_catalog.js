const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Seed Service Catalog from CSV Master
 * Source: docs/final_worker_payout_master_india.csv
 * 
 * Financial Interpretation:
 * fixed_worker_payout_inr is the BASE CUSTOMER-FACING SERVICE PRICE.
 * All monetary calculations also store integer paise (INR * 100).
 */
async function seedServiceCatalog(db) {
  // Discover CSV path
  const candidatePaths = [
    path.join(__dirname, '..', '..', '..', 'docs', 'final_worker_payout_master_india.csv'),
    path.join('c:', 'Users', 'ASUS', 'cooperative gig platform', 'docs', 'final_worker_payout_master_india.csv'),
    path.join(__dirname, '..', 'final_worker_payout_master_india.csv'),
  ];

  let csvPath = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      csvPath = p;
      break;
    }
  }

  if (!csvPath) {
    console.error('❌ Service Master CSV not found in any candidate path.');
    return { success: false, error: 'CSV_NOT_FOUND' };
  }

  console.log(`📄 Found Service Master CSV at: ${csvPath}`);
  const rawContent = fs.readFileSync(csvPath, 'utf8');
  const lines = rawContent.trim().split(/\r?\n/);

  if (lines.length < 2) {
    console.error('❌ CSV file is empty or missing headers');
    return { success: false, error: 'CSV_EMPTY' };
  }

  const header = lines[0].split(',').map(s => s.trim().toLowerCase());
  const idIdx = header.indexOf('service_id');
  const catIdx = header.indexOf('category');
  const jobIdx = header.indexOf('job_name');
  const unitIdx = header.indexOf('pricing_unit');
  const priceIdx = header.indexOf('fixed_worker_payout_inr');
  const minQtyIdx = header.indexOf('minimum_quantity');
  const scopeIdx = header.indexOf('payout_scope');
  const notesIdx = header.indexOf('notes');

  if (idIdx === -1 || catIdx === -1 || jobIdx === -1 || unitIdx === -1 || priceIdx === -1) {
    console.error('❌ CSV missing required columns. Header:', header);
    return { success: false, error: 'CSV_INVALID_HEADER' };
  }

  const validRecords = [];
  const serviceIds = new Set();
  const duplicateIds = [];
  let invalidCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV split with basic comma separation
    const parts = line.split(',');
    const serviceId = parts[idIdx]?.trim();
    const category = parts[catIdx]?.trim();
    const jobName = parts[jobIdx]?.trim();
    const pricingUnit = parts[unitIdx]?.trim();
    const priceInr = parseFloat(parts[priceIdx]?.trim());
    const minQty = parseInt(parts[minQtyIdx]?.trim() || '1', 10);
    const scope = scopeIdx !== -1 ? parts[scopeIdx]?.trim() : '';
    // join any trailing notes if they contained commas
    const notes = notesIdx !== -1 ? parts.slice(notesIdx).join(',').trim() : '';

    if (serviceIds.has(serviceId)) {
      duplicateIds.push(serviceId);
    }
    serviceIds.add(serviceId);

    if (!serviceId || !category || !jobName || !pricingUnit || isNaN(priceInr) || priceInr <= 0 || isNaN(minQty) || minQty <= 0) {
      console.warn(`⚠️ Row ${i + 1} invalid: ${line}`);
      invalidCount++;
      continue;
    }

    const pricePaise = Math.round(priceInr * 100);

    validRecords.push({
      serviceId,
      category,
      jobName,
      pricingUnit,
      priceInr,
      pricePaise,
      minQty: Math.max(1, minQty),
      scope,
      notes,
    });
  }

  console.log(`📊 CSV Validation Summary:`);
  console.log(`   - Total Lines: ${lines.length}`);
  console.log(`   - Unique Service IDs: ${serviceIds.size}`);
  console.log(`   - Valid Services: ${validRecords.length}`);
  console.log(`   - Invalid Rows: ${invalidCount}`);
  console.log(`   - Duplicate IDs: ${duplicateIds.length}`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const record of validRecords) {
    const existing = await db.get('SELECT id FROM service_catalog WHERE service_id = ?', [record.serviceId]);

    if (!existing) {
      const id = uuidv4();
      await db.run(`
        INSERT INTO service_catalog (
          id, service_id, category, job_name, pricing_unit,
          base_price_inr, base_price_paise, minimum_quantity, payout_scope, notes, is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        id,
        record.serviceId,
        record.category,
        record.jobName,
        record.pricingUnit,
        record.priceInr,
        record.pricePaise,
        record.minQty,
        record.scope,
        record.notes,
      ]);
      insertedCount++;
    } else {
      await db.run(`
        UPDATE service_catalog
        SET category = ?,
            job_name = ?,
            pricing_unit = ?,
            base_price_inr = ?,
            base_price_paise = ?,
            minimum_quantity = ?,
            payout_scope = ?,
            notes = ?,
            is_active = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE service_id = ?
      `, [
        record.category,
        record.jobName,
        record.pricingUnit,
        record.priceInr,
        record.pricePaise,
        record.minQty,
        record.scope,
        record.notes,
        record.serviceId,
      ]);
      updatedCount++;
    }
  }

  console.log(`✅ Service Catalog Seeding Complete: ${insertedCount} inserted, ${updatedCount} updated.`);
  return {
    success: true,
    totalCsvRows: lines.length - 1,
    validCount: validRecords.length,
    insertedCount,
    updatedCount,
    invalidCount,
    duplicateCount: duplicateIds.length,
  };
}

// Standalone execution support
if (require.main === module) {
  require('dotenv').config();
  const db = require('../db/database');
  (async () => {
    try {
      await db.initDb();
      const res = await seedServiceCatalog(db);
      console.log('Seed Result:', res);
      process.exit(0);
    } catch (err) {
      console.error('Fatal seed error:', err);
      process.exit(1);
    }
  })();
}

module.exports = { seedServiceCatalog };
