# Domain Completion Checklist

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-GOV-003 |
| **Title** | Domain Completion Checklist |
| **Category** | Implementation Governance |
| **Layer** | Level 1 — Governance |
| **Status** | ACCEPTED |
| **Version** | v1.0 |

---

## PURPOSE

Dokumen ini mendefinisikan checklist standar yang WAJIB dipenuhi oleh setiap domain sebelum dinyatakan Production Ready. Checklist ini berlaku untuk seluruh domain VTU ABADI.

---

## UNIVERSAL CHECKLIST (All Domains)

Setiap domain wajib memenuhi 10 item berikut.

| # | Item | Definition of Done | Verifiable By |
|---|------|-------------------|---------------|
| **DC-01** | Constitution tersedia | Dokumen EEOS Constitution untuk domain ini exists, status ACCEPTED atau lebih tinggi | EEOS README index |
| **DC-02** | ADR tersedia | Minimal 1 ADR yang mendokumentasikan keputusan arsitektur domain ini | ADR Register |
| **DC-03** | Business Registry siap | Tabel database untuk registry domain ini exists + seeded | Prisma schema + DB query |
| **DC-04** | Business Engine siap | Engine yang dibutuhkan domain ini exists dan tested | Engine test suite |
| **DC-05** | API selesai | Seluruh API endpoint untuk domain ini berfungsi (CRUD + business operations) | API integration test |
| **DC-06** | UI selesai | Admin panel / user interface untuk domain ini accessible dan berfungsi | Manual smoke test |
| **DC-07** | Testing selesai | Unit test + integration test coverage untuk domain ini | Test report |
| **DC-08** | EEOS Compliance selesai | Compliance Gate Stage 5 lulus — zero violations | Compliance report |
| **DC-09** | Documentation selesai | API documentation, workflow documentation, error handling documentation | Document review |
| **DC-10** | Production Ready | Domain berfungsi di Vercel production, health check OK, monitoring active | Production health check |

---

## DOMAIN-SPECIFIC CHECKLISTS

### Business Registry Domain

| # | Item | Detail |
|---|------|--------|
| BR-01 | Table exists | `business_{name}` table in Supabase |
| BR-02 | Repository exists | CRUD operations via Prisma |
| BR-03 | Admin API exists | GET/POST/PUT/DELETE endpoints |
| BR-04 | Admin UI exists | Admin panel page for managing entries |
| BR-05 | Seeded | Initial data populated |
| BR-06 | Alias Registry | Alias entries created (if applicable) |
| BR-07 | Audit Trail | Changes to registry entries logged |
| BR-08 | Soft Delete | `is_active` flag — no hard delete |

### Business Engine Domain

| # | Item | Detail |
|---|------|--------|
| BE-01 | Interface defined | TypeScript interface typed |
| BE-02 | Input validated | Edge cases handled (null, empty, invalid) |
| BE-03 | Output deterministic | Same input → same output (for deterministic engines) |
| BE-04 | Confidence reported | Probabilistic engines report confidence |
| BE-05 | Unit tested | ≥ 5 test cases per engine |
| BE-06 | Dependency documented | `depends_on` in EEOS metadata |

### Package Creation Bot Domain

| # | Item | Detail |
|---|------|--------|
| PC-01 | OCR Workflow | Flyer upload → OCR → text extraction |
| PC-02 | Extraction Workflow | Per-field extraction with confidence + source provenance |
| PC-03 | Fusion Engine | 6-step pipeline (Collect→Normalize→Merge→Conflict→Validate→Draft) |
| PC-04 | Draft Persistence | Drafts in database (not in-memory) |
| PC-05 | Multi-Date | 1 flyer N dates = N drafts |
| PC-06 | Human Review UI | Confidence-guided review interface |
| PC-07 | Publish Workflow | Approval → Package Code generation → Keberangkatan creation |
| PC-08 | Audit Trail | Every Business Event (EVT-01 to EVT-14) logged |
| PC-09 | Idempotency | Duplicate publish → NO-OP |

### Google Drive Domain

| # | Item | Detail |
|---|------|--------|
| GD-01 | Hierarchical folders | Root → Year → Month → Package → DocType |
| GD-02 | Folder Registry | `drive_folder_registry` table + repository |
| GD-03 | File Registry | `drive_file_registry` table + repository |
| GD-04 | Sync Engine | 7-step flow (Resolve→Execute→Verify→Metadata→Audit) |
| GD-05 | Transfer support | Native move via Drive API |
| GD-06 | Rename support | Native rename via Drive API |
| GD-07 | Reconciliation | Detect orphan files, sync status tracking |
| GD-08 | Error Recovery | Retry failed syncs, exponential backoff |

### Invoice Domain

| # | Item | Detail |
|---|------|--------|
| IN-01 | Invoice Constitution | EEOS document exists |
| IN-02 | Invoice Generation | Auto-generate from Package + Jamaah |
| IN-03 | Split Invoice | Split A/B/C support |
| IN-04 | Payment Tracking | Paid / Partial / Unpaid status |
| IN-05 | Due Date | Auto-calculated + reminders |
| IN-06 | Audit Trail | Every invoice state change logged |

### Manifest Domain

| # | Item | Detail |
|---|------|--------|
| MF-01 | Manifest Constitution | EEOS document exists |
| MF-02 | Auto-Generate | From Package + Jamaah data |
| MF-03 | Hotel Split | Separate manifest per hotel combination |
| MF-04 | Finalize | Row renumbering + lock |
| MF-05 | Export | PDF/Excel export |
| MF-06 | Audit Trail | Every manifest operation logged |

---

## COMPLETION REPORTING

Setiap domain yang mencapai Production Ready wajib di-update di EEOS README:

```markdown
### Domain Completion Status

| Domain | Constitution | Registry | Engine | API | UI | Testing | Compliance | Production |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Business Registry | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | ⬜ |
| Business Engine | — | — | ✅ | — | — | ✅ | ✅ | ⬜ |
| Package Creation Bot | ✅ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| ... | | | | | | | | |
```

---

## CHANGE HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v1.0 | 2026-06-29 | AI Agent | Initial checklist |
