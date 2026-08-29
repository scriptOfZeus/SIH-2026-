require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');

const db = require('./db/database');
db.initDb(); // initializes + seeds DB on first run

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO realtime server
const { initSocketServer } = require('./services/socketService');
const io = initSocketServer(server);

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
const trackingRoutes = require('./routes/tracking');
const smsRoutes = require('./routes/sms');
const welfareRoutes = require('./routes/welfare');
const disputeRoutes = require('./routes/disputes');
const adminDisputeRoutes = require('./routes/adminDisputes');

const BASE = '/api/v1';

app.use(`${BASE}/auth`, authRoutes);
app.use(`${BASE}`, workerRoutes); // has both /admin/workers and /workers/* paths internally
app.use(`${BASE}/customers`, customerRoutes);
app.use(`${BASE}/bookings`, bookingRoutes);
app.use(`${BASE}/payments`, paymentRoutes);
app.use(`${BASE}/ratings`, ratingRoutes);
app.use(`${BASE}/admin`, adminRoutes);
app.use(`${BASE}`, trackingRoutes); // provides /bookings/:id/consent-tracking, /location, /tracking, /track-stream
app.use(`${BASE}/sms`, smsRoutes); // provides /sms/webhook, /sms/logs
app.use(`${BASE}`, welfareRoutes); // provides /welfare/* and /admin/welfare/* routes
app.use(`${BASE}/disputes`, disputeRoutes);
app.use(`${BASE}/admin/disputes`, adminDisputeRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Cooperative Gig Platform API - V2 (demo build)', realtime: 'Socket.IO + SSE' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`   API base: http://localhost:${PORT}${BASE}`);
  console.log(`   Admin login: admin@demo.com / admin123\n`);
});

module.exports = { app, server, io };
