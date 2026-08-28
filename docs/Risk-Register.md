# Risk-Register.md

## Cooperative Gig Services Platform — Risk Register (All Versions)

| # | Threat | Category | Impact | Likelihood (V1) | Version | Mitigation |
|---|---|---|---|---|---|---|
| 1 | Geo-matching query slowdown at scale | Technical | Medium | Low | V1 | GiST index on location columns; capped search radius |
| 2 | Matching engine single point of failure | Technical | High | Low | V1 | Manual admin-assign fallback path documented |
| 3 | Payment succeeds but commission split fails | Technical | High | Medium | V1 | Log payment + split as separate transactional steps; reconcile via admin dashboard |
| 4 | AI forecasting model drift | Technical | Low | N/A | V2 | Retraining cadence defined once model is live |
| 5 | Worker identity impersonation at registration | Security | High | Medium | V1 | Federation admin creates worker records directly (no self-registration); worker only activates via OTP on an existing record |
| 5b | Skill India certificate verification is manual/portal-based, no public developer API confirmed | Operational | Medium | Medium | V1 | Admin manually checks cert number/QR on official Skill India/NSDC portal before approval; record `skill_certificate_verified_at` timestamp for audit trail; flag "verification in process" cases for admin follow-up rather than auto-approving |
| 5c | Admin approves a worker on a fabricated/mismatched certificate number (human error) | Security | Medium | Medium | V1 | Require certificate number to be entered exactly as shown on portal result; spot-check a sample of approvals periodically; log which admin verified each certificate |
| 6 | Fake/spam bookings harassing workers | Security | Medium | Medium | V1 | Booking rate-limit per customer account; cancellation tracking |
| 7 | Location/address data exposure via API | Security | High | Medium | V1 | Role-based API access; only assigned worker sees address, only during active booking |
| 8 | Fraudulent "job completed" confirmation | Security | Medium | Medium | V1 | Require both customer + worker confirmation before payout release |
| 9 | Cold-start: no workers or no customers at launch | Business | High | High | V1 | Seed with single pilot federation's existing worker base before customer-facing launch |
| 10 | Cooperative/worker resistance to digital platform | Business | Medium | Medium | V1 | Involve federation admins early; simple UI, local-language onboarding |
| 11 | Private platforms poaching verified workers | Business | Medium | Low | V1/V2 | Noted as competitive-moat discussion; not solvable at MVP stage |
| 12 | Inter-federation disputes over shared workers/customers | Business | Low | N/A | V2 | Governance rules defined at multi-tenancy design stage |
| 13 | DPDP Act 2023 non-compliance (consent, retention) | Regulatory | High | Medium | V1 | Explicit consent screen for location tracking; auto-delete location history post-booking |
| 14 | Gig-worker legal classification ambiguity | Regulatory | Medium | Low | V1 | Frame workers as existing cooperative members, not new gig-classified workers |
| 15 | Payment KYC/RBI compliance gaps | Regulatory | Medium | Low | V1 | Delegate KYC to Razorpay's built-in compliance layer |
| 16 | Worker quality degrades post-verification | Operational | Medium | Medium | V1 | Recurring rating threshold; flag low performers for admin review |
| 17 | Worker no-shows after accepting booking | Operational | Medium | Medium | V1 | Cancellation penalty + reliability score visible to admin |
| 18 | Offline/low-connectivity worker access failure | Operational | Medium | Medium (real-world) | V2 | SMS fallback planned; out of scope for V1 demo |
| 19 | Live GPS tracking privacy exposure | Security | High | N/A | V2 | Consent-scoped tracking, active-booking-only visibility, encrypted transit |
| 20 | Multi-federation data leakage (cross-tenant) | Security | High | N/A | V2 | Strict `federation_id` scoping at query layer; tenant isolation tests |
| 21 | Emergency booking queue abuse | Operational | Medium | N/A | V2 | Pricing/penalty model for misuse of priority booking |
| 22 | Insurance claim fraud | Business | Medium | N/A | V2 | Third-party insurer verification workflow, not self-adjudicated |

---

## Risk Severity Summary (V1 scope only)

| Impact Level | Count |
|---|---|
| High | 6 |
| Medium | 9 |
| Low | 3 |

## Notes

- Rows marked **V2** are listed now for completeness — shows the panel/team these were considered upfront, not missed. They become "live" risks only once the corresponding V2 feature is actually built.
- This is a living document. Update Likelihood/Mitigation columns as development progresses and add new rows the moment a new risk is discovered — do not wait until a retrospective.
- Any new feature added mid-build (in any version) that touches **payments, location, or verification** must get a new row here before merging.
