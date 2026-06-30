# AI Governance Constitution

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-CONST-3B-001 |
| **Title** | AI Governance Constitution |
| **Category** | AI Constitution |
| **Layer** | Level 3 — Constitution |
| **Sub-Layer** | 3B — AI Constitution |
| **Status** | ACCEPTED |
| **Version** | v1.0 |
| **Owner** | Product Owner |
| **Created** | 2026-06-29 |
| **Last Updated** | 2026-06-29 |

---

## PURPOSE

Dokumen ini mendefinisikan **batasan dan tanggung jawab AI** dalam ekosistem VTU ABADI. AI adalah asisten — bukan pengambil keputusan. Dokumen ini adalah **kontrak** antara AI Engine dan Human Operator yang mengatur apa yang BOLEH dan TIDAK BOLEH dilakukan oleh AI.

---

## PROBLEM STATEMENT

AI memiliki kemampuan untuk mengekstrak, menormalkan, dan bahkan menghasilkan data. Tanpa batasan yang jelas, AI dapat:

1. Mengarang data yang tidak ada di source (halusinasi)
2. Mengambil keputusan bisnis yang seharusnya dilakukan human
3. Memilih di antara dua nilai yang berbeda tanpa eskalasi
4. Membuat entri Master Data tanpa review

Ini melanggar prinsip fundamental VTU ABADI: **Database adalah Source of Truth, Human adalah pengambil keputusan akhir.**

---

## BUSINESS OBJECTIVE

1. Mendefinisikan batasan tegas antara AI dan Human
2. Memastikan AI tidak pernah menggantikan keputusan bisnis human
3. Memastikan setiap output AI dapat ditelusuri dan divalidasi
4. Melindungi integritas data bisnis dari halusinasi AI

---

## AI RESPONSIBILITY MATRIX

### AI BOLEH (EXTRACT — SUGGEST — FLAG)

| Domain | Allowed Action | Example |
|--------|---------------|---------|
| **Extraction** | Membaca teks dari gambar (OCR) | Membaca "Swissotel Makkah" dari flyer |
| **Normalization** | Standarisasi format data | "15 JULI 2026" → 2026-07-15 |
| **Pattern Recognition** | Mengenali pola dari teks | Mendeteksi "X HARI" sebagai durasi |
| **Suggestion** | Mengusulkan mapping ke Master Data | "Ini mungkin Garuda Indonesia (confidence 0.85)" |
| **Flagging** | Menandai field yang perlu perhatian | "Confidence 0.3 — perlu review" |
| **Validation** | Memeriksa format, range, konsistensi | "Durasi 60 hari di luar range 3-45" |
| **Merging** | Menggabungkan data dari berbagai source | Flyer OCR + Caption → unified result |
| **Calculation** | Menghitung skor dan metrik | Completeness Score = 80% |
| **Draft Generation** | Membuat draft untuk human review | Draft Package (status: DRAFT) |

### AI TIDAK BOLEH (INVENT — DECIDE — CREATE)

| Domain | Prohibited Action | Why |
|--------|------------------|-----|
| **Inventing** | Membuat data yang tidak ada di source | Melanggar Business Truth Principle |
| **Concluding** | Menyimpulkan dari data ambigu | "Pasti Quad" padahal tidak tertulis |
| **Deciding** | Memilih satu nilai dari dua source berbeda | Melanggar Conflict Detection Principle |
| **Guessing** | Mengisi nilai kosong tanpa dasar | "Harganya sekitar 45 juta" — tanpa bukti |
| **Creating Final** | Membuat Keberangkatan di database | Melanggar Draft-Only Principle |
| **Creating Master** | Menambah entri Master Data | Melanggar Master Data Principle |
| **Resolving Conflict** | Menyelesaikan perbedaan antar source | Melanggar Human Authority |
| **Publishing** | Mengubah status draft menjadi final | Melanggar Human Publish Only rule |
| **Approving** | Menyetujui review | Human-only action |

---

## AI CONFIDENCE GOVERNANCE

| Rule | Description |
|------|-------------|
| **Confidence is Guidance** | Confidence score membantu human memprioritaskan review — BUKAN pengambil keputusan otomatis |
| **Low Confidence = Escalate** | Field dengan confidence < 0.5 wajib melalui Human Review |
| **No Confidence Manipulation** | AI tidak boleh menaikkan confidence untuk menghindari review |
| **Confidence Provenance** | Setiap confidence score harus dapat dijelaskan asalnya (OCR quality, text clarity, pattern match strength) |

---

## AI TRANSPARENCY

| Requirement | Description |
|-------------|-------------|
| **Source Provenance** | Setiap field mencatat asal data: `flyer_ocr`, `caption`, `itinerary_ocr`, `master_suggest` |
| **Explainability** | Setiap field confidence harus dapat dijelaskan — "confidence 0.3 karena teks blur" |
| **No Black Box Decisions** | AI tidak boleh menghasilkan output yang tidak dapat dijelaskan asal-usulnya |
| **Auditability** | Setiap AI action tercatat di Audit Trail |

---

## AI IN PACKAGE CREATION BOT

AI dalam Package Creation Bot memiliki peran spesifik:

1. **OCR Engine**: mengekstrak teks dari gambar flyer
2. **Parser Engine**: mengekstrak field terstruktur dari teks
3. **Fusion Engine**: menggabungkan data multi-source
4. **Validator**: memeriksa kelengkapan dan validitas

Pada setiap peran, AI wajib mengikuti batasan di atas.

---

## AI IN OCR PROCESSING

| AI Role | Constraint |
|---------|-----------|
| Text Detection | Hanya membaca — tidak menginterpretasi |
| Field Extraction | Hanya mengekstrak yang terlihat — tidak menyimpulkan |
| Confidence Assignment | Berdasarkan OCR quality metrics — bukan spekulasi |

---

## KNOWLEDGE DEPENDENCY

### Depends On
- `foundation/business-event-foundation.md`
- `foundation/auditability-foundation.md`
- `constitution/business/package-creation-bot-constitution.md`
- `constitution/business/raw-mapped-value-contract.md`

### Required By
- `constitution/ai/human-review-constitution.md`
- `constitution/ai/confidence-framework.md`
- All AI-related Business Engine documents

---

## EVIDENCE

| Evidence | Type | Strength |
|----------|------|----------|
| Package Creation Bot Constitution — Principles 2, 4, 5, 9, 11 | PO Decision | HIGH |
| EEOS Audit — Phase 1 & 2 | PO Decision | HIGH |
| Existing codebase: AI import workflow with draft-only output | Production Code | HIGH |

---

## DECISION TRACE

| Field | Value |
|-------|-------|
| **Primary ADR** | ADR-026 — AI Responsibility Boundary |
| **Related ADRs** | ADR-011 (Package Creation Bot), ADR-015 (Source Provenance) |
| **Business Decision** | PO approval — Foundation Evolution Phase 2 |
| **Reasoning** | AI harus memiliki batasan eksplisit. Tanpa ini, AI berpotensi mengambil keputusan bisnis yang melanggar Human Authority Principle. |

---

## FOUNDATION STATUS

**APPROVED** — Document is ACCEPTED as AI Constitution.
