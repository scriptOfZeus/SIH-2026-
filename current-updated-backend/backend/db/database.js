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
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS ocr_confidence_score REAL;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS ocr_status TEXT DEFAULT 'pending';
      CREATE INDEX IF NOT EXISTS idx_workers_ocr_status ON workers(ocr_status);

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
    `);

    // Backfill payments.federation_id from bookings if missing
    await db.run(`
      UPDATE payments 
      SET federation_id = (SELECT federation_id FROM bookings WHERE bookings.id = payments.booking_id)
      WHERE federation_id IS NULL AND booking_id IS NOT NULL
    `);

    // Seed one federation + one admin if empty
    const fedCountRes = await db.get('SELECT COUNT(*) as c FROM federations');
    const fedCount = parseInt(fedCountRes.c);
    
    if (fedCount === 0) {
      const fedId = uuidv4();
      await db.run('INSERT INTO federations (id, name, region) VALUES (?, ?, ?)', [
        fedId, 'Pilot Federation', 'Demo Region'
      ]);
      const bcrypt = require('crypto').createHash('sha256').update('admin123').digest('hex');
      await db.run(
        'INSERT INTO admins (id, federation_id, full_name, email, password_hash) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), fedId, 'Demo Admin', 'admin@demo.com', bcrypt]
      );
      console.log('✅ Seeded federation + admin (admin@demo.com / admin123)');
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
    
    console.log('✅ Database initialization complete.');
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
  }
}

// Export initialization function as well
db.initDb = initDb;

module.exports = db;
