# Package Creation Bot Constitution

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-CONST-3A-001 |
| **Title** | Package Creation Bot Constitution |
| **Category** | Business Constitution |
| **Layer** | Level 3 — Constitution |
| **Sub-Layer** | 3A — Business Constitution |
| **Status** | ACCEPTED |
| **Version** | v1.2 |
| **Owner** | Product Owner |
| **Reviewer** | AI Agent |
| **Approver** | Product Owner |
| **Created** | 2026-06-29 |
| **Last Updated** | 2026-06-29 |
| **Review Due** | 2026-12-29 |

---

## PURPOSE

Dokumen ini mendefinisikan **Business Constitution** untuk Package Creation Bot — AI Assistant yang membantu admin membuat Paket Keberangkatan dari flyer dan caption. Dokumen ini adalah **hukum** yang mengatur bagaimana Package Creation Bot harus bekerja, apa yang boleh dilakukan AI, apa yang wajib dilakukan Human, dan bagaimana data mengalir dari source ke database.

---

## PROBLEM STATEMENT

Admin menghabiskan waktu 15-30 menit per flyer untuk membuat Paket Keberangkatan secara manual. Proses ini melibatkan pembacaan flyer, ekstraksi tanggal, harga, maskapai, hotel, dan informasi lainnya — rawan human error, terutama pada ekstraksi tanggal dan harga. Setiap admin mungkin mengekstrak data dengan cara berbeda, menghasilkan inkonsistensi.

---

## BUSINESS OBJECTIVE

1. Mengurangi waktu pembuatan paket dari 15-30 menit menjadi 2-5 menit per flyer
2. AI mengekstrak data dari flyer/caption/itinerary — Human me-review dan menyetujui
3. Standardisasi format ekstraksi untuk seluruh paket
4. AI TIDAK PERNAH membuat data final — Human adalah pengambil keputusan terakhir

---

## BUSINESS CONTEXT

Package Creation Bot berada dalam domain **Package Creation** — salah satu dari beberapa domain bisnis VTU ABADI.

```
PACKAGE DOMAIN
├── Package Creation Bot (DOKUMEN INI)
├── Invoice Constitution
├── Manifest Constitution
├── Rooming Constitution
└── Hotel Allocation Constitution
```

Bot ini adalah **entry point** ke seluruh domain Package. Setelah Package dibuat melalui Bot, proses selanjutnya (Invoice, Manifest, Rooming) mengikuti Constitution masing-masing.

---

## 14 PRINCIPLES

### Principle 1 — Source-First
Data diekstrak dari source (flyer, itinerary, caption). AI tidak mengarang data yang tidak ada di source. Jika data tidak ditemukan → status: MISSING.

### Principle 2 — Draft-Only
Output AI selalu dalam status DRAFT. AI TIDAK BOLEH langsung membuat Keberangkatan final di database. Human adalah satu-satunya yang bisa mem-publish.

### Principle 3 — Multi-Date
Satu flyer dengan N tanggal keberangkatan = N draft package. Setiap draft independen — dapat di-approve atau di-reject secara terpisah.

### Principle 4 — Master Data
AI tidak membuat entri Master Data baru. Field yang membutuhkan Master (Maskapai, Hotel, Kota) menyimpan Raw Value (teks asli) + Mapped Value (Master ID). Status NEED_MAPPING untuk field yang belum dipetakan.

### Principle 5 — Confidence
Setiap field hasil ekstraksi membawa confidence score (0.0 - 1.0). Confidence adalah **alat bantu Human Review** — BUKAN pengambil keputusan otomatis. Field dengan confidence rendah diberi highlight visual.

### Principle 6 — Validation-Before-Draft
Validasi terjadi SEBELUM draft dibuat — bukan setelah. Mandatory field gagal → draft TIDAK BOLEH dibuat.

### Principle 7 — Pricing Mode
Single Pricing: satu harga untuk semua jamaah. Tier Pricing: harga per kelas (Silver/Gold/Platinum). Tier Pricing TIDAK diimplementasikan sampai Invoice Layer mendukung.

