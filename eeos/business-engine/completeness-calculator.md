# Completeness Calculator

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-ENG-003 |
| **Title** | Business Completeness Calculator |
| **Category** | Business Engine |
| **Layer** | Level 4 — Business Engine |
| **Taxonomy** | Calculator |
| **Status** | ACCEPTED |
| **Version** | v1.0 |
| **Owner** | Product Owner |
| **Created** | 2026-06-29 |

---

## PURPOSE

Engine ini menghitung **Business Completeness Score** — metrik yang mengukur seberapa lengkap data bisnis dalam sebuah Draft Package. Berbeda dengan Confidence (mengukur akurasi AI), Completeness mengukur **kelengkapan bisnis**.

---

## BUSINESS FORMULA

```
Completeness Score =
  (MandatoryComplete% × 0.50) +
  (RecommendedComplete% × 0.30) +
  (OptionalComplete% × 0.20)
```

### Mandatory Fields (50% weight)

| Field | Kategori |
|-------|----------|
| departureDates | Mandatory |
| price (or tiers) | Mandatory |
| airlineText | Mandatory |
| durationDays | Mandatory |
| packageType | Mandatory |

### Recommended Fields (30% weight)

| Field | Kategori |
|-------|----------|
| hotelMekkahText | Recommended |
| hotelMadinahText | Recommended |
| landingCity | Recommended |
| include[] | Recommended |

### Optional Fields (20% weight)

| Field | Kategori |
|-------|----------|
| exclude[] | Optional |
| promoText | Optional |
| description | Optional |
| notes | Optional |
| perlengkapan[] | Optional |
| itineraryDraft | Optional |

---

## BUSINESS RULES

| # | Rule |
|---|------|
| CC-01 | Mandatory < 100% → draft TIDAK BOLEH dibuat (BLOCKER) |
| CC-02 | Completeness < 60% → draft TIDAK BOLEH dibuat (BLOCKER) |
| CC-03 | Completeness 60-80% → draft dibuat dengan flag "Perlu Pelengkapan" |
| CC-04 | Completeness > 80% → draft dibuat — siap review |
| CC-05 | Completeness dihitung ulang setiap kali admin mengedit field |

---

## SCORE INTERPRETATION

| Score | Label | Action |
|-------|-------|--------|
| 90-100 | **Excellent** | Siap publish — quick review |
| 80-89 | **Good** | Minor gaps — normal review |
| 60-79 | **Adequate** | Beberapa field missing — priority review |
| 40-59 | **Incomplete** | Banyak field missing — BLOCKER |
| 0-39 | **Poor** | Hampir kosong — BLOCKER |

---

## DIFFERENCE FROM CONFIDENCE

| | Confidence | Completeness |
|---|---|---|
| **Mengukur** | Akurasi AI | Kelengkapan bisnis |
| **Per field** | ✅ Yes | ❌ No — aggregate |
| **Digunakan untuk** | Review priority per field | Kelayakan draft secara keseluruhan |
| **Blocker?** | Tidak (eskalasi) | Ya (Mandatory < 100% = BLOCKER) |

---

## EVIDENCE

| Evidence | Type | Strength |
|----------|------|----------|
| Package Creation Bot Constitution — Principle 14 (Field Category) | PO Decision | HIGH |
| EEOS Audit — Phase 2 Foundation Evolution | PO Decision | HIGH |

---

## FOUNDATION STATUS

**APPROVED** as Business Engine Calculator.
