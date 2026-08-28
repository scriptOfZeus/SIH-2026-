# Database-Schema-V1.md

## Cooperative Gig Services Platform — V1 Data Model

PostgreSQL + PostGIS. Scoped strictly to V1 features (single federation, no multi-tenancy, no insurance/dispute modules yet — but `federation_id` is included from day one so V2 multi-tenancy doesn't require a rewrite).

---

## Tables

### `federations`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | TEXT | |
| region | TEXT | |
| created_at | TIMESTAMP | |

*(V1 will have exactly one row here — the pilot federation.)*

### `workers`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| federation_id | UUID (FK → federations.id) | |
| added_by_admin_id | UUID (FK → admins.id) | which admin created this record — workers never self-register |
| full_name | TEXT | entered by admin at creation |
| phone | TEXT (unique) | used for OTP account activation only, not registration |
| account_activated | BOOLEAN | default false; true once worker completes first OTP login |
| skill_category | TEXT | enum-like: electrician, plumber, cleaner, etc. — should match the trade on the certificate |
| skill_certificate_number | TEXT | Skill India/NSDC certificate number, entered by admin |
| skill_certificate_verified | BOOLEAN | default false; set true only after admin manually confirms via the official portal |
| skill_certificate_verified_at | TIMESTAMP | nullable, set when verified |
| verification_status | TEXT | `pending`, `approved`, `rejected` — should not move to `approved` until `skill_certificate_verified = true` |
| location | GEOGRAPHY(Point) | PostGIS point, last-known location |
| avg_rating | NUMERIC(2,1) | denormalized, updated on new rating |
| reliability_score | NUMERIC(3,2) | derived from no-show/cancellation history |
| created_at | TIMESTAMP | |

### `customers`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| full_name | TEXT | |
| phone | TEXT (unique) | OTP login |
| default_address | TEXT | |
| default_location | GEOGRAPHY(Point) | |
| created_at | TIMESTAMP | |

### `bookings`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| customer_id | UUID (FK → customers.id) | |
| worker_id | UUID (FK → workers.id) | nullable until matched |
| federation_id | UUID (FK → federations.id) | denormalized for admin queries |
| skill_category | TEXT | |
| status | TEXT | `requested`, `accepted`, `rejected`, `completed`, `cancelled` |
| scheduled_time | TIMESTAMP | V1 is scheduled-only, no instant/emergency |
| service_address | TEXT | |
| service_location | GEOGRAPHY(Point) | |
| estimated_distance_km | NUMERIC | static distance-based ETA input |
| completed_by_customer | BOOLEAN | default false, fraud mitigation |
| completed_by_worker | BOOLEAN | default false, fraud mitigation |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### `payments`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| booking_id | UUID (FK → bookings.id) | |
| amount | NUMERIC(10,2) | |
| platform_commission | NUMERIC(10,2) | |
| worker_payout | NUMERIC(10,2) | |
| status | TEXT | `pending`, `paid`, `failed`, `split_failed` |
| razorpay_payment_id | TEXT | |
| created_at | TIMESTAMP | |

### `ratings`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| booking_id | UUID (FK → bookings.id) | |
| rated_by | TEXT | `customer` or `worker` |
| rating | SMALLINT | 1–5 |
| comment | TEXT | nullable |
| created_at | TIMESTAMP | |

### `admins`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| federation_id | UUID (FK → federations.id) | |
| full_name | TEXT | |
| email | TEXT (unique) | |
| password_hash | TEXT | |
| created_at | TIMESTAMP | |

---

## Relationships (V1)

```
federations (1) ──< workers
federations (1) ──< admins
customers   (1) ──< bookings >── (1) workers
bookings    (1) ──< payments
bookings    (1) ──< ratings   (two rows max per booking: customer→worker, worker→customer)
```

## Deliberately Excluded from V1 Schema (see Database-Schema-V2.md when created)

- `insurance_policies`, `welfare_claims` tables
- `disputes` table
- Multi-federation cross-reference tables
- `offline_sync_queue`

## Indexing Notes for V1

- `workers.location` and `bookings.service_location` — GiST index (PostGIS) for radius queries
- `workers.phone`, `customers.phone` — unique index for OTP lookup
- `bookings.status` — index for admin dashboard filtering