### Principle 8 — Fusion Engine
Data dari berbagai source diproses melalui 6-step pipeline: Collect → Normalize → Merge → Conflict Detection → Validation → Draft Package. Tidak boleh langsung: AI → Draft Package.

### Principle 9 — Business Truth
AI TIDAK BOLEH menciptakan fakta. AI TIDAK BOLEH mengarang data. AI TIDAK BOLEH menyimpulkan tanpa dasar. AI hanya boleh: Extract, Normalize, Suggest, Flag.

### Principle 10 — Source Provenance
Setiap field hasil ekstraksi mencatat asal datanya: `flyer_ocr`, `caption`, `itinerary_ocr`, `master_suggest`. Tujuan: Auditability, Human Review, Explainability.

### Principle 11 — Conflict Detection
Jika dua source memberikan data berbeda → field status: CONFLICT → Human Review. AI TIDAK BOLEH memilih salah satu source secara otomatis.

### Principle 12 — Source Priority (Soft Guideline)
Jika semua source memberikan data yang SAMA → confidence tinggi, langsung pakai. Jika berbeda → CONFLICT → eskalasi ke Human. TIDAK PERNAH: otomatis memilih source hanya karena "prioritas lebih tinggi."

### Principle 13 — Field Status
Setiap field memiliki business status yang menunjukkan kondisi data: MISSING → EXTRACTED → MAPPED/CONFLICT/NEED_REVIEW → VALIDATED.

### Principle 14 — Field Category
Setiap field dikelompokkan: **Mandatory** (Tanggal, Harga, Maskapai, Durasi), **Recommended** (Hotel, Landing, Include), **Optional** (Exclude, Promo, Catatan). Mandatory gagal → draft TIDAK BOLEH dibuat.

---

## BUSINESS ACTOR MODEL

| Actor | Role | Responsibilities | Constraints |
|-------|------|-----------------|-------------|
| **Admin** | Human Operator | Upload source; review extraction; map to master data; edit fields; approve/reject; publish | Tidak bisa skip Human Review; tidak bisa publish langsung dari AI output |
| **AI Engine** | Automated Extractor | OCR processing; text parsing; field extraction; normalization; merge; conflict detection; confidence scoring | Tidak boleh membuat keputusan final; tidak boleh mengarang data; tidak boleh memilih saat konflik |
| **Human Review** | Quality Gate | Field-by-field verification; conflict resolution; master data mapping; completeness check; approval decision | Wajib untuk setiap draft sebelum publish |
| **System** | Orchestrator | Persist draft; manage workflow states; enforce validation gates; record audit trail; generate package code | Tidak boleh bypass workflow; tidak boleh mengubah data tanpa Business Event |

---

## BUSINESS STATES

### Draft Lifecycle

```
DRAFT → REVIEW → READY → PUBLISHED
  ↑                ↓
  └── REJECT ◄──────┘
```

| State | Meaning | Set By | Valid Transitions |
|-------|---------|--------|-------------------|
| DRAFT | AI selesai ekstraksi, siap direview | System (auto) | → REVIEW, → ARCHIVED |
| REVIEW | Admin sedang mereview | Admin | → READY, → DRAFT (reject), → ARCHIVED |
| READY | Disetujui, siap publish | Admin (approve) | → PUBLISHED, → REVIEW (rollback) |
| PUBLISHED | Sudah menjadi Keberangkatan | System (auto) | Terminal — immutable |
| ARCHIVED | Dihapus/discard | Admin (discard) | Terminal |

### Field States

| State | Meaning | Confidence Impact |
|-------|---------|-------------------|
| MISSING | Tidak ditemukan di source manapun | Mandatory → blocker |
| EXTRACTED | Ditemukan, belum diverifikasi | Review priority |
| CONFLICT | Dua source berbeda → butuh human | HIGH priority review |
| MAPPED | Sudah dipetakan ke Master Data | Rendah — tinggal konfirmasi |
| NEED_REVIEW | Confidence rendah (< 0.5) | Medium priority |
| VALIDATED | Human sudah setujui | Final — siap publish |

