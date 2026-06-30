# Package Type Classifier

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-ENG-006 |
| **Title** | Package Type Classifier |
| **Category** | Business Engine — Classifier |
| **Layer** | Level 4 |
| **Status** | ACCEPTED |
| **Version** | v1.0 |

---

## PURPOSE

Engine ini mengklasifikasikan paket ke dalam tipe yang dikenal berdasarkan keyword di caption dan flyer.

---

## CLASSIFICATION RULES

| Keywords | Package Type |
|----------|-------------|
| `umroh`, `reguler`, `umrah` (tanpa `plus`/`turkie`/`dubai`) | `umroh_reguler` |
| `plus turkiye`, `plus turki`, `turkie`, `turkey` | `umroh_plus` |
| `plus dubai`, `dubai` | `umroh_plus` |
| `plus eropa`, `europe`, `eropa` | `umroh_plus` |
| `plus aqsha`, `aqsha`, `al aqsa` | `umroh_plus` |
| `haji khusus`, `haji` | `haji_khusus` |
| `wisata halal`, `muslim tour` | `wisata_halal` |

---

## RESOLUTION STRATEGY

| Match | Action | Confidence |
|-------|--------|-----------|
| Single keyword match | Langsung klasifikasi | 0.90 |
| Multiple keyword match (same type) | Klasifikasi — high confidence | 0.95 |
| Multiple keyword match (different type) | CONFLICT — human resolve | 0.30 |
| No keyword match | Default: `umroh_reguler`; NEED_REVIEW | 0.30 |

---

## BUSINESS RULES

| # | Rule |
|---|------|
| PT-01 | Default type: `umroh_reguler` (most common) |
| PT-02 | Keyword matching is **case-insensitive** |
| PT-03 | `umroh_plus` is a single type — sub-type (Turkiye/Dubai/Eropa) stored in `programName` |
| PT-04 | Confidence < 0.5 → NEED_REVIEW |

---

## EVIDENCE

- **Source:** `package-ai/caption-parser.ts` → `detectPackageType()`
- **Type:** Production Code
- **Strength:** HIGH

---

## FOUNDATION STATUS

**APPROVED** as Business Engine Classifier.
