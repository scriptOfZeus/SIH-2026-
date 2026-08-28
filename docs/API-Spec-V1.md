# API-Spec-V1.md

## Cooperative Gig Services Platform — V1 REST API

Base URL (dev): `http://localhost:5000/api/v1`
Auth: JWT via phone-OTP login (customer/worker), email+password (admin). All authenticated routes require `Authorization: Bearer <token>`.

---

## Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/otp/request` | Request OTP for a phone number. For workers, the phone must already exist on an admin-created record — unknown numbers are rejected |
| POST | `/auth/otp/verify` | Verify OTP, returns JWT. First successful verify sets `account_activated = true` for a worker |
| POST | `/auth/admin/login` | Admin email+password login, returns JWT |

**Note:** There is no customer-facing worker self-registration endpoint. Workers cannot create their own accounts under any circumstance in V1.

## Workers

| Method | Endpoint | Description |
|---|---|---|
| POST | `/admin/workers` | **Admin only** — create a worker record: name, phone, skill_category, skill_certificate_number |
| PATCH | `/admin/workers/:id/verify-certificate` | **Admin only** — mark `skill_certificate_verified = true` after manually checking the number/QR on the Skill India portal |
| PATCH | `/admin/workers/:id/verify` | **Admin only** — approve/reject the worker overall (blocked until certificate is verified) |
| GET | `/workers/me` | Worker gets own profile (requires activated account) |
| PATCH | `/workers/me` | Worker updates own location (not name/phone/certificate — those are admin-controlled) |
| GET | `/workers/nearby` | Query params: `lat, lng, skill_category, radius_km` → list of matching approved workers |

## Customers

| Method | Endpoint | Description |
|---|---|---|
| POST | `/customers/register` | Create customer profile (post-OTP verify) |
| GET | `/customers/me` | Get own profile |
| PATCH | `/customers/me` | Update profile/default address |

## Bookings

| Method | Endpoint | Description |
|---|---|---|
| POST | `/bookings` | Customer creates a booking (category, address, scheduled_time) |
| GET | `/bookings/:id` | Get booking detail |
| GET | `/bookings/mine` | List bookings for logged-in customer or worker |
| PATCH | `/bookings/:id/accept` | Worker accepts a booking |
| PATCH | `/bookings/:id/reject` | Worker rejects a booking (triggers re-match) |
| PATCH | `/bookings/:id/complete` | Mark booking complete (requires both-side confirmation) |
| PATCH | `/bookings/:id/cancel` | Customer or worker cancels (before completion) |

**Completion flow (fraud mitigation):**
`complete` requires two calls — one from customer, one from worker — before status flips to `completed` and payment is released. Tracked via `completed_by_customer` and `completed_by_worker` fields on the booking.

## Payments

| Method | Endpoint | Description |
|---|---|---|
| POST | `/payments/initiate` | Create Razorpay order for a booking |
| POST | `/payments/webhook` | Razorpay webhook — confirms payment, triggers commission split |
| GET | `/payments/:booking_id` | Get payment status/invoice for a booking |

## Ratings

| Method | Endpoint | Description |
|---|---|---|
| POST | `/ratings` | Submit rating (booking_id, rated_by, rating, comment) |
| GET | `/ratings/worker/:worker_id` | Get all ratings for a worker (feeds avg_rating) |

## Admin Dashboard

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/workers` | List all workers in federation, filter by verification_status |
| GET | `/admin/bookings` | List all bookings, filter by status/date range |
| GET | `/admin/analytics/summary` | Basic counts: total bookings, revenue, active workers |

---

## Standard Response Envelope

```json
{
  "success": true,
  "data": { },
  "error": null
}
```

On failure:
```json
{
  "success": false,
  "data": null,
  "error": { "code": "BOOKING_NOT_FOUND", "message": "Booking does not exist" }
}
```

## Deliberately Excluded from V1 API (see API-Spec-V2.md when created)

- `/bookings/emergency` — instant/on-demand booking
- `/insurance/*`, `/welfare/*`
- `/disputes/*`
- `/federations` CRUD — V1 assumes one federation seeded directly in DB
- Live tracking WebSocket/streaming endpoint — V1 uses static ETA only