---

## BUSINESS EVENTS

| # | Event | Trigger | Actor | Pre-condition | Post-condition |
|---|-------|---------|-------|---------------|----------------|
| EVT-01 | Upload Flyer | Admin uploads flyer image | Admin | File JPEG valid, 10KB-10MB | Flyer stored; OCR queued |
| EVT-02 | Upload Caption | Admin inputs caption text | Admin | 1-5000 characters | Caption stored |
| EVT-03 | Upload Itinerary | Admin uploads itinerary image | Admin | File JPEG valid | Itinerary stored |
| EVT-04 | OCR Process | System triggered after upload | AI Engine | Image available | OCR text extracted |
| EVT-05 | Extraction | System triggered after OCR | AI Engine | OCR text + caption available | ExtractionResult with per-field confidence |
| EVT-06 | Fusion | System triggered after extraction | AI Engine | All sources collected | Normalized, merged, conflict-detected result |
| EVT-07 | Validation | System triggered after fusion | AI Engine | Fused result available | Validation result (PASS/FAIL per field) |
| EVT-08 | Draft Created | System after validation | System | All mandatory fields pass | Draft persisted (status: DRAFT) |
| EVT-09 | Human Review Started | Admin opens draft | Admin | Draft in DRAFT/REVIEW | Draft → REVIEW |
| EVT-10 | Draft Updated | Admin edits fields | Admin | Draft not PUBLISHED | Updated extraction result |
| EVT-11 | Draft Rejected | Admin rejects | Admin | Draft in REVIEW | Draft → DRAFT with revision notes |
| EVT-12 | Draft Approved | Admin approves | Admin | All mandatory validated | Draft → READY |
| EVT-13 | Publish | Admin confirms publish | Admin | Draft in READY | Keberangkatan created; draft → PUBLISHED |
| EVT-14 | Draft Discarded | Admin discards | Admin | Draft not PUBLISHED | Draft → ARCHIVED; temp files cleaned |

---

## BUSINESS RULES

| # | Rule ID | Rule | Category |
|---|---------|------|----------|
| R-01 | Draft-Only | Output AI selalu DRAFT — tidak pernah final | Fundamental |
| R-02 | Multi-Date | Satu flyer N tanggal = N draft terpisah | Fundamental |
| R-03 | Mandatory Gate | Mandatory field gagal → draft TIDAK BOLEH dibuat | Gate |
| R-04 | No Master Creation | AI tidak boleh membuat Master Data baru | Constraint |
| R-05 | Conflict Escalation | Dua source berbeda → CONFLICT → Human resolve | Escalation |
| R-06 | Raw+Mapped | Setiap field menyimpan raw value + mapped value | Data Contract |
| R-07 | Per-Field Confidence | Setiap field memiliki confidence score | Data Contract |
| R-08 | Source Provenance | Setiap field memiliki source provenance | Data Contract |
| R-09 | Field Status Tracking | Setiap field memiliki 6-state business status | Data Contract |
| R-10 | Business Truth | AI tidak menciptakan fakta | Constraint |
| R-11 | No Auto-Select | AI tidak memilih saat konflik | Constraint |
| R-12 | Single Extraction Unit | Satu AI extraction = satu flyer (sebelum multi-date split) | Process |
| R-13 | Validation First | Validasi sebelum draft — bukan setelah | Process |
| R-14 | Human Publish Only | Human adalah satu-satunya yang bisa mem-publish | Authority |
| R-15 | Airline Master Only | Maskapai hanya dari Master Airlines | Constraint |
| R-16 | Hotel Master Only | Hotel hanya dari Master Hotels | Constraint |
| R-17 | Confidence Tool | Confidence bukan pengambil keputusan — alat bantu | Guidance |
| R-18 | Published Immutable | Draft tidak boleh diubah setelah PUBLISHED | Immutability |

