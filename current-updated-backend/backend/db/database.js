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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        booking_id TEXT REFERENCES bookings(id),
        amount REAL,
        platform_commission REAL,
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

      CREATE INDEX IF NOT EXISTS idx_workers_phone ON workers(phone);
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
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
    
    console.log('✅ Database initialization complete.');
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
  }
}

// Export initialization function as well
db.initDb = initDb;

module.exports = db;
