# Build-Process.md

## Cooperative Gig Services Platform — Complete Build Process (Start to Final Project)

This is the master playbook covering the entire lifecycle: setup → V1 build → demo/submission → V2 (if needed) → beyond. Follow phases in strict order within a version. Do not start a phase until the previous one's checklist is fully ticked.

---

## PART A — PROJECT START

### Phase 0 — Repo & Context Setup

- [ ] Create repo with structure:
```
cooperative-gig-platform/
├── docs/
│   ├── README-Index.md
│   ├── TechStack-V1-Scope.md
│   ├── TechStack-V2-Scope.md
│   ├── Risk-Register.md
│   ├── Database-Schema-V1.md
│   ├── API-Spec-V1.md
│   └── Build-Process.md
├── backend/
├── mobile/
├── admin-dashboard/
└── ai-service/
```
- [ ] Place all base docs into `/docs`
- [ ] `git init`, commit docs as the first commit (before any code)
- [ ] Set up `.gitignore` (node_modules, .env, build artifacts, `.dart_tool/`)
- [ ] Create `.env.example` listing required environment variables (DB URL, Razorpay keys, Firebase keys, Maps API key) — never commit real `.env`
- [ ] Set up basic CI stub (even just "run tests on push") — expand later, don't skip having the placeholder

---

## PART B — VERSION 1 BUILD

### Phase 1 — Foundation (Non-Negotiable Order)

- [ ] Spin up PostgreSQL + PostGIS (Docker Compose recommended)
- [ ] Generate migrations directly from `Database-Schema-V1.md` — don't let the AI tool invent its own schema
- [ ] Run migrations, confirm all V1 tables exist with correct indexes
- [ ] Build Auth module alone: OTP request/verify (customer/worker), admin email+password login, JWT issuance
- [ ] Test auth in isolation via curl/Postman before writing any other backend code
- [ ] Confirm JWT middleware correctly blocks unauthenticated requests on a dummy protected route

**Gate check:** Do not proceed to Phase 2 until a valid token can be obtained and is correctly accepted/rejected.

### Phase 2 — Core Loop (Vertical Slices, One at a Time)

Build and manually test each slice fully before starting the next. Reference `API-Spec-V1.md` for exact endpoint contracts.

- [ ] **Slice 1:** Federation admin creates worker record (name, phone, skill category, Skill India certificate number) → admin manually verifies certificate against the official Skill India portal → admin approves → worker activates account via OTP on first login
- [ ] **Slice 2:** Customer registration → nearby-worker search (test PostGIS radius query with real dummy coordinates)
- [ ] **Slice 3:** Booking creation → worker accept/reject → re-match on reject
- [ ] **Slice 4:** Two-sided completion → Razorpay payment (test mode) → commission split
  - [ ] Deliberately test failure paths: cancel mid-payment, only one side confirms completion, split failure
- [ ] **Slice 5:** Ratings (both directions, updates worker `avg_rating`)

**Gate check:** Entire backend core loop works end-to-end via API calls alone, before any UI exists.

### Phase 3 — Interfaces

- [ ] Admin dashboard (React) — worker list/approval, bookings table, basic analytics summary
- [ ] Mobile app — customer flow first (browse → book → pay → rate)
- [ ] Mobile app — worker flow (view bookings → accept/reject → mark complete)
- [ ] Multilingual strings (EN + at least 1 regional language) — do this last, once UI text is stable

### Phase 4 — Guardrails (Apply Throughout, Not a One-Time Step)

- [ ] Before accepting any AI-suggested feature, check it against "Deferred to V2+" in `TechStack-V1-Scope.md`
- [ ] Any newly discovered risk during coding gets added to `Risk-Register.md` immediately
- [ ] Commit after every completed slice, not in large batches
- [ ] Federation-scoped tables always carry `federation_id`, even with one federation live
- [ ] Every completion/payment code path re-checked against Risk Register #3 and #8 before merging

### Phase 5 — Testing & Hardening

- [ ] Write basic integration tests for auth, booking creation, and payment flow (even minimal ones — not optional)
- [ ] Manually attempt to break each high-impact risk from `Risk-Register.md` (fake booking spam, split failure, impersonation) and confirm mitigations hold
- [ ] Run through V1 Success Criteria checklist (from `TechStack-V1-Scope.md`) top to bottom
- [ ] Fix any failing criteria before moving to Phase 6 — do not defer known-broken items to "later"

### Phase 6 — Deployment (V1)

