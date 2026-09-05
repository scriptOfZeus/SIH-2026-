const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Use the Supabase DATABASE_URL from .env
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: connectionString && connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Helper to convert SQLite style ? placeholders to Postgres $1, $2, etc.
// Also converts SQLite datetime('now') to CURRENT_TIMESTAMP on the fly.
function formatSql(sql) {
  let index = 1;
  let formatted = sql.replace(/\?/g, () => `$${index++}`);
  formatted = formatted.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');
  return formatted;
}

pool.on('error', (err) => {
  console.error('[PG POOL ERROR]', err.message);
});

const db = {
  pool,
  
  async query(sql, params = []) {
    const formattedSql = formatSql(sql);
    return pool.query(formattedSql, params);
  },

  async get(sql, params = []) {
    const res = await this.query(sql, params);
    return res.rows[0];
  },

  async all(sql, params = []) {
    const res = await this.query(sql, params);
    return res.rows;
  },

  async run(sql, params = []) {
    const res = await this.query(sql, params);
    return { changes: res.rowCount };
  },

  async exec(sql) {
    // Split multi-statement SQL by semicolon and run each
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('PRAGMA'));
    
    for (const statement of statements) {
      await this.query(statement);
    }
  }
};

// Database Initialization (Schema setup)
async function initDb() {
  try {
    console.log('🔄 Initializing Supabase PostgreSQL database...');
    
    await db.exec(`
      CREATE TABLE IF NOT EXISTS federations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        region TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        federation_id TEXT REFERENCES federations(id),
        full_name TEXT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY,
        federation_id TEXT REFERENCES federations(id),
        added_by_admin_id TEXT REFERENCES admins(id),
        full_name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        account_activated INTEGER DEFAULT 0,
        skill_category TEXT NOT NULL,
        skill_certificate_number TEXT,
        skill_certificate_verified INTEGER DEFAULT 0,
        skill_certificate_verified_at TEXT,
        verification_status TEXT DEFAULT 'pending',
        lat REAL,
        lng REAL,
        avg_rating REAL DEFAULT 0,
        reliability_score REAL DEFAULT 1.0,
        certificate_document_url TEXT,
        ocr_extracted_number TEXT,
        ocr_extracted_name TEXT,
        ocr_confidence_score REAL,
        ocr_status TEXT DEFAULT 'pending',
        is_available INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        full_name TEXT,
        phone TEXT UNIQUE NOT NULL,
        default_address TEXT,
        default_lat REAL,
        default_lng REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        customer_id TEXT REFERENCES customers(id),
        worker_id TEXT REFERENCES workers(id),
        federation_id TEXT REFERENCES federations(id),
        skill_category TEXT NOT NULL,
        status TEXT DEFAULT 'requested',
        scheduled_time TEXT,
        service_address TEXT,
        service_lat REAL,
        service_lng REAL,
        estimated_distance_km REAL,
        parts_fee REAL DEFAULT 0.0,
        service_notes TEXT,
        completed_by_customer INTEGER DEFAULT 0,
        completed_by_worker INTEGER DEFAULT 0,
        tracking_consent_given INTEGER DEFAULT 0,
        tracking_consent_at TIMESTAMP,
        tracking_active INTEGER DEFAULT 0,
        is_emergency INTEGER DEFAULT 0,
        emergency_timeout_seconds INTEGER DEFAULT 60,
        dispatch_attempts INTEGER DEFAULT 0,
        rejected_worker_ids TEXT DEFAULT '[]',
        emergency_fee REAL DEFAULT 0.0,
        short_code TEXT UNIQUE,
        origin_channel TEXT DEFAULT 'web',
        offline_synced_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        booking_id TEXT REFERENCES bookings(id),
        federation_id TEXT REFERENCES federations(id),
        amount REAL,
        platform_commission REAL,
        welfare_deduction REAL DEFAULT 0.0,
        worker_payout REAL,
        status TEXT DEFAULT 'pending',
        razorpay_payment_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ratings (
        id TEXT PRIMARY KEY,
        booking_id TEXT REFERENCES bookings(id),
        rated_by TEXT,
        rating INTEGER,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sms_logs (
        id TEXT PRIMARY KEY,
        direction TEXT NOT NULL,
        sender_phone TEXT NOT NULL,
        recipient_phone TEXT NOT NULL,
        message_body TEXT NOT NULL,
        booking_id TEXT REFERENCES bookings(id),
        worker_id TEXT REFERENCES workers(id),
        federation_id TEXT REFERENCES federations(id),
        command TEXT,
        status TEXT DEFAULT 'processed',
        provider_message_id TEXT UNIQUE,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS insurance_policies (
        id TEXT PRIMARY KEY,
        federation_id TEXT REFERENCES federations(id) NOT NULL,
        name TEXT NOT NULL,
        provider_name TEXT NOT NULL,
        policy_number TEXT,
        coverage_amount REAL NOT NULL,
        premium_monthly REAL DEFAULT 0.0,
        contribution_rate REAL DEFAULT 0.02,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS worker_welfare_enrollments (
        id TEXT PRIMARY KEY,
        worker_id TEXT REFERENCES workers(id) NOT NULL,
        policy_id TEXT REFERENCES insurance_policies(id) NOT NULL,
        federation_id TEXT REFERENCES federations(id) NOT NULL,
        status TEXT DEFAULT 'active',
        total_contributions_accumulated REAL DEFAULT 0.0,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_contribution_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS welfare_contributions (
        id TEXT PRIMARY KEY,
        worker_id TEXT REFERENCES workers(id) NOT NULL,
        booking_id TEXT REFERENCES bookings(id),
        payment_id TEXT REFERENCES payments(id),
        federation_id TEXT REFERENCES federations(id) NOT NULL,
        policy_id TEXT REFERENCES insurance_policies(id),
        amount REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS welfare_claims (
        id TEXT PRIMARY KEY,
        claim_number TEXT UNIQUE NOT NULL,
        worker_id TEXT REFERENCES workers(id) NOT NULL,
        policy_id TEXT REFERENCES insurance_policies(id) NOT NULL,
        federation_id TEXT REFERENCES federations(id) NOT NULL,
        claim_type TEXT NOT NULL,
        amount_requested REAL NOT NULL,
        amount_approved REAL DEFAULT 0.0,
        incident_date TEXT NOT NULL,
        description TEXT NOT NULL,
        evidence_document_url TEXT,
        status TEXT DEFAULT 'submitted',
        admin_notes TEXT,
        adjudicated_by_admin_id TEXT REFERENCES admins(id),
        adjudicated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS demand_forecast_snapshots (
        id TEXT PRIMARY KEY,
        federation_id TEXT REFERENCES federations(id),
        region TEXT NOT NULL,
        skill_category TEXT NOT NULL,
        forecast_date TEXT NOT NULL,
        predicted_demand INTEGER NOT NULL,
        lower_bound INTEGER NOT NULL,
        upper_bound INTEGER NOT NULL,
        baseline_demand REAL,
        growth_percent REAL,
        hotspot_level TEXT DEFAULT 'LOW',
        model_type TEXT DEFAULT 'holt_winters',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reallocation_alerts (
        id TEXT PRIMARY KEY,
        federation_id TEXT REFERENCES federations(id),
        skill_category TEXT NOT NULL,
        source_region TEXT NOT NULL,
        target_region TEXT NOT NULL,
        reallocate_count INTEGER NOT NULL,
        distance_km REAL NOT NULL,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'pending_approval',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_workers_phone ON workers(phone);
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
      CREATE INDEX IF NOT EXISTS idx_snapshots_region_cat ON demand_forecast_snapshots(region, skill_category);
      CREATE INDEX IF NOT EXISTS idx_snapshots_fed ON demand_forecast_snapshots(federation_id);
      CREATE INDEX IF NOT EXISTS idx_reallocation_fed ON reallocation_alerts(federation_id);
      CREATE INDEX IF NOT EXISTS idx_reallocation_status ON reallocation_alerts(status);

      CREATE TABLE IF NOT EXISTS disputes (
        id TEXT PRIMARY KEY,
        dispute_number TEXT UNIQUE NOT NULL,
        booking_id TEXT REFERENCES bookings(id) NOT NULL,
        raised_by_id TEXT NOT NULL,
        raised_by_role TEXT NOT NULL,
        federation_id TEXT REFERENCES federations(id) NOT NULL,
        reason TEXT NOT NULL,
        evidence_document_url TEXT,
        status TEXT DEFAULT 'raised',
        resolution_action TEXT DEFAULT 'none',
        resolution_notes TEXT,
        refund_amount REAL DEFAULT 0.0,
        adjudicated_by_admin_id TEXT REFERENCES admins(id),
        adjudicated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_disputes_booking ON disputes(booking_id);
      CREATE INDEX IF NOT EXISTS idx_disputes_fed ON disputes(federation_id);

      ALTER TABLE payments ADD COLUMN IF NOT EXISTS federation_id TEXT REFERENCES federations(id);
      CREATE INDEX IF NOT EXISTS idx_payments_fed ON payments(federation_id);

      ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'none';
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_amount REAL DEFAULT 0.0;

      ALTER TABLE workers ADD COLUMN IF NOT EXISTS certificate_document_url TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS ocr_extracted_number TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS ocr_extracted_name TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS ocr_job_role TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS ocr_qualification_code TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS ocr_training_location TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS ocr_grade TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS ocr_nsqf_level TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS ocr_confidence_score REAL;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS ocr_status TEXT DEFAULT 'pending';
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS is_available INTEGER DEFAULT 1;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS hourly_rate REAL DEFAULT 450.0;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 1;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS pincode TEXT;
      CREATE INDEX IF NOT EXISTS idx_workers_ocr_status ON workers(ocr_status);
      CREATE INDEX IF NOT EXISTS idx_workers_is_available ON workers(is_available);

      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS parts_fee REAL DEFAULT 0.0;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_notes TEXT;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tracking_consent_given INTEGER DEFAULT 0;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tracking_consent_at TIMESTAMP;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tracking_active INTEGER DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_bookings_tracking_active ON bookings(tracking_active);

      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_emergency INTEGER DEFAULT 0;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS emergency_timeout_seconds INTEGER DEFAULT 60;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dispatch_attempts INTEGER DEFAULT 0;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rejected_worker_ids TEXT DEFAULT '[]';
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS emergency_fee REAL DEFAULT 0.0;
      CREATE INDEX IF NOT EXISTS idx_bookings_emergency_status ON bookings(is_emergency, status);

      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS origin_channel TEXT DEFAULT 'web';
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS offline_synced_at TIMESTAMP;
      CREATE INDEX IF NOT EXISTS idx_bookings_short_code ON bookings(short_code);

      CREATE TABLE IF NOT EXISTS sms_logs (
        id TEXT PRIMARY KEY,
        direction TEXT NOT NULL,
        sender_phone TEXT NOT NULL,
        recipient_phone TEXT NOT NULL,
        message_body TEXT NOT NULL,
        booking_id TEXT REFERENCES bookings(id),
        worker_id TEXT REFERENCES workers(id),
        federation_id TEXT REFERENCES federations(id),
        command TEXT,
        status TEXT DEFAULT 'processed',
        provider_message_id TEXT UNIQUE,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sms_logs_provider_msg ON sms_logs(provider_message_id);
      CREATE INDEX IF NOT EXISTS idx_sms_logs_booking ON sms_logs(booking_id);

      ALTER TABLE payments ADD COLUMN IF NOT EXISTS welfare_deduction REAL DEFAULT 0.0;

      CREATE TABLE IF NOT EXISTS insurance_policies (
        id TEXT PRIMARY KEY,
        federation_id TEXT REFERENCES federations(id) NOT NULL,
        name TEXT NOT NULL,
        provider_name TEXT NOT NULL,
        policy_number TEXT,
        coverage_amount REAL NOT NULL,
        premium_monthly REAL DEFAULT 0.0,
        contribution_rate REAL DEFAULT 0.02,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_policies_fed ON insurance_policies(federation_id);

      CREATE TABLE IF NOT EXISTS worker_welfare_enrollments (
        id TEXT PRIMARY KEY,
        worker_id TEXT REFERENCES workers(id) NOT NULL,
        policy_id TEXT REFERENCES insurance_policies(id) NOT NULL,
        federation_id TEXT REFERENCES federations(id) NOT NULL,
        status TEXT DEFAULT 'active',
        total_contributions_accumulated REAL DEFAULT 0.0,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_contribution_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_enrollments_worker ON worker_welfare_enrollments(worker_id);

      CREATE TABLE IF NOT EXISTS welfare_contributions (
        id TEXT PRIMARY KEY,
        worker_id TEXT REFERENCES workers(id) NOT NULL,
        booking_id TEXT REFERENCES bookings(id),
        payment_id TEXT REFERENCES payments(id),
        federation_id TEXT REFERENCES federations(id) NOT NULL,
        policy_id TEXT REFERENCES insurance_policies(id),
        amount REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_contributions_worker ON welfare_contributions(worker_id);

      CREATE TABLE IF NOT EXISTS welfare_claims (
        id TEXT PRIMARY KEY,
        claim_number TEXT UNIQUE NOT NULL,
        worker_id TEXT REFERENCES workers(id) NOT NULL,
        policy_id TEXT REFERENCES insurance_policies(id) NOT NULL,
        federation_id TEXT REFERENCES federations(id) NOT NULL,
        claim_type TEXT NOT NULL,
        amount_requested REAL NOT NULL,
        amount_approved REAL DEFAULT 0.0,
        incident_date TEXT NOT NULL,
        description TEXT NOT NULL,
        evidence_document_url TEXT,
        status TEXT DEFAULT 'submitted',
        admin_notes TEXT,
        adjudicated_by_admin_id TEXT REFERENCES admins(id),
        adjudicated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_claims_fed_status ON welfare_claims(federation_id, status);
      CREATE INDEX IF NOT EXISTS idx_claims_worker ON welfare_claims(worker_id);

      -- Phase 2.5 Multi-Federation & Admin Role Enhancements
      ALTER TABLE federations ADD COLUMN IF NOT EXISTS code TEXT;
      ALTER TABLE federations ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE federations ADD COLUMN IF NOT EXISTS location TEXT;
      ALTER TABLE federations ADD COLUMN IF NOT EXISTS contact_phone TEXT;
      ALTER TABLE federations ADD COLUMN IF NOT EXISTS contact_email TEXT;
      ALTER TABLE federations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
      ALTER TABLE federations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_federations_code ON federations(code);

      ALTER TABLE admins ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'federation_admin';
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
      CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);

      ALTER TABLE workers ADD COLUMN IF NOT EXISTS worker_type TEXT DEFAULT 'federation';
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS final_verification_status TEXT DEFAULT 'pending';
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS final_adjudicated_by_admin_id TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS final_adjudication_notes TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS final_adjudicated_at TIMESTAMP;
      CREATE INDEX IF NOT EXISTS idx_workers_worker_type ON workers(worker_type);
      CREATE INDEX IF NOT EXISTS idx_workers_final_verification ON workers(final_verification_status);

      CREATE TABLE IF NOT EXISTS federation_forecasts (
        id TEXT PRIMARY KEY,
        federation_id TEXT REFERENCES federations(id) NOT NULL,
        skill_category TEXT NOT NULL,
        region TEXT,
        forecast_date TEXT NOT NULL,
        day_name TEXT NOT NULL,
        predicted_demand INTEGER NOT NULL,
        lower_bound INTEGER DEFAULT 0,
        upper_bound INTEGER DEFAULT 0,
        published_by_admin_id TEXT REFERENCES admins(id),
        status TEXT DEFAULT 'published',
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_fed_forecasts_fed ON federation_forecasts(federation_id);
      CREATE INDEX IF NOT EXISTS idx_fed_forecasts_date ON federation_forecasts(forecast_date);

      -- Phase 3 Location & Telemetry Enhancements
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS last_location_updated_at TIMESTAMP;
      CREATE INDEX IF NOT EXISTS idx_workers_lat_lng_avail ON workers (lat, lng, is_available, verification_status);
      CREATE INDEX IF NOT EXISTS idx_workers_last_loc_time ON workers (last_location_updated_at);
      CREATE INDEX IF NOT EXISTS idx_bookings_service_coords ON bookings (service_lat, service_lng);

      -- Phase 6 Service Pricing, Financial Ledger, and Welfare Payout Architecture
      CREATE TABLE IF NOT EXISTS service_catalog (
        id TEXT PRIMARY KEY,
        service_id TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        job_name TEXT NOT NULL,
        pricing_unit TEXT NOT NULL,
        base_price_inr REAL NOT NULL,
        base_price_paise INTEGER NOT NULL,
        minimum_quantity INTEGER DEFAULT 1,
        payout_scope TEXT,
        notes TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_services_id ON service_catalog(service_id);
      CREATE INDEX IF NOT EXISTS idx_services_category ON service_catalog(category);
      CREATE INDEX IF NOT EXISTS idx_services_active ON service_catalog(is_active);

      CREATE TABLE IF NOT EXISTS payment_ledger (
        id TEXT PRIMARY KEY,
        booking_id TEXT REFERENCES bookings(id),
        payment_id TEXT REFERENCES payments(id),
        worker_id TEXT REFERENCES workers(id),
        federation_id TEXT REFERENCES federations(id),
        worker_type TEXT NOT NULL,
        gross_amount_paise INTEGER NOT NULL,
        worker_amount_paise INTEGER NOT NULL,
        insurance_amount_paise INTEGER NOT NULL,
        federation_amount_paise INTEGER NOT NULL,
        platform_amount_paise INTEGER NOT NULL,
        gross_amount REAL NOT NULL,
        worker_amount REAL NOT NULL,
        insurance_amount REAL NOT NULL,
        federation_amount REAL NOT NULL,
        platform_amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        transaction_type TEXT DEFAULT 'payment',
        status TEXT DEFAULT 'paid',
        reconciled INTEGER DEFAULT 1,
        idempotency_key TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_ledger_booking ON payment_ledger(booking_id);
      CREATE INDEX IF NOT EXISTS idx_ledger_payment ON payment_ledger(payment_id);
      CREATE INDEX IF NOT EXISTS idx_ledger_worker ON payment_ledger(worker_id);
      CREATE INDEX IF NOT EXISTS idx_ledger_federation ON payment_ledger(federation_id);
      CREATE INDEX IF NOT EXISTS idx_ledger_idempotency ON payment_ledger(idempotency_key);
      CREATE INDEX IF NOT EXISTS idx_ledger_created ON payment_ledger(created_at);

      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_id TEXT;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_unit_price REAL;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_unit_price_paise INTEGER;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS effective_quantity INTEGER DEFAULT 1;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gross_amount REAL;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gross_amount_paise INTEGER;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS worker_payout REAL;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS worker_payout_paise INTEGER;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS insurance_contribution REAL;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS insurance_contribution_paise INTEGER;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS federation_share REAL;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS federation_share_paise INTEGER;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS platform_fee REAL;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS platform_fee_paise INTEGER;

      ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS worker_type TEXT;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_paise INTEGER;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS worker_payout_paise INTEGER;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS insurance_deduction_paise INTEGER;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS federation_share_paise INTEGER;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS platform_commission_paise INTEGER;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS federation_share REAL DEFAULT 0.0;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS split_status TEXT DEFAULT 'pending';
    `);

    // Backfill payments.federation_id from bookings if missing
    await db.run(`
      UPDATE payments 
      SET federation_id = (SELECT federation_id FROM bookings WHERE bookings.id = payments.booking_id)
      WHERE federation_id IS NULL AND booking_id IS NOT NULL
    `);

    // Backfill federation codes
    await db.run(`
      UPDATE federations 
      SET code = 'PILOT-FED'
      WHERE (code IS NULL OR code = '') AND name = 'Pilot Federation'
    `);
    await db.run(`
      UPDATE federations 
      SET code = 'FED-' || UPPER(SUBSTR(id, 1, 8))
      WHERE code IS NULL OR code = ''
    `);

    // Backfill worker_type & final_verification_status
    await db.run(`
      UPDATE workers 
      SET worker_type = CASE WHEN federation_id IS NULL THEN 'independent' ELSE 'federation' END
      WHERE worker_type IS NULL OR worker_type = ''
    `);
    await db.run(`
      UPDATE workers 
      SET final_verification_status = CASE WHEN skill_certificate_verified = 1 THEN 'approved' ELSE 'pending' END
      WHERE final_verification_status IS NULL OR final_verification_status = ''
    `);

    // Seed federations + supervising & federation admins
    const fedCountRes = await db.get('SELECT COUNT(*) as c FROM federations');
    const fedCount = parseInt(fedCountRes.c);
    
    let pilotFed = await db.get("SELECT id FROM federations WHERE name = 'Pilot Federation'");
    if (!pilotFed) {
      const fedId = uuidv4();
      await db.run('INSERT INTO federations (id, name, region, code, status) VALUES (?, ?, ?, ?, ?)', [
        fedId, 'Pilot Federation', 'Demo Region', 'PILOT-FED', 'active'
      ]);
      pilotFed = { id: fedId };
    }

    const bcrypt = require('crypto').createHash('sha256').update('admin123').digest('hex');

    // Ensure supervising admin exists (admin@demo.com with supervising_admin role)
    const superAdmin = await db.get("SELECT id FROM admins WHERE email = 'admin@demo.com'");
    if (!superAdmin) {
      await db.run(
        'INSERT INTO admins (id, federation_id, full_name, email, password_hash, role, status) VALUES (?, NULL, ?, ?, ?, ?, ?)',
        [uuidv4(), 'Supervising Admin', 'admin@demo.com', bcrypt, 'supervising_admin', 'active']
      );
      console.log('✅ Seeded Supervising Admin (admin@demo.com / admin123)');
    } else {
      await db.run("UPDATE admins SET role = 'supervising_admin' WHERE email = 'admin@demo.com'");
    }

    // Ensure dedicated federation admin exists (fedadmin@demo.com) for Pilot Federation
    const fedAdmin = await db.get("SELECT id FROM admins WHERE email = 'fedadmin@demo.com'");
    if (!fedAdmin && pilotFed) {
      await db.run(
        'INSERT INTO admins (id, federation_id, full_name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), pilotFed.id, 'Pilot Federation Admin', 'fedadmin@demo.com', bcrypt, 'federation_admin', 'active']
      );
      console.log('✅ Seeded Federation Admin (fedadmin@demo.com / admin123)');
    }

    // Seed safe demo insurance policy for federations if none exists
    const federations = await db.all('SELECT id, name FROM federations');
    for (const fed of federations) {
      const existingPolicy = await db.get('SELECT id FROM insurance_policies WHERE federation_id = ?', [fed.id]);
      if (!existingPolicy) {
        const policyId = uuidv4();
        await db.run(`
          INSERT INTO insurance_policies (
            id, federation_id, name, provider_name, policy_number, coverage_amount, premium_monthly, contribution_rate, status
          )
          VALUES (?, ?, ?, 'National Cooperative Health Mutual', ?, 200000.0, 50.0, 0.02, 'active')
        `, [policyId, fed.id, `${fed.name} Health & Accidental Shield`, `POL-${fed.id.slice(0, 6).toUpperCase()}`]);
        console.log(`✅ Seeded demo insurance policy for ${fed.name}`);
      }
    }

    // Seed service catalog from CSV if empty or incomplete
    try {
      const { seedServiceCatalog } = require('../scripts/seed_service_catalog');
      const serviceCountRes = await db.get('SELECT COUNT(*) as c FROM service_catalog');
      const serviceCount = parseInt(serviceCountRes?.c || '0', 10);
      if (serviceCount < 249) {
        console.log(`📦 Seeding service catalog (${serviceCount}/249 services found)...`);
        await seedServiceCatalog(db);
      }
    } catch (seedErr) {
      console.warn('⚠️ Non-fatal service catalog auto-seed warning:', seedErr.message);
    }
    
    console.log('✅ Database initialization complete.');
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
  }
}

// Export initialization function as well
db.initDb = initDb;

module.exports = db;
