# TechStack-V1-Scope.md

## Cooperative Gig Services Platform — Tech Stack & Version 1 (MVP) Definition

This document defines the **finalized tech stack** and the **exact feature boundary** for Version 1, so the build stays scoped and demo-able within hackathon timelines.

---

## 1. Finalized Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Mobile App (Customer + Worker)** | Flutter | Single codebase for Android/iOS, fast to prototype, good for multilingual UI |
| **Admin Dashboard (Federation)** | React.js + Tailwind CSS | Fast to build, easy charts/tables for admin analytics |
| **Backend API** | Node.js + Express (or NestJS) | Fast REST API development, large ecosystem, easy JSON handling |
| **Database** | PostgreSQL + PostGIS | Relational integrity for bookings/payments + native geo-query support |
| **Authentication** | Firebase Auth / JWT | OTP-based login for low digital-literacy users |
| **Geo-Matching** | PostGIS radius queries + Google Maps API | Nearest-worker search, live tracking, distance/ETA |
| **AI/Demand Forecasting** | Python microservice (scikit-learn / Prophet) | Kept separate from core backend; called via internal API |
| **Payments** | Razorpay (UPI, cards, wallets) | India-first, supports split payments for cooperative commission |
| **Notifications** | Firebase Cloud Messaging + SMS fallback (Twilio/MSG91) | Push + SMS for low-connectivity workers |
| **Cloud Hosting** | AWS (EC2/RDS/S3) or GCP equivalents | Standard, scalable, judge-familiar |
| **File/Media Storage** | AWS S3 | Certification documents, profile photos |

**Note:** AI service is deliberately a separate microservice — keeps the core booking/payment flow stable and demo-safe even if the ML component is still being tuned.

---

## 2. Version 1 (MVP) — What's IN

The goal of V1 is a **working, demoable core loop**: a customer books a verified worker, the worker accepts and completes the job, payment happens, and both rate each other. Everything else is V2+.

### ✅ Included in V1

1. **Worker Registration & Verification** — federation admin creates worker records directly (no self-registration); worker only activates the account via phone OTP afterward
2. **Skill India Certificate Verification** — worker must hold a valid Skill India/NSDC certificate; admin manually checks the certificate number/QR against the official Skill India verification portal before approving
3. **Skill Profiling** — fixed category list, single skill tag per worker, linked to the verified certificate's trade
3. **Customer Booking & Scheduling** — browse by category → view nearby workers → book a time slot
4. **Geo-Location Matching** — radius-based nearest-worker search (PostGIS), static distance-based ETA
5. **Digital Payments & Invoicing** — Razorpay one-time payment per booking, auto-generated simple invoice
6. **Ratings & Feedback** — 5-star + comment, both directions
7. **Federation Admin Dashboard (Basic)** — view workers, approve/reject, view bookings/revenue
8. **Multilingual UI** — at least 2 languages (English + 1 regional)

### ❌ Deferred to V2+ (explicitly out of scope for V1)

- AI-based demand forecasting and workforce auto-allocation
- Worker welfare/insurance enrollment and claims workflow
- Emergency/on-demand instant booking (V1 is scheduled-only)
- Live GPS tracking during service (V1 uses static ETA only)
- Dispute resolution workflow with evidence upload
- Multi-federation SaaS tenancy (V1 assumes a single federation/pilot)
- Offline-mode/SMS-based booking fallback
- Automated document verification (OCR/AI-based certificate checks)

---

## 3. V1 Success Criteria (Demo Checklist)

- [ ] A federation admin can create a worker record with a Skill India certificate number, manually verify it against the official portal, approve it, and the worker appears as bookable
- [ ] A worker can activate their account via phone OTP after the admin has created their record (cannot register independently)
- [ ] A customer can search by category, see nearby workers, and book a slot
- [ ] Worker can accept/reject a booking from their app
- [ ] Payment completes end-to-end via Razorpay test mode
- [ ] Both parties can rate each other post-completion
- [ ] Admin dashboard shows live worker list + booking count
- [ ] App UI available in at least 2 languages

---

## 4. Path from V1 → V2

Once the core loop is proven, priority order for V2 (see `TechStack-V2-Scope.md` for full detail):
1. Live GPS tracking + real-time ETA
2. Emergency/on-demand booking
3. AI demand forecasting microservice (already isolated in V1 architecture)
4. Insurance/welfare module
5. Dispute resolution workflow
6. Multi-federation tenancy
7. Offline/SMS fallback
8. Automated document verification