- [ ] Deploy backend to a cloud instance (AWS/GCP) — even a single small instance is fine for demo purposes
- [ ] Point mobile app builds at the deployed backend URL (not localhost) at least once before demo day
- [ ] Deploy admin dashboard (Vercel/Netlify/S3+CloudFront or similar)
- [ ] Set up Razorpay in test mode with real test credentials (not mocked responses) for the deployed build
- [ ] Confirm HTTPS is enforced everywhere real user data (location, phone, payment) is transmitted

### Phase 7 — Demo Preparation

- [ ] Seed realistic demo data (real regional coordinates, varied worker categories, believable names)
- [ ] Dry-run full demo script at least twice: register worker → approve → book → accept → pay → rate
- [ ] Confirm admin dashboard reflects demo data accurately in real time
- [ ] Prepare fallback plan for live-demo failure (recorded backup video/screenshots)
- [ ] Prepare a 1-slide architecture diagram + 1-slide risk-register summary for judges — shows depth beyond just the working app

### Phase 8 — Submission / Final V1 Deliverable

- [ ] Freeze `main` branch — tag this commit as `v1.0`
- [ ] Ensure `/docs` folder is up to date and matches what was actually built (update any doc that drifted during coding)
- [ ] Write a short `SUBMISSION.md` (or reuse README) — problem statement, solution summary, tech stack, screenshots/demo link
- [ ] Package/export whatever the submission format requires (repo link, video demo, pitch deck)

**This completes the final V1 project.** Everything below is only needed if the project continues beyond V1 (next hackathon round, further development, or personal continuation).

---

## PART C — VERSION 2 (ONLY IF THE PROJECT CONTINUES)

### Phase 9 — V2 Scope Activation

- [ ] Confirm V1 is stable and `v1.0` tag exists before starting anything here
- [ ] Open `TechStack-V2-Scope.md` — this is the authoritative V2 boundary, already prepared
- [ ] Re-open `Risk-Register.md`, review all V2-tagged rows — these define what V2 must account for
- [ ] Fork schema: create `Database-Schema-V2.md` adding `insurance_policies`, `welfare_claims`, `disputes`, multi-federation cross-references, `offline_sync_queue`
- [ ] Fork API spec: create `API-Spec-V2.md` adding the new endpoints these features require

### Phase 10 — V2 Feature Build (Vertical Slices Again)

Build in this order, per `TechStack-V2-Scope.md`:
- [ ] Live GPS tracking + real-time ETA (replaces static ETA)
- [ ] Emergency/on-demand instant booking
- [ ] AI demand forecasting microservice — connect live (already isolated in V1 architecture)
- [ ] Worker welfare & insurance module
- [ ] Dispute resolution workflow
- [ ] Multi-federation tenancy
- [ ] Offline-mode / SMS fallback booking
- [ ] Automated (OCR/AI) document verification

Each feature: build → test in isolation → update Risk Register → commit → then move to next.

### Phase 11 — V2 Guardrails & Regression

- [ ] Every V2 feature added must update `Risk-Register.md` with new threats it introduces before merge
- [ ] Re-run full V1 regression tests before shipping any V2 feature — V2 must not break the core loop
- [ ] Run through V2 Success Criteria checklist (from `TechStack-V2-Scope.md`)

### Phase 12 — V2 Deployment & Submission

- [ ] Same deployment steps as Phase 6, applied to the updated system
- [ ] Tag release as `v2.0`
- [ ] Update `/docs` to reflect final V2 state

---

## PART D — VERSION 3+ (REPEATABLE PATTERN)

For any future version beyond V2:
- [ ] Review current Risk Register for deferred/unaddressed items
- [ ] Write a new `TechStack-VX-Scope.md` with explicit in/out list (mirror V1/V2 format)
- [ ] Fork schema and API docs if structural changes are needed
- [ ] Build in vertical slices, gate-checking after each
- [ ] Update Risk Register with new threats introduced by new features
- [ ] Full regression test of all previous versions' core flows before demo/release
- [ ] Tag release as `vX.0`

---

## Golden Rules (All Versions, Always)

1. **Docs before code.** Every version starts with an updated scope doc, not a coding session.
2. **One vertical slice at a time.** Never build breadth-first across features.
3. **Nothing ships without hitting its version's gate check.**
4. **Every new risk gets written down the moment it's discovered**, not after the fact.
5. **Regression-test old versions' core loops whenever a new version is built on top.**
6. **Docs are updated to match reality** — if the build drifted from the doc during coding, fix the doc before tagging a release, not after.
