# README-Index.md

## Cooperative Gig Services Platform for Household & Community Services (PS26089)

This is the entry point for vibe-coding this project. Read in this order.

---

## Document Map

| # | File | Purpose |
|---|---|---|
| 1 | `TechStack-V1-Scope.md` | Finalized tech stack + exact V1 feature boundary (in/out) |
| 2 | `Risk-Register.md` | Known threats across technical/security/business/regulatory/operational, with mitigations |
| 3 | `Database-Schema-V1.md` | Full V1 table definitions, relationships, indexing notes |
| 4 | `API-Spec-V1.md` | REST API endpoints, auth flow, response envelope, V1 exclusions |
| 5 | `Build-Process.md` | Full step-by-step build procedure, start to finish, across all versions |
| 6 | `TechStack-V2-Scope.md` | V2 feature boundary — only opened once V1 is stable and validated |

---

## Golden Rule for Vibe-Coding This Project

**Anything not explicitly listed under "Included in V1" in `TechStack-V1-Scope.md` does not get built right now.** If a feature feels tempting to add (live tracking, AI forecasting, insurance, disputes, multi-federation), check the "Deferred to V2+" list first — it's there on purpose, not an oversight. Once V1 ships, `TechStack-V2-Scope.md` takes over as the next boundary.

## Cross-Cutting Rules (apply throughout, all versions)

- Every table with federation-relevant data carries `federation_id`, even though V1 has only one federation — avoids a schema rewrite for V2 multi-tenancy.
- Booking completion requires **both-sided confirmation** before payment release.
- Location data access is role-based, not just hidden in the UI.
- Any new feature tempting to vibe-code beyond the current version's scope list gets a one-line entry added to `Risk-Register.md` first if it touches payments, location, or verification.

## Quick Links by Task

- Setting up the database? → `Database-Schema-V1.md`
- Building an endpoint? → `API-Spec-V1.md`
- Not sure if a feature belongs in V1? → `TechStack-V1-Scope.md`
- Found a new failure mode while coding? → log it in `Risk-Register.md`
- Not sure what to build next / what order? → `Build-Process.md`
- V1 is done and stable, starting V2? → `TechStack-V2-Scope.md`
