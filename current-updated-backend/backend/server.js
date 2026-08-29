require('dotenv').config();
const express = require('express');
const cors = require('cors');

const db = require('./db/database');
db.initDb(); // initializes + seeds DB on first run


const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const authRoutes = require('./routes/auth');
const workerRoutes = require('./routes/workers');
const customerRoutes = require('./routes/customers');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const ratingRoutes = require('./routes/ratings');
const adminRoutes = require('./routes/admin');

const BASE = '/api/v1';

app.use(`${BASE}/auth`, authRoutes);
app.use(`${BASE}`, workerRoutes); // has both /admin/workers and /workers/* paths internally
app.use(`${BASE}/customers`, customerRoutes);
app.use(`${BASE}/bookings`, bookingRoutes);
app.use(`${BASE}/payments`, paymentRoutes);
app.use(`${BASE}/ratings`, ratingRoutes);
app.use(`${BASE}/admin`, adminRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Cooperative Gig Platform API - V1 (demo build)' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`   API base: http://localhost:${PORT}${BASE}`);
  console.log(`   Admin login: admin@demo.com / admin123\n`);
});
