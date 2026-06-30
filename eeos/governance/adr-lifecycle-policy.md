# ADR Lifecycle Policy

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-GOV-004 |
| **Title** | ADR Lifecycle Policy |
| **Category** | Implementation Governance |
| **Layer** | Level 1 — Governance |
| **Status** | ACCEPTED |
| **Version** | v1.0 |

---

## PURPOSE

Dokumen ini mendefinisikan lifecycle resmi Architecture Decision Record (ADR) dari pertama kali digagas hingga diarsipkan. Setiap ADR wajib mengikuti lifecycle ini.

---

## ADR LIFECYCLE

```
DRAFT → PROPOSED → ARCHITECTURE REVIEW → ACCEPTED → IMPLEMENTED → VERIFIED → CLOSED
                                                ↓
                                          SUPERSEDED (oleh ADR baru)
                                                ↓
                                            ARCHIVED
```

---

## STAGE 1: DRAFT

| Field | Value |
|-------|-------|
| **Objective** | Menulis draf awal ADR |
| **Entry Criteria** | Kebutuhan arsitektur teridentifikasi |
| **Responsible** | AI Agent (Software Architect) |
| **Exit Criteria** | ADR document ditulis dengan format lengkap |

### ADR Document Format (Minimum)

```markdown
# ADR-NNN: Title

## Status
DRAFT

## Context
[Why is this decision needed?]

## Decision
[What is the decision?]

## Consequences
[What becomes easier/harder because of this decision?]

## Alternatives Considered
[What other options were evaluated and rejected?]

## Date
[YYYY-MM-DD]

## Owner
[Product Owner / AI Agent]
```

---

## STAGE 2: PROPOSED

| Field | Value |
|-------|-------|
| **Objective** | Mengajukan ADR untuk review |
| **Entry Criteria** | ADR draft selesai |
| **Responsible** | AI Agent → Product Owner |
| **Exit Criteria** | Product Owner menerima ADR untuk Architecture Review |

### Action
- ADR status diubah dari `DRAFT` ke `PROPOSED`
- Product Owner diberi notifikasi
- Product Owner dapat: menerima untuk review, atau menolak (ADR kembali ke DRAFT)

---

## STAGE 3: ARCHITECTURE REVIEW

| Field | Value |
|-------|-------|
| **Objective** | Validasi teknis ADR |
| **Entry Criteria** | ADR status PROPOSED, Product Owner accepted for review |
| **Responsible** | AI Agent (Architecture Reviewer) |
| **Exit Criteria** | Architecture Review PASS |

### Review Checklist
- [ ] ADR tidak melanggar Foundation Lock
- [ ] ADR tidak melanggar Business Constitution
- [ ] ADR tidak melanggar AI Constitution
- [ ] ADR tidak menciptakan circular dependency
- [ ] ADR memiliki impact analysis
- [ ] ADR memiliki rollback strategy (jika applicable)
- [ ] ADR memiliki migration strategy (jika database change)
- [ ] ADR konsisten dengan seluruh dokumen EEOS

### Outcome
- **PASS** → ADR berlanjut ke Product Owner untuk Acceptance
- **FAIL** → ADR kembali ke DRAFT dengan catatan revisi

---

## STAGE 4: ACCEPTED

| Field | Value |
|-------|-------|
| **Objective** | Product Owner menerima ADR |
| **Entry Criteria** | Architecture Review PASS |
| **Responsible** | Product Owner |
| **Exit Criteria** | Product Owner tanda tangan acceptance |

### Action
- ADR status diubah dari `PROPOSED` ke `ACCEPTED`
- ADR dicatat di ADR Register
- Jika ADR mengubah Foundation → Foundation Evolution Gate dijalankan
- Jika ADR mengubah Constitution → dokumen Constitution diperbarui
- EEOS document(s) yang terdampak diperbarui

---

## STAGE 5: IMPLEMENTED

| Field | Value |
|-------|-------|
| **Objective** | ADR direalisasikan dalam source code |
| **Entry Criteria** | ADR status ACCEPTED |
| **Responsible** | AI Agent (Senior Engineer) |
| **Exit Criteria** | Implementation Compliance Gate Stage 1-7 PASS |

