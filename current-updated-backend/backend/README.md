# Cooperative Gig Services Platform — V1 Backend

Built for SIH PS26089. Covers the **entire V1 core loop** end-to-end,
backed by a real Supabase PostgreSQL database — no frontend needed to
demo it, use curl/Postman/PowerShell or the script below.

## What's real vs. mocked

| Piece | In this build | Why |
|---|---|---|
| Database | **Real PostgreSQL, hosted on Supabase** (`db/database.js`, via `pg` pooled connection) | Data persists permanently — verified live in Supabase's Table Editor. |
| Geo radius search | Haversine formula (plain JS) | Same input/output as a PostGIS radius query, no DB extension needed. |
| OTP / SMS | Mocked — code is **always `123456`**, printed to console | No Firebase/Twilio account needed yet. Swap `utils/otp.js` later. |
| Payments | Mocked — `/payments/initiate` marks paid instantly | No Razorpay keys needed yet. Swap the block in `routes/payments.js` later — response shape already matches Razorpay's pattern (commission split, payment record). |
| Everything else (auth flow, roles, two-sided completion, ratings, admin approval gate) | **Real, fully working** | This is the actual business logic your judges will care about. |

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in `backend/` (never commit this — it's in `.gitignore`) with your Supabase connection string:
   ```
   DATABASE_URL=postgresql://postgres.<project_ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```
   Use the **Transaction pooler** connection string from Supabase (Project Settings → Database), not the direct connection — the direct one only resolves over IPv6 and will fail with `getaddrinfo ENOENT` on most networks.
3. Start the server:
   ```bash
   npm start
   ```

Server starts at `http://localhost:5000`. On first run it seeds one
federation and one admin login (only if the `federations` table is empty):

- **Admin email:** `admin@demo.com`
- **Admin password:** `admin123`

## Verifying data is really persisting

Open your Supabase dashboard → **Table Editor** → pick any table
(`workers`, `bookings`, etc.) → the rows you create via the API appear
there, live. This is real, permanent storage — not a local file that
resets on restart.

## Full demo script

Windows PowerShell: run `demo.ps1` in this folder (`.\demo.ps1`).
Mac/Linux/Git Bash: see the equivalent curl sequence below.

```bash
BASE=http://localhost:5000/api/v1

# 1. Admin logs in
ADMIN_TOKEN=$(curl -s -X POST $BASE/auth/admin/login -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"admin123"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.token))")

# 2. Admin creates a worker (use a unique phone each run — real data persists!)
WORKER_ID=$(curl -s -X POST $BASE/admin/workers -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"full_name":"Ramesh Kumar","phone":"+919876543210","skill_category":"electrician","skill_certificate_number":"NSDC12345"}' \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.id))")

# 3. Admin verifies certificate, then approves
curl -s -X PATCH $BASE/admin/workers/$WORKER_ID/verify-certificate -H "Authorization: Bearer $ADMIN_TOKEN"
curl -s -X PATCH $BASE/admin/workers/$WORKER_ID/verify -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"decision":"approved"}'

# 4. Worker logs in via OTP (always 123456 in this build) and sets location
curl -s -X POST $BASE/auth/otp/request -H "Content-Type: application/json" -d '{"phone":"+919876543210","role":"worker"}'
WORKER_TOKEN=$(curl -s -X POST $BASE/auth/otp/verify -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","code":"123456","role":"worker"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.token))")
curl -s -X PATCH $BASE/workers/me -H "Content-Type: application/json" -H "Authorization: Bearer $WORKER_TOKEN" -d '{"lat":22.5726,"lng":88.3639}'

# 5. Customer logs in via OTP
curl -s -X POST $BASE/auth/otp/request -H "Content-Type: application/json" -d '{"phone":"+919000011111","role":"customer"}'
CUST_TOKEN=$(curl -s -X POST $BASE/auth/otp/verify -H "Content-Type: application/json" \
  -d '{"phone":"+919000011111","code":"123456","role":"customer"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.token))")

# 6. Customer searches nearby, books (auto-matches nearest approved worker)
curl -s "$BASE/workers/nearby?lat=22.57&lng=88.36&skill_category=electrician&radius_km=10"
BOOKING_ID=$(curl -s -X POST $BASE/bookings -H "Content-Type: application/json" -H "Authorization: Bearer $CUST_TOKEN" \
  -d '{"skill_category":"electrician","service_address":"12 Park Street, Kolkata","service_lat":22.57,"service_lng":88.36,"scheduled_time":"2026-08-29T10:00:00Z"}' \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.id))")

# 7. Worker accepts
curl -s -X PATCH $BASE/bookings/$BOOKING_ID/accept -H "Authorization: Bearer $WORKER_TOKEN"

# 8. Two-sided completion (both must confirm)
curl -s -X PATCH $BASE/bookings/$BOOKING_ID/complete -H "Authorization: Bearer $CUST_TOKEN"
curl -s -X PATCH $BASE/bookings/$BOOKING_ID/complete -H "Authorization: Bearer $WORKER_TOKEN"

# 9. Payment
curl -s -X POST $BASE/payments/initiate -H "Content-Type: application/json" -H "Authorization: Bearer $CUST_TOKEN" \
  -d "{\"booking_id\":\"$BOOKING_ID\",\"amount\":500}"

# 10. Rating
curl -s -X POST $BASE/ratings -H "Content-Type: application/json" -H "Authorization: Bearer $CUST_TOKEN" \
  -d "{\"booking_id\":\"$BOOKING_ID\",\"rating\":5,\"comment\":\"Great work\"}"

# 11. Admin dashboard summary
curl -s $BASE/admin/analytics/summary -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Note:** because data now persists for real, re-running this script
with the same phone numbers will fail on step 2 (`DUPLICATE_PHONE`).
Either change the phone number each run, or clear test rows in
Supabase's SQL Editor first:
```sql
DELETE FROM ratings;
DELETE FROM payments;
DELETE FROM bookings;
DELETE FROM workers;
DELETE FROM customers;
```
(This clears test data but leaves `federations`/`admins` untouched, so your admin login keeps working.)

## What to say to judges

"Backend implements the full V1 core loop from our API spec — worker
onboarding with Skill India certificate verification, geo-matched
booking, fraud-resistant two-sided completion, commission-split
payments, and ratings — backed by a real PostgreSQL database on
Supabase. OTP and payment gateways are mocked for the demo since we
don't have live Twilio/Razorpay accounts yet, but the API contracts
and business logic are unchanged, so it's a drop-in swap post-hackathon."

## If you have extra time before submission

- Deploy the backend itself to Render/Railway (free tier, ~10 min) so
  it's not just localhost — bonus points for judges.
- Point Postman at it and save a collection instead of curl, easier
  to click through live.
- Add an `AI_SERVICE_URL` in `.env` once the AI/ML teammate's demand-forecast service is running (see `routes/admin.js`).


```bash
BASE=http://localhost:5000/api/v1

# 1. Admin logs in
ADMIN_TOKEN=$(curl -s -X POST $BASE/auth/admin/login -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"admin123"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.token))")