---

## BUSINESS WORKFLOW

```
┌──────────────────────────────────────────────────────────┐
│                   FUSION ENGINE (6-STEP)                  │
│                                                          │
│  SOURCE COLLECTION                                       │
│  ├── Flyer Utama (OCR → rawText)                        │
│  ├── Flyer Itinerary (OCR → rawText)                    │
│  └── Caption (text parsing)                             │
│              │                                           │
│              ▼                                           │
│  NORMALIZATION                                           │
│  ├── Date: "15 JULI 2026" → 2026-07-15                   │
│  ├── Number: "45.5 Jt" → 45500000                        │
│  └── Text: "Saudia Airlines" → "Saudia Airlines"         │
│              │                                           │
│              ▼                                           │
│  MERGE                                                    │
│  ├── Flyer fields + Caption fields + Itinerary fields    │
│  └── Single unified extraction result                    │
│              │                                           │
│              ▼                                           │
│  CONFLICT DETECTION                                      │
│  ├── Compare values across sources                      │
│  ├── Same value → high confidence                       │
│  └── Different → CONFLICT flag                          │
│              │                                           │
│              ▼                                           │
│  BUSINESS VALIDATION                                     │
│  ├── Mandatory fields present?                          │
│  ├── Format valid? (date, number)                       │
│  └── Range valid? (duration 3-45, price > 0)            │
│              │                                           │
│              ▼                                           │
│  DRAFT PACKAGE                                           │
│  ├── 1 flyer N tanggal = N drafts                       │
│  └── Status: DRAFT                                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│                   HUMAN REVIEW                           │
│                                                          │
│  For each draft:                                         │
│  ├── Review fields with confidence < 0.5                 │
│  ├── Resolve CONFLICT fields                             │
│  ├── Map NEED_MAPPING fields to Master Data              │
│  ├── Edit incorrect values                              │
│  ├── Validate all Mandatory fields                       │
│  └── APPROVE → READY  or  REJECT → DRAFT                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│                   PUBLISH                                 │
│                                                          │
│  Draft READY → Create Keberangkatan di database          │
│  ├── Generate Package Code                               │
│  ├── Set status: scheduled                              │
│  ├── Record Audit Trail                                  │
│  └── Draft → PUBLISHED (terminal)                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## BUSINESS FORMULAS

| # | Formula | Definition | Input | Output |
|---|---------|-----------|-------|--------|
| F-01 | Package Code | `{TYPE}-{CITY}-{MONTH}{YY}` | type, city, date | String |
| F-02 | Program Name | `{PackageTypeLabel} {City} {Duration} Hari {Month} {Year}` | type, city, duration, date | String |
| F-03 | Completeness Score | `Mandatory% × 0.50 + Recommended% × 0.30 + Optional% × 0.20` | Field counts per category | 0-100 |
| F-04 | Confidence Aggregate | Mean of all field confidence scores | Field confidences[] | 0.0-1.0 |
| F-05 | Duration | Extract "X HARI" pattern from text | Caption text | Integer (3-45) |
| F-06 | Date Normalize | Indonesian text → ISO date | "15 JULI 2026" | "2026-07-15" |

---

## BUSINESS VALIDATION

| # | Validation | Rule | Severity | Performed By |
|---|-----------|------|----------|-------------|
| V-01 | File Type | JPEG/JPG only — magic byte check | BLOCKER | System |
| V-02 | File Size | 10KB - 10MB | BLOCKER | System |
| V-03 | Caption Length | 1 - 5000 characters | BLOCKER | System |
| V-04 | Mandatory Presence | Tanggal, Harga, Maskapai, Durasi must be present | BLOCKER | AI Engine |
| V-05 | Future Date | Departure date > today | WARNING | AI Engine |
| V-06 | Price Range | > 0, < 500,000,000 | WARNING | AI Engine |
| V-07 | Duration Range | 3 - 45 days | WARNING | AI Engine |
| V-08 | Conflict | Two sources differ → CONFLICT | WARNING | AI Engine |
| V-09 | Airline Known | In Master Airlines or confidence > threshold | WARNING | AI Engine |
| V-10 | Hotel Known | In Master Hotels or flag NEED_MAPPING | INFO | AI Engine |
| V-11 | Low Confidence | Per-field confidence < 0.5 → NEED_REVIEW | WARNING | AI Engine |
| V-12 | Completeness | Business Completeness < 60% → BLOCKER | BLOCKER | AI Engine |

---

## BUSINESS EXCEPTIONS

| # | Exception | Trigger | System Response | Human Intervention |
|---|----------|---------|-----------------|-------------------|
| E-01 | OCR Failed | All providers exhausted | Draft with MISSING fields; confidence 0 | Admin inputs manually |
| E-02 | Source Conflict | Flyer ≠ Caption | Field status = CONFLICT; flagged review | Admin chooses correct value |
| E-03 | All Mandatory Missing | Flyer unreadable | Draft NOT created; error message | Admin re-uploads or inputs manually |
| E-04 | Unknown Airline | Not in Master | Field status = NEED_MAPPING | Admin maps to Master Airlines |
| E-05 | Price Not Found | No numbers in source | hargaPaket = 0; flagged | Admin inputs manually |
| E-06 | Duplicate Code | Generated code exists | Warning; non-blocking | Admin decides: rename or proceed |
| E-07 | Past Date | departureDate < today | Warning; low confidence flag | Admin confirms — possible extraction error |
| E-08 | Multi-Hotel Conflict | Different hotels per date | All hotels saved; flagged | Admin splits into separate drafts |
| E-09 | Concurrent Edit | Two admins open same draft | No lock mechanism currently | Manual coordination |
| E-10 | Publish Failed | DB error | Rollback; draft stays READY | Admin retries publish |

---

## AI RESPONSIBILITY BOUNDARY

### AI BOLEH

| Action | Description |
|--------|-------------|
| **Extract** | Membaca teks dari gambar (OCR) |
| **Normalize** | Standarisasi format tanggal, angka, nama |
| **Suggest** | Mengusulkan mapping ke Master Data berdasarkan kemiripan |
| **Flag** | Menandai field dengan confidence rendah |
| **Validate** | Memeriksa format, range, konsistensi |
| **Merge** | Menggabungkan data dari berbagai source |
| **Calculate** | Menghitung completeness score, confidence aggregate |
| **Generate Draft** | Menghasilkan draft package untuk human review |

### AI TIDAK BOLEH

| Action | Description |
|--------|-------------|
| **Invent** | Membuat data yang tidak ada di source |
| **Conclude** | Menyimpulkan "pasti X" dari data ambigu |
| **Decide** | Memilih salah satu dari dua nilai berbeda |
| **Guess** | Mengisi nilai kosong dengan perkiraan tanpa dasar |
| **Create Final** | Membuat Keberangkatan final di database |
| **Resolve Conflict** | Menyelesaikan konflik antar source |
| **Create Master** | Membuat entri baru di Master Data |

---

## HUMAN REVIEW MANDATORY SCOPE

### Wajib Direview (6 items)

| # | Item | Reason |
|---|------|--------|
| HR-01 | Field confidence < 0.5 | Risiko tinggi — AI tidak yakin |
| HR-02 | Field status CONFLICT | AI tidak boleh memilih |
| HR-03 | Field status NEED_MAPPING | Perlu mapping ke Master Data |
| HR-04 | All Mandatory fields | Fundamental untuk paket |
| HR-05 | Harga paket | AI paling sering salah di harga |
| HR-06 | All departure dates | Multi-date: pastikan semua benar |

### Quick Review (3 items)

| # | Item |
|---|------|
| HR-07 | Recommended fields (hotel, landing, include) |
| HR-08 | Optional fields (exclude, promo, notes) |
| HR-09 | Fields with confidence > 0.9 |

---

## SYSTEM RESPONSIBILITY

| Responsibility | Description |
|---------------|-------------|
| **Workflow Enforcement** | Pastikan transisi state valid |
| **Validation Gate** | Jangan buat draft jika mandatory gagal |
| **Audit Trail** | Catat setiap Business Event |
| **Idempotency** | Duplicate event → NO-OP |
| **Storage** | Simpan flyer temporer; cleanup setelah publish/discard |
| **Code Generation** | Generate kode paket unik sesuai template |
| **Error Recovery** | Publish gagal → draft tetap READY |
| **State Persistence** | Draft di database — survive restart |

---

## DATA EXTRACTION CONTRACT

### A. Package Identity

| Field | Required | Type | Source |
|-------|----------|------|--------|
| startingPoint | Mandatory | Text + Master City | Flyer/Caption |
| packageType | Mandatory | Enum + Master Package Type | Flyer/Caption |
| durationDays | Mandatory | Integer | Caption |
| programName | Optional | Free text | Generated |

### B. Departure

| Field | Required | Type | Source |
|-------|----------|------|--------|
| departureDates | Mandatory | Array of dates | Flyer |
| Note: Satu flyer N tanggal = N draft package |

### C. Transportation

| Field | Required | Type | Source |
|-------|----------|------|--------|
| airlineText | Mandatory | Raw text | Flyer/Caption |
| airlineMasterId | Mandatory* | Master Airlines ID | Human mapping |
| landingCity | Recommended | Master City ID | Flyer |
| transit | Optional | Text | Flyer Itinerary |

*setelah human mapping

### D. Pricing

| Field | Required | Type | Source |
|-------|----------|------|--------|
| pricingMode | Mandatory | SINGLE or TIER | Flyer |
| price | Mandatory (SINGLE) | Integer | Flyer |
| tiers | Mandatory (TIER) | Array of {name, price} | Flyer |

### E. Hotel

| Field | Required | Type | Source |
|-------|----------|------|--------|
| hotelMekkahText | Recommended | Raw text | Flyer |
| hotelMekkahMasterId | Optional* | Master Hotel ID | Human mapping |
| hotelMadinahText | Recommended | Raw text | Flyer |
| hotelMadinahMasterId | Optional* | Master Hotel ID | Human mapping |

### F. Perlengkapan

| Field | Required | Type | Source |
|-------|----------|------|--------|
| perlengkapan | Optional | Array of {name, source, confidence} | Flyer + Master Suggest |

### G. Include
| Field | Required | Type | Source |
|-------|----------|------|--------|
| include | Optional | Array of strings | Caption/Flyer |

### H. Exclude
| Field | Required | Type | Source |
|-------|----------|------|--------|
| exclude | Optional | Array of strings | Caption/Flyer |

### I. Itinerary
| Field | Required | Type | Source |
|-------|----------|------|--------|
| itineraryDraft | Optional | Array of {day, city, activities, hotel} | Flyer Itinerary |

### J. Marketing
| Field | Required | Type | Source |
|-------|----------|------|--------|
| promoText | Optional | Text | Caption |
| description | Optional | Text | Caption |
| notes | Optional | Text | Caption |

---

## KNOWLEDGE DEPENDENCY

### Depends On
- `foundation/identity-foundation.md` (v1.0 LOCKED)
- `foundation/business-event-foundation.md` (v1.0 READY TO LOCK)
- `foundation/operational-state-foundation.md` (v1.0 LOCKED)
- `foundation/auditability-foundation.md` (v1.0 LOCKED)
- `foundation/idempotency-foundation.md` (v1.0 READY TO LOCK)
- `constitution/business/raw-mapped-value-contract.md`
- `constitution/ai/ai-governance.md`

### Required By
- `constitution/business/invoice-constitution.md`
- `constitution/business/manifest-constitution.md`
- `constitution/business/rooming-constitution.md`
- `constitution/business/pricing-mode-constitution.md`
- `business-engine/package-code-generator.md`
- `business-engine/completeness-calculator.md`

---

## EVIDENCE

### Primary Evidence
- **Type:** Production Code
- **Source:** `package-ai/` module (6 files)
- **Description:** Package AI import workflow DRAFT → REVIEW → READY → PUBLISHED sudah berfungsi di codebase, API routes tersedia
- **Strength:** HIGH

### Supporting Evidence
- **Type:** Product Owner Decision
- **Source:** EEOS Audit — Package Creation Bot Phase 1 (2026-06-29) + Phase 2 Foundation Evolution (2026-06-29)
- **Description:** Product Owner menyetujui 14 Principles sebagai Business Constitution, termasuk Fusion Engine, Conflict Detection, Source Provenance, dan Field Status
- **Strength:** HIGH

### Validation History
- 2026-06-15 — AI Agent: Knowledge discovered in codebase
- 2026-06-20 — AI Agent: Knowledge extracted and classified
- 2026-06-29 — AI Agent: Documented as Constitution v1.0 DRAFT
- 2026-06-29 — Product Owner: Reviewed, 7 principles added (Fusion Engine, Business Truth, Source Provenance, Conflict Detection, Source Priority, Field Status, Field Category)
- 2026-06-29 — Product Owner: v1.2 ACCEPTED

---

## DECISION TRACE

| Field | Value |
|-------|-------|
| **Primary ADR** | ADR-011 — Package Creation Bot Business Logic Constitution |
| **Related ADRs** | ADR-014 (Fusion Engine), ADR-015 (Source Provenance & Field Status), ADR-025 (Package Code Generator), ADR-026 (AI Responsibility), ADR-027 (Human Review Scope) |
| **Business Decision** | Product Owner approval — Package Creation Bot Phase 1 + Phase 2 |
| **Decision Date** | 2026-06-29 |
| **Alternatives Rejected** | (1) AI langsung membuat Keberangkatan tanpa Human Review — ditolak karena melanggar Human Authority Principle; (2) Single source tanpa Conflict Detection — ditolak karena kehilangan cross-validation antar source |
| **Reasoning** | Human harus tetap menjadi pengambil keputusan akhir. AI adalah asisten, bukan pengganti. Conflict antar source harus visible ke human — tidak boleh di-resolve otomatis oleh AI. |
| **Accepted By** | Product Owner |

---

## KNOWLEDGE TRUST

| Indicator | Score |
|-----------|-------|
| Evidence Completeness | 90 |
| Validation Completeness | 90 |
| Traceability | 95 |
| Operational Usage | 70 |
| Review Freshness | 100 |
| Documentation Completeness | 95 |
| Foundation Compliance | 100 |
| **Overall** | **91** |
| **Grade** | **A** |

---

## FOUNDATION STATUS

**APPROVED** — Document is ACCEPTED as Business Constitution. Not yet LOCKED as Foundation (Foundation Lock pending Product Owner final approval of all 10 Foundation candidates).

---

## IMPLEMENTATION REFERENCE

Implementation MUST follow this Constitution. The following source code modules are the current implementation:

- `src/server/services/package-ai/` — AI extraction and draft management
- `src/app/api/admin/packages/ai-import/` — API endpoints
- (pending) Admin UI for Human Review
- (pending) Multi-date split logic
- (pending) Master Data tables integration

All implementation changes MUST be traceable to a Rule in this Constitution via ADR.

---

## CHANGE HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v1.0 | 2026-06-29 | AI Agent | Initial draft — 7 Principles from Phase 1 |
| v1.1 | 2026-06-29 | AI Agent | Added 7 Principles from Phase 2 (Fusion Engine, Business Truth, Source Provenance, Conflict Detection, Source Priority, Field Status, Field Category) |
| v1.2 | 2026-06-29 | AI Agent | Added Data Extraction Contract (A-J), Business Exceptions (10), Validation Catalog (12), System Responsibility, Knowledge Trust evaluation. Final Sprint 1 curation. |
