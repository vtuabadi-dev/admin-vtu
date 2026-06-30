# Raw + Mapped Value Data Contract

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-CONST-3A-002 |
| **Title** | Raw + Mapped Value Data Contract |
| **Category** | Business Constitution |
| **Layer** | Level 3 — Constitution |
| **Sub-Layer** | 3A — Business Constitution |
| **Status** | ACCEPTED |
| **Version** | v1.0 |
| **Owner** | Product Owner |
| **Created** | 2026-06-29 |
| **Last Updated** | 2026-06-29 |

---

## PURPOSE

Dokumen ini mendefinisikan kontrak data yang memisahkan **Raw Value** (teks asli hasil ekstraksi AI) dari **Mapped Value** (referensi ke Master Data yang dipilih oleh Human). Kontrak ini wajib diterapkan ke SETIAP field yang memiliki Master Data reference.

---

## PROBLEM STATEMENT

AI mengekstrak teks dari flyer — misalnya "Saudia Airlines". Namun database bisnis menggunakan Master Data dengan ID yang terstruktur. Jika AI langsung memetakan "Saudia Airlines" ke Master ID `MA-001`, dua masalah muncul:

1. Jika pemetaan salah, tidak ada jejak teks asli untuk koreksi
2. AI melanggar Master Data Principle — AI tidak boleh membuat mapping final

Tanpa pemisahan Raw + Mapped, audit trail tidak lengkap dan koreksi human menjadi sulit.

---

## BUSINESS OBJECTIVE

1. Memisahkan **apa yang AI baca** (Raw) dari **apa yang Human pilih** (Mapped)
2. Memungkinkan human mengoreksi mapping tanpa kehilangan data asli
3. Memungkinkan audit trail lengkap — dari teks asli hingga Master ID final
4. Mencegah AI mengambil keputusan final tentang Master Data

---

## DATA CONTRACT

### Setiap Field dengan Master Data Wajib Memiliki:

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `rawValue` | String | Teks asli hasil ekstraksi AI — TIDAK PERNAH diubah | `"Saudia Airlines"` |
| `mappedValue` | String (nullable) | Master Data ID — dipilih oleh Human | `"MA-001"` |
| `source` | Enum | Asal data: `flyer_ocr`, `caption`, `itinerary_ocr`, `master_suggest` | `"flyer_ocr"` |
| `confidence` | Float (0.0-1.0) | Keyakinan AI terhadap rawValue | `0.95` |
| `fieldStatus` | Enum | MISSING / EXTRACTED / MAPPED / CONFLICT / NEED_REVIEW / VALIDATED | `"EXTRACTED"` |

### Field Tanpa Master Data Hanya Memiliki:

| Attribute | Type | Description |
|-----------|------|-------------|
| `rawValue` | String | Teks asli — final value |
| `source` | Enum | Asal data |
| `confidence` | Float | Keyakinan AI |
| `fieldStatus` | Enum | Status bisnis |

---

## APPLICABLE FIELDS

### Package Creation Bot

| Domain Field | Has Master? | Master Table |
|-------------|------------|-------------|
| maskapai | ✅ YES | `master_airlines` |
| hotelMekkah | ✅ YES | `master_hotels` |
| hotelMadinah | ✅ YES | `master_hotels` |
| startingPoint | ✅ YES | `master_cities` |
| landingCity | ✅ YES | `master_cities` |
| packageType | ✅ YES | `master_package_types` |
| perlengkapan[] | ✅ YES | `master_perlengkapan` |
| departureDate | ❌ NO | — |
| durationDays | ❌ NO | — |
| price | ❌ NO | — |
| programName | ❌ NO | — |
| include[] | ❌ NO | — |
| exclude[] | ❌ NO | — |
| promoText | ❌ NO | — |

---

## BUSINESS RULES

| # | Rule |
|---|------|
| R-RM-01 | Raw value TIDAK PERNAH diubah setelah ekstraksi — meskipun salah |
| R-RM-02 | Mapped value HANYA diisi oleh Human — tidak pernah oleh AI |
| R-RM-03 | Field dengan status NEED_MAPPING = rawValue ada, mappedValue null |
| R-RM-04 | Field dengan status MAPPED = rawValue ada, mappedValue terisi |
| R-RM-05 | AI boleh mengusulkan mapping via field `suggestedMapping` — tetapi TIDAK BOLEH mengisi `mappedValue` |
| R-RM-06 | Jika rawValue salah total (bukan masalah mapping), human mengedit via Human Review — field status berubah menjadi VALIDATED |
| R-RM-07 | Setiap perubahan mappedValue tercatat di Audit Trail |

---

## FIELD STATUS STATE MACHINE

```
MISSING ──► EXTRACTED ──► MAPPED ──► VALIDATED
                │            │
                ├──► CONFLICT ──► VALIDATED (human resolve)
                │
                └──► NEED_REVIEW ──► VALIDATED (human confirm)
```

---

## KNOWLEDGE DEPENDENCY

### Depends On
- `foundation/auditability-foundation.md` (v1.0 LOCKED)
- `constitution/business/package-creation-bot-constitution.md`

### Required By
- `constitution/ai/ai-governance.md`
- All Business Engine documents that map to Master Data

---

## EVIDENCE

| Evidence | Type | Strength |
|----------|------|----------|
| Package Creation Bot Constitution (14 Principles, Principle 4 & 6) | PO Decision | HIGH |
| EEOS Audit — Phase 1 Business Architecture Audit | PO Decision | HIGH |
| Existing codebase: `PackageExtractionResult` type in `package-ai/types.ts` | Production Code | MEDIUM |

---

## DECISION TRACE

| Field | Value |
|-------|-------|
| **Primary ADR** | ADR-012 — Raw + Mapped Value Data Contract |
| **Business Decision** | PO approval — Foundation Evolution Phase 2 (2026-06-29) |
| **Reasoning** | Memisahkan Raw dari Mapped adalah fondasi untuk auditability, human review, dan AI governance |

---

## FOUNDATION STATUS

**APPROVED** — Document is ACCEPTED as Business Constitution Data Contract.
