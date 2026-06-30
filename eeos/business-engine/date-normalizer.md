# Date Normalizer

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-ENG-004 |
| **Title** | Date Normalizer |
| **Category** | Business Engine — Normalizer |
| **Layer** | Level 4 |
| **Status** | ACCEPTED |
| **Version** | v1.0 |
| **Owner** | Product Owner |
| **Created** | 2026-06-29 |

---

## PURPOSE

Engine ini menormalkan format tanggal dari berbagai format input (terutama format teks Indonesia) ke format standar ISO 8601 (`YYYY-MM-DD`).

---

## INPUT FORMATS

| Format | Example | Source |
|--------|---------|--------|
| Indonesian text | `15 JULI 2026` | Caption, Flyer OCR |
| Indonesian short | `15 JUL 2026` | Flyer OCR |
| Numeric DD-MM-YYYY | `15-07-2026` | Flyer OCR |
| Numeric DD/MM/YYYY | `15/07/2026` | Flyer OCR |
| ISO 8601 | `2026-07-15` | Already normalized |

---

## OUTPUT FORMAT

```
ISO 8601: YYYY-MM-DD
Example: 2026-07-15
```

---

## NORMALIZATION RULES

| Rule | Description |
|------|-------------|
| DN-01 | Month names mapped to number (JULI → 07, JAN → 01, etc.) |
| DN-02 | Month abbreviations supported (JUL, JAN, FEB, etc.) |
| DN-03 | Single-digit day → zero-padded (5 → 05) |
| DN-04 | Two-digit year → expanded (26 → 2026) |
| DN-05 | Invalid date (e.g., 31 FEB) → validation error |
| DN-06 | Past date → warning flag (tidak memblokir) |

---

## EVIDENCE

| Evidence | Type | Strength |
|----------|------|----------|
| Codebase: `caption-parser.ts` → `extractDates()` | Production Code | HIGH |

---

## FOUNDATION STATUS

**APPROVED** as Business Engine Normalizer.
