# TechStack-V2-Scope.md

## Cooperative Gig Services Platform — Version 2 Scope

**Do not open this document's build steps until `TechStack-V1-Scope.md`'s Success Criteria checklist is fully ticked and the V1 demo is stable.** V2 builds on top of the V1 core loop — it does not replace it.

---

## 1. Additional/Updated Tech Stack for V2

| Layer | Addition | Why |
|---|---|---|
| **Real-time layer** | WebSockets (Socket.IO) or Firebase Realtime DB | Live GPS tracking during active bookings |
| **AI/Forecasting** | Same Python microservice, now connected live (not stubbed) | Demand forecasting + workforce allocation surfaced to admin dashboard |
| **Insurance/Welfare** | Third-party insurer API integration (TBD based on federation's insurer) | Enrollment + claims workflow |
| **SMS Fallback** | Twilio/MSG91 | Offline/low-connectivity booking confirmations |
| **Document AI** | AWS Textract / Google Document AI (OCR) | Automated certificate/ID verification |
| **Multi-tenancy** | Row-level security (Postgres RLS) or strict `federation_id` query scoping | Isolate data across multiple onboarded federations |

---

## 2. Version 2 — What's IN

1. **Live GPS Tracking** — real-time worker location during active booking, replacing static ETA
2. **Emergency/On-Demand Booking** — instant booking flow with priority matching and possible surge logic
3. **AI Demand Forecasting (Live)** — admin dashboard surfaces predicted demand hotspots, suggests worker reallocation
4. **Worker Welfare & Insurance** — enrollment, contribution tracking, claims submission/status
5. **Dispute Resolution Workflow** — complaint submission, evidence upload (photos), admin review states, resolution actions (refund/warning/suspension)
6. **Multi-Federation Tenancy** — self-serve federation onboarding, strict cross-tenant data isolation, federation-level branding
7. **Offline/SMS Fallback** — SMS-based booking confirmation and status updates for low-connectivity workers
8. **Automated Document Verification** — OCR-based certificate/ID checks to speed up (not replace) admin approval

### ❌ Still Deferred (V3+)

- Advanced fraud-detection ML (beyond rule-based checks)
- In-app worker training/certification modules
- Cross-federation worker lending/sharing agreements
- Advanced analytics/BI dashboards beyond basic summaries

---

## 3. V2 Success Criteria (Checklist)

- [ ] Live tracking visible to customer during an active booking, with consent screen shown before tracking starts
- [ ] Emergency booking successfully matches a worker within a defined time SLA (e.g., under 5 minutes in testing)
- [ ] Admin dashboard shows AI-forecasted demand hotspots for at least 2 regions
- [ ] A worker can enroll in insurance and submit a test claim
- [ ] A dispute can be raised, reviewed by admin, and resolved with a recorded outcome
- [ ] A second federation can onboard and confirm it cannot see the first federation's workers/bookings
- [ ] A booking made via SMS fallback successfully creates a record once connectivity resumes
- [ ] OCR verification correctly flags a mismatched/invalid document in testing

---

## 4. New Risks Introduced by V2 (cross-reference `Risk-Register.md`)

Every feature above must have a corresponding row in `Risk-Register.md` before merge — see rows #18–22 already seeded there as placeholders. Update likelihood/mitigation as each feature is actually built, and add new rows for anything not already anticipated (e.g., SLA-miss handling for emergency bookings, insurer data-sharing compliance).
