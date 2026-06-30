# Implementation Compliance Gate

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-GOV-002 |
| **Title** | Implementation Compliance Gate |
| **Category** | Implementation Governance |
| **Layer** | Level 1 — Governance |
| **Status** | ACCEPTED |
| **Version** | v1.0 |

---

## PURPOSE

Dokumen ini mendefinisikan pipeline yang WAJIB dilalui oleh setiap implementasi sebelum merge ke main branch dan deployment ke production. Pipeline ini memastikan setiap kode mematuhi EEOS Constitution.

---

## COMPLIANCE PIPELINE

```
TECHNICAL DESIGN → IMPLEMENTATION → UNIT TEST → INTEGRATION TEST
→ EEOS COMPLIANCE REVIEW → ARCHITECTURE REVIEW → MERGE → DEPLOYMENT
```

---

## STAGE 1: TECHNICAL DESIGN

| Field | Value |
|-------|-------|
| **Objective** | Mendesain solusi teknis berdasarkan EEOS Constitution |
| **Responsible** | AI Agent (Software Architect) |
| **Input** | EEOS document(s) yang relevan, ADR (jika ada) |
| **Output** | Technical Design Document (.md) berisi: approach, files to create/modify, database changes, API contract, risk assessment |
| **Exit Criteria** | Design tidak melanggar Foundation Lock, Constitution, atau Business Rule manapun |

### Checklist
- [ ] Design references specific EEOS document(s) and section(s)
- [ ] Design does not change Foundation
- [ ] Design follows Business Constitution (if applicable)
- [ ] Design follows AI Constitution (if AI-related)
- [ ] Design follows Integration Constitution (if integration-related)
- [ ] Database changes are additive (no existing table modifications without ADR)
- [ ] API follows API Response Standard
- [ ] Naming follows Naming Convention Standard

---

## STAGE 2: IMPLEMENTATION

| Field | Value |
|-------|-------|
| **Objective** | Menulis source code sesuai Technical Design |
| **Responsible** | AI Agent (Senior Engineer) |
| **Input** | Technical Design Document |
| **Output** | Source code changes (new files, modified files) |
| **Exit Criteria** | Build berhasil (`npm run build`), TypeScript strict lulus |

### Checklist
- [ ] Code follows Repository Pattern Standard
- [ ] No raw SQL (use Prisma Client typed API)
- [ ] No business rule hardcoded (reference EEOS instead)
- [ ] No Foundation Lock violation
- [ ] Environment variables follow Environment Constitution
- [ ] Audit trail implemented (if operation changes business state)
- [ ] Build succeeds with zero errors
- [ ] ESLint passes

---

## STAGE 3: UNIT TEST

| Field | Value |
|-------|-------|
| **Objective** | Menguji setiap unit secara terisolasi |
| **Responsible** | AI Agent (Quality Assurance) |
| **Input** | Implemented code |
| **Output** | Test results (pass/fail), coverage report |
| **Exit Criteria** | All unit tests pass, coverage ≥ target for new code |

### Checklist
- [ ] Business Engine: tested with sample inputs → correct outputs
- [ ] Repository: CRUD operations tested
- [ ] API routes: response format tested
- [ ] Validation: edge cases tested (null, invalid, boundary)
- [ ] Error handling: failure paths tested

---

## STAGE 4: INTEGRATION TEST

| Field | Value |
|-------|-------|
| **Objective** | Menguji integrasi antar komponen |
| **Responsible** | AI Agent (Quality Assurance) |
| **Input** | Unit-tested code |
| **Output** | Integration test results |
| **Exit Criteria** | All integration tests pass |

### Checklist
- [ ] Database: real Supabase connection tested
- [ ] API: end-to-end request → response tested
- [ ] OCR Gateway: provider rotation tested (if OCR-related)
- [ ] Google Drive: upload/download tested (if Drive-related)
- [ ] Auth: authenticated + unauthenticated paths tested

---

## STAGE 5: EEOS COMPLIANCE REVIEW

| Field | Value |
|-------|-------|
| **Objective** | Memverifikasi bahwa implementasi mematuhi EEOS |
| **Responsible** | AI Agent (Architecture Reviewer) |
| **Input** | Implemented code + EEOS documents |
| **Output** | Compliance Report: PASS or FAIL with violations listed |
| **Exit Criteria** | Zero EEOS violations |

### Compliance Checklist
- [ ] **Foundation Lock** intact — no changes to Identity, Manifest, Invoice, Operational State
- [ ] **Business Event** — every state change goes through Business Event (not direct DB update)
- [ ] **Auditability** — every business event creates audit trail
- [ ] **Historical Consistency** — no history deletion or overwriting
- [ ] **Idempotency** — duplicate event = NO-OP (if applicable)
- [ ] **Scope Guard** — no refactoring outside scope, no file changes without permission
- [ ] **No Silent Decision** — all architectural decisions are in ADR or EEOS document
- [ ] **Change Visibility** — changes to Foundation-trigger domains explicitly documented

### If FAIL:
- Implementation returned to developer with violation list
- Each violation must be resolved
- Re-review after fixes

---

## STAGE 6: ARCHITECTURE REVIEW

| Field | Value |
|-------|-------|
| **Objective** | Verifikasi arsitektur setelah implementasi |
| **Responsible** | AI Agent (Architecture Reviewer) |
| **Input** | EEOS-compliant code |
| **Output** | Architecture Review Report |
| **Exit Criteria** | No architectural regressions detected |

### Review Checklist
- [ ] No circular dependencies introduced
- [ ] No breaking changes to existing APIs
- [ ] Database schema consistent with Prisma schema (no drift)
- [ ] Performance: no N+1 queries, no missing indexes
- [ ] Security: no exposed secrets, RBAC enforced
- [ ] Scalability: no serverless-incompatible patterns (local fs, shell commands)

---

## STAGE 7: MERGE

| Field | Value |
|-------|-------|
| **Objective** | Merge implementation ke main branch |
| **Responsible** | AI Agent |
| **Input** | All previous stages PASS |
| **Output** | Merged code in main branch |
| **Exit Criteria** | Merge successful, no conflicts |

### Pre-Merge Checklist
- [ ] All 6 previous stages PASS
- [ ] Product Owner Approval (for Foundation-affecting changes)
- [ ] ADR accepted (if new ADR created)
- [ ] Git commit message references EEOS document(s) and ADR(s)

---

## STAGE 8: DEPLOYMENT

| Field | Value |
|-------|-------|
| **Objective** | Deploy ke Vercel |
| **Responsible** | Vercel auto-deploy (GitHub push → Vercel) |
| **Input** | Merged code |
| **Output** | Deployed application |
| **Exit Criteria** | Deployment status: Ready, health check passes |

### Post-Deploy Checklist
- [ ] Vercel deployment status: Ready
- [ ] Health check endpoint returns healthy
- [ ] Database connection verified
- [ ] OCR Gateway accessible (if OCR-related)
- [ ] Google Drive connection verified (if Drive-related)
- [ ] Auth login tested
- [ ] New feature manually smoke-tested

---

## FAILURE HANDLING

| Stage Failed | Action |
|-------------|--------|
| Technical Design | Revise design — do not start coding |
| Implementation | Fix build errors, retry |
| Unit Test | Fix failing tests, retry |
| Integration Test | Fix integration issues, retry |
| EEOS Compliance | **BLOCKER** — return to implementation with violation list |
| Architecture Review | Fix architectural issues, retry |
| Merge | Resolve conflicts, retry |
| Deployment | Rollback Vercel, investigate, fix |

---

## CHANGE HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v1.0 | 2026-06-29 | AI Agent | Initial policy |