### Action
- ADR status diubah dari `ACCEPTED` ke `IMPLEMENTED`
- ADR document di-update dengan implementation reference (file paths, PR number)
- Compliance Gate Stage 5 (EEOS Compliance Review) memverifikasi bahwa implementasi sesuai ADR

---

## STAGE 6: VERIFIED

| Field | Value |
|-------|-------|
| **Objective** | Verifikasi bahwa implementasi berfungsi di production |
| **Entry Criteria** | ADR status IMPLEMENTED, deployment successful |
| **Responsible** | AI Agent (Quality Assurance) |
| **Exit Criteria** | Minimum 7 hari di production tanpa issue terkait ADR ini |

### Verification Checklist
- [ ] Feature berfungsi di production
- [ ] Tidak ada regression terkait ADR ini
- [ ] Performance dalam batas yang diharapkan
- [ ] Tidak ada bug report terkait ADR ini
- [ ] Health metrics normal

---

## STAGE 7: CLOSED

| Field | Value |
|-------|-------|
| **Objective** | ADR dinyatakan final |
| **Entry Criteria** | ADR status VERIFIED |
| **Responsible** | Product Owner |
| **Exit Criteria** | ADR closed |

### Action
- ADR status diubah dari `VERIFIED` ke `CLOSED`
- ADR dianggap sebagai bagian permanen dari arsitektur
- Tidak ada perubahan lebih lanjut pada ADR ini
- Jika ADR perlu diubah → buat ADR BARU dengan field `supersedes: ADR-NNN`

---

## EXCEPTION PATH: SUPERSEDED

| Field | Value |
|-------|-------|
| **Objective** | ADR digantikan oleh ADR baru |
| **Entry Criteria** | ADR baru (dengan field `supersedes`) mencapai status ACCEPTED |
| **Responsible** | AI Agent |
| **Exit Criteria** | ADR lama → SUPERSEDED → ARCHIVED |

### Action
- ADR baru menambahkan field: `supersedes: ADR-NNN`
- Saat ADR baru mencapai ACCEPTED:
  - ADR lama: `ACCEPTED → SUPERSEDED`
  - Saat ADR baru mencapai IMPLEMENTED:
  - ADR lama: `SUPERSEDED → ARCHIVED`
- Kedua ADR tetap tersimpan — historical reference

---

## EXCEPTION PATH: REJECTED

| Field | Value |
|-------|-------|
| **Objective** | ADR ditolak — tidak akan diimplementasikan |
| **Entry Criteria** | Product Owner atau Architecture Review menolak ADR |
| **Responsible** | Product Owner |
| **Exit Criteria** | ADR → ARCHIVED dengan catatan penolakan |

### Action
- ADR status: `PROPOSED → ARCHIVED`
- Catatan penolakan ditambahkan ke ADR: alasan penolakan, tanggal
- ADR tetap disimpan untuk historical record — mencegah proposal yang sama diajukan ulang

---

## ADR STATUS TRANSITION MATRIX

| From | To | By |
|------|----|-----|
| (creation) | DRAFT | AI Agent |
| DRAFT | PROPOSED | AI Agent → PO notification |
| DRAFT | ARCHIVED | AI Agent (abandoned draft) |
| PROPOSED | DRAFT | PO (reject for review) |
| PROPOSED | ARCHITECTURE REVIEW | PO (accept for review) |
| ARCHITECTURE REVIEW | DRAFT | Architecture Reviewer (FAIL) |
| ARCHITECTURE REVIEW | ACCEPTED | PO (accept after PASS) |
| ACCEPTED | IMPLEMENTED | AI Agent (after compliance gate) |
| ACCEPTED | SUPERSEDED | (auto — when superseding ADR accepted) |
| IMPLEMENTED | VERIFIED | AI Agent (after 7 days production) |
| VERIFIED | CLOSED | PO |
| SUPERSEDED | ARCHIVED | AI Agent |
| Any | ARCHIVED | PO (rejection) |

---

## CHANGE HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v1.0 | 2026-06-29 | AI Agent | Initial policy |