# 2. Admin creates a worker
WORKER_ID=$(curl -s -X POST $BASE/admin/workers -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"full_name":"Ramesh Kumar","phone":"+919876543210","skill_category":"electrician","skill_certificate_number":"NSDC12345"}' \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.id))")

# 3. Admin verifies certificate, then approves
curl -s -X PATCH $BASE/admin/workers/$WORKER_ID/verify-certificate -H "Authorization: Bearer $ADMIN_TOKEN"
curl -s -X PATCH $BASE/admin/workers/$WORKER_ID/verify -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"decision":"approved"}'

# 4. Worker logs in via OTP (always 123456 in this build) and sets location
curl -s -X POST $BASE/auth/otp/request -H "Content-Type: application/json" -d '{"phone":"+919876543210","role":"worker"}'
WORKER_TOKEN=$(curl -s -X POST $BASE/auth/otp/verify -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","code":"123456","role":"worker"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.token))")
curl -s -X PATCH $BASE/workers/me -H "Content-Type: application/json" -H "Authorization: Bearer $WORKER_TOKEN" -d '{"lat":22.5726,"lng":88.3639}'

# 5. Customer logs in via OTP
curl -s -X POST $BASE/auth/otp/request -H "Content-Type: application/json" -d '{"phone":"+919000011111","role":"customer"}'
CUST_TOKEN=$(curl -s -X POST $BASE/auth/otp/verify -H "Content-Type: application/json" \
  -d '{"phone":"+919000011111","code":"123456","role":"customer"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.token))")

# 6. Customer searches nearby, books (auto-matches nearest approved worker)
curl -s "$BASE/workers/nearby?lat=22.57&lng=88.36&skill_category=electrician&radius_km=10"
BOOKING_ID=$(curl -s -X POST $BASE/bookings -H "Content-Type: application/json" -H "Authorization: Bearer $CUST_TOKEN" \
  -d '{"skill_category":"electrician","service_address":"12 Park Street, Kolkata","service_lat":22.57,"service_lng":88.36,"scheduled_time":"2026-08-29T10:00:00Z"}' \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.id))")

# 7. Worker accepts
curl -s -X PATCH $BASE/bookings/$BOOKING_ID/accept -H "Authorization: Bearer $WORKER_TOKEN"

# 8. Two-sided completion (both must confirm)
curl -s -X PATCH $BASE/bookings/$BOOKING_ID/complete -H "Authorization: Bearer $CUST_TOKEN"
curl -s -X PATCH $BASE/bookings/$BOOKING_ID/complete -H "Authorization: Bearer $WORKER_TOKEN"

# 9. Payment
curl -s -X POST $BASE/payments/initiate -H "Content-Type: application/json" -H "Authorization: Bearer $CUST_TOKEN" \
  -d "{\"booking_id\":\"$BOOKING_ID\",\"amount\":500}"

# 10. Rating
curl -s -X POST $BASE/ratings -H "Content-Type: application/json" -H "Authorization: Bearer $CUST_TOKEN" \
  -d "{\"booking_id\":\"$BOOKING_ID\",\"rating\":5,\"comment\":\"Great work\"}"

# 11. Admin dashboard summary
curl -s $BASE/admin/analytics/summary -H "Authorization: Bearer $ADMIN_TOKEN"
```

## What to say to judges

"Backend implements the full V1 core loop from our API spec — worker
onboarding with Skill India certificate verification, geo-matched
booking, fraud-resistant two-sided completion, commission-split
payments, and ratings. For the hackathon demo we swapped Postgres for
SQLite and mocked OTP/payment gateways to move fast — the API
contracts and business logic are unchanged, so it's a drop-in swap
post-hackathon." This is honest and actually sounds *good* — it shows
you understood the architecture enough to know what's safe to mock.

## If you have extra time before submission

- Deploy to Render/Railway (free tier, ~10 min) so it's not just
  localhost — bonus points for judges.
- Point Postman at it and save a collection instead of curl, easier
  to click through live.
