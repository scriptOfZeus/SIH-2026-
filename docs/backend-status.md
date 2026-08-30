# Backend Status — Cooperative Gig Services Platform (PS26089)

## ✅ Features Implemented

**Authentication**
- OTP-based login for workers and customers (mocked — code is always `123456` for now)
- Email/password login for admins
- JWT-based sessions with role checks (admin / worker / customer)

**Worker Management**
- Admin can add a worker (name, phone, skill category, certificate number)
- Admin can verify a worker's skill certificate
- Admin can approve/reject a worker (blocked until certificate is verified)
- Worker can view/update their own profile and location
- Geo-based "nearby workers" search (by skill category + radius) using distance calculation

**Customer Management**
- Customer profile view/update (name, default address/location)

**Bookings**
- Customer creates a booking — auto-matches the nearest approved worker in that skill category
- Worker can accept or reject a booking (rejecting re-matches to the next nearest worker)
- Two-sided completion — booking only marks "completed" once **both** customer and worker confirm (fraud protection)
- Booking cancellation (before completion)
- Full booking history per user (`GET /bookings/mine/list`)

**Payments**
- Payment record created per booking, with automatic platform commission split (15%) vs. worker payout
- Mocked as instantly "paid" — no real payment gateway connected yet

**Ratings**
- Customer/worker can rate a completed booking
- Worker's average rating auto-recalculates from all their ratings

**Admin Dashboard**
- List/filter all bookings by status
- Summary analytics: total bookings, total revenue, active/pending worker counts
- Demand-forecast connector route ready — calls out to the AI/ML teammate's service once it exists, fails gracefully if it's not running yet

**Database**
- Real PostgreSQL, hosted on Supabase — data persists permanently (verified live in Table Editor)
- Matches the team's `Database-Schema-V1.md` schema

---

## ❌ Not Implemented Yet

- **Real SMS/OTP delivery** — currently mocked (fixed code `123456`), no Twilio/Firebase connected
- **Real payment gateway** — currently mocked as instantly "paid," no Razorpay connected
- **Receipts/invoices** — payments are recorded as data rows only; no PDF or formatted receipt is generated
- **AI/demand-forecasting logic itself** — the connector route exists on the backend side, but the actual ML service is a separate teammate's work, not yet built
- **Frontend** — no UI yet; everything so far is tested via Postman/PowerShell/curl directly against the API
- **PostGIS-based geo search** — using a simpler distance formula (haversine) instead of PostGIS's native radius queries; same results, less infrastructure
- **Admin/worker self-registration flows beyond the current spec** — e.g. password reset, editing certificates after submission

---

## 🔮 Possible Future Additions

- Connect real Razorpay payments + auto-generate a proper receipt/invoice after each payment
- Connect real OTP delivery via Twilio or Firebase Auth
- Swap haversine distance for PostGIS if we need more advanced geo features later (route distance, service-area polygons, etc.)
- Add password reset / account recovery flows
- Add push notifications (booking accepted, worker en route, etc.) once a frontend exists
- Add rate-limiting / abuse protection on OTP requests
- Deploy backend to Render/Railway so it's reachable outside localhost
