require('dotenv').config();
const db = require('../db/database');

async function main() {
  console.log('=== CHECKING SUPABASE POSTGRESQL TABLES ===');
  const cols = await db.all("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'workers'");
  console.table(cols);

  const workers = await db.all("SELECT id, full_name, phone, skill_category, verification_status, lat, lng FROM workers LIMIT 5");
  console.log('=== WORKERS ===');
  console.table(workers);

  const customers = await db.all("SELECT id, full_name, phone FROM customers LIMIT 5");
  console.log('=== CUSTOMERS ===');
  console.table(customers);

  const bookings = await db.all("SELECT id, customer_id, worker_id, status, skill_category, is_emergency FROM bookings ORDER BY created_at DESC LIMIT 5");
  console.log('=== RECENT BOOKINGS ===');
  console.table(bookings);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
